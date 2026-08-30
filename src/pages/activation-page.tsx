import { useState } from "react";
import {
  activateRestaurant,
  activateStaff,
  saveActivationConfig,
  verifyActivationCode,
} from "@/lib/activation";
import {
  Smartphone,
  Loader2,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  ChefHat,
  UtensilsCrossed,
  Calculator,
  User,
} from "lucide-react";

export default function ActivationPage() {
  const [step, setStep] = useState<"code" | "credentials">("code");
  const [code, setCode] = useState("");
  const [codeError, setCodeError] = useState("");
  const [codeLoading, setCodeLoading] = useState(false);
  const [restaurantName, setRestaurantName] = useState("");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [staffId, setStaffId] = useState("");
  const [pin, setPin] = useState("");
  const [role, setRole] = useState<"owner" | "staff">("owner");

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  async function handleCodeSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!code || code.length < 10) return;

    setCodeLoading(true);
    setCodeError("");

    try {
      const result = await verifyActivationCode(code);
      if (result.valid) {
        setRestaurantName(result.restaurantName || "");
        setStep("credentials");
      } else {
        setCodeError("كود التفعيل غير صحيح");
      }
    } catch {
      setCodeError("خطأ في الاتصال");
    } finally {
      setCodeLoading(false);
    }
  }

  async function handleCredentialsSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      let result;
      if (role === "owner") {
        result = await activateRestaurant(code, email, password);
      } else {
        result = await activateStaff(code, staffId, pin);
      }

      if (result.success && result.config) {
        saveActivationConfig(result.config);
        setSuccess(true);
        setTimeout(() => {
          window.location.href = role === "owner" ? "/dashboard" : "/ops";
        }, 2000);
      } else {
        setError(result.error || "خطأ غير متوقع");
      }
    } catch {
      setError("خطأ غير متوقع");
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4" dir="rtl" style={{ background: "var(--background)" }}>
        <div className="w-full max-w-sm text-center space-y-4">
          <div className="w-20 h-20 mx-auto rounded-2xl flex items-center justify-center" style={{ background: "var(--primary)" }}>
            <CheckCircle2 className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-2xl font-bold" style={{ color: "var(--foreground)" }}>تم التفعيل بنجاح!</h1>
          <p style={{ color: "var(--muted-foreground)" }}>جاري تحميل التطبيق...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4" dir="rtl" style={{ background: "var(--background)" }}>
      <div className="w-full max-w-sm space-y-8">
        {/* Logo */}
        <div className="text-center space-y-4">
          <div className="w-20 h-20 mx-auto rounded-2xl flex items-center justify-center" style={{ background: "var(--primary)" }}>
            <Smartphone className="w-10 h-10 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold" style={{ color: "var(--foreground)" }}>SahlDZ</h1>
            <p className="text-sm mt-1" style={{ color: "var(--muted-foreground)" }}>تفعيل التطبيق</p>
          </div>
        </div>

        {/* Step 1: Code */}
        {step === "code" && (
          <form onSubmit={handleCodeSubmit} className="space-y-4">
            {codeError && (
              <div className="rounded-xl p-3 text-sm text-center flex items-center gap-2 justify-center" style={{ background: "var(--destructive)", color: "white" }}>
                <AlertCircle className="w-4 h-4" />
                {codeError}
              </div>
            )}

            <div className="space-y-2">
              <label className="text-sm font-medium" style={{ color: "var(--foreground)" }}>
                كود المطعم
              </label>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="REST-XXXX-XXXX"
                className="w-full px-4 py-3 rounded-xl text-center tracking-widest font-mono text-lg outline-none"
                style={{
                  background: "var(--card)",
                  border: "1px solid var(--border)",
                  color: "var(--foreground)",
                }}
                maxLength={14}
                required
              />
              <p className="text-xs text-center" style={{ color: "var(--muted-foreground)" }}>
                تحصل عليه من مدير المطعم
              </p>
            </div>

            <button
              type="submit"
              disabled={codeLoading || code.length < 10}
              className="w-full py-3 rounded-xl font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              style={{
                background: "var(--primary)",
                color: "var(--primary-foreground)",
              }}
            >
              {codeLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  جاري التحقق...
                </>
              ) : (
                "التالي"
              )}
            </button>
          </form>
        )}

        {/* Step 2: Credentials */}
        {step === "credentials" && (
          <form onSubmit={handleCredentialsSubmit} className="space-y-4">
            {/* Restaurant name */}
            <div className="rounded-xl p-3 text-center" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
              <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>المطعم</p>
              <p className="text-sm font-bold" style={{ color: "var(--primary)" }}>{restaurantName}</p>
            </div>

            {/* Role selector */}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setRole("owner")}
                className="flex-1 py-2 rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-2"
                style={{
                  background: role === "owner" ? "var(--primary)" : "var(--card)",
                  color: role === "owner" ? "var(--primary-foreground)" : "var(--muted-foreground)",
                  border: role === "owner" ? "none" : "1px solid var(--border)",
                }}
              >
                <User className="w-4 h-4" />
                أنا المدير
              </button>
              <button
                type="button"
                onClick={() => setRole("staff")}
                className="flex-1 py-2 rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-2"
                style={{
                  background: role === "staff" ? "var(--primary)" : "var(--card)",
                  color: role === "staff" ? "var(--primary-foreground)" : "var(--muted-foreground)",
                  border: role === "staff" ? "none" : "1px solid var(--border)",
                }}
              >
                <ChefHat className="w-4 h-4" />
                أنا موظف
              </button>
            </div>

            {error && (
              <div className="rounded-xl p-3 text-sm text-center" style={{ background: "var(--destructive)", color: "white" }}>
                {error}
              </div>
            )}

            {/* Owner fields */}
            {role === "owner" && (
              <>
                <div className="space-y-2">
                  <label className="text-sm font-medium" style={{ color: "var(--foreground)" }}>
                    البريد الإلكتروني
                  </label>
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
                    required
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium" style={{ color: "var(--foreground)" }}>
                    كلمة المرور
                  </label>
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
              </>
            )}

            {/* Staff fields */}
            {role === "staff" && (
              <>
                <div className="space-y-2">
                  <label className="text-sm font-medium" style={{ color: "var(--foreground)" }}>
                    رقم الموظف
                  </label>
                  <input
                    type="text"
                    value={staffId}
                    onChange={(e) => setStaffId(e.target.value.toUpperCase())}
                    placeholder="CH001"
                    className="w-full px-4 py-3 rounded-xl text-center tracking-widest font-mono outline-none"
                    style={{
                      background: "var(--card)",
                      border: "1px solid var(--border)",
                      color: "var(--foreground)",
                    }}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium" style={{ color: "var(--foreground)" }}>
                    رقم PIN
                  </label>
                  <input
                    type="password"
                    value={pin}
                    onChange={(e) => setPin(e.target.value)}
                    placeholder="••••"
                    maxLength={6}
                    className="w-full px-4 py-3 rounded-xl text-center tracking-widest font-mono text-lg outline-none"
                    style={{
                      background: "var(--card)",
                      border: "1px solid var(--border)",
                      color: "var(--foreground)",
                    }}
                    required
                  />
                </div>
              </>
            )}

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setStep("code");
                  setError("");
                }}
                className="flex-1 py-3 rounded-xl font-medium transition-colors"
                style={{
                  background: "var(--card)",
                  color: "var(--muted-foreground)",
                  border: "1px solid var(--border)",
                }}
              >
                رجوع
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-[2] py-3 rounded-xl font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                style={{
                  background: "var(--primary)",
                  color: "var(--primary-foreground)",
                }}
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    جاري التفعيل...
                  </>
                ) : (
                  "تفعيل"
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
