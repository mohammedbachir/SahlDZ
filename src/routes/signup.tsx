import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { Eye, EyeOff, Loader2, Mail, Lock, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AuthShell } from "@/components/AuthShell";
import { getPostAuthRedirect, redirectIfAuthed, translateAuthError } from "@/lib/auth";
import { checkRateLimit, recordFailedAttempt } from "@/lib/rate-limiter";
import { useTranslation } from "react-i18next";
import { appOrigin } from "@/lib/app-url";

export const Route = createFileRoute("/signup")({
  beforeLoad: redirectIfAuthed,
  component: SignupPage,
});

function SignupPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Password strength calculation
  const getPasswordStrength = (pw: string) => {
    let strength = 0;
    if (pw.length >= 8) strength++;
    if (/[A-Z]/.test(pw)) strength++;
    if (/[0-9]/.test(pw)) strength++;
    if (/[^A-Za-z0-9]/.test(pw)) strength++;
    return strength;
  };

  const passwordStrength = getPasswordStrength(password);
  const strengthLabels = ["ضعيفة", "مقبولة", "جيدة", "قوية"];
  const strengthColors = ["bg-red-500", "bg-orange-500", "bg-yellow-500", "bg-green-500"];

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);

    const trimmedEmail = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setError("البريد الإلكتروني غير صالح");
      return;
    }
    if (password.length < 8) {
      setError("كلمة المرور قصيرة جداً (8 أحرف على الأقل)");
      return;
    }
    if (password !== confirmPassword) {
      setError("كلمتا المرور غير متطابقتين");
      return;
    }

    const { allowed, waitSeconds } = checkRateLimit(`signup:${trimmedEmail}`);
    if (!allowed) {
      setError(`محاولات كثيرة جداً، حاول مجدداً بعد ${waitSeconds} ثانية`);
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email: trimmedEmail,
        password,
        options: {
          emailRedirectTo: `${appOrigin()}/login`,
        },
      });
      if (error) {
        recordFailedAttempt(`signup:${trimmedEmail}`);
        setError(translateAuthError(error.message));
        return;
      }
      if (!data.session) {
        setInfo(
          "تم إنشاء حسابك بنجاح! أرسلنا رسالة تأكيد إلى بريدك الإلكتروني. افتحها واضغط على الرابط لتفعيل الحساب، ثم سجّل الدخول."
        );
        return;
      }
      const to = await getPostAuthRedirect(data.session.user.id);
      navigate({ to });
    } catch {
      setError(t("common.error"));
    } finally {
      setLoading(false);
    }
  }

  async function onGoogle() {
    setError(null);
    setInfo(null);
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: `${window.location.origin}/auth/callback` },
      });
      if (error) setError(translateAuthError(error.message ?? "google"));
    } catch {
      setError(t("common.error"));
    } finally {
      setLoading(false);
    }
  }

  async function onApple() {
    setError(null);
    setInfo(null);
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "apple",
        options: { redirectTo: `${window.location.origin}/auth/callback` },
      });
      if (error) setError(translateAuthError(error.message ?? "apple"));
    } catch {
      setError(t("common.error"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell
      title={t("auth.signupTitle")}
      subtitle={t("auth.signupSubtitle")}
      footer={
        <>
          {t("auth.haveAccount")}{" "}
          <Link to="/login" className="text-[var(--primary)] font-semibold hover:underline">
            {t("auth.login")}
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} className="space-y-5">
        {/* Email field */}
        <div className="relative">
          <div className="absolute right-4 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)]">
            <Mail className="w-5 h-5" />
          </div>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            placeholder={t("auth.email")}
            className="w-full pr-12 pl-4 py-3 rounded-lg border border-[var(--border)] bg-transparent text-[var(--foreground)] outline-none transition-colors focus:border-[var(--primary)] placeholder:text-[var(--muted-foreground)]"
          />
        </div>

        {/* Password field */}
        <div className="relative">
          <div className="absolute right-4 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)]">
            <Lock className="w-5 h-5" />
          </div>
          <input
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            placeholder={t("auth.password")}
            className="w-full pr-12 pl-12 py-3 rounded-lg border border-[var(--border)] bg-transparent text-[var(--foreground)] outline-none transition-colors focus:border-[var(--primary)] placeholder:text-[var(--muted-foreground)]"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
          >
            {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
          </button>
        </div>

        {/* Password strength indicator */}
        {password.length > 0 && (
          <div className="space-y-2">
            <div className="flex gap-1">
              {[0, 1, 2, 3].map((i) => (
                <div
                  key={i}
                  className={`h-1.5 flex-1 rounded-full transition-colors ${
                    i < passwordStrength ? strengthColors[passwordStrength - 1] : "bg-[var(--border)]"
                  }`}
                />
              ))}
            </div>
            <p className="text-xs text-[var(--muted-foreground)]">
              قوة كلمة المرور: <span className="font-medium">{strengthLabels[passwordStrength - 1] || "ضعيفة"}</span>
            </p>
          </div>
        )}

        {/* Confirm password field */}
        <div className="relative">
          <div className="absolute right-4 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)]">
            <Lock className="w-5 h-5" />
          </div>
          <input
            type={showConfirmPassword ? "text" : "password"}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            placeholder="أعد إدخال كلمة المرور"
            className={`w-full pr-12 pl-12 py-3 rounded-lg border bg-transparent text-[var(--foreground)] outline-none transition-colors placeholder:text-[var(--muted-foreground)] ${
              confirmPassword && password !== confirmPassword
                ? "border-red-500 focus:border-red-500"
                : confirmPassword && password === confirmPassword
                ? "border-green-500 focus:border-green-500"
                : "border-[var(--border)] focus:border-[var(--primary)]"
            }`}
          />
          <button
            type="button"
            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
            className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
          >
            {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
          </button>
          {confirmPassword && password === confirmPassword && (
            <div className="absolute left-12 top-1/2 -translate-y-1/2 text-green-500">
              <Check className="w-5 h-5" />
            </div>
          )}
        </div>

        {/* Password requirements */}
        <div className="text-xs text-[var(--muted-foreground)] space-y-1">
          <p className={password.length >= 8 ? "text-green-500" : ""}>
            {password.length >= 8 ? "✓" : "○"} 8 أحرف على الأقل
          </p>
          <p className={/[A-Z]/.test(password) ? "text-green-500" : ""}>
            {/[A-Z]/.test(password) ? "✓" : "○"} حرف كبير واحد على الأقل
          </p>
          <p className={/[0-9]/.test(password) ? "text-green-500" : ""}>
            {/[0-9]/.test(password) ? "✓" : "○"} رقم واحد على الأقل
          </p>
        </div>

        {/* Info message */}
        {info && (
          <div className="p-4 rounded-xl bg-green-500/10 border border-green-500/20 text-sm text-green-600 text-center leading-relaxed">
            {info}
          </div>
        )}

        {/* Error message */}
        {error && (
          <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-sm text-red-500 text-center">
            {error}
          </div>
        )}

        {/* Submit button */}
        <button
          type="submit"
          disabled={loading || !!info}
          className="w-full py-3 rounded-lg bg-[var(--primary)] text-[#1a1612] font-semibold transition-colors hover:bg-[var(--primary)]/90 disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {loading ? (
            <Loader2 className="w-5 h-5 animate-spin mx-auto" />
          ) : (
            t("auth.create")
          )}
        </button>

        {/* Divider */}
        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-[var(--border)]" />
          </div>
          <div className="relative flex justify-center text-xs">
            <span className="px-3 bg-[var(--card)] text-[var(--muted-foreground)]">أو</span>
          </div>
        </div>

        {/* Social buttons */}
        <div className="space-y-2">
          <button
            type="button"
            onClick={onGoogle}
            disabled={loading || !!info}
            className="w-full flex items-center justify-center gap-2.5 py-2.5 rounded-lg border border-[var(--border)] bg-transparent font-medium text-sm text-[var(--foreground)] transition-colors hover:bg-[var(--muted)] disabled:opacity-60"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" aria-hidden="true">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.75h3.57c2.08-1.92 3.28-4.74 3.28-8.07Z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.75c-.99.66-2.25 1.06-3.71 1.06-2.86 0-5.28-1.93-6.15-4.53H2.18v2.84A11 11 0 0 0 12 23Z"/>
              <path fill="#FBBC05" d="M5.85 14.12a6.6 6.6 0 0 1 0-4.24V7.04H2.18a11 11 0 0 0 0 9.92l3.67-2.84Z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.04l3.67 2.84C6.72 7.31 9.14 5.38 12 5.38Z"/>
            </svg>
            التسجيل بـ Google
          </button>

          <button
            type="button"
            onClick={onApple}
            disabled={loading || !!info}
            className="w-full flex items-center justify-center gap-2.5 py-2.5 rounded-lg bg-[var(--foreground)] text-[var(--background)] font-medium text-sm transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M16.365 1.43c0 1.14-.493 2.27-1.177 3.08-.744.9-1.99 1.57-2.987 1.57-.12 0-.23-.02-.3-.03-.01-.06-.04-.22-.04-.39 0-1.15.572-2.27 1.206-2.98.804-.94 2.142-1.64 3.248-1.68.03.13.05.28.05.43zm4.565 15.71c-.03.07-.463 1.58-1.518 3.12-.945 1.34-1.94 2.71-3.43 2.71-1.517 0-1.9-.88-3.63-.88-1.698 0-2.302.91-3.67.91-1.377 0-2.332-1.26-3.428-2.8-1.287-1.82-2.323-4.63-2.323-7.28 0-4.28 2.797-6.55 5.552-6.55 1.448 0 2.675.95 3.6.95.865 0 2.222-1.01 3.902-1.01.613 0 2.886.06 4.374 2.19-.13.09-2.383 1.37-2.383 4.19 0 3.26 2.854 4.42 2.955 4.45z"/>
            </svg>
            التسجيل بـ Apple
          </button>
        </div>
      </form>
    </AuthShell>
  );
}
