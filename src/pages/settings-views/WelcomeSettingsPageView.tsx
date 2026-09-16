import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Loader2, Sparkles, X, Plus as PlusIcon, Image as ImageIcon, Video as VideoIcon, Upload } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useServerFn } from "@tanstack/react-start";
import { getSplashSettings, updateSplashSettings } from "@/lib/settings.functions";



type SplashFeature = { icon: string; text: string };

async function getServerAuthHeaders() {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error("الجلسة منتهية، سجّل دخولك من جديد");
  return { Authorization: `Bearer ${token}` };
}

export function WelcomeSettingsPageView() {
  const getSplashFn = useServerFn(getSplashSettings);
  const updateSplashFn = useServerFn(updateSplashSettings);

  const [splashLoaded, setSplashLoaded] = useState(false);
  const [splashSaving, setSplashSaving] = useState(false);
  const [splashEnabled, setSplashEnabled] = useState(true);
  const [splashAlwaysShow, setSplashAlwaysShow] = useState(false);
  const [coverType, setCoverType] = useState<"image" | "video">("image");
  const [coverImageUrl, setCoverImageUrl] = useState<string | null>(null);
  const [coverVideoUrl, setCoverVideoUrl] = useState<string | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [tagline, setTagline] = useState("");
  const [splashDescription, setSplashDescription] = useState("");
  const [splashFeatures, setSplashFeatures] = useState<SplashFeature[]>([]);
  const [newFeatureIcon, setNewFeatureIcon] = useState("Sparkles");
  const [newFeatureText, setNewFeatureText] = useState("");
  const [instagramUrl, setInstagramUrl] = useState("");
  const [facebookUrl, setFacebookUrl] = useState("");
  const [whatsappNumber, setWhatsappNumber] = useState("");
  const [brandColor, setBrandColor] = useState("#7c5cff");
  const coverFileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    (async () => {
      try {
        const headers = await getServerAuthHeaders();
        const sp = await getSplashFn({ headers });
        setSplashEnabled(sp.splash_enabled ?? true);
        setSplashAlwaysShow(sp.splash_always_show ?? false);
        setCoverType((sp.cover_type as "image" | "video") || "image");
        setCoverImageUrl(sp.cover_image_url);
        setCoverVideoUrl(sp.cover_video_url);
        setCoverPreview(sp.cover_type === "video" ? sp.cover_video_url : sp.cover_image_url);
        setTagline(sp.tagline ?? "");
        setSplashDescription(sp.splash_description ?? "");
        setSplashFeatures(sp.features ?? []);
        setInstagramUrl(sp.instagram_url ?? "");
        setFacebookUrl(sp.facebook_url ?? "");
        setWhatsappNumber(sp.whatsapp_number ?? "");
        setBrandColor(sp.brand_color || "#7c5cff");
      } catch {
        // ignore if not found
      } finally {
        setSplashLoaded(true);
      }
    })();
  }, []);

  function onPickCover(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    const isVideo = f.type.startsWith("video/");
    const isImage = f.type.startsWith("image/");
    if (!isVideo && !isImage) return toast.error("صورة أو فيديو فقط");
    if (f.size > 25 * 1024 * 1024) return toast.error("الحجم الأقصى 25MB");
    
    setCoverFile(f);
    setCoverType(isVideo ? "video" : "image");
    setCoverPreview(URL.createObjectURL(f));
  }

  function addFeature() {
    const text = newFeatureText.trim();
    if (!text) return;
    if (splashFeatures.length >= 8) return toast.error("الحد الأقصى 8 مميزات");
    setSplashFeatures([...splashFeatures, { icon: newFeatureIcon || "Sparkles", text }]);
    setNewFeatureText("");
  }

  function removeFeature(idx: number) {
    setSplashFeatures(splashFeatures.filter((_, i) => i !== idx));
  }

  async function onSaveSplash() {
    setSplashSaving(true);
    try {
      let upload: { name: string; type: string; base64: string } | null = null;
      if (coverFile) {
        const base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve((reader.result as string).split(",")[1] ?? "");
          reader.onerror = () => reject(reader.error);
          reader.readAsDataURL(coverFile);
        });
        upload = {
          name: coverFile.name,
          type: coverFile.type || (coverType === "video" ? "video/mp4" : "image/jpeg"),
          base64,
        };
      }
      const headers = await getServerAuthHeaders();
      const res = await updateSplashFn({
        data: {
          splash_enabled: splashEnabled,
          splash_always_show: splashAlwaysShow,
          cover_type: coverType,
          cover_image_url: coverImageUrl,
          cover_video_url: coverVideoUrl,
          cover_upload: upload,
          tagline: tagline.trim() || null,
          splash_description: splashDescription.trim() || null,
          features: splashFeatures,
          instagram_url: instagramUrl.trim() || null,
          facebook_url: facebookUrl.trim() || null,
          whatsapp_number: whatsappNumber.trim() || null,
          brand_color: brandColor || null,
        },
        headers,
      });
      if (res?.cover_image_url !== undefined) setCoverImageUrl(res.cover_image_url);
      if (res?.cover_video_url !== undefined) setCoverVideoUrl(res.cover_video_url);
      setCoverFile(null);
      toast.success("تم حفظ صفحة الترحيب");
    } catch (e) {
      toast.error((e as Error).message || "فشل الحفظ");
    } finally {
      setSplashSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 mb-6">
        <Sparkles className="w-6 h-6 text-primary" />
        <h2 className="text-xl font-bold">صفحة الترحيب (Splash)</h2>
        {!splashLoaded && <Loader2 className="w-4 h-4 animate-spin text-primary" />}
      </div>

      <div className="glass shadow-glass rounded-2xl border border-border/60 p-6 space-y-5">
        <p className="text-sm text-muted-foreground">أول ما يراه العميل عند مسح QR. تظهر مرة واحدة كل 24 ساعة افتراضياً.</p>

        <div className="space-y-3 rounded-xl border bg-muted/30 p-4">
          <label className="flex items-start justify-between gap-4 cursor-pointer">
            <div className="space-y-0.5">
              <div className="font-semibold">تفعيل صفحة الترحيب</div>
              <p className="text-xs text-muted-foreground">إذا أوقفتها، سيدخل العميل مباشرة إلى المنيو.</p>
            </div>
            <input type="checkbox" className="mt-1 h-5 w-5 accent-primary" checked={splashEnabled} onChange={(e) => setSplashEnabled(e.target.checked)} />
          </label>
          <label className={`flex items-start justify-between gap-4 cursor-pointer ${!splashEnabled ? "opacity-50" : ""}`}>
            <div className="space-y-0.5">
              <div className="font-semibold">إظهار الصفحة في كل زيارة</div>
              <p className="text-xs text-muted-foreground">تظهر للعميل في كل مرة يفتح فيها المنيو حتى خلال نفس اليوم.</p>
            </div>
            <input type="checkbox" className="mt-1 h-5 w-5 accent-primary" checked={splashAlwaysShow} disabled={!splashEnabled} onChange={(e) => setSplashAlwaysShow(e.target.checked)} />
          </label>
        </div>

        <div className="space-y-2">
          <Label>نوع الغلاف</Label>
          <div className="flex gap-2">
            <Button type="button" variant={coverType === "image" ? "default" : "outline"} onClick={() => setCoverType("image")} size="sm">
              <ImageIcon className="w-4 h-4 ml-2" /> صورة
            </Button>
            <Button type="button" variant={coverType === "video" ? "default" : "outline"} onClick={() => setCoverType("video")} size="sm">
              <VideoIcon className="w-4 h-4 ml-2" /> فيديو
            </Button>
          </div>
        </div>

        <div className="space-y-2">
          <Label>{coverType === "video" ? "فيديو الغلاف" : "صورة الغلاف"}</Label>
          <div className="flex items-center gap-4">
            <div className="w-32 h-24 rounded-xl overflow-hidden bg-muted border flex items-center justify-center">
              {coverPreview ? (
                coverType === "video" ? <video src={coverPreview} muted className="w-full h-full object-cover" /> : <img src={coverPreview} alt="cover" className="w-full h-full object-cover" />
              ) : (
                <span className="text-xs text-muted-foreground">لا يوجد</span>
              )}
            </div>
            <div className="space-y-2">
              <input ref={coverFileRef} type="file" accept={coverType === "video" ? "video/*" : "image/*"} className="hidden" onChange={onPickCover} />
              <Button type="button" variant="outline" size="sm" onClick={() => coverFileRef.current?.click()}>
                <Upload className="w-4 h-4 ml-2" /> اختر ملف
              </Button>
              <p className="text-xs text-muted-foreground">حد أقصى 25MB</p>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <Label>لون العلامة (يحرّك الخلفية)</Label>
          <div className="flex items-center gap-3">
            <Input type="color" value={brandColor} onChange={(e) => setBrandColor(e.target.value)} className="h-10 w-14 p-1 cursor-pointer" />
            <Input value={brandColor} onChange={(e) => setBrandColor(e.target.value)} dir="ltr" className="font-mono" placeholder="#7c5cff" />
          </div>
        </div>

        <div className="space-y-2">
          <Label>الشعار القصير</Label>
          <Input value={tagline} onChange={(e) => setTagline(e.target.value)} placeholder="نكهة لا تُنسى" maxLength={140} />
        </div>

        <div className="space-y-2">
          <Label>وصف قصير</Label>
          <textarea value={splashDescription} onChange={(e) => setSplashDescription(e.target.value)} placeholder="عن المطعم..." maxLength={500} rows={3} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
        </div>

        <div className="space-y-2">
          <Label>المميزات (حد أقصى 8)</Label>
          <div className="flex flex-wrap gap-2">
            {splashFeatures.map((f, idx) => (
              <div key={idx} className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted text-sm border">
                <span className="text-xs text-muted-foreground">{f.icon}</span>
                <span>{f.text}</span>
                <button onClick={() => removeFeature(idx)} className="text-muted-foreground hover:text-destructive">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-[140px_1fr_auto] gap-2 pt-2">
            <Input value={newFeatureIcon} onChange={(e) => setNewFeatureIcon(e.target.value)} placeholder="Sparkles" dir="ltr" />
            <Input value={newFeatureText} onChange={(e) => setNewFeatureText(e.target.value)} placeholder="مثل: حلال 100%" maxLength={80} onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addFeature())} />
            <Button type="button" variant="outline" size="sm" onClick={addFeature}>
              <PlusIcon className="w-4 h-4 ml-1" /> إضافة
            </Button>
          </div>
        </div>

        <div className="space-y-3">
          <Label>روابط التواصل</Label>
          <div className="space-y-2">
            <Input value={instagramUrl} onChange={(e) => setInstagramUrl(e.target.value)} placeholder="https://instagram.com/..." dir="ltr" />
            <Input value={facebookUrl} onChange={(e) => setFacebookUrl(e.target.value)} placeholder="https://facebook.com/..." dir="ltr" />
            <Input value={whatsappNumber} onChange={(e) => setWhatsappNumber(e.target.value)} placeholder="213555..." dir="ltr" />
          </div>
        </div>

        <div className="pt-4">
          <Button onClick={onSaveSplash} disabled={splashSaving || !splashLoaded} className="w-full sm:w-auto">
            {splashSaving && <Loader2 className="w-4 h-4 ml-2 animate-spin" />} حفظ التغييرات
          </Button>
        </div>
      </div>
    </div>
  );
}
