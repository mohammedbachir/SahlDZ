import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Loader2, Store, ArrowLeft, Sparkles, LogOut } from "lucide-react";
import { requireAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { createRestaurant } from "@/lib/restaurant-setup.functions";
import { clearSessionCache } from "@/lib/session-cache";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const Route = createFileRoute("/setup")({
  beforeLoad: requireAuth,
  component: Setup,
});

function Setup() {
  const navigate = useNavigate();
  const createFn = useServerFn(createRestaurant);
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [ownerEmail, setOwnerEmail] = useState("");
  const [ownerPhone, setOwnerPhone] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [marketingConsent, setMarketingConsent] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from("restaurants")
        .select("id")
        .eq("owner_id", user.id)
        .maybeSingle();
      if (data?.id) {
        navigate({ to: "/ops", replace: true });
      }
    })();
  }, [navigate]);

  async function getAuthHeaders() {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const token = session?.access_token;
    if (!token) return null;
    return { Authorization: `Bearer ${token}` };
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    if (name.trim().length < 2) {
      toast.error("أدخل اسم مطعمك أولاً");
      return;
    }
    setSubmitting(true);
    try {
      const headers = await getAuthHeaders();
      if (!headers) {
        toast.error("الجلسة منتهية، سجّل دخولك من جديد");
        navigate({ to: "/login", replace: true });
        return;
      }
      const res = await createFn({
        headers,
        data: {
          name,
          address,
          phone,
          owner_name: ownerName,
          owner_email: ownerEmail,
          owner_phone: ownerPhone,
          whatsapp_number: whatsapp,
          marketing_consent: marketingConsent,
        },
      });
      if (!res.ok && res.reason === "preview") {
        toast.error(
          "أنت في وضع المعاينة — لإنشاء مطعم حقيقي اربط قاعدة البيانات أولاً",
        );
        return;
      }
      toast.success("تم إنشاء مطعمك بنجاح 🎉");
      navigate({ to: "/ops", replace: true });
    } catch (err) {
      toast.error((err as Error).message || "تعذر إنشاء المطعم");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleLogout() {
    localStorage.removeItem("sahl_dz_preview_role");
    localStorage.removeItem("sahl_dz_auth_cache");
    await supabase.auth.signOut();
    clearSessionCache();
    navigate({ to: "/login", replace: true });
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center bg-[var(--background)] p-4"
      dir="rtl"
    >
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-l from-amber-600 to-amber-500 text-white shadow-lg shadow-amber-600/20">
            <Store className="h-6 w-6" />
          </div>
          <CardTitle className="text-2xl font-bold text-amber-700">
            أنشئ مطعمك
          </CardTitle>
          <CardDescription>
            خطوة واحدة تفصلك عن إدارة كاملة: الطلبات، المخزون، الموظفون،
            والتقارير.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[var(--muted-foreground)]">
                اسم المطعم *
              </label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="مثال: مطعم الأصيل"
                required
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[var(--muted-foreground)]">
                العنوان
              </label>
              <Input
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="ولاية، بلدية، حي…"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[var(--muted-foreground)]">
                رقم الهاتف
              </label>
              <Input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="05XXXXXXXX"
                dir="ltr"
                className="text-right"
              />
            </div>

            <div className="pt-2 border-t border-[var(--border)]">
              <div className="text-sm font-semibold mb-2">
                بيانات مُدير المطعم
              </div>
              <div className="space-y-1.5">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[var(--muted-foreground)]">
                    اسم المدير
                  </label>
                  <Input
                    value={ownerName}
                    onChange={(e) => setOwnerName(e.target.value)}
                    placeholder="الاسم الكامل"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[var(--muted-foreground)]">
                    البريد الإلكتروني
                  </label>
                  <Input
                    value={ownerEmail}
                    onChange={(e) => setOwnerEmail(e.target.value)}
                    placeholder="manager@example.com"
                    dir="ltr"
                    className="text-right"
                    type="email"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[var(--muted-foreground)]">
                    هاتف المدير
                  </label>
                  <Input
                    value={ownerPhone}
                    onChange={(e) => setOwnerPhone(e.target.value)}
                    placeholder="05XXXXXXXX"
                    dir="ltr"
                    className="text-right"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[var(--muted-foreground)]">
                    رقم واتساب
                  </label>
                  <Input
                    value={whatsapp}
                    onChange={(e) => setWhatsapp(e.target.value)}
                    placeholder="213XXXXXXXXX"
                    dir="ltr"
                    className="text-right"
                  />
                </div>
                <label className="flex items-start gap-2 pt-1 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={marketingConsent}
                    onChange={(e) => setMarketingConsent(e.target.checked)}
                    className="mt-1 accent-[var(--primary)]"
                  />
                  <span className="text-[11px] text-[var(--muted-foreground)]">
                    أوافق على أن تتواصل معي منصة سهل حول التحديثات والعروض
                    والقُدرات الجديدة من حين لآخر
                  </span>
                </label>
              </div>
            </div>

            <Button
              type="submit"
              disabled={submitting}
              className="w-full bg-amber-600 hover:bg-amber-700"
            >
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
              إنشاء المطعم والبدء
            </Button>
            <p className="text-center text-[11px] text-[var(--muted-foreground)]">
              في وضع المعاينة يُعرض التبويب التوضيحي فقط — الربط الحقيقي يحتاج
              قاعدة بيانات.
            </p>
          </form>

          <div className="mt-4 border-t border-[var(--border)] pt-4 space-y-2">
            <Button asChild variant="outline" className="w-full">
              <Link to="/dashboard">
                <ArrowLeft className="h-4 w-4" />
                الانتقال إلى لوحة التحكم (معاينة)
              </Link>
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={handleLogout}
              className="w-full text-[var(--muted-foreground)]"
            >
              <LogOut className="h-4 w-4" />
              تسجيل الخروج
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
