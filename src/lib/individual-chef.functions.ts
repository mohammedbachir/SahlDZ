import { createServerFn } from "@tanstack/react-start";
import { getRequestHeader } from "@tanstack/react-start/server";
import { previewExpiry } from "@/lib/preview-mode";
import { supabase } from "@/integrations/supabase/client";
import { getFirebaseDb } from "@/integrations/firebase/config";
import {
  ROLE_KITCHEN,
  makeStaffSessionToken,
  generateUniqueSerial,
  resolveStaffFromToken,
} from "@/lib/staff-core";
import { requireRestaurantId } from "@/lib/server-staff-auth";

/** DB logic: resolve chef context from session token. */
export async function getIndividualChefContextCore(token: string) {
  const { staffRow, restaurantId } = await resolveStaffFromToken(token);
  if (staffRow.role !== ROLE_KITCHEN)
    throw new Error("هذا الحساب ليس حساب مطبخ");
  const { data: rest } = await supabase
    .from("restaurants")
    .select("id,name,logo_url")
    .eq("id", restaurantId)
    .maybeSingle();
  return {
    chefName: staffRow.name as string,
    restaurant: (rest as any) ?? { id: restaurantId, name: "", logo_url: null },
  };
}

export const getIndividualChefContext = createServerFn({ method: "GET" })
  .validator((d: { token: string }) => d)
  .handler(async ({ data }) => {
    const { token } = data as { token: string };
    if (!getFirebaseDb())
      throw new Error("Firebase غير مُعد — يرجى تكوين الاتصال");
    return getIndividualChefContextCore(token);
  });

/** DB logic: list active orders (new + preparing) for the chef's restaurant. */
export async function individualChefListActiveCore(token: string) {
  const { restaurantId } = await resolveStaffFromToken(token);

  const { data: orderRows } = await supabase
    .from("orders")
    .select("*")
    .eq("restaurant_id", restaurantId)
    .in("status", ["new", "preparing"])
    .order("created_at", { ascending: false });

  if (!orderRows?.length) return { orders: [] };

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

  const orders = orderRows.map((o: any) => ({
    id: o.id,
    status: o.status as string,
    created_at: o.created_at as string,
    acknowledged: (o.acknowledged as boolean) ?? false,
    table_number: o.table_id ? (tableMap.get(o.table_id) ?? null) : null,
    notes: (o.notes as string) ?? null,
    order_type: (o.order_type as string) ?? "dine_in",
    customer_name: (o.customer_name as string) ?? null,
    customer_phone: (o.customer_phone as string) ?? null,
    customer_address: (o.customer_address as string) ?? null,
    daily_number: (o.daily_number as number) ?? null,
    items: (itemsByOrder.get(o.id) ?? []).map((it: any) => ({
      name: it.name_snapshot as string,
      qty: it.quantity as number,
    })),
  }));

  return { orders };
}

export const individualChefListActive = createServerFn({ method: "GET" })
  .validator((d: { token: string }) => d)
  .handler(async ({ data }) => {
    const { token } = data as { token: string };
    return individualChefListActiveCore(token);
  });

/** DB logic: chef starts preparing an order. */
export async function individualChefStartPreparingCore(
  token: string,
  orderId: string,
) {
  const { restaurantId } = await resolveStaffFromToken(token);
  const { error } = await supabase
    .from("orders")
    .update({ status: "preparing", acknowledged: true })
    .eq("id", orderId)
    .eq("restaurant_id", restaurantId)
    .eq("status", "new");
  if (error) throw new Error(error.message);
  return { ok: true };
}

export const individualChefStartPreparing = createServerFn({ method: "POST" })
  .validator((d: { token: string; orderId: string }) => d)
  .handler(async ({ data }) => {
    const { token, orderId } = data as { token: string; orderId: string };
    return individualChefStartPreparingCore(token, orderId);
  });

/** DB logic: chef marks order as ready. */
export async function individualChefMarkReadyCore(
  token: string,
  orderId: string,
) {
  const { restaurantId } = await resolveStaffFromToken(token);
  const { error } = await supabase
    .from("orders")
    .update({ status: "ready" })
    .eq("id", orderId)
    .eq("restaurant_id", restaurantId)
    .eq("status", "preparing");
  if (error) throw new Error(error.message);
  return { ok: true };
}

export const individualChefMarkReady = createServerFn({ method: "POST" })
  .validator((d: { token: string; orderId: string }) => d)
  .handler(async ({ data }) => {
    const { token, orderId } = data as { token: string; orderId: string };
    return individualChefMarkReadyCore(token, orderId);
  });

export const individualChefLogout = createServerFn({ method: "POST" })
  .validator((d: { token: string }) => d)
  .handler(async () => ({ ok: true }));

/** Public (login-page) list of active kitchen staff for a restaurant. */
export async function getPublicChefListCore(restaurantId: string) {
  const rest = await supabase
    .from("restaurants")
    .select("name,logo_url")
    .eq("id", restaurantId)
    .maybeSingle();
  if (!rest.data)
    return {
      found: false,
      name: "",
      logo_url: null as string | null,
      chefs: [],
    };
  const rows = await supabase
    .from("staff")
    .select("id,name")
    .eq("restaurant_id", restaurantId)
    .eq("role", ROLE_KITCHEN)
    .eq("frozen", false);
  return {
    found: true,
    name: (rest.data as any).name ?? "",
    logo_url: ((rest.data as any).logo_url as string | null) ?? null,
    chefs: (rows.data ?? []).map((c: any) => ({ id: c.id, name: c.name })),
  };
}

export const getPublicChefList = createServerFn({ method: "GET" })
  .validator((d: { restaurantId: string }) => d)
  .handler(async ({ data }) => {
    const { restaurantId } = data as { restaurantId: string };
    return getPublicChefListCore(restaurantId);
  });

/** DB logic without the HTTP layer — also used by tests. */
export async function verifyIndividualChefPinCore(chefId: string, pin: string) {
  const row = await supabase
    .from("staff")
    .select("*")
    .eq("id", chefId)
    .maybeSingle();
  const staffRow = row.data as any;
  if (!staffRow) throw new Error("الحساب غير موجود");
  if (staffRow.frozen) {
    throw new Error(
      staffRow.freeze_reason
        ? `تم تجميد حسابك: ${staffRow.freeze_reason}`
        : "تم تجميد حسابك — راجع الإدارة",
    );
  }
  if (staffRow.role !== ROLE_KITCHEN)
    throw new Error("هذا الحساب لم يعد حساب مطبخ");
  if (String(staffRow.pin ?? "") !== pin.trim())
    throw new Error("رمز PIN غير صحيح");

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
    chefName: staffRow.name as string,
    chefId: staffRow.id as string,
    restaurant,
  };
}

/** Verifies a kitchen-staff PIN against the `staff` collection; enforces freeze. */
export const verifyIndividualChefPin = createServerFn({ method: "POST" })
  .validator((d: { chefId: string; pin: string }) => d)
  .handler(async ({ data }) => {
    if (!getFirebaseDb())
      throw new Error("Firebase غير مُعد — يرجى تكوين الاتصال");
    return verifyIndividualChefPinCore(data.chefId, data.pin);
  });

// ─── Owner-facing CRUD (settings panel) ────────────────────────

export type ChefListRow = {
  id: string;
  name: string;
  is_active: boolean;
  employee_id: string | null;
  created_at: string | null;
};

async function assertOwnedKitchenStaff(
  rid: string,
  staffId: string,
): Promise<any> {
  const row = await supabase
    .from("staff")
    .select("*")
    .eq("id", staffId)
    .single();
  const staffRow = row.data as any;
  if (!staffRow || staffRow.restaurant_id !== rid)
    throw new Error("الحساب غير موجود");
  return staffRow;
}

/** DB logic without the HTTP layer — also used by tests. */
export async function listIndividualChefsCore(rid: string) {
  const rows = await supabase
    .from("staff")
    .select("*")
    .eq("restaurant_id", rid)
    .eq("role", ROLE_KITCHEN);
  const chefs: ChefListRow[] = (rows.data ?? []).map((s: any) => ({
    id: s.id,
    name: s.name,
    is_active: !s.frozen,
    employee_id: null,
    created_at: s.created_at ?? null,
  }));
  chefs.sort((a, b) => String(a.name).localeCompare(String(b.name), "ar"));
  return { chefs };
}

export async function addIndividualChefCore(
  rid: string,
  rawName: string,
  rawPin: string,
) {
  if (!rawName?.trim()) throw new Error("اكتب اسم الطاهي");
  const cleanPin = rawPin?.trim() ?? "";
  if (!/^\d{4,6}$/.test(cleanPin)) throw new Error("PIN من 4 إلى 6 أرقام");
  const serial = await generateUniqueSerial();
  const { error } = await supabase.from("staff").insert({
    restaurant_id: rid,
    name: rawName.trim(),
    role: ROLE_KITCHEN,
    serial,
    pin: cleanPin,
    pin_changed: false,
    frozen: false,
    freeze_reason: null,
    created_at: new Date().toISOString(),
  });
  if (error) throw new Error(error.message);
  return { ok: true };
}

export async function updateIndividualChefPinCore(
  rid: string,
  chefId: string,
  rawPin: string,
) {
  const cleanPin = rawPin?.trim() ?? "";
  if (!/^\d{4,6}$/.test(cleanPin)) throw new Error("PIN من 4 إلى 6 أرقام");
  await assertOwnedKitchenStaff(rid, chefId);
  const { error } = await supabase
    .from("staff")
    .update({ pin: cleanPin })
    .eq("id", chefId);
  if (error) throw new Error(error.message);
  return { ok: true };
}

export async function toggleIndividualChefCore(
  rid: string,
  chefId: string,
  isActive: boolean,
) {
  await assertOwnedKitchenStaff(rid, chefId);
  const payload = isActive
    ? { frozen: false, freeze_reason: null }
    : {
        frozen: true,
        freeze_reason: "تم إيقاف هذا الحساب من الإعدادات",
        frozen_at: new Date().toISOString(),
      };
  const { error } = await supabase
    .from("staff")
    .update(payload)
    .eq("id", chefId);
  if (error) throw new Error(error.message);
  return { ok: true };
}

export async function deleteIndividualChefCore(rid: string, chefId: string) {
  await assertOwnedKitchenStaff(rid, chefId);
  const { error } = await supabase.from("staff").delete().eq("id", chefId);
  if (error) throw new Error(error.message);
  return { ok: true };
}

export const listIndividualChefs = createServerFn({ method: "GET" }).handler(
  async () => {
    const rid = await requireRestaurantId(getRequestHeader("authorization"));
    return listIndividualChefsCore(rid);
  },
);

export const addIndividualChef = createServerFn({ method: "POST" })
  .validator((d: { name: string; pin: string }) => d)
  .handler(async ({ data }) => {
    const rid = await requireRestaurantId(getRequestHeader("authorization"));
    return addIndividualChefCore(rid, data.name, data.pin);
  });

export const updateIndividualChefPin = createServerFn({ method: "POST" })
  .validator((d: { chefId: string; pin: string }) => d)
  .handler(async ({ data }) => {
    const rid = await requireRestaurantId(getRequestHeader("authorization"));
    return updateIndividualChefPinCore(rid, data.chefId, data.pin);
  });

export const toggleIndividualChef = createServerFn({ method: "POST" })
  .validator((d: { chefId: string; is_active: boolean }) => d)
  .handler(async ({ data }) => {
    const rid = await requireRestaurantId(getRequestHeader("authorization"));
    return toggleIndividualChefCore(rid, data.chefId, data.is_active);
  });

export const deleteIndividualChef = createServerFn({ method: "POST" })
  .validator((d: { chefId: string }) => d)
  .handler(async ({ data }) => {
    const rid = await requireRestaurantId(getRequestHeader("authorization"));
    return deleteIndividualChefCore(rid, data.chefId);
  });
