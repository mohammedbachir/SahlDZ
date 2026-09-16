import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2, ShoppingBag, Power, Copy, RefreshCw, QrCode, Upload } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useServerFn } from "@tanstack/react-start";
import {
  getTakeawayStatus, enableTakeaway, disableTakeaway, regenerateTakeawayToken,
} from "@/lib/takeaway.functions";



async function getServerAuthHeaders() {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error("الجلسة منتهية، سجّل دخولك من جديد");
  return { Authorization: `Bearer ${token}` };
}

export function TakeawaySettingsPageView() {
  const getTakeawayStatusFn = useServerFn(getTakeawayStatus);
  const enableTakeawayFn = useServerFn(enableTakeaway);
  const disableTakeawayFn = useServerFn(disableTakeaway);
  const regenTakeawayFn = useServerFn(regenerateTakeawayToken);

  const [loading, setLoading] = useState(true);
  const [takeawayEnabled, setTakeawayEnabled] = useState(false);
  const [takeawayToken, setTakeawayToken] = useState<string | null>(null);
  const [takeawayBusy, setTakeawayBusy] = useState(false);
  const [confirmDisableTakeaway, setConfirmDisableTakeaway] = useState(false);
  const [restaurantName, setRestaurantName] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const headers = await getServerAuthHeaders();
        const ts = await getTakeawayStatusFn({ headers });
        setTakeawayEnabled(!!ts.enabled);
        setTakeawayToken(ts.token ?? null);
        
        const { data: u } = await supabase.auth.getUser();
        if (u.user) {
          const { data: rest } = await supabase.from("restaurants").select("name").eq("owner_id", u.user.id).single();
          if (rest) setRestaurantName(rest.name);
        }
      } catch (e) {
        // ignore
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function onEnableTakeaway() {
    setTakeawayBusy(true);
    try {
      const headers = await getServerAuthHeaders();
      const res = await enableTakeawayFn({ headers });
      setTakeawayEnabled(true);
      setTakeawayToken(res.token);
      toast.success("تم تفعيل الطلب السريع");
    } catch (e) {
      toast.error((e as Error).message || "فشل التفعيل");
    } finally {
      setTakeawayBusy(false);
    }
  }

  async function onDisableTakeaway() {
    setTakeawayBusy(true);
    try {
      const headers = await getServerAuthHeaders();
      await disableTakeawayFn({ headers });
      setTakeawayEnabled(false);
      setConfirmDisableTakeaway(false);
      toast.success("تم تعطيل الطلب السريع");
    } catch (e) {
      toast.error((e as Error).message || "فشل التعطيل");
    } finally {
      setTakeawayBusy(false);
    }
  }

  async function onRegenTakeaway() {
    setTakeawayBusy(true);
    try {
      const headers = await getServerAuthHeaders();
      const res = await regenTakeawayFn({ headers });
      setTakeawayToken(res.token);
      setTakeawayEnabled(true);
      toast.success("تم توليد رابط جديد");
    } catch (e) {
      toast.error((e as Error).message || "فشل التوليد");
    } finally {
      setTakeawayBusy(false);
    }
  }

  const takeawayUrl = typeof window !== "undefined" && takeawayToken
    ? `${window.location.origin}/t/${takeawayToken}`
    : "";
  const takeawayQrUrl = takeawayUrl
    ? `https://api.qrserver.com/v1/create-qr-code/?size=320x320&margin=10&data=${encodeURIComponent(takeawayUrl)}`
    : "";

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 mb-6">
        <ShoppingBag className="w-6 h-6 text-primary" />
        <h2 className="text-xl font-bold">الطلب السريع عبر QR (Takeaway)</h2>
      </div>

      <div className="glass shadow-glass rounded-2xl border border-border/60 p-6 space-y-4">
        <p className="text-sm text-muted-foreground leading-relaxed">
          ضع رمز QR على طاولة الكاشير. العميل يمسح الرمز، يطلب الأكل، يدخل اسمه ورقمه، ويأخذ رمز طلبه (مثلاً <span className="font-mono font-bold text-foreground">007</span>) لمتابعته. الرمز يُعاد ترقيمه تلقائياً كل يوم الساعة 6 صباحاً.
        </p>

        {takeawayEnabled ? (
          <>
            <div className="rounded-xl bg-green-50 border border-green-200 p-3 flex items-center gap-2 text-sm text-green-800">
              <Power className="w-4 h-4" /> الطلب السريع مفعّل
            </div>

            {takeawayQrUrl && (
              <div className="flex flex-col items-center gap-4 rounded-xl border bg-card p-6 shadow-sm">
                <div className="bg-white p-2 rounded-xl">
                  <img src={takeawayQrUrl} alt="QR للطلب السريع" className="w-48 h-48 object-contain" />
                </div>
                <div className="flex flex-wrap justify-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => {
                    const w = window.open("", "_blank");
                    if (w) {
                      w.document.write(
                        `<html dir="rtl"><head><title>QR الطلب السريع</title></head><body style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100vh;font-family:sans-serif;margin:0;background:#f8f9fa;"><h2>${restaurantName || "اطلب من هنا"}</h2><div style="background:white;padding:20px;border-radius:16px;box-shadow:0 4px 12px rgba(0,0,0,0.1);"><img src="${takeawayQrUrl.replace("320x320", "600x600")}" style="width:400px;height:400px;"/></div><p style="font-size:18px;color:#555;margin-top:20px;font-weight:bold;">امسح الرمز للطلب السريع</p><script>window.onload=()=>setTimeout(()=>window.print(),300)</script></body></html>`,
                      );
                      w.document.close();
                    }
                  }}>
                    <QrCode className="w-4 h-4 ms-2" /> طباعة الرمز
                  </Button>
                  <a href={takeawayQrUrl.replace("320x320", "800x800")} download="takeaway-qr.png">
                    <Button variant="outline" size="sm">
                      <Upload className="w-4 h-4 ms-2 rotate-180" /> تنزيل الصورة
                    </Button>
                  </a>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label>الرابط</Label>
              <div className="flex gap-2">
                <Input value={takeawayUrl} readOnly dir="ltr" className="font-mono text-xs bg-muted/50" />
                <Button variant="outline" size="icon" onClick={() => {
                  if (takeawayUrl) {
                    navigator.clipboard.writeText(takeawayUrl);
                    toast.success("تم نسخ الرابط");
                  }
                }} aria-label="copy">
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 pt-4 border-t border-border/50">
              <Button variant="outline" onClick={onRegenTakeaway} disabled={takeawayBusy}>
                {takeawayBusy ? <Loader2 className="w-4 h-4 animate-spin ms-2" /> : <RefreshCw className="w-4 h-4 ms-2" />}
                توليد رابط جديد
              </Button>
              <Button variant="outline" onClick={() => setConfirmDisableTakeaway(true)} className="border-red-300 text-red-700 hover:bg-red-50 hover:text-red-800">
                <Power className="w-4 h-4 ms-2" />
                تعطيل النظام
              </Button>
            </div>
          </>
        ) : (
          <div className="pt-2">
            <Button onClick={onEnableTakeaway} disabled={takeawayBusy} className="w-full sm:w-auto">
              {takeawayBusy ? <Loader2 className="w-4 h-4 animate-spin ms-2" /> : <ShoppingBag className="w-4 h-4 ms-2" />}
              تفعيل الطلب السريع
            </Button>
          </div>
        )}
      </div>

      <Dialog open={confirmDisableTakeaway} onOpenChange={setConfirmDisableTakeaway}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>تعطيل الطلب السريع؟</DialogTitle>
            <DialogDescription>
              لن يتمكن العملاء من المسح والطلب حتى تعيد التفعيل.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDisableTakeaway(false)}>إلغاء</Button>
            <Button className="bg-red-600 hover:bg-red-700 text-white" onClick={onDisableTakeaway}>تعطيل</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
