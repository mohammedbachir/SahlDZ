import { createServerFn } from "@tanstack/react-start";
import { getRequestHeader } from "@tanstack/react-start/server";
import { supabase } from "@/integrations/supabase/client";
import { getFirebaseDb } from "@/integrations/firebase/config";
import {
  requireRestaurantId,
  createFirebaseUser,
} from "@/lib/server-staff-auth";

export const updateMenuTheme = createServerFn({ method: "POST" })
  .validator((d: { menu_theme: string }) => d)
  .handler(async () => ({ ok: true }));

export const getSplashSettings = createServerFn({ method: "GET" }).handler(
  async () => ({
    splash_enabled: false,
    splash_always_show: false,
    cover_type: "image" as string,
    cover_image_url: null as string | null,
    cover_video_url: null as string | null,
    tagline: "",
    splash_description: "",
    features: [] as Array<{ icon: string; text: string }>,
    instagram_url: "",
    facebook_url: "",
    whatsapp_number: "",
    brand_color: "#7c5cff",
  }),
);

export const updateSplashSettings = createServerFn({ method: "POST" })
  .validator(
    (d: {
      splash_enabled?: boolean;
      splash_always_show?: boolean;
      cover_type?: string;
      cover_image_url?: string | null;
      cover_video_url?: string | null;
      cover_upload?:
        string | { name: string; type: string; base64: string } | null;
      tagline?: string | null;
      splash_description?: string | null;
      features?: string | Array<{ icon: string; text: string }>;
      instagram_url?: string | null;
      facebook_url?: string | null;
      whatsapp_number?: string | null;
      brand_color?: string | null;
    }) => d,
  )
  .handler(async () => ({
    cover_image_url: null as string | null,
    cover_video_url: null as string | null,
  }));

// ─── Manager accounts (`user_roles` + Firebase Auth) ───────────

/**
 * Creates a real Firebase Auth user via the Identity Toolkit REST API and
 * links it to the owner's restaurant through a `user_roles` document.
 */
export async function createStaffAccountCore(
  rid: string,
  rawEmail: string,
  password: string,
  role: string,
) {
  const email = rawEmail?.trim().toLowerCase() ?? "";
  if (!email.includes("@")) throw new Error("البريد غير صالح");
  if (!password || password.length < 6)
    throw new Error("كلمة السر 6 أحرف على الأقل");

  const { uid, emailExists } = await createFirebaseUser(email, password);
  if (emailExists) throw new Error("هذا البريد مستخدم مسبقاً");
  if (!uid) throw new Error("فشل إنشاء حساب المصادقة");

  const inserted = await supabase
    .from("user_roles")
    .insert({ user_id: uid, restaurant_id: rid, role, email })
    .single();
  if (inserted.error) throw new Error(inserted.error.message);
  return { staff: { id: (inserted.data as any)?.id ?? uid, email } };
}

/**
 * Revokes access by deleting the `user_roles` document(s). The underlying
 * Firebase Auth user remains until admin-SDK cleanup is introduced.
 */
export async function deleteStaffAccountCore(rid: string, staffUserId: string) {
  const rows = await supabase
    .from("user_roles")
    .select("id")
    .eq("user_id", staffUserId)
    .eq("restaurant_id", rid);
  for (const row of (rows.data ?? []) as Array<{ id: string }>) {
    await supabase.from("user_roles").delete().eq("id", row.id);
  }
  return { ok: true };
}

/** Requires the Admin SDK — not available in this backend-free build. */
export async function updateStaffPasswordCore(): Promise<never> {
  throw new Error(
    "تغيير كلمة سر المديرين غير متاح بعد — احذف الحساب وأعد إنشاءه",
  );
}

export async function listStaffAccountsCore(rid: string) {
  const rows = await supabase
    .from("user_roles")
    .select("*")
    .eq("restaurant_id", rid);
  const staff = (rows.data ?? []).map((r: any) => ({
    id: r.id,
    user_id: r.user_id,
    role: r.role,
    email: r.email ?? "",
  }));
  return { staff };
}

export const createStaffAccount = createServerFn({ method: "POST" })
  .validator((d: { email: string; password: string; role: string }) => d)
  .handler(async ({ data }) => {
    if (!getFirebaseDb()) return { staff: { id: "mock-staff", email: "" } };
    const rid = await requireRestaurantId(getRequestHeader("authorization"));
    return createStaffAccountCore(rid, data.email, data.password, data.role);
  });

export const deleteStaffAccount = createServerFn({ method: "POST" })
  .validator((d: { staffUserId: string }) => d)
  .handler(async ({ data }) => {
    if (!getFirebaseDb()) return { ok: true };
    const rid = await requireRestaurantId(getRequestHeader("authorization"));
    return deleteStaffAccountCore(rid, data.staffUserId);
  });

export const updateStaffPassword = createServerFn({ method: "POST" })
  .validator((d: { staffUserId: string; newPassword: string }) => d)
  .handler(async () => {
    await updateStaffPasswordCore();
  });

export const listStaffAccounts = createServerFn({ method: "GET" }).handler(
  async () => {
    if (!getFirebaseDb()) return { staff: [] };
    const rid = await requireRestaurantId(getRequestHeader("authorization"));
    return listStaffAccountsCore(rid);
  },
);
