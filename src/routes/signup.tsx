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
      </form>
    </AuthShell>
  );
}
