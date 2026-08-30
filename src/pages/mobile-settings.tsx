import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useRestaurantId } from "@/lib/restaurant";
import { getFirebaseDb } from "@/integrations/firebase/config";
import { initializeFCM, saveFCMToken } from "@/lib/fcm";
import { Settings, Bell, BellOff, LogOut, Store, User } from "lucide-react";

export default function MobileSettings() {
  const { restaurantId, loading: rLoading } = useRestaurantId();
  const [email, setEmail] = useState("المدير");
  const [restaurantName, setRestaurantName] = useState<string | null>(null);
  const [ownerContact, setOwnerContact] = useState<{
    owner_name?: string | null;
    owner_email?: string | null;
    owner_phone?: string | null;
    whatsapp_number?: string | null;
  } | null>(null);
  const [notifStatus, setNotifStatus] = useState<"unknown" | "enabled" | "off">(
    "unknown",
  );
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!getFirebaseDb()) {
      setEmail(
        localStorage.getItem("sahl_dz_preview_uid") ? "وضع المعاينة" : "المدير",
      );
      return;
    }
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (data.user?.email) setEmail(data.user.email);
    })();
  }, []);

  useEffect(() => {
    if (!restaurantId || !getFirebaseDb()) return;
    (async () => {
      const { data } = await supabase
        .from("restaurants")
        .select("name")
        .eq("id", restaurantId)
        .maybeSingle();
      if (data) setRestaurantName(data.name);
      const { data: contact } = await supabase
        .from("restaurants")
        .select("owner_name,owner_email,owner_phone,whatsapp_number")
        .eq("id", restaurantId)
        .maybeSingle();
      if (contact) setOwnerContact(contact);
    })();
  }, [restaurantId]);

  useEffect(() => {
    if (typeof Notification === "undefined") return;
    setNotifStatus(Notification.permission === "granted" ? "enabled" : "off");
  }, []);

  async function enableNotifications() {
    setBusy(true);
    try {
      const token = await initializeFCM();
      if (token && restaurantId) {
        await saveFCMToken(restaurantId, token);
        setNotifStatus("enabled");
      }
    } catch {
      /* silent */
    }
    setBusy(false);
  }

  async function handleLogout() {
    try {
      if (getFirebaseDb()) {
        await supabase.auth.signOut();
      }
    } catch {
      /* silent */
    }
    localStorage.removeItem("sahl_dz_preview_uid");
    localStorage.removeItem("sahl_dz_preview_role");
    localStorage.removeItem("sahl_dz_auth_cache");
    localStorage.removeItem("sahl_dz_restaurant");
    window.location.href = "/mobile/login";
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[var(--background)] to-[var(--muted)]/30 p-4 pb-24">
      <div className="flex items-center gap-2 mb-6">
        <Settings className="w-6 h-6 text-[var(--primary)]" />
        <h1 className="text-2xl font-bold">الإعدادات</h1>
      </div>

      <div className="space-y-3">
        <div className="rounded-2xl border border-border/60 bg-card p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Store className="w-5 h-5 text-[var(--primary)]" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs text-muted-foreground">المطعم</div>
              <div className="font-semibold text-sm truncate">
                {rLoading ? "..." : restaurantName || "مطعم السهل"}
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-border/60 bg-card p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <User className="w-5 h-5 text-[var(--primary)]" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs text-muted-foreground">الحساب</div>
              <div className="font-semibold text-sm truncate" dir="ltr">
                {email}
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-border/60 bg-card p-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Store className="w-5 h-5 text-[var(--primary)]" />
            </div>
            <div>
              <div className="font-semibold text-sm">بيانات مُدير المطعم</div>
              <div className="text-xs text-muted-foreground mt-0.5">
                يستخدمها فريق سهل للتواصل معك حول القُدرات والعروض — تُستخدم فقط
                بموافقتك
              </div>
            </div>
          </div>
          <div className="text-sm space-y-1.5 pt-1">
            <div className="flex justify-between gap-3">
              <span className="text-muted-foreground text-xs pt-0.5">
                الاسم
              </span>
              <span className="truncate">
                {ownerContact?.owner_name || "—"}
              </span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-muted-foreground text-xs pt-0.5">
                البريد
              </span>
              <span className="truncate" dir="ltr">
                {ownerContact?.owner_email || "—"}
              </span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-muted-foreground text-xs pt-0.5">
                الهاتف
              </span>
              <span className="truncate" dir="ltr">
                {ownerContact?.owner_phone || "—"}
              </span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-muted-foreground text-xs pt-0.5">
                واتساب
              </span>
              <span className="truncate" dir="ltr">
                {ownerContact?.whatsapp_number || "—"}
              </span>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-border/60 bg-card p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              {notifStatus === "enabled" ? (
                <Bell className="w-5 h-5 text-[var(--primary)]" />
              ) : (
                <BellOff className="w-5 h-5 text-muted-foreground" />
              )}
            </div>
            <div className="flex-1">
              <div className="font-semibold text-sm">الإشعارات الحية</div>
              <div className="text-xs text-muted-foreground mt-0.5">
                {notifStatus === "enabled"
                  ? "الإشعارات مفعّلة — ستصل تحديثات المبيعات فورياً"
                  : "الإشعارات غير مفعّلة"}
              </div>
            </div>
          </div>
          {notifStatus !== "enabled" && (
            <button
              onClick={enableNotifications}
              disabled={busy}
              className="w-full py-2.5 rounded-xl text-sm font-medium bg-[var(--primary)] text-white disabled:opacity-50 transition-opacity"
            >
              {busy ? "جارٍ التفعيل..." : "تفعيل الإشعارات"}
            </button>
          )}
        </div>

        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl border border-destructive/40 bg-destructive/10 text-destructive text-sm font-semibold"
        >
          <LogOut className="w-5 h-5" />
          تسجيل الخروج
        </button>
      </div>
    </div>
  );
}
