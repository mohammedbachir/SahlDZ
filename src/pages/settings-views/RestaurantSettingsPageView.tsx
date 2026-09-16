import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Loader2, Settings, KeyRound, Copy, Upload } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";



type Restaurant = {
  id: string;
  name: string;
  logo_url: string | null;
  google_maps_review_url: string | null;
  activation_code?: string | null;
};

export function RestaurantSettingsPageView() {
  const navigate = useNavigate();
  const [r, setR] = useState<Restaurant | null>(null);
  const [name, setName] = useState("");
  const [gUrl, setGUrl] = useState("");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    (async () => {
      try {
        const { data: u } = await supabase.auth.getUser();
        if (!u.user) {
          const saved = localStorage.getItem("sahl_dz_restaurant");
          if (saved) {
            try {
              const parsed = JSON.parse(saved);
              setR(parsed);
              setName(parsed.name ?? "");
              setGUrl(parsed.google_maps_review_url ?? "");
              setLogoPreview(parsed.logo_url);
            } catch {}
          } else {
            setR({
              id: "mock-id",
              name: "مطعم السهل",
              logo_url: null,
              google_maps_review_url: "https://g.page/example",
            });
            setName("مطعم السهل");
            setGUrl("https://g.page/example");
          }
          setLoading(false);
          return;
        }
        const { data: rows, error } = await supabase
          .from("restaurants")
          .select("id, name, logo_url, google_maps_review_url, activation_code")
          .eq("owner_id", u.user.id)
          .limit(1);
        const data = rows?.[0];
        if (error || !data) {
          const saved = localStorage.getItem("sahl_dz_restaurant");
          if (saved) {
            try {
              const parsed = JSON.parse(saved);
              setR(parsed);
              setName(parsed.name ?? "");
              setGUrl(parsed.google_maps_review_url ?? "");
              setLogoPreview(parsed.logo_url);
            } catch {}
          }
          setLoading(false);
          return;
        }
        setR(data);
        setName(data.name);
        setGUrl(data.google_maps_review_url ?? "");
        setLogoPreview(data.logo_url);
        setLoading(false);
      } catch (e) {
        toast.error((e as Error).message || "فشل تحميل الإعدادات");
        setLoading(false);
      }
    })();
  }, []);

  const onPickLogo = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setLogoFile(f);
    const reader = new FileReader();
    reader.onload = () => setLogoPreview(String(reader.result));
    reader.readAsDataURL(f);
  };

  const onSave = async () => {
    if (!r) return;
    if (!name.trim()) {
      toast.error("اسم المطعم مطلوب");
      return;
    }
    setSaving(true);
    try {
      let logoUrl = r.logo_url;
      let logoWarning = false;
      if (logoFile) {
        const base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => {
            const result = reader.result as string;
            resolve(result.split(",")[1] ?? "");
          };
          reader.onerror = () => reject(reader.error);
          reader.readAsDataURL(logoFile);
        });
        const ext = (logoFile.name.split(".").pop() || "png").toLowerCase();
        const path = `${r.id}/logo-${Date.now()}.${ext}`;
        const dataUrl = `data:${logoFile.type || "image/png"};base64,${base64}`;
        const up = await supabase.storage.from("restaurant-logos").upload(path, dataUrl);
        if (up.error) logoWarning = true;
        else logoUrl = up.data?.url ?? logoUrl;
      }
      const { data: updated, error } = await supabase
        .from("restaurants")
        .update({
          name: name.trim(),
          logo_url: logoUrl,
          google_maps_review_url: gUrl.trim() || null,
        })
        .eq("id", r.id)
        .select("id, name, logo_url, google_maps_review_url, activation_code")
        .single();
      if (error) throw new Error(error.message || "فشل الحفظ");
      
      const updatedR = updated ?? { ...r, name: name.trim(), logo_url: logoUrl, google_maps_review_url: gUrl.trim() || null };
      setR(updatedR);
      localStorage.setItem("sahl_dz_restaurant", JSON.stringify(updatedR));
      window.dispatchEvent(new Event("restaurant-updated"));
      setLogoFile(null);
      toast.success(logoWarning ? "تم حفظ التغييرات، لكن فشل رفع الشعار" : "تم حفظ التغييرات بنجاح");
    } catch (e) {
      toast.error((e as Error).message || "فشل الحفظ");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 mb-6">
        <Settings className="w-6 h-6 text-primary" />
        <h2 className="text-xl font-bold">إعدادات المطعم</h2>
      </div>

      {r?.activation_code && (
        <div className="glass shadow-glass rounded-2xl border border-primary/30 p-6 space-y-4 bg-gradient-to-br from-primary/5 to-transparent">
          <div className="flex items-center gap-2">
            <KeyRound className="w-5 h-5 text-primary" />
            <h3 className="text-lg font-bold">رقم تسجيل (تسجيل الدخول على الأجهزة)</h3>
          </div>
          <p className="text-sm text-muted-foreground">
            هذا الرمز مطلوب عند فتح تطبيق سطح المكتب / تسجيل دخول الموظفين من أجهزة جديدة. شاركه مع موظفيك أو احتفظ به.
          </p>
          <div className="flex items-center gap-2 rounded-xl bg-background/50 border p-3 w-fit">
            <div dir="ltr" className="font-mono text-xl md:text-2xl font-bold tracking-widest text-primary px-4">
              {r.activation_code}
            </div>
            <Button variant="outline" size="sm" onClick={() => {
              if (r.activation_code) {
                navigator.clipboard.writeText(r.activation_code);
                toast.success("تم نسخ رمز التسجيل");
              }
            }}>
              <Copy className="w-4 h-4 ml-1" /> نسخ
            </Button>
          </div>
          <div className="rounded-xl bg-blue-50/50 border border-blue-200 p-3 text-xs text-blue-900">
            💡 استخدم هذا الرمز مع رقم الموظف (السيريال) ورمز PIN عند تسجيل الدخول من تطبيق سطح المكتب.
          </div>
        </div>
      )}

      <div className="glass shadow-glass rounded-2xl border border-border/60 p-6 space-y-5">
        <div className="space-y-2">
          <Label>شعار المطعم</Label>
          <div className="flex items-center gap-4">
            {logoPreview ? (
              <img src={logoPreview} alt="logo" className="w-20 h-20 rounded-2xl object-cover border" />
            ) : (
              <div className="w-20 h-20 rounded-2xl bg-muted flex items-center justify-center text-muted-foreground text-xl font-bold">
                {name?.[0] ?? "م"}
              </div>
            )}
            <div>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onPickLogo} />
              <Button type="button" variant="outline" onClick={() => fileRef.current?.click()}>
                <Upload className="w-4 h-4 ml-2" />
                تغيير الشعار
              </Button>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="name">اسم المطعم</Label>
          <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="اسم المطعم" />
        </div>

        <div className="space-y-2">
          <Label htmlFor="gurl">رابط تقييم Google Maps</Label>
          <Input id="gurl" value={gUrl} onChange={(e) => setGUrl(e.target.value)} placeholder="https://g.page/r/..." dir="ltr" />
        </div>

        <div className="pt-4">
          <Button onClick={onSave} disabled={saving} className="w-full sm:w-auto">
            {saving && <Loader2 className="w-4 h-4 ml-2 animate-spin" />}
            حفظ التغييرات
          </Button>
        </div>
      </div>
    </div>
  );
}
