import {
  createFileRoute,
  Link,
  useNavigate,
  redirect,
} from "@tanstack/react-router";
import { useState, useEffect, type FormEvent } from "react";
import { Eye, EyeOff, Loader2, Mail, Lock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AuthShell } from "@/components/AuthShell";
import {
  getPostAuthRedirect,
  redirectIfAuthed,
  translateAuthError,
} from "@/lib/auth";
import {
  checkRateLimit,
  clearRateLimit,
  recordFailedAttempt,
} from "@/lib/rate-limiter";
import { useTranslation } from "react-i18next";
import { getFirebaseDb } from "@/integrations/firebase/config";
import { cacheSession } from "@/lib/session-cache";
import { DownloadBanner } from "@/components/download-banner";

const IS_PREVIEW = !getFirebaseDb();
const IS_DESKTOP = typeof window !== "undefined" && window.__ELECTRON__;

export const Route = createFileRoute("/login")({
  beforeLoad: () => {
    if (typeof window !== "undefined" && window.__ELECTRON__) {
      throw redirect({ to: "/staff-login", search: { rid: "" } });
    }
    return redirectIfAuthed();
  },
  component: LoginPage,
});

function LoginPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [previewRole, setPreviewRole] = useState<"owner" | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined" && window.__ELECTRON__) {
      navigate({ to: "/staff-login", search: { rid: "" } });
      return;
    }
    if (IS_PREVIEW) {
      const stored = localStorage.getItem("sahl_dz_preview_role");
      if (stored === "owner") {
        setPreviewRole("owner");
      }
    }
  }, [navigate]);

  function enterPreviewMode() {
    cacheSession("preview-owner-id", "/dashboard");
    localStorage.setItem("sahl_dz_preview_role", "owner");
    setPreviewRole("owner");
    navigate({ to: "/dashboard" });
  }

  if (IS_PREVIEW && !previewRole) {
    return (
      <>
        <AuthShell
          title={t("auth.loginTitle")}
          subtitle={t("auth.loginSubtitle")}
          footer={
            <>
              {t("auth.noAccount")}{" "}
              <Link
                to="/signup"
                className="text-[var(--primary)] font-semibold hover:underline"
              >
                {t("auth.createAccount")}
              </Link>
            </>
          }
        >
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-sm text-amber-600 text-center leading-relaxed">
              {t("kitchen.previewModeBadge")}
            </div>
            <button
              type="button"
              onClick={enterPreviewMode}
              className="w-full py-3 rounded-lg bg-[var(--primary)] text-[#1a1612] font-semibold transition-colors hover:bg-[var(--primary)]/90"
            >
              {t("common.login")} كمدير المطعم
            </button>
            <p className="text-xs text-[var(--muted-foreground)] text-center">
              هذا وضع المعاينة — بيانات تجريبية بدون خادم
            </p>
          </div>
        </AuthShell>
        {!IS_DESKTOP && <DownloadBanner />}
      </>
    );
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    const trimmedEmail = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setError("البريد الإلكتروني غير صالح");
      return;
    }
    if (password.length < 6) {
      setError("كلمة المرور قصيرة جداً (6 أحرف على الأقل)");
      return;
    }

    const { allowed, waitSeconds } = checkRateLimit(`login:${trimmedEmail}`);
    if (!allowed) {
      setError(`محاولات كثيرة جداً، حاول مجدداً بعد ${waitSeconds} ثانية`);
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: trimmedEmail,
        password,
      });
      if (error || !data.session) {
        recordFailedAttempt(`login:${trimmedEmail}`);
        setError(translateAuthError(error?.message ?? "invalid login"));
        return;
      }
      clearRateLimit(`login:${trimmedEmail}`);
      const to = await getPostAuthRedirect(data.session.user.id);
      navigate({ to });
    } catch {
      setError(t("common.error"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <AuthShell
        title={t("auth.loginTitle")}
        subtitle={t("auth.loginSubtitle")}
        footer={
          IS_DESKTOP ? null : (
            <>
              {t("auth.noAccount")}{" "}
              <Link
                to="/signup"
                className="text-[var(--primary)] font-semibold hover:underline"
              >
                {t("auth.createAccount")}
              </Link>
            </>
          )
        }
      >
        <div className="space-y-5">
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
                {showPassword ? (
                  <EyeOff className="w-5 h-5" />
                ) : (
                  <Eye className="w-5 h-5" />
                )}
              </button>
            </div>

            {/* Forgot password */}
            <div className="text-left">
              <Link
                to="/forgot-password"
                className="text-sm text-[var(--primary)] hover:underline"
              >
                نسيت كلمة المرور؟
              </Link>
            </div>

            {/* Error message */}
            {error && (
              <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-sm text-red-500 text-center">
                {error}
              </div>
            )}

            {/* Submit button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-lg bg-[var(--primary)] text-[#1a1612] font-semibold transition-colors hover:bg-[var(--primary)]/90 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin mx-auto" />
              ) : (
                t("auth.login")
              )}
            </button>
          </form>
        </div>
      </AuthShell>
      {!IS_DESKTOP && <DownloadBanner />}
    </>
  );
}
