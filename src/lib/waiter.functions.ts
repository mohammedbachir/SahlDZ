import { createServerFn } from "@tanstack/react-start";
import { getRequestHeader } from "@tanstack/react-start/server";
import { previewExpiry } from "@/lib/preview-mode";
import { supabase } from "@/integrations/supabase/client";
import { getFirebaseDb } from "@/integrations/firebase/config";
import {
  ROLE_WAITER,
  makeStaffSessionToken,
  generateUniqueSerial,
  resolveStaffFromToken,
} from "@/lib/staff-core";
import { requireRestaurantId } from "@/lib/server-staff-auth";

/** DB logic: resolve waiter context from session token. */
export async function getWaiterContextCore(token: string) {
  const { staffRow, restaurantId } = await resolveStaffFromToken(token);
  if (staffRow.role !== ROLE_WAITER) throw new Error("هذا الحساب ليس حساب نادل");
  const { data: rest } = await supabase
    .from("restaurants")
    .select("id,name,logo_url")
    .eq("id", restaurantId)
    .maybeSingle();
  return {
    waiterName: staffRow.name as string,
    restaurant: (rest as any) ?? { id: restaurantId, name: "", logo_url: null },
  };
}

export const getWaiterContext = createServerFn({ method: "GET" })
  .validator((d: { token: string }) => d)
  .handler(async ({ data }) => {
    const { token } = data as { token: string };
    if (!getFirebaseDb()) throw new Error("Firebase غير مُعد — يرجى تكوين الاتصال");
    return getWaiterContextCore(token);
  });

export const waiterLogout = createServerFn({ method: "POST" })
  .validator((d: { token: string }) => d)
  .handler(async () => ({ ok: true }));

/** DB logic: list active orders for the waiter's restaurant. */
export async function waiterListOrdersCore(token: string) {
  const { staffId, restaurantId } = await resolveStaffFromToken(token);

  const { data: orderRows } = await supabase
    .from("orders")
    .select("*")
    .eq("restaurant_id", restaurantId)
    .in("status", ["new", "preparing", "ready"])
    .order("created_at", { ascending: false });

  if (!orderRows?.length) return { orders: [] };

  const ids = orderRows.map((o: any) => o.id as string);

  const [itemsRes, tablesRes] = await Promise.all([
    supabase.from("order_items").select("*").in("order_id", ids),
    supabase
      .from("tables")
      .select("id,table_number")
      .in(
        "id",
        orderRows.map((o: any) => o.table_id).filter(Boolean),
      ),
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
  for (const t of tablesRes.data ?? []) tableMap.set((t as any).id, (t as any).table_number);

  const orders = orderRows.map((o: any) => ({
    id: o.id,
    total: o.total as number,
    status: o.status as string,
    created_at: o.created_at as string,
    order_type: (o.order_type as string) ?? "dine_in",
    customer_name: (o.customer_name as string) ?? null,
    daily_number: (o.daily_number as number) ?? null,
    notes: (o.notes as string) ?? null,
    table_number: o.table_id ? tableMap.get(o.table_id) ?? null : null,
    is_mine: o.served_by === staffId,
    items: (itemsByOrder.get(o.id) ?? []).map((it: any) => ({
      name: it.name_snapshot as string,
      qty: it.quantity as number,
    })),
  }));

  return { orders };
}

export const waiterListReadyOrders = createServerFn({ method: "GET" })
  .validator((d: { token: string }) => d)
  .handler(async ({ data }) => {
    const { token } = data as { token: string };
    return waiterListOrdersCore(token);
  });

/** DB logic: waiter claims an order. */
export async function waiterClaimOrderCore(token: string, orderId: string) {
  const { staffId, restaurantId } = await resolveStaffFromToken(token);
  const { error } = await supabase
    .from("orders")
    .update({ served_by: staffId })
    .eq("id", orderId)
    .eq("restaurant_id", restaurantId)
    .in("status", ["new", "preparing", "ready"]);
  if (error) throw new Error(error.message);
  return { ok: true };
}

export const waiterClaimOrder = createServerFn({ method: "POST" })
  .validator((d: { token: string; orderId: string }) => d)
  .handler(async ({ data }) => {
    const { token, orderId } = data as { token: string; orderId: string };
    return waiterClaimOrderCore(token, orderId);
  });

/** DB logic: waiter marks order as served (delivered to table). */
export async function waiterMarkServedCore(token: string, orderId: string) {
  const { staffId, restaurantId } = await resolveStaffFromToken(token);
  const { data: order } = await supabase
    .from("orders")
    .select("id,status,served_by")
    .eq("id", orderId)
    .eq("restaurant_id", restaurantId)
    .maybeSingle();
  if (!order) throw new Error("الطلب غير موجود");
  if ((order as any).status !== "ready") throw new Error("الطلب ليس جاهزاً للتسليم");
  if ((order as any).served_by && (order as any).served_by !== staffId) {
    throw new Error("هذا الطلب مُسند لنادل آخر");
  }
  const { error } = await supabase
    .from("orders")
    .update({ served_by: staffId, status: "paid" })
    .eq("id", orderId)
    .eq("restaurant_id", restaurantId);
  if (error) throw new Error(error.message);
  return { ok: true };
}

export const waiterMarkServed = createServerFn({ method: "POST" })
  .validator((d: { token: string; orderId: string }) => d)
  .handler(async ({ data }) => {
    const { token, orderId } = data as { token: string; orderId: string };
    return waiterMarkServedCore(token, orderId);
  });

/** Public (login-page) list of active waiters for a restaurant. */
export async function getPublicWaiterListCore(restaurantId: string) {
  const rest = await supabase
    .from("restaurants")
    .select("name,logo_url")
    .eq("id", restaurantId)
    .maybeSingle();
  if (!rest.data) return { found: false, name: "", logo_url: null as string | null, waiters: [] };
  const rows = await supabase
    .from("staff")
    .select("id,name")
    .eq("restaurant_id", restaurantId)
    .eq("role", ROLE_WAITER)
    .eq("frozen", false);
  return {
    found: true,
    name: (rest.data as any).name ?? "",
    logo_url: ((rest.data as any).logo_url as string | null) ?? null,
    waiters: (rows.data ?? []).map((w: any) => ({ id: w.id, name: w.name })),
  };
}

export const getPublicWaiterList = createServerFn({ method: "GET" })
  .validator((d: { restaurantId: string }) => d)
  .handler(async ({ data }) => {
    const { restaurantId } = data as { restaurantId: string };
    return getPublicWaiterListCore(restaurantId);
  });

/** DB logic without the HTTP layer — also used by tests. */
export async function verifyWaiterPinCore(waiterId: string, pin: string) {
  const row = await supabase.from("staff").select("*").eq("id", waiterId).maybeSingle();
  const staffRow = row.data as any;
  if (!staffRow) throw new Error("الحساب غير موجود");
  if (staffRow.frozen) {
    throw new Error(
      staffRow.freeze_reason ? `تم تجميد حسابك: ${staffRow.freeze_reason}` : "تم تجميد حسابك — راجع الإدارة",
    );
  }
  if (staffRow.role !== ROLE_WAITER) throw new Error("هذا الحساب لم يعد حساب نادل");
  if (String(staffRow.pin ?? "") !== pin.trim()) throw new Error("رمز PIN غير صحيح");

  const rest = await supabase
    .from("restaurants")
    .select("id,name,logo_url")
    .eq("id", staffRow.restaurant_id)
    .maybeSingle();
  const restaurant = (rest.data as any) ?? {
    id: staffRow.restaurant_id,
    name: "",
    logo_url: null,
  };
  return {
    token: await makeStaffSessionToken(staffRow.id),
    expiresAt: previewExpiry(),
    waiterName: staffRow.name as string,
    waiterId: staffRow.id as string,
    restaurant,
  };
}

/** Verifies a waiter PIN against the `staff` collection; enforces freeze. */
export const verifyWaiterPin = createServerFn({ method: "POST" })
  .validator((d: { waiterId: string; pin: string }) => d)
  .handler(async ({ data }) => {
    if (!getFirebaseDb()) throw new Error("Firebase غير مُعد — يرجى تكوين الاتصال");
    return verifyWaiterPinCore(data.waiterId, data.pin);
  });

// ─── Owner-facing CRUD (settings panel) ────────────────────────

export type WaiterListRow = {
  id: string;
  name: string;
  is_active: boolean;
  employee_id: string | null;
  created_at: string | null;
};

async function listStaffByRole(rid: string, role: string): Promise<WaiterListRow[]> {
  const rows = await supabase
    .from("staff")
    .select("*")
    .eq("restaurant_id", rid)
    .eq("role", role);
  const mapped: WaiterListRow[] = (rows.data ?? []).map((s: any) => ({
    id: s.id,
    name: s.name,
    is_active: !s.frozen,
    employee_id: null,
    created_at: s.created_at ?? null,
  }));
  return mapped.sort((a, b) => String(a.name).localeCompare(String(b.name), "ar"));
}

/** DB logic without the HTTP layer — also used by tests. */
export async function listWaitersCore(rid: string) {
  return { waiters: await listStaffByRole(rid, ROLE_WAITER) };
}

function validateStaffInput(name: string, pin: string) {
  if (!name?.trim()) throw new Error("اكتب الاسم");
  const cleanPin = pin?.trim() ?? "";
  if (!/^\d{4,6}$/.test(cleanPin)) throw new Error("PIN من 4 إلى 6 أرقام");
  return { name: name.trim(), pin: cleanPin };
}

export async function addWaiterCore(rid: string, rawName: string, rawPin: string) {
  const { name, pin } = validateStaffInput(rawName, rawPin);
  const serial = await generateUniqueSerial();
  const { error } = await supabase.from("staff").insert({
    restaurant_id: rid,
    name,
    role: ROLE_WAITER,
    serial,
    pin,
    pin_changed: false,
    frozen: false,
    freeze_reason: null,
    created_at: new Date().toISOString(),
  });
  if (error) throw new Error(error.message);
  return { ok: true };
}

async function assertOwnedStaff(rid: string, staffId: string): Promise<any> {
  const row = await supabase.from("staff").select("*").eq("id", staffId).single();
  const staffRow = row.data as any;
  // Adapter returns data:null when not found.
  if (!staffRow || staffRow.restaurant_id !== rid) throw new Error("الحساب غير موجود");
  return staffRow;
}

export async function updateWaiterPinCore(rid: string, waiterId: string, rawPin: string) {
  const cleanPin = rawPin?.trim() ?? "";
  if (!/^\d{4,6}$/.test(cleanPin)) throw new Error("PIN من 4 إلى 6 أرقام");
  await assertOwnedStaff(rid, waiterId);
  const { error } = await supabase.from("staff").update({ pin: cleanPin }).eq("id", waiterId);
  if (error) throw new Error(error.message);
  return { ok: true };
}

export async function toggleWaiterCore(rid: string, waiterId: string, isActive: boolean) {
  await assertOwnedStaff(rid, waiterId);
  const payload = isActive
    ? { frozen: false, freeze_reason: null }
    : { frozen: true, freeze_reason: "تم إيقاف هذا الحساب من الإعدادات", frozen_at: new Date().toISOString() };
  const { error } = await supabase.from("staff").update(payload).eq("id", waiterId);
  if (error) throw new Error(error.message);
  return { ok: true };
}

export async function deleteWaiterCore(rid: string, waiterId: string) {
  await assertOwnedStaff(rid, waiterId);
  const { error } = await supabase.from("staff").delete().eq("id", waiterId);
  if (error) throw new Error(error.message);
  return { ok: true };
}

export const listWaiters = createServerFn({ method: "GET" }).handler(async () => {
  const rid = await requireRestaurantId(getRequestHeader("authorization"));
  return listWaitersCore(rid);
});

export const addWaiter = createServerFn({ method: "POST" })
  .validator((d: { name: string; pin: string }) => d)
  .handler(async ({ data }) => {
    const rid = await requireRestaurantId(getRequestHeader("authorization"));
    return addWaiterCore(rid, data.name, data.pin);
  });

export const updateWaiterPin = createServerFn({ method: "POST" })
  .validator((d: { waiterId: string; pin: string }) => d)
  .handler(async ({ data }) => {
    const rid = await requireRestaurantId(getRequestHeader("authorization"));
    return updateWaiterPinCore(rid, data.waiterId, data.pin);
  });

export const toggleWaiter = createServerFn({ method: "POST" })
  .validator((d: { waiterId: string; is_active: boolean }) => d)
  .handler(async ({ data }) => {
    const rid = await requireRestaurantId(getRequestHeader("authorization"));
    return toggleWaiterCore(rid, data.waiterId, data.is_active);
  });

export const deleteWaiter = createServerFn({ method: "POST" })
  .validator((d: { waiterId: string }) => d)
  .handler(async ({ data }) => {
    const rid = await requireRestaurantId(getRequestHeader("authorization"));
    return deleteWaiterCore(rid, data.waiterId);
  });
