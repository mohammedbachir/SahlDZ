import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getFirebaseDb } from "@/integrations/firebase/config";
import { translateAuthError } from "@/lib/auth";
import { Smartphone, Loader2, Eye, EyeOff } from "lucide-react";

export default function MobileLoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !password) return;
    setLoading(true);
    setError("");

    try {
      if (!getFirebaseDb()) {
        localStorage.setItem("sahl_dz_preview_role", "owner");
        localStorage.setItem("sahl_dz_preview_uid", "preview-user");
        window.location.href = "/mobile";
        return;
      }

      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) {
        setError(translateAuthError(authError.message));
        setLoading(false);
        return;
      }

      if (data.user) {
        window.location.href = "/mobile";
      }
    } catch {
      setError("حدث خطأ غير متوقع");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6" dir="rtl" style={{ background: "var(--background)" }}>
      <div className="w-full max-w-sm space-y-8">
        {/* Logo */}
        <div className="text-center space-y-4">
          <div className="w-20 h-20 mx-auto rounded-2xl flex items-center justify-center" style={{ background: "var(--primary)" }}>
            <Smartphone className="w-10 h-10 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold" style={{ color: "var(--foreground)" }}>SahlDZ</h1>
            <p className="text-sm mt-1" style={{ color: "var(--muted-foreground)" }}>نظام إدارة المطعم</p>
          </div>
        </div>

        {/* Login Form */}
        <form onSubmit={handleLogin} className="space-y-4">
          {error && (
            <div className="rounded-xl p-3 text-sm text-center" style={{ background: "var(--destructive)", color: "white" }}>
              {error}
            </div>
          )}

          <div className="space-y-2">
            <label className="text-sm font-medium" style={{ color: "var(--foreground)" }}>البريد الإلكتروني</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@sahldz.com"
              className="w-full px-4 py-3 rounded-xl outline-none"
              style={{
                background: "var(--card)",
                border: "1px solid var(--border)",
                color: "var(--foreground)",
              }}
              autoComplete="email"
              required
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium" style={{ color: "var(--foreground)" }}>كلمة المرور</label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••"
                className="w-full px-4 py-3 rounded-xl outline-none"
                style={{
                  background: "var(--card)",
                  border: "1px solid var(--border)",
                  color: "var(--foreground)",
                }}
                autoComplete="current-password"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute left-3 top-1/2 -translate-y-1/2"
                style={{ color: "var(--muted-foreground)" }}
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || !email || !password}
            className="w-full py-3 rounded-xl font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            style={{
              background: "var(--primary)",
              color: "var(--primary-foreground)",
            }}
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                جاري تسجيل الدخول...
              </>
            ) : (
              "دخول"
            )}
          </button>
        </form>

        {/* Footer */}
        <div className="text-center">
          <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>
            نسيت كلمة المرور؟ تواصل مع مدير النظام
          </p>
        </div>
      </div>
    </div>
  );
}
