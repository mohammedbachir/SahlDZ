import { redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { cacheSession, readSessionCache } from "@/lib/session-cache";

// Only trust the cached redirect target while it's fresh; otherwise the real
// post-auth target is recomputed (roles/ownership may have changed).
const CACHE_FRESH_MS = 60 * 60 * 1000; // 1 hour

export function freshCachedTarget(): string | null {
  const cached = readSessionCache();
  if (cached?.to && cached.ts && Date.now() - cached.ts < CACHE_FRESH_MS) {
    return cached.to;
  }
  return null;
}

export async function getPostAuthRedirect(userId: string): Promise<string> {
  // Owner: owns a restaurant directly → operations management (general overview)
  const { data: owned } = await supabase
    .from("restaurants")
    .select("id")
    .eq("owner_id", userId)
    .maybeSingle();

  if (owned?.id) {
    cacheSession(userId, "/ops");
    return "/ops";
  }

  // Staff: has a role in a restaurant
  const { data: role } = await supabase
    .from("user_roles")
    .select("restaurant_id, role")
    .eq("user_id", userId)
    .maybeSingle();

  if (role?.restaurant_id) {
    // Owner alias (admin role) also lands on operations management
    if (role.role === "admin") {
      cacheSession(userId, "/ops");
      return "/ops";
    }
    cacheSession(userId, "/dashboard");
    return "/dashboard";
  }

  // New user with no restaurant — owner onboarding (create restaurant)
  // happens on the account page itself.
  cacheSession(userId, "/account");
  return "/account";
}

export async function requireOwner(): Promise<void> {
  const { data } = await supabase.auth.getSession();
  if (!data.session?.user?.id) {
    throw redirect({ to: "/login" });
  }
  const userId = data.session.user.id;

  // Verify the user actually owns a restaurant or has the admin role
  const { data: owned } = await supabase
    .from("restaurants")
    .select("id")
    .eq("owner_id", userId)
    .maybeSingle();
  if (owned?.id) return;

  const { data: role } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .maybeSingle();
  if (role?.role === "admin") return;

  // Not an owner — send them to their own post-auth destination
  const to = await getPostAuthRedirect(userId);
  throw redirect({ to });
}

export async function redirectIfAuthed(): Promise<void> {
  const fast = freshCachedTarget();
  if (fast) {
    throw redirect({ to: fast });
  }
  const { data } = await supabase.auth.getSession();
  if (data.session?.user?.id) {
    const to = await getPostAuthRedirect(data.session.user.id);
    throw redirect({ to });
  }
}

export async function requireAuth(): Promise<void> {
  const { data } = await supabase.auth.getSession();
  if (!data.session?.user?.id) {
    throw redirect({ to: "/login" });
  }
}

export function translateAuthError(message: string): string {
  const map: Record<string, string> = {
    "invalid login credentials": "بيانات الدخول غير صحيحة",
    "Invalid login credentials": "بيانات الدخول غير صحيحة",
    "Email not confirmed": "البريد الإلكتروني غير مؤكد بعد، تحقق من بريدك",
    "User already registered": "هذا البريد الإلكتروني مسجل مسبقاً",
    "invalid login": "بيانات الدخول غير صحيحة",
    "Password should be at least 6 characters": "كلمة المرور يجب أن تكون 6 أحرف على الأقل",
    "Unable to validate email address": "تعذر التحقق من صحة البريد الإلكتروني",
  };
  return map[message] ?? message;
}
