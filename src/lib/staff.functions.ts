import { createServerFn } from "@tanstack/react-start";
import { getRequestHeader } from "@tanstack/react-start/server";
import { supabase } from "@/integrations/supabase/client";
import { getFirebaseDb } from "@/integrations/firebase/config";
import {
  requireRestaurantId,
  createFirebaseUser,
} from "@/lib/server-staff-auth";
import {
  generateUniquePin,
  generateUniqueSerial,
  effectiveStaffPermissions,
} from "@/lib/staff-core";
import {
  normalizePermissions,
  primaryInterfaceFor,
  interfaceLabel,
  roleLabelFor,
  OPS_AREAS,
  type StaffPermission,
  type StaffOpsArea,
} from "@/lib/staff-permissions";

export type StaffRecord = {
  id: string;
  restaurant_id: string;
  name: string;
  role: string | null;
  serial: string;
  pin: string;
  pin_changed?: boolean;
  frozen: boolean;
  freeze_reason: string | null;
  frozen_at?: string | null;
  permissions: string[];
  email?: string | null;
  user_id?: string | null;
  salary?: number | null;
  created_at?: string;
};

export type StaffInput = {
  name: string;
  pin: string;
  permissions: string[];
  email?: string | null;
  password?: string | null;
  salary?: number | null;
  frozen?: boolean;
  freeze_reason?: string | null;
};

function cleanPermissions(raw: unknown): StaffPermission[] {
  const perms = normalizePermissions(raw);
  const known = perms.filter((p) => {
    const base = p.endsWith(":write") ? p.slice(0, -6) : p;
    if (["kitchen", "waiter", "cashier"].includes(base)) return true;
    return (OPS_AREAS as string[]).includes(base);
  });
  return [...new Set(known)] as StaffPermission[];
}

/** Sync the legacy `role` label from the new permission list. */
function roleFromPermissions(permissions: string[]): string {
  const primary = primaryInterfaceFor(permissions);
  if (primary) return interfaceLabel(primary);
  return roleLabelFor(permissions);
}

/**
 * Transitional mapping from the unified permission list to one of the
 * existing operations-dashboard roles. Phase 5 reads permissions directly
 * from the staff document, making this mapping only a fallback.
 */
function deriveOpsRoleForPermissions(permissions: string[]): string {
  const areas = grantedAreas(permissions);
  const write = new Set(areas.filter((x) => x.write).map((x) => x.a));
  if (write.has("employees") || write.has("staffPerformance"))
    return "hr_manager";
  if (
    write.has("suppliers") &&
    (write.has("inventory") || write.has("expenses"))
  )
    return "purchasing_manager";
  if (write.has("recipes") || write.has("inventoryCount") || write.has("waste"))
    return "production_manager";
  if (write.size > 0) return "operations_manager";
  return "staff";
}

function grantedAreas(
  permissions: string[],
): Array<{ a: StaffOpsArea; write: boolean }> {
  const out: Array<{ a: StaffOpsArea; write: boolean }> = [];
  for (const area of OPS_AREAS) {
    const has =
      permissions.includes(area) || permissions.includes(`${area}:write`);
    if (has)
      out.push({ a: area, write: permissions.includes(`${area}:write`) });
  }
  return out;
}

function sortByName(list: StaffRecord[]): StaffRecord[] {
  return [...list].sort((a, b) => a.name.localeCompare(b.name, "ar"));
}

// ─── DB logic (no HTTP layer; also used by tests) ───────────────

export async function listStaffCore(rid: string) {
  const rows = await supabase
    .from("staff")
    .select("*")
    .eq("restaurant_id", rid);
  const staff: StaffRecord[] = (rows.data ?? []).map((s: any) => ({
    id: s.id,
    restaurant_id: s.restaurant_id,
    name: s.name,
    role: s.role ?? null,
    serial: s.serial ?? "",
    pin: s.pin ?? "",
    pin_changed: !!s.pin_changed,
    frozen: !!s.frozen,
    freeze_reason: s.freeze_reason ?? null,
    frozen_at: s.frozen_at ?? null,
    permissions: effectiveStaffPermissions(s),
    email: s.email ?? null,
    user_id: s.user_id ?? null,
    salary: s.salary ? Number(s.salary) : null,
    created_at: s.created_at ?? null,
  }));
  return { staff: sortByName(staff) };
}

export async function addStaffCore(rid: string, input: StaffInput) {
  const name = input?.name?.trim() ?? "";
  const pin = input?.pin?.trim() ?? "";
  if (!name) throw new Error("أدخل اسم الموظف");
  if (pin && !/^\d{4,6}$/.test(pin)) throw new Error("PIN من 4 إلى 6 أرقام");
  const permissions = cleanPermissions(input?.permissions);
  const finalPin = pin || (await generateUniquePin());

  let user_id: string | null = null;
  let email: string | null = input?.email?.trim()?.toLowerCase() || null;
  if (email && input?.password) {
    const { uid, emailExists } = await createFirebaseUser(
      email,
      input.password,
    );
    if (emailExists)
      throw new Error("هذا البريد مستخدم مسبقاً — اختر بريداً آخر");
    if (!uid) throw new Error("فشل إنشاء حساب الدخول من الويب");
    user_id = uid;
    const opRole = deriveOpsRoleForPermissions(permissions);
    const { error: roleErr } = await supabase
      .from("user_roles")
      .insert({ user_id: uid, restaurant_id: rid, role: opRole, email });
    if (roleErr) throw new Error(roleErr.message);
  } else if (email) {
    email = null;
  }

  const serial = await generateUniqueSerial();
  const { error } = await supabase.from("staff").insert({
    restaurant_id: rid,
    name,
    role: roleFromPermissions(permissions),
    serial,
    pin: finalPin,
    pin_changed: false,
    frozen: false,
    freeze_reason: null,
    permissions,
    email,
    user_id,
    salary: input.salary ? Number(input.salary) || null : null,
    created_at: new Date().toISOString(),
  });
  if (error) throw new Error(error.message);
  return { ok: true, serial, pin: finalPin };
}

export async function updateStaffCore(
  rid: string,
  staffId: string,
  input: Partial<StaffInput>,
) {
  const row = await assertOwnedStaff(rid, staffId);
  const payload: Record<string, any> = {};

  if (input.name !== undefined) {
    const name = input.name.trim();
    if (!name) throw new Error("أدخل اسم الموظف");
    payload.name = name;
  }

  if (input.pin !== undefined) {
    const pin = input.pin.trim();
    if (pin && !/^\d{4,6}$/.test(pin)) throw new Error("PIN من 4 إلى 6 أرقام");
    if (pin) {
      payload.pin = pin;
      payload.pin_changed = true;
    }
  }

  if (input.permissions !== undefined) {
    const permissions = cleanPermissions(input.permissions);
    payload.permissions = permissions;
    payload.role = roleFromPermissions(permissions);
  }

  if (input.frozen !== undefined) {
    const frozen = !!input.frozen;
    payload.frozen = frozen;
    payload.freeze_reason = frozen
      ? (input.freeze_reason?.trim() ?? null)
      : null;
    payload.frozen_at = frozen ? new Date().toISOString() : null;
  }

  if (input.email !== undefined && input.email?.trim()) {
    const email = input.email.trim().toLowerCase();
    if (!row.user_id) {
      const password = input.password?.trim();
      if (!password || password.length < 6)
        throw new Error("كلمة السر 6 أحرف على الأقل لتفعيل الدخول من الويب");
      const { uid, emailExists } = await createFirebaseUser(email, password);
      if (emailExists) throw new Error("هذا البريد مستخدم مسبقاً");
      if (!uid) throw new Error("فشل إنشاء حساب الدخول من الويب");
      const opRole = deriveOpsRoleForPermissions(
        (payload.permissions as string[] | undefined) ?? row.permissions ?? [],
      );
      const { error: roleErr } = await supabase
        .from("user_roles")
        .insert({ user_id: uid, restaurant_id: rid, role: opRole, email });
      if (roleErr) throw new Error(roleErr.message);
      payload.user_id = uid;
      payload.email = email;
    }
  }

  if (input.salary !== undefined) {
    payload.salary = input.salary ? Math.max(0, Number(input.salary)) : null;
  }

  if (Object.keys(payload).length === 0) return { ok: true };
  const { error } = await supabase
    .from("staff")
    .update(payload)
    .eq("id", staffId);
  if (error) throw new Error(error.message);
  return { ok: true };
}

export async function toggleStaffCore(
  rid: string,
  staffId: string,
  active: boolean,
) {
  await assertOwnedStaff(rid, staffId);
  const payload = active
    ? { frozen: false, freeze_reason: null, frozen_at: null }
    : {
        frozen: true,
        freeze_reason: "تم إيقاف هذا الحساب من الإعدادات",
        frozen_at: new Date().toISOString(),
      };
  const { error } = await supabase
    .from("staff")
    .update(payload)
    .eq("id", staffId);
  if (error) throw new Error(error.message);
  return { ok: true };
}

export async function deleteStaffCore(rid: string, staffId: string) {
  const row = await assertOwnedStaff(rid, staffId);
  if (row.user_id) {
    const roles = await supabase
      .from("user_roles")
      .select("id")
      .eq("user_id", row.user_id)
      .eq("restaurant_id", rid);
    for (const r of (roles.data ?? []) as Array<{ id: string }>) {
      await supabase.from("user_roles").delete().eq("id", r.id);
    }
  }
  const { error } = await supabase.from("staff").delete().eq("id", staffId);
  if (error) throw new Error(error.message);
  return { ok: true };
}

async function assertOwnedStaff(
  rid: string,
  staffId: string,
): Promise<StaffRecord> {
  const row = await supabase
    .from("staff")
    .select("*")
    .eq("id", staffId)
    .single();
  const s = row.data as any;
  if (!s || s.restaurant_id !== rid) throw new Error("الموظف غير موجود");
  return s as StaffRecord;
}

// ─── Server function bindings ───────────────────────────────────

export const listStaff = createServerFn({ method: "GET" }).handler(async () => {
  if (!getFirebaseDb())
    return {
      staff: [
        {
          id: "s1",
          restaurant_id: "mock",
          name: "أحمد بلحاج",
          role: "مطبخ",
          serial: "XKQM-482913",
          pin: "4821",
          pin_changed: false,
          frozen: false,
          freeze_reason: null,
          permissions: ["kitchen", "cashier"],
          email: null,
          user_id: null,
        },
        {
          id: "s2",
          restaurant_id: "mock",
          name: "سمير حمداني",
          role: "كاشير",
          serial: "BZHT-937145",
          pin: "937145",
          pin_changed: false,
          frozen: false,
          freeze_reason: null,
          permissions: ["cashier", "inventory", "reports"],
          email: null,
          user_id: null,
        },
        {
          id: "s3",
          restaurant_id: "mock",
          name: "ليلى بوعلام",
          role: "نادل",
          serial: "QRWE-660241",
          pin: "6602",
          pin_changed: true,
          frozen: true,
          freeze_reason: "غياب متكرر",
          permissions: ["waiter"],
          email: null,
          user_id: null,
        },
      ],
    };
  const rid = await requireRestaurantId(getRequestHeader("authorization"));
  return listStaffCore(rid);
});

export const addStaff = createServerFn({ method: "POST" })
  .validator((d: StaffInput) => d)
  .handler(async ({ data }) => {
    if (!getFirebaseDb())
      return { ok: true, serial: "MOCK-000000", pin: data.pin || "0000" };
    const rid = await requireRestaurantId(getRequestHeader("authorization"));
    return addStaffCore(rid, data);
  });

export const updateStaff = createServerFn({ method: "POST" })
  .validator((d: { staffId: string; input: Partial<StaffInput> }) => d)
  .handler(async ({ data }) => {
    if (!getFirebaseDb()) return { ok: true };
    const rid = await requireRestaurantId(getRequestHeader("authorization"));
    return updateStaffCore(rid, data.staffId, data.input);
  });

export const toggleStaff = createServerFn({ method: "POST" })
  .validator((d: { staffId: string; active: boolean }) => d)
  .handler(async ({ data }) => {
    if (!getFirebaseDb()) return { ok: true };
    const rid = await requireRestaurantId(getRequestHeader("authorization"));
    return toggleStaffCore(rid, data.staffId, data.active);
  });

export const deleteStaff = createServerFn({ method: "POST" })
  .validator((d: { staffId: string }) => d)
  .handler(async ({ data }) => {
    if (!getFirebaseDb()) return { ok: true };
    const rid = await requireRestaurantId(getRequestHeader("authorization"));
    return deleteStaffCore(rid, data.staffId);
  });
