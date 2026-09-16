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
  documentId,
} from "firebase/firestore";
import {
  ROLE_KITCHEN,
  makeStaffSessionToken,
  generateUniqueSerial,
  resolveStaffFromToken,
  staffSessionExpiry,
  effectiveStaffPermissions,
} from "@/lib/staff-core";
import { requireRestaurantId } from "@/lib/server-staff-auth";

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

/** DB logic: resolve chef context from session token. */
export async function getIndividualChefContextCore(token: string) {
  const { staffRow, restaurantId } = await resolveStaffFromToken(token);
  if (!staffRow.permissions?.includes("kitchen"))
    throw new Error("هذا الحساب لا يملك صلاحية المطبخ");

  const db = getFirebaseDb();
  let rest: any = { id: restaurantId, name: "", logo_url: null };
  if (db) {
    const restSnap = await getDoc(doc(db, "restaurants", restaurantId));
    if (restSnap.exists()) {
      rest = { id: restSnap.id, ...restSnap.data() };
    }
  }

  return {
    chefName: staffRow.name as string,
    restaurant: rest,
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
  const db = getFirebaseDb();
  if (!db) throw new Error("Firebase غير متصل");

  const snap = await getDocs(
    query(collection(db, "orders"), where("restaurant_id", "==", restaurantId)),
  );
  const orderRows = snap.docs
    .map((d) => ({ ...d.data(), id: d.id }))
    .filter((o: any) => o.status === "new" || o.status === "preparing");
  if (!orderRows.length) return { orders: [] };

  const ids = orderRows.map((o: any) => o.id as string);
  const tableIds = orderRows
    .map((o: any) => o.table_id)
    .filter(Boolean) as string[];

  const [itemsSnap, tablesSnap] = await Promise.all([
    getDocs(query(collection(db, "order_items"), where("order_id", "in", ids))),
    tableIds.length
      ? getDocs(
          query(collection(db, "tables"), where(documentId(), "in", tableIds)),
        )
      : Promise.resolve({ docs: [] } as any),
  ]);

  const itemsByOrder = new Map<string, any[]>();
  for (const d of itemsSnap.docs) {
    const it = { ...d.data(), id: d.id } as any;
    const arr = itemsByOrder.get(it.order_id) ?? [];
    arr.push(it);
    itemsByOrder.set(it.order_id, arr);
  }

  const tableMap = new Map<string, number>();
  for (const d of tablesSnap.docs) {
    const t = d.data() as any;
    tableMap.set(d.id, t.table_number);
  }

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
      note: (it.note as string) ?? null,
      options: it.options_snapshot ? safeParseOptions(it.options_snapshot) : [],
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
  const db = getFirebaseDb();
  if (!db) throw new Error("Firebase غير متصل");

  const orderRef = doc(db, "orders", orderId);
  const snap = await getDoc(orderRef);
  if (!snap.exists()) throw new Error("الطلبية غير موجودة");
  const data = snap.data();
  if (data.restaurant_id !== restaurantId)
    throw new Error("طلبية مملوكة لمطعم آخر");
  if (data.status !== "new")
    throw new Error(`حالة الطلبية "${data.status}" — لا يمكن بدء التحضير`);

  await updateDoc(orderRef, { status: "preparing", acknowledged: true });
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
  const db = getFirebaseDb();
  if (!db) throw new Error("Firebase غير متصل");

  const orderRef = doc(db, "orders", orderId);
  const snap = await getDoc(orderRef);
  if (!snap.exists()) throw new Error("الطلبية غير موجودة");
  const data = snap.data();
  if (data.restaurant_id !== restaurantId)
    throw new Error("طلبية مملوكة لمطعم آخر");
  if (data.status !== "preparing")
    throw new Error(`حالة الطلبية "${data.status}" — لا يمكن وضعها كجاهزة`);

  await updateDoc(orderRef, { status: "ready" });
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
  const db = getFirebaseDb();
  if (!db)
    return {
      found: false,
      name: "",
      logo_url: null as string | null,
      chefs: [],
    };

  const restSnap = await getDoc(doc(db, "restaurants", restaurantId));
  if (!restSnap.exists())
    return {
      found: false,
      name: "",
      logo_url: null as string | null,
      chefs: [],
    };

  const restData = restSnap.data() as Record<string, any>;

  const staffSnap = await getDocs(
    query(collection(db, "staff"), where("restaurant_id", "==", restaurantId)),
  );

  return {
    found: true,
    name: (restData.name as string) ?? "",
    logo_url: (restData.logo_url as string | null) ?? null,
    chefs: staffSnap.docs
      .filter(
        (d) =>
          (d.data() as any).role === ROLE_KITCHEN &&
          (d.data() as any).frozen !== true,
      )
      .map((d) => ({ id: d.id, name: (d.data() as any).name })),
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
  const db = getFirebaseDb();
  if (!db) throw new Error("Firebase غير متصل");

  const staffSnap = await getDoc(doc(db, "staff", chefId));
  if (!staffSnap.exists()) throw new Error("الحساب غير موجود");
  const staffRow = { id: staffSnap.id, ...staffSnap.data() } as any;

  if (staffRow.frozen) {
    throw new Error(
      staffRow.freeze_reason
        ? `تم تجميد حسابك: ${staffRow.freeze_reason}`
        : "تم تجميد حسابك — راجع الإدارة",
    );
  }
  if (!effectiveStaffPermissions(staffRow).includes("kitchen"))
    throw new Error("هذا الحساب لم يعد حساب مطبخ");
  if (String(staffRow.pin ?? "") !== pin.trim())
    throw new Error("رمز PIN غير صحيح");

  let restaurant: any = {
    id: staffRow.restaurant_id,
    name: "",
    logo_url: null,
  };
  const restSnap = await getDoc(doc(db, "restaurants", staffRow.restaurant_id));
  if (restSnap.exists()) {
    restaurant = { id: restSnap.id, ...restSnap.data() };
  }

  return {
    token: await makeStaffSessionToken(staffRow.id),
    expiresAt: staffSessionExpiry(),
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
    employee_id: s.serial ?? null,
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
