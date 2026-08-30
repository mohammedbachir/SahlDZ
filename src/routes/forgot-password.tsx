import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Loader2, Mail, ShieldCheck } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { tx } from "@/lib/ops-tx";
import { getFirebaseDb, getFirebaseAuth } from "@/integrations/firebase/config";

export const Route = createFileRoute("/forgot-password")({
  component: ForgotPassword,
});

function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting || sent) return;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      toast.error("أدخل بريداً إلكترونياً صحيحاً");
      return;
    }
    setSubmitting(true);
    try {
      if (!getFirebaseDb()) {
        toast.info(
          "وضع المعاينة: لا يوجد خادم لإرسال البريد. في النسخة المربوطة يُرسل رابط الاستعادة لبريدك فوراً.",
        );
        setSent(true);
        return;
      }
      const auth = getFirebaseAuth();
      if (!auth) throw new Error("خطأ في الاتصال");
      const { sendPasswordResetEmail } = await import("firebase/auth");
      await sendPasswordResetEmail(auth, email.trim());
      toast.success("أرسلنا رابط استعادة كلمة المرور إلى بريدك");
      setSent(true);
    } catch (err) {
      const message =
        (err as { code?: string } | null)?.code === "auth/user-not-found"
          ? "لا يوجد حساب بهذا البريد"
          : (err as Error).message || "تعذر إرسال رابط الاستعادة";
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--background)] p-4" dir="rtl">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="mx-auto mb-2 flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-600/10 text-amber-600">
            <Mail className="h-5 w-5" />
          </div>
          <CardTitle className="text-center text-2xl font-bold text-amber-700">
            {tx("auth.forgotPasswordTitle")}
          </CardTitle>
          <CardDescription className="text-center">
            {tx("auth.forgotPasswordDesc")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {sent ? (
            <div className="flex flex-col items-center gap-3 text-center">
              <ShieldCheck className="h-10 w-10 text-emerald-500" />
              <p className="text-sm text-[var(--muted-foreground)]">
                تحقق من صندوق البريد الوارد — وإن لم تجد الرسالة افحص مجلد
                الرسائل غير المرغوب فيها (Spam).
              </p>
              <Button asChild variant="outline" className="w-full">
                <Link to="/login">{tx("auth.backToLogin")}</Link>
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[var(--muted-foreground)]">
                  البريد الإلكتروني
                </label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  dir="ltr"
                  className="text-right"
                />
              </div>
              <Button
                type="submit"
                disabled={submitting}
                className="w-full bg-amber-600 hover:bg-amber-700"
              >
                {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                إرسال رابط الاستعادة
              </Button>
              <Button asChild variant="outline" className="w-full">
                <Link to="/login">{tx("auth.backToLogin")}</Link>
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}