import { createServerFn } from "@tanstack/react-start";
import { getRequestHeader } from "@tanstack/react-start/server";
import { supabase } from "@/integrations/supabase/client";
import { getFirebaseDb } from "@/integrations/firebase/config";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  updateDoc,
  query,
  where,
} from "firebase/firestore";
import { requireRestaurantId } from "@/lib/server-staff-auth";
import { hmacSign, hmacVerify, STAFF_SESSION_TTL_MS } from "@/lib/staff-core";
import { getMenuOptionsForItemsCore } from "@/lib/menu-options.functions";
import { notifyDriversForOrderCore } from "@/lib/delivery-drivers.functions";
import { DEFAULT_CATEGORIES, DEFAULT_MENU_ITEMS } from "@/lib/default-menu";

export type ReadyOrderLine = {
  name: string;
  qty: number;
  price: number;
  note?: string | null;
  options?: Array<{ label: string; choice: string; price_delta: number }>;
};

export type ReadyOrder = {
  id: string;
  total: number;
  created_at: string;
  table_number: number | null;
  daily_number: number | null;
  order_type?: string;
  status?: string;
  customer_name?: string | null;
  customer_phone?: string | null;
  customer_address?: string | null;
  notes?: string | null;
  items: ReadyOrderLine[];
};

function safeParseOptions(
  raw: any,
): Array<{ label: string; choice: string; price_delta: number }> {
  try {
    const arr = typeof raw === "string" ? JSON.parse(raw) : raw;
    return Array.isArray(arr)
      ? arr.map((o: any) => ({
          label: String(o?.label ?? ""),
          choice: String(o?.choice ?? ""),
          price_delta: Number(o?.price_delta) || 0,
        }))
      : [];
  } catch {
    return [];
  }
}

export type ZReport = {
  dayKey: string;
  totalRevenue: number;
  totalOrders: number;
  avgTicket: number;
  byType: Record<
    "dine_in" | "takeaway" | "delivery",
    { count: number; revenue: number }
  >;
  unpaidCount: number;
  unpaidTotal: number;
};

/** Parse a cashier session token `csh.<restaurantId>.<expiryEpochMs>.<hmac>`. */
async function parseCashierToken(
  token: string,
): Promise<{ restaurantId: string; expiresAt: number } | null> {
  if (!token.startsWith("csh.")) return null;
  const parts = token.split(".");
  if (parts.length !== 4) return null;
  const expiresAt = Number(parts[2]);
  if (!Number.isFinite(expiresAt)) return null;
  const payload = `csh.${parts[1]}.${parts[2]}`;
  const valid = await hmacVerify(payload, parts[3]);
  if (!valid) return null;
  return { restaurantId: parts[1], expiresAt };
}

/** Resolve restaurant ID from cashier token, with expiry check. */
async function resolveCashierRestaurantId(token: string): Promise<string> {
  const parsed = await parseCashierToken(token);
  if (!parsed) throw new Error("جلسة الكاشير منتهية — سجّل دخولك من جديد");
  if (parsed.expiresAt <= Date.now())
    throw new Error("جلسة الكاشير منتهية — سجّل دخولك من جديد");
  return parsed.restaurantId;
}

/** Batch-fetch order items + table numbers for a set of orders. */
async function enrichOrders(orderRows: any[]): Promise<ReadyOrder[]> {
  if (!orderRows.length) return [];

  const ids = orderRows.map((o: any) => o.id as string);

  const [itemsRes, tablesRes] = await Promise.all([
    supabase.from("order_items").select("*").in("order_id", ids),
    supabase
      .from("tables")
      .select("id,table_number")
      .in("id", orderRows.map((o: any) => o.table_id).filter(Boolean)),
  ]);

  if (itemsRes.error) throw new Error(itemsRes.error.message);
  if (tablesRes.error) throw new Error(tablesRes.error.message);

  const itemsByOrder = new Map<string, any[]>();
  for (const it of itemsRes.data ?? []) {
    const arr = itemsByOrder.get((it as any).order_id) ?? [];
    arr.push(it);
    itemsByOrder.set((it as any).order_id, arr);
  }

  const tableMap = new Map<string, number>();
  for (const t of tablesRes.data ?? [])
    tableMap.set((t as any).id, (t as any).table_number);

  return orderRows.map((o: any) => {
    const items = (itemsByOrder.get(o.id) ?? []).map((it: any) => ({
      name: it.name_snapshot as string,
      qty: it.quantity as number,
      price: it.price_snapshot as number,
      note: (it.note as string) ?? null,
      options: it.options_snapshot ? safeParseOptions(it.options_snapshot) : [],
    }));
    return {
      id: o.id,
      total: o.total as number,
      created_at: o.created_at as string,
      table_number: o.table_id ? (tableMap.get(o.table_id) ?? null) : null,
      daily_number: (o.daily_number as number) ?? null,
      status: (o.status as string) ?? "new",
      order_type: (o.order_type as string) ?? "dine_in",
      customer_name: (o.customer_name as string) ?? null,
      customer_phone: (o.customer_phone as string) ?? null,
      customer_address: (o.customer_address as string) ?? null,
      notes: (o.notes as string) ?? null,
      items,
    };
  });
}

/** DB logic: get cashier restaurant context. */
export async function getCashierContextCore(token: string) {
  const restaurantId = await resolveCashierRestaurantId(token);
  const { data: rest } = await supabase
    .from("restaurants")
    .select("id,name,logo_url")
    .eq("id", restaurantId)
    .maybeSingle();
  return {
    restaurant: (rest as any) ?? { id: restaurantId, name: "", logo_url: null },
  };
}

export const getCashierContext = createServerFn({ method: "GET" })
  .validator((d: { token: string }) => d)
  .handler(async ({ data }) => {
    const { token } = data as { token: string };
    if (!getFirebaseDb())
      throw new Error("Firebase غير مُعد — يرجى تكوين الاتصال");
    return getCashierContextCore(token);
  });

/** DB logic: list orders with status = 'ready' (ready for payment). */
export async function cashierListReadyCore(token: string) {
  const restaurantId = await resolveCashierRestaurantId(token);
  const db = getFirebaseDb();
  if (!db) throw new Error("Firebase غير متصل");

  const snap = await getDocs(
    query(collection(db, "orders"), where("restaurant_id", "==", restaurantId)),
  );
  const orderRows = snap.docs
    .map((d) => ({ ...d.data(), id: d.id }))
    .filter((o: any) => o.status === "ready");
  return { orders: await enrichOrders(orderRows ?? []) };
}

export const cashierListReady = createServerFn({ method: "GET" })
  .validator((d: { token: string }) => d)
  .handler(async ({ data }) => {
    const { token } = data as { token: string };
    return cashierListReadyCore(token);
  });

/** DB logic: list ALL active orders (new, preparing, ready) for tracking. */
export async function cashierListActiveOrdersCore(token: string) {
  const restaurantId = await resolveCashierRestaurantId(token);
  const db = getFirebaseDb();
  if (!db) throw new Error("Firebase غير متصل");

  const snap = await getDocs(
    query(collection(db, "orders"), where("restaurant_id", "==", restaurantId)),
  );
  const orderRows = snap.docs
    .map((d) => ({ ...d.data(), id: d.id }))
    .filter((o: any) => ["new", "preparing", "ready"].includes(o.status));
  return { orders: await enrichOrders(orderRows ?? []) };
}

export const cashierListActiveOrders = createServerFn({ method: "GET" })
  .validator((d: { token: string }) => d)
  .handler(async ({ data }) => {
    const { token } = data as { token: string };
    return cashierListActiveOrdersCore(token);
  });

/** DB logic: update an order's status (new → preparing → ready). */
export async function cashierUpdateOrderStatusCore(
  token: string,
  orderId: string,
  status: string,
) {
  const restaurantId = await resolveCashierRestaurantId(token);
  const db = getFirebaseDb();
  if (!db) throw new Error("Firebase غير متصل");

  const orderRef = doc(db, "orders", orderId);
  const snap = await getDoc(orderRef);
  if (!snap.exists()) throw new Error("الطلبية غير موجودة");
  const data = snap.data();
  if (data.restaurant_id !== restaurantId)
    throw new Error("طلبية مملوكة لمطعم آخر");

  const update: Record<string, any> = { status };
  if (status === "ready") update.ready_at = new Date().toISOString();
  await updateDoc(orderRef, update);
  return { ok: true };
}

export const cashierUpdateOrderStatus = createServerFn({ method: "POST" })
  .validator((d: { token: string; orderId: string; status: string }) => d)
  .handler(async ({ data }) => {
    const { token, orderId, status } = data as {
      token: string;
      orderId: string;
      status: string;
    };
    return cashierUpdateOrderStatusCore(token, orderId, status);
  });

/** DB logic: lookup orders for a specific table number. */
export async function cashierLookupTableCore(
  token: string,
  tableNumber: number,
) {
  const restaurantId = await resolveCashierRestaurantId(token);

  const { data: table } = await supabase
    .from("tables")
    .select("id")
    .eq("restaurant_id", restaurantId)
    .eq("table_number", tableNumber)
    .maybeSingle();
  if (!table) return { orders: [] as ReadyOrder[] };

  const { data: orderRows } = await supabase
    .from("orders")
    .select("*")
    .eq("restaurant_id", restaurantId)
    .eq("table_id", (table as any).id)
    .in("status", ["new", "preparing", "ready"])
    .order("created_at", { ascending: false });

  return { orders: await enrichOrders(orderRows ?? []) };
}

export const cashierLookupTable = createServerFn({ method: "GET" })
  .validator((d: { token: string; tableNumber: number }) => d)
  .handler(async ({ data }) => {
    const { token, tableNumber } = data as {
      token: string;
      tableNumber: number;
    };
    return cashierLookupTableCore(token, tableNumber);
  });

/** DB logic: mark orders as paid. */
export async function cashierMarkPaidCore(token: string, orderIds: string[]) {
  const restaurantId = await resolveCashierRestaurantId(token);
  const db = getFirebaseDb();
  if (!db) throw new Error("Firebase غير متصل");
  const now = new Date().toISOString();

  for (const orderId of orderIds) {
    const orderRef = doc(db, "orders", orderId);
    const snap = await getDoc(orderRef);
    if (!snap.exists()) continue;
    const data = snap.data();
    if (data.restaurant_id !== restaurantId) continue;
    if (data.status !== "ready") continue;
    await updateDoc(orderRef, { status: "paid", served_at: now });
  }
  return { ok: true };
}

export const cashierMarkPaid = createServerFn({ method: "POST" })
  .validator((d: { token: string; orderIds: string[] }) => d)
  .handler(async ({ data }) => {
    const { token, orderIds } = data as { token: string; orderIds: string[] };
    return cashierMarkPaidCore(token, orderIds);
  });

export const cashierLogout = createServerFn({ method: "POST" })
  .validator((d: { token: string }) => d)
  .handler(async () => ({ ok: true }));

/** DB logic: generate Z-report (end-of-day) for the cashier's restaurant. */
export async function cashierZReportCore(token: string): Promise<ZReport> {
  const restaurantId = await resolveCashierRestaurantId(token);
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const dayKey = now.toISOString().slice(0, 10);

  const { data: paidOrders } = await supabase
    .from("orders")
    .select("*")
    .eq("restaurant_id", restaurantId)
    .eq("status", "paid")
    .gte("created_at", startOfDay.toISOString())
    .lte("created_at", now.toISOString());

  const { data: unpaidOrders } = await supabase
    .from("orders")
    .select("id,total")
    .eq("restaurant_id", restaurantId)
    .in("status", ["new", "preparing", "ready"]);

  const byType: ZReport["byType"] = {
    dine_in: { count: 0, revenue: 0 },
    takeaway: { count: 0, revenue: 0 },
    delivery: { count: 0, revenue: 0 },
  };

  let totalRevenue = 0;
  let totalOrders = 0;

  for (const o of paidOrders ?? []) {
    const t = ((o as any).order_type as keyof ZReport["byType"]) ?? "dine_in";
    const rev = (o as any).total as number;
    totalRevenue += rev;
    totalOrders++;
    if (byType[t]) {
      byType[t].count++;
      byType[t].revenue += rev;
    }
  }

  const unpaidTotal = (unpaidOrders ?? []).reduce(
    (s: number, o: any) => s + ((o.total as number) ?? 0),
    0,
  );

  return {
    dayKey,
    totalRevenue,
    totalOrders,
    avgTicket: totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0,
    byType,
    unpaidCount: (unpaidOrders ?? []).length,
    unpaidTotal,
  };
}

export const cashierZReport = createServerFn({ method: "GET" })
  .validator((d: { token: string }) => d)
  .handler(async ({ data }): Promise<ZReport> => {
    const { token } = data as { token: string };
    return cashierZReportCore(token);
  });

async function loadCashierConfig(restaurantId: string) {
  const rest = await supabase
    .from("restaurants")
    .select("id,name,logo_url,cashier_pin,cashier_enabled")
    .eq("id", restaurantId)
    .maybeSingle();
  return rest.data as any; // null when not found (also in preview mode)
}

/** DB logic without the HTTP layer — also used by tests. */
export async function getPublicCashierLoginInfoCore(restaurantId: string) {
  const rest = await loadCashierConfig(restaurantId);
  if (!rest) return { found: false, name: "", enabled: false };
  return {
    found: true,
    name: (rest.name as string) ?? "",
    enabled: rest.cashier_enabled === true && !!rest.cashier_pin,
  };
}

/** Public (login-page): whether the shared cashier system is enabled for a restaurant. */
export const getPublicCashierLoginInfo = createServerFn({ method: "GET" })
  .validator((d: { restaurantId: string }) => d)
  .handler(async ({ data }) => {
    return getPublicCashierLoginInfoCore(
      (data as { restaurantId: string }).restaurantId,
    );
  });

/** DB logic without the HTTP layer — also used by tests. */
export async function verifyCashierPinCore(restaurantId: string, pin: string) {
  const rest = await loadCashierConfig(restaurantId);
  if (!rest) throw new Error("المطعم غير موجود");
  if (rest.cashier_enabled !== true || !rest.cashier_pin) {
    throw new Error("نظام الكاشير غير مفعّل — فعّله من الإعدادات");
  }
  if (String(rest.cashier_pin) !== pin.trim())
    throw new Error("رمز PIN غير صحيح");

  const expiresAt = new Date(Date.now() + STAFF_SESSION_TTL_MS).getTime();
  const payload = `csh.${rest.id}.${expiresAt}`;
  const sig = await hmacSign(payload);
  return {
    token: `${payload}.${sig}`,
    expiresAt: new Date(expiresAt).toISOString(),
    restaurant: {
      id: rest.id as string,
      name: (rest.name as string) ?? "",
      logo_url: (rest.logo_url as string | null) ?? null,
    },
  };
}

/** Verifies the shared restaurant-wide cashier PIN stored on the restaurant doc. */
export const verifyCashierPin = createServerFn({ method: "POST" })
  .validator((d: { restaurantId: string; pin: string }) => d)
  .handler(async ({ data }) => {
    if (!getFirebaseDb())
      throw new Error("Firebase غير مُعد — يرجى تكوين الاتصال");
    return verifyCashierPinCore(data.restaurantId, data.pin);
  });

// ─── Owner-facing management (settings panel) ──────────────────

/** DB logic without the HTTP layer — also used by tests. */
export async function setCashierPinCore(rid: string, rawPin: string) {
  const cleanPin = rawPin?.trim() ?? "";
  if (!/^\d{4}$/.test(cleanPin)) throw new Error("يجب أن يكون الرمز 4 أرقام");
  const { error } = await supabase
    .from("restaurants")
    .update({ cashier_pin: cleanPin, cashier_enabled: true })
    .eq("id", rid);
  if (error) throw new Error(error.message);
  return { ok: true };
}

export async function disableCashierCore(rid: string) {
  const { error } = await supabase
    .from("restaurants")
    .update({ cashier_enabled: false, cashier_pin: null })
    .eq("id", rid);
  if (error) throw new Error(error.message);
  return { ok: true };
}

export async function getCashierStatusCore(rid: string) {
  const rest = await loadCashierConfig(rid);
  return { enabled: !!rest?.cashier_enabled && !!rest?.cashier_pin };
}

export const setCashierPin = createServerFn({ method: "POST" })
  .validator((d: { pin: string }) => d)
  .handler(async ({ data }) => {
    const rid = await requireRestaurantId(getRequestHeader("authorization"));
    return setCashierPinCore(rid, data.pin);
  });

export const disableCashier = createServerFn({ method: "POST" }).handler(
  async () => {
    const rid = await requireRestaurantId(getRequestHeader("authorization"));
    return disableCashierCore(rid);
  },
);

export const getCashierStatus = createServerFn({ method: "GET" }).handler(
  async () => {
    const rid = await requireRestaurantId(getRequestHeader("authorization"));
    return getCashierStatusCore(rid);
  },
);

// ─── Cashier self-service ordering (create new orders from menu) ──

export type CashierMenuItem = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  category_id: string | null;
  image_url: string | null;
  is_available: boolean;
  created_at?: string;
};

export type CashierCategory = {
  id: string;
  name: string;
  display_order: number;
};

export type CashierTableInfo = {
  id: string;
  table_number: number;
};

export type CashierNewOrderLine = {
  menu_item_id: string;
  name: string;
  price: number;
  quantity: number;
  note?: string;
  options?: Array<{ label: string; choice: string; price_delta: number }>;
};

export type CashierNewOrderInput = {
  token: string;
  order_type: "dine_in" | "takeaway" | "delivery";
  table_number?: number;
  customer_name?: string;
  customer_phone?: string;
  customer_address?: string;
  notes?: string;
  lines: CashierNewOrderLine[];
};

/** DB logic: fetch categories + available menu items + tables for the cashier menu. */
export async function cashierGetMenuCore(token: string) {
  const restaurantId = await resolveCashierRestaurantId(token);
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

  const categories = ((catRes.data ?? []) as CashierCategory[]).sort(
    (a, b) => (a.display_order ?? 0) - (b.display_order ?? 0),
  );
  const items = ((itemRes.data ?? []) as CashierMenuItem[]).sort((a, b) =>
    String(a.created_at ?? "").localeCompare(String(b.created_at ?? "")),
  );
  const tables = ((tableRes.data ?? []) as CashierTableInfo[]).sort(
    (a, b) => (a.table_number ?? 0) - (b.table_number ?? 0),
  );

  const { optionsByItem } = await getMenuOptionsForItemsCore(
    items.map((i) => i.id),
  );

  return {
    categories,
    items,
    tables,
    optionsByItem,
  };
}

export const cashierGetMenu = createServerFn({ method: "GET" })
  .validator((d: { token: string }) => d)
  .handler(async ({ data }) => {
    const { token } = data as { token: string };
    if (!getFirebaseDb())
      throw new Error("Firebase غير مُعد — يرجى تكوين الاتصال");
    return cashierGetMenuCore(token);
  });

/** DB logic: create a new order (status 'new') + its order_items, then return for printing. */
export async function cashierCreateOrderCore(input: CashierNewOrderInput) {
  const restaurantId = await resolveCashierRestaurantId(input.token);

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
  const dailyNumber = ((lastOrder?.daily_number as number) ?? 0) + 1;

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

  // Delivery orders: notify the restaurant's linked delivery drivers on
  // Telegram right away so they can pick up the delivery.
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

export const cashierCreateOrder = createServerFn({ method: "POST" })
  .validator((d: CashierNewOrderInput) => d)
  .handler(async ({ data }) => {
    if (!getFirebaseDb())
      throw new Error("Firebase غير مُعد — يرجى تكوين الاتصال");
    return cashierCreateOrderCore(data);
  });

// ─── Seed the default demo menu into the restaurant's database ──
// Lets the owner fill an empty menu (categories + items + structured
// options + tables) so the real cashier screen shows the demo dishes.

/** DB logic: idempotently insert the default menu + tables for a restaurant. */
export async function seedCashierMenuCore(rid: string) {
  // Categories (skip existing ids)
  const { data: existingCats } = await supabase
    .from("categories")
    .select("id")
    .eq("restaurant_id", rid);
  const existingCatIds = new Set(
    (existingCats ?? []).map((c: any) => c.id as string),
  );
  const missingCats = DEFAULT_CATEGORIES.filter(
    (c) => !existingCatIds.has(c.id),
  );
  const catRows = missingCats.map((c) => ({
    id: c.id,
    restaurant_id: rid,
    name: c.name,
    display_order: c.display_order,
  }));
  if (catRows.length) {
    const { error } = await supabase.from("categories").insert(catRows);
    if (error) throw new Error(error.message);
  }

  // Items (skip existing ids) + their options
  const { data: existingItems } = await supabase
    .from("menu_items")
    .select("id")
    .eq("restaurant_id", rid);
  const existingItemIds = new Set(
    (existingItems ?? []).map((i: any) => i.id as string),
  );
  const missingItems = DEFAULT_MENU_ITEMS.filter(
    (i) => !existingItemIds.has(i.id),
  );

  for (const item of missingItems) {
    const { error } = await supabase.from("menu_items").insert({
      id: item.id,
      restaurant_id: rid,
      name: item.name,
      description: item.description,
      price: item.price,
      category_id: item.category_id,
      image_url: item.image_url,
      is_available: item.is_available,
    });
    if (error) throw new Error(error.message);

    if (item.options.length) {
      let order = 0;
      for (const opt of item.options) {
        const { data: optRow, error: optErr } = await supabase
          .from("menu_item_options")
          .insert({
            restaurant_id: rid,
            menu_item_id: item.id,
            name: opt.name,
            required: opt.required,
            multi: opt.multi,
            display_order: order,
          })
          .select("id")
          .single();
        if (optErr) throw new Error(optErr.message);
        let cOrder = 0;
        for (const ch of opt.choices) {
          const { error: chErr } = await supabase
            .from("menu_item_option_choices")
            .insert({
              option_id: (optRow as any).id,
              name: ch.name,
              price_delta: ch.price_delta,
              display_order: cOrder,
            });
          if (chErr) throw new Error(chErr.message);
          cOrder++;
        }
        order++;
      }
    }
  }

  // Tables (if none exist)
  const { data: existingTables } = await supabase
    .from("tables")
    .select("id")
    .eq("restaurant_id", rid);
  if (!(existingTables ?? []).length) {
    const tableRows = [1, 2, 3, 4, 5, 6, 7, 8].map((n) => ({
      restaurant_id: rid,
      table_number: n,
    }));
    const { error } = await supabase.from("tables").insert(tableRows);
    if (error) throw new Error(error.message);
  }

  return {
    insertedCategories: catRows.length,
    insertedItems: missingItems.length,
  };
}

export const seedCashierMenu = createServerFn({ method: "POST" }).handler(
  async () => {
    const rid = await requireRestaurantId(getRequestHeader("authorization"));
    if (!getFirebaseDb())
      throw new Error("Firebase غير مُعد — يرجى تكوين الاتصال");
    return seedCashierMenuCore(rid);
  },
);
