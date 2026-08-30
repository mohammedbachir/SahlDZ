import { createServerFn } from "@tanstack/react-start";
import { getRequestHeader } from "@tanstack/react-start/server";
import { supabase } from "@/integrations/supabase/client";
import { getFirebaseDb } from "@/integrations/firebase/config";
import { requireRestaurantId } from "@/lib/server-staff-auth";
import { hmacSign, hmacVerify } from "@/lib/staff-core";

export type ReadyOrder = {
  id: string;
  total: number;
  created_at: string;
  table_number: number | null;
  daily_number: number | null;
  order_type?: string;
  customer_name?: string | null;
  customer_phone?: string | null;
  customer_address?: string | null;
  notes?: string | null;
  items: Array<{ name: string; qty: number; price: number }>;
};

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
    }));
    return {
      id: o.id,
      total: o.total as number,
      created_at: o.created_at as string,
      table_number: o.table_id ? (tableMap.get(o.table_id) ?? null) : null,
      daily_number: (o.daily_number as number) ?? null,
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
  const { data: orderRows } = await supabase
    .from("orders")
    .select("*")
    .eq("restaurant_id", restaurantId)
    .eq("status", "ready")
    .order("created_at", { ascending: false });
  return { orders: await enrichOrders(orderRows ?? []) };
}

export const cashierListReady = createServerFn({ method: "GET" })
  .validator((d: { token: string }) => d)
  .handler(async ({ data }) => {
    const { token } = data as { token: string };
    return cashierListReadyCore(token);
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
  const now = new Date().toISOString();
  const { error } = await supabase
    .from("orders")
    .update({ status: "paid", served_at: now })
    .in("id", orderIds)
    .eq("restaurant_id", restaurantId)
    .eq("status", "ready");
  if (error) throw new Error(error.message);
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

  const expiresAt = new Date(Date.now() + 24 * 3600 * 1000).getTime();
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
