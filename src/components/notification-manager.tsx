import { useEffect, useState } from "react";
import { initializeFCM, saveFCMToken, onForegroundMessage } from "@/lib/fcm";
import { useRestaurantId } from "@/lib/restaurant";
import { Bell, X, BellOff } from "lucide-react";
import { toast } from "sonner";

export default function NotificationManager() {
  const { restaurantId } = useRestaurantId();
  const [permission, setPermission] =
    useState<NotificationPermission>("default");
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    if (!restaurantId) return;
    setPermission(Notification.permission);
    if (Notification.permission === "default") {
      const timer = setTimeout(() => setShowPrompt(true), 5000);
      return () => clearTimeout(timer);
    }
    if (Notification.permission === "granted") {
      setupFCM();
    }
  }, [restaurantId]);

  useEffect(() => {
    const unsubscribe = onForegroundMessage((payload) => {
      toast(payload.title, { description: payload.body });
    });
    return unsubscribe;
  }, []);

  async function setupFCM() {
    const token = await initializeFCM();
    if (token && restaurantId) {
      await saveFCMToken(restaurantId, token);
    }
  }

  async function handleAllow() {
    setPermission("granted");
    setShowPrompt(false);
    await setupFCM();
  }

  function handleDismiss() {
    setShowPrompt(false);
  }

  if (!showPrompt || permission !== "default") return null;

  return (
    <div className="fixed top-4 left-4 right-4 z-50 animate-in slide-in-from-top-4">
      <div className="bg-card border border-border/60 rounded-2xl p-4 shadow-lg">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <Bell className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-sm">تفعيل الإشعارات</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              تلقى إشعارات فورية للطلبات الجديدة والتنبيهات
            </p>
            <div className="flex gap-2 mt-3">
              <button
                onClick={handleAllow}
                className="px-4 py-1.5 bg-primary text-primary-foreground rounded-lg text-xs font-medium"
              >
                تفعيل
              </button>
              <button
                onClick={handleDismiss}
                className="px-4 py-1.5 text-muted-foreground text-xs hover:text-foreground"
              >
                لاحقاً
              </button>
            </div>
          </div>
          <button
            onClick={handleDismiss}
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
