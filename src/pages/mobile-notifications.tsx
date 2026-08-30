import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useRestaurantId } from "@/lib/restaurant";
import { getFirebaseDb } from "@/integrations/firebase/config";
import {
  Bell,
  AlertTriangle,
  ShoppingBag,
  MessageSquare,
  Package,
  CheckCircle2,
  Trash2,
} from "lucide-react";

type Notification = {
  id: string;
  type: "low_stock" | "new_order" | "complaint" | "waste" | "delivery";
  title: string;
  body: string;
  read: boolean;
  created_at: string;
};

const ICON_MAP: Record<string, typeof Bell> = {
  low_stock: Package,
  new_order: ShoppingBag,
  complaint: MessageSquare,
  waste: AlertTriangle,
  delivery: AlertTriangle,
};

const COLOR_MAP: Record<string, string> = {
  low_stock: "text-red-500 bg-red-50",
  new_order: "text-blue-500 bg-blue-50",
  complaint: "text-orange-500 bg-orange-50",
  waste: "text-rose-500 bg-rose-50",
  delivery: "text-purple-500 bg-purple-50",
};

export default function MobileNotifications() {
  const { restaurantId, loading: rLoading } = useRestaurantId();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const prevDataRef = useRef<string>("");

  useEffect(() => {
    if (!restaurantId || !getFirebaseDb()) {
      setLoading(false);
      return;
    }
    loadNotifications(restaurantId);
    const iv = setInterval(() => loadNotifications(restaurantId), 15000);
    return () => clearInterval(iv);
  }, [restaurantId]);

  async function loadNotifications(rid: string) {
    const now = new Date();
    const hourAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const hourAgoStr = hourAgo.toISOString();

    const [ordersRes, ingredientsRes, complaintsRes, wasteRes] = await Promise.all([
      supabase
        .from("orders")
        .select("id,status,total,order_type,customer_name,created_at")
        .eq("restaurant_id", rid)
        .gte("created_at", hourAgoStr)
        .order("created_at", { ascending: false })
        .limit(20),
      supabase
        .from("ingredients")
        .select("id,name,current_stock,alert_threshold,unit")
        .eq("restaurant_id", rid),
      supabase
        .from("complaints")
        .select("id,title,status,severity,created_at")
        .eq("restaurant_id", rid)
        .order("created_at", { ascending: false })
        .limit(10),
      supabase
        .from("waste_logs")
        .select("id,quantity,reason,cost,created_at")
        .eq("restaurant_id", rid)
        .gte("created_at", hourAgoStr)
        .order("created_at", { ascending: false })
        .limit(10),
    ]);

    const notifs: Notification[] = [];

    // Low stock alerts
    const ingredients = (ingredientsRes.data ?? []) as any[];
    const lowStock = ingredients.filter(
      (i) => Number(i.current_stock) < Number(i.alert_threshold)
    );
    for (const i of lowStock.slice(0, 5)) {
      notifs.push({
        id: `stock-${i.id}`,
        type: "low_stock",
        title: `مخزون ناقص: ${i.name}`,
        body: `المخزون: ${i.current_stock} ${i.unit} (الحد الأدنى: ${i.alert_threshold})`,
        read: false,
        created_at: new Date().toISOString(),
      });
    }

    // New orders
    const orders = (ordersRes.data ?? []) as any[];
    for (const o of orders.slice(0, 10)) {
      const typeLabel =
        o.order_type === "delivery"
          ? "توصيل"
          : o.order_type === "takeaway"
          ? "تيك أواي"
          : "صالة";
      notifs.push({
        id: `order-${o.id}`,
        type: o.order_type === "delivery" ? "delivery" : "new_order",
        title: `طلب ${typeLabel} — ${Number(o.total).toLocaleString("ar-DZ")} دج`,
        body:
          o.status === "new"
            ? "جديد — في الانتظار"
            : o.status === "preparing"
            ? "قيد التحضير"
            : o.status === "ready"
            ? "جاهز للتقديم"
            : "مدفوع",
        read: o.status === "paid",
        created_at: o.created_at,
      });
    }

    // Complaints
    const complaints = (complaintsRes.data ?? []) as any[];
    for (const c of complaints.slice(0, 5)) {
      notifs.push({
        id: `complaint-${c.id}`,
        type: "complaint",
        title: `شكوى: ${c.title}`,
        body: `الحالة: ${c.status} | الخطورة: ${c.severity}`,
        read: c.status === "resolved",
        created_at: c.created_at,
      });
    }

    // Waste
    const waste = (wasteRes.data ?? []) as any[];
    for (const w of waste.slice(0, 5)) {
      notifs.push({
        id: `waste-${w.id}`,
        type: "waste",
        title: `هدر: ${w.reason}`,
        body: `الكمية: ${w.quantity} | التكلفة: ${Number(w.cost).toLocaleString("ar-DZ")} دج`,
        read: false,
        created_at: w.created_at,
      });
    }

    // Sort by date
    notifs.sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    // Check if data changed
    const dataStr = JSON.stringify(notifs.map((n) => n.id));
    if (dataStr !== prevDataRef.current) {
      setNotifications(notifs);
      prevDataRef.current = dataStr;
    }
    setLoading(false);
  }

  function markAllRead() {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }

  function clearAll() {
    setNotifications([]);
  }

  const unreadCount = notifications.filter((n) => !n.read).length;

  if (rLoading || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[var(--background)] to-[var(--muted)]/30 p-4">
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-20 rounded-2xl bg-[var(--muted)]/20 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[var(--background)] to-[var(--muted)]/30 p-4 pb-24">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Bell className="w-6 h-6" />
            الإشعارات
            {unreadCount > 0 && (
              <span className="text-sm bg-red-500 text-white rounded-full px-2 py-0.5">
                {unreadCount}
              </span>
            )}
          </h1>
          <p className="text-sm text-muted-foreground">
            {notifications.length} إشعار — آخر 24 ساعة
          </p>
        </div>
        <div className="flex gap-2">
          {unreadCount > 0 && (
            <button
              onClick={markAllRead}
              className="text-xs text-primary hover:underline"
            >
              قراءة الكل
            </button>
          )}
          {notifications.length > 0 && (
            <button
              onClick={clearAll}
              className="text-xs text-destructive hover:underline"
            >
              مسح
            </button>
          )}
        </div>
      </div>

      {/* Notifications List */}
      {notifications.length === 0 ? (
        <div className="text-center py-16">
          <CheckCircle2 className="w-16 h-16 mx-auto text-green-500 mb-4" />
          <h2 className="text-xl font-bold mb-2">لا إشعارات</h2>
          <p className="text-muted-foreground">كل شيء يعمل بشكل طبيعي</p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map((n) => {
            const Icon = ICON_MAP[n.type] || Bell;
            const colorClass = COLOR_MAP[n.type] || "text-gray-500 bg-gray-50";
            return (
              <div
                key={n.id}
                className={`rounded-2xl border p-4 transition-all ${
                  n.read
                    ? "border-border/40 bg-card/60 opacity-60"
                    : "border-border/60 bg-card shadow-sm"
                }`}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${colorClass}`}
                  >
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-sm truncate">{n.title}</h3>
                      {!n.read && (
                        <div className="w-2 h-2 rounded-full bg-blue-500 shrink-0" />
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{n.body}</p>
                    <p className="text-xs text-muted-foreground/60 mt-1">
                      {new Date(n.created_at).toLocaleString("ar-DZ", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
