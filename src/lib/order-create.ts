import { supabase } from "@/integrations/supabase/client";
import { getMenuOptionsForItemsCore } from "@/lib/menu-options.functions";
import { notifyDriversForOrderCore } from "@/lib/delivery-drivers.functions";

// ─── Shared order creation / menu loading ──────────────────────
// Used by both the cashier (POS) and waiter web screens so an order
// created from either surface lands in the same `orders` collection.

export type OrderMenuItem = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  category_id: string | null;
  image_url: string | null;
  is_available: boolean;
  created_at?: string;
};

export type OrderCategory = {
  id: string;
  name: string;
  display_order: number;
};

export type OrderTableInfo = {
  id: string;
  table_number: number;
};

export type NewOrderLine = {
  menu_item_id: string;
  name: string;
  price: number;
  quantity: number;
  note?: string;
  options?: Array<{ label: string; choice: string; price_delta: number }>;
};

export type NewOrderInput = {
  order_type: "dine_in" | "takeaway" | "delivery";
  table_number?: number;
  customer_name?: string;
  customer_phone?: string;
  customer_address?: string;
  notes?: string;
  lines: NewOrderLine[];
};

export async function fetchMenuForRestaurantCore(restaurantId: string) {
  const [catRes, itemRes, tableRes] = await Promise.all([
    supabase
      .from("categories")
      .select("id,name,display_order")
      .eq("restaurant_id", restaurantId),
    supabase
      .from("menu_items")
      .select("id,name,description,price,category_id,image_url,is_available")
      .eq("restaurant_id", restaurantId),
    supabase
      .from("tables")
      .select("id,table_number")
      .eq("restaurant_id", restaurantId),
  ]);
  if (catRes.error) throw new Error(catRes.error.message);
  if (itemRes.error) throw new Error(itemRes.error.message);
  if (tableRes.error) throw new Error(tableRes.error.message);

  const categories = ((catRes.data ?? []) as OrderCategory[]).sort(
    (a, b) => (a.display_order ?? 0) - (b.display_order ?? 0),
  );
  const items = ((itemRes.data ?? []) as OrderMenuItem[]).sort((a, b) =>
    String(a.created_at ?? "").localeCompare(String(b.created_at ?? "")),
  );
  const tables = ((tableRes.data ?? []) as OrderTableInfo[]).sort(
    (a, b) => (a.table_number ?? 0) - (b.table_number ?? 0),
  );

  const { optionsByItem } = await getMenuOptionsForItemsCore(
    items.map((i) => i.id),
  );

  return { categories, items, tables, optionsByItem };
}

/** DB logic: create a new order (status 'new') + its order_items. */
export async function createOrderForRestaurantCore(
  restaurantId: string,
  input: NewOrderInput,
  opts?: { servedBy?: string | null; createdByRole?: string | null },
) {
  if (!input.lines?.length) throw new Error("أضف صنفاً واحداً على الأقل");
  if (!["dine_in", "takeaway", "delivery"].includes(input.order_type))
    throw new Error("نوع الطلب غير صالح");

  // Resolve table id for dine_in
  let tableId: string | null = null;
  if (input.order_type === "dine_in") {
    if (!input.table_number) throw new Error("حدد رقم الطاولة");
    const { data: table } = await supabase
      .from("tables")
      .select("id")
      .eq("restaurant_id", restaurantId)
      .eq("table_number", input.table_number)
      .maybeSingle();
    if (!table) throw new Error("رقم الطاولة غير موجود");
    tableId = (table as any).id;
  }

  // Determine the next per-day order number
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const { data: lastOrder } = await supabase
    .from("orders")
    .select("daily_number")
    .eq("restaurant_id", restaurantId)
    .gte("created_at", startOfDay.toISOString())
    .order("daily_number", { ascending: false })
    .limit(1)
    .maybeSingle();
  const dailyNumber = (((lastOrder as any)?.daily_number as number) ?? 0) + 1;

  const total = input.lines.reduce((sum, l) => {
    const optionTotal = (l.options ?? []).reduce(
      (s, o) => s + (o.price_delta || 0),
      0,
    );
    const unitPrice = (l.price || 0) + optionTotal;
    return sum + unitPrice * (l.quantity || 1);
  }, 0);

  const now = new Date().toISOString();
  const orderPayload = {
    restaurant_id: restaurantId,
    table_id: tableId,
    status: "new",
    acknowledged: false,
    stock_decremented: false,
    total,
    order_type: input.order_type,
    customer_name: input.customer_name || null,
    customer_phone: input.customer_phone || null,
    customer_address: input.customer_address || null,
    notes: input.notes || null,
    daily_number: dailyNumber,
    served_by: opts?.servedBy ?? null,
    created_by_role: opts?.createdByRole ?? null,
    created_at: now,
  };

  const { data: created, error } = await supabase
    .from("orders")
    .insert(orderPayload)
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  const orderId = (created as any).id;

  const itemRows = input.lines.map((l) => ({
    order_id: orderId,
    menu_item_id: l.menu_item_id,
    name_snapshot: l.name,
    quantity: l.quantity || 1,
    price_snapshot: l.price || 0,
    note: l.note || null,
    options_snapshot: l.options?.length ? JSON.stringify(l.options) : null,
  }));
  const { error: itemsErr } = await supabase
    .from("order_items")
    .insert(itemRows);
  if (itemsErr) throw new Error(itemsErr.message);

  if (input.order_type === "delivery") {
    void notifyDriversForOrderCore({
      restaurantId,
      orderId,
      total,
      customerName: input.customer_name || null,
      customerPhone: input.customer_phone || null,
      customerAddress: input.customer_address || null,
      items: input.lines.map((l) => ({
        name: l.name,
        quantity: l.quantity || 1,
      })),
      dailyNumber,
    });
  }

  return {
    orderId,
    dailyNumber,
    total,
    created_at: now,
    order_type: input.order_type,
    table_number: input.table_number ?? null,
    customer_name: input.customer_name || null,
    customer_phone: input.customer_phone || null,
    customer_address: input.customer_address || null,
    notes: input.notes || null,
    lines: input.lines,
  };
}
