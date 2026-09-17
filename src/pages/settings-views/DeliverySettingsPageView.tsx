import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2, Bike, Power, Copy, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useServerFn } from "@tanstack/react-start";
import {
  getDeliveryStatus, enableDelivery, disableDelivery, regenerateDeliveryToken,
} from "@/lib/delivery.functions";



async function getServerAuthHeaders() {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error("الجلسة منتهية، سجّل دخولك من جديد");
  return { Authorization: `Bearer ${token}` };
}

export function DeliverySettingsPageView() {
  const getDeliveryStatusFn = useServerFn(getDeliveryStatus);
  const enableDeliveryFn = useServerFn(enableDelivery);
  const disableDeliveryFn = useServerFn(disableDelivery);
  const regenDeliveryFn = useServerFn(regenerateDeliveryToken);

  const [loading, setLoading] = useState(true);
  const [deliveryEnabled, setDeliveryEnabled] = useState(false);
  const [deliveryToken, setDeliveryToken] = useState<string | null>(null);
  const [deliveryBusy, setDeliveryBusy] = useState(false);
  const [confirmDisableDelivery, setConfirmDisableDelivery] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const headers = await getServerAuthHeaders();
        const ds = await getDeliveryStatusFn({ headers });
        setDeliveryEnabled(!!ds.enabled);
        setDeliveryToken(ds.token ?? null);
      } catch (e) {
        // ignore
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function onEnableDelivery() {
    setDeliveryBusy(true);
    try {
      const headers = await getServerAuthHeaders();
      const res = await enableDeliveryFn({ headers });
      setDeliveryEnabled(true);
      setDeliveryToken(res.token);
      toast.success("تم تفعيل نظام التوصيل");
    } catch (e) {
      toast.error((e as Error).message || "فشل التفعيل");
    } finally {
      setDeliveryBusy(false);
    }
  }

  async function onDisableDelivery() {
    setDeliveryBusy(true);
    try {
      const headers = await getServerAuthHeaders();
      await disableDeliveryFn({ headers });
      setDeliveryEnabled(false);
      setConfirmDisableDelivery(false);
      toast.success("تم تعطيل نظام التوصيل");
    } catch (e) {
      toast.error((e as Error).message || "فشل التعطيل");
    } finally {
      setDeliveryBusy(false);
    }
  }

  async function onRegenDelivery() {
    setDeliveryBusy(true);
    try {
      const headers = await getServerAuthHeaders();
      const res = await regenDeliveryFn({ headers });
      setDeliveryToken(res.token);
      setDeliveryEnabled(true);
      toast.success("تم توليد رابط جديد");
    } catch (e) {
      toast.error((e as Error).message || "فشل التوليد");
    } finally {
      setDeliveryBusy(false);
    }
  }

  const deliveryUrl = typeof window !== "undefined" && deliveryToken
    ? `${window.location.origin}/d/${deliveryToken}`
    : "";

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 mb-6">
        <Bike className="w-6 h-6 text-primary" />
        <h2 className="text-xl font-bold">نظام التوصيل (Delivery)</h2>
      </div>

      <div className="bg-card border border-border rounded-xl p-6 space-y-4">
        <p className="text-sm text-muted-foreground leading-relaxed">
          فعّل رابطًا مخصصًا للطلب من البيت — انسخه وضعه في Bio على Instagram أو شاركه عبر WhatsApp. سيظهر الطلب لدى الطباخ مع اسم العميل ورقم الهاتف وعنوان التوصيل.
        </p>

        {deliveryEnabled ? (
          <>
            <div className="rounded-xl bg-green-50 border border-green-200 p-3 flex items-center gap-2 text-sm text-green-800">
              <Power className="w-4 h-4" /> نظام التوصيل مفعّل
            </div>

            <div className="space-y-2">
              <Label>رابط التوصيل المخصص</Label>
              <div className="flex gap-2">
                <Input value={deliveryUrl} readOnly dir="ltr" className="font-mono text-xs bg-muted/50" />
                <Button variant="outline" size="icon" onClick={() => {
                  if (deliveryUrl) {
                    navigator.clipboard.writeText(deliveryUrl);
                    toast.success("تم نسخ الرابط");
                  }
                }} aria-label="copy">
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-1">ضع هذا الرابط في الـ Bio على Instagram أو شاركه مع زبائنك.</p>
            </div>

            <div className="flex flex-wrap gap-2 pt-4 border-t border-border/50">
              <Button variant="outline" onClick={onRegenDelivery} disabled={deliveryBusy}>
                {deliveryBusy ? <Loader2 className="w-4 h-4 animate-spin ms-2" /> : <RefreshCw className="w-4 h-4 ms-2" />}
                توليد رابط جديد
              </Button>
              <Button variant="outline" onClick={() => setConfirmDisableDelivery(true)} className="border-red-300 text-red-700 hover:bg-red-50 hover:text-red-800">
                <Power className="w-4 h-4 ms-2" />
                تعطيل النظام
              </Button>
            </div>
          </>
        ) : (
          <div className="pt-2">
            <Button onClick={onEnableDelivery} disabled={deliveryBusy} className="w-full sm:w-auto">
              {deliveryBusy ? <Loader2 className="w-4 h-4 animate-spin ms-2" /> : <Bike className="w-4 h-4 ms-2" />}
              تفعيل نظام التوصيل
            </Button>
          </div>
        )}
      </div>

      <Dialog open={confirmDisableDelivery} onOpenChange={setConfirmDisableDelivery}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>تعطيل التوصيل؟</DialogTitle>
            <DialogDescription>
              الرابط الحالي سيتوقف عن العمل ولن يتمكن العملاء من الطلب من المنزل.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDisableDelivery(false)}>إلغاء</Button>
            <Button className="bg-red-600 hover:bg-red-700 text-white" onClick={onDisableDelivery}>تعطيل</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
