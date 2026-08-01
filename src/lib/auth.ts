import { redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

type Session = { user: { id: string; email?: string | null } } | null;

export async function getPostAuthRedirect(userId: string): Promise<string> {
  const { data: owned } = await supabase
    .from("restaurants")
    .select("id")
    .eq("owner_id", userId)
    .maybeSingle();

  if (owned?.id) return "/dashboard";

  const { data: role } = await supabase
    .from("user_roles")
    .select("restaurant_id")
    .eq("user_id", userId)
    .maybeSingle();

  if (role?.restaurant_id) return "/dashboard";

  return "/setup";
}

export async function redirectIfAuthed(): Promise<void> {
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

export function getAuthSessionWaitMs(): number {
  return 2000;
}

export async function waitForAuthSession(waitMs: number): Promise<Session | null> {
  const started = Date.now();
  while (Date.now() - started < waitMs) {
    const { data } = await supabase.auth.getSession();
    if (data.session?.user) return data.session;
    await new Promise((r) => setTimeout(r, 150));
  }
  return null;
}
