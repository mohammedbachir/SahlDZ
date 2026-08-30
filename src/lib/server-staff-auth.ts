import { supabase } from "@/integrations/supabase/client";

// Server-only helpers used inside createServerFn handlers.
// NOTE: this module deliberately never imports "@tanstack/react-start/server"
// — the Authorization header is read by the *.functions.ts callers (whose
// handler bodies are stripped from client bundles) and passed in explicitly.

const FIREBASE_API_KEY = import.meta.env.VITE_FIREBASE_API_KEY as
  string | undefined;
const USE_EMULATORS = import.meta.env.VITE_USE_FIREBASE_EMULATORS === "1";
const EMULATOR_HOST =
  import.meta.env.VITE_FIREBASE_AUTH_EMULATOR_HOST ?? "127.0.0.1:9099";

function identityToolkitBase(): string {
  // The Auth emulator mirrors the production Identity Toolkit REST API.
  if (USE_EMULATORS)
    return `http://${EMULATOR_HOST}/identitytoolkit.googleapis.com/v1`;
  return "https://identitytoolkit.googleapis.com/v1";
}

/**
 * Verifies a Firebase Auth ID token via Google's Identity Toolkit REST API
 * (no admin SDK needed) and returns the user's uid, or null when absent/invalid.
 */
export async function getAuthedUserId(
  authHeader: string | null | undefined,
): Promise<string | null> {
  return getAuthedUserIdFromToken(bearerOf(authHeader) ?? "");
}

function bearerOf(header: string | null | undefined): string | null {
  if (!header || !header.startsWith("Bearer ")) return null;
  const token = header.slice("Bearer ".length).trim();
  return token || null;
}

/** Resolves the restaurant owned by (or assigned to) the given user. */
export async function resolveRestaurantIdForUser(
  userId: string,
): Promise<string | null> {
  const owned = await supabase
    .from("restaurants")
    .select("id")
    .eq("owner_id", userId)
    .maybeSingle();
  if (owned.data?.id) return owned.data.id as string;
  const roles = await supabase
    .from("user_roles")
    .select("restaurant_id")
    .eq("user_id", userId)
    .maybeSingle();
  return (roles.data?.restaurant_id as string) ?? null;
}

/** Throws an Arabic error unless the request carries a valid session with a restaurant. */
export async function requireRestaurantId(
  authHeader: string | null | undefined,
): Promise<string> {
  const userId = await getAuthedUserId(authHeader);
  if (!userId)
    throw new Error("الجلسة منتهية أو غير مصرح بها — سجّل دخولك من جديد");
  const restaurantId = await resolveRestaurantIdForUser(userId);
  if (!restaurantId) throw new Error("لا يوجد مطعم مرتبط بهذا الحساب");
  return restaurantId;
}

/** Testable variant: resolves the restaurant directly from an ID token. */
export async function requireRestaurantIdFromToken(
  idToken: string,
): Promise<string> {
  const userId = await getAuthedUserIdFromToken(idToken);
  if (!userId)
    throw new Error("الجلسة منتهية أو غير مصرح بها — سجّل دخولك من جديد");
  const restaurantId = await resolveRestaurantIdForUser(userId);
  if (!restaurantId) throw new Error("لا يوجد مطعم مرتبط بهذا الحساب");
  return restaurantId;
}

/** Like getAuthedUserId but takes the ID token explicitly (used by tests). */
export async function getAuthedUserIdFromToken(
  idToken: string,
): Promise<string | null> {
  const apiKey = USE_EMULATORS ? "fake-api-key" : FIREBASE_API_KEY;
  if (!idToken || !apiKey) return null;
  try {
    const res = await fetch(
      `${identityToolkitBase()}/accounts:lookup?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken }),
      },
    );
    if (!res.ok) return null;
    const json: any = await res.json();
    return json?.users?.[0]?.localId ?? null;
  } catch {
    return null;
  }
}

export async function createFirebaseUser(
  email: string,
  password: string,
): Promise<{ uid: string | null; emailExists: boolean }> {
  const apiKey = USE_EMULATORS ? "fake-api-key" : FIREBASE_API_KEY;
  if (!apiKey) return { uid: null, emailExists: false };
  try {
    const res = await fetch(
      `${identityToolkitBase()}/accounts:signUp?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      },
    );
    const json: any = await res.json();
    if (!res.ok) {
      const err = json?.error?.message ?? "";
      if (typeof err === "string" && err.includes("EMAIL_EXISTS"))
        return { uid: null, emailExists: true };
      throw new Error(
        typeof err === "string" && err ? err : "فشل إنشاء الحساب",
      );
    }
    return { uid: json?.localId ?? null, emailExists: false };
  } catch (e: any) {
    if (e?.message?.includes("EMAIL_EXISTS"))
      return { uid: null, emailExists: true };
    throw e;
  }
}
