import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useRestaurantId, formatDZD } from "@/lib/restaurant";
import { getFirebaseDb } from "@/integrations/firebase/config";
import {
  Calendar,
  TrendingUp,
  ShoppingBag,
  Package,
  Truck,
  AlertTriangle,
  MessageSquare,
  Clock,
  DollarSign,
  Utensils,
  RefreshCw,
  FileText,
} from "lucide-react";

type DailyReport = {
  date: string;
  totalOrders: number;
  paidOrders: number;
  pendingOrders: number;
  totalRevenue: number;
  paidRevenue: number;
  averageOrder: number;
  dineIn: { count: number; revenue: number };
  takeaway: { count: number; revenue: number };
  delivery: { count: number; revenue: number };
  lowStockItems: { name: string; current: number; threshold: number; unit: string }[];
  openComplaints: number;
  wasteToday: number;
  topItems: { name: string; count: number }[];
  hourlyBreakdown: { hour: string; count: number; revenue: number }[];
};

export default function MobileDailySummary() {
  const { restaurantId, loading: rLoading } = useRestaurantId();
  const [report, setReport] = useState<DailyReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const prevReportRef = useRef<string>("");

  useEffect(() => {
    if (!restaurantId || !getFirebaseDb()) {
      setLoading(false);
      return;
    }
    loadReport(restaurantId);
    const iv = setInterval(() => loadReport(restaurantId), 60000);
    return () => clearInterval(iv);
  }, [restaurantId]);

  async function loadReport(rid: string) {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startStr = startOfDay.toISOString();
    const endStr = now.toISOString();

    const [ordersRes, ingredientsRes, complaintsRes, wasteRes, itemsRes] =
      await Promise.all([
        supabase
          .from("orders")
          .select("id,total,order_type,status,created_at,items")
          .eq("restaurant_id", rid)
          .gte("created_at", startStr)
          .lte("created_at", endStr),
        supabase
          .from("ingredients")
          .select("id,name,current_stock,alert_threshold,unit")
          .eq("restaurant_id", rid),
        supabase
          .from("complaints")
          .select("id,title,status,severity,created_at")
          .eq("restaurant_id", rid)
          .eq("status", "open"),
        supabase
          .from("waste_logs")
          .select("id,quantity,created_at")
          .eq("restaurant_id", rid)
          .gte("created_at", startStr)
          .lte("created_at", endStr),
        supabase
          .from("menu_items")
          .select("id,name,category_id")
          .eq("restaurant_id", rid),
      ]);

    const orders = (ordersRes.data ?? []) as any[];
    const ingredients = (ingredientsRes.data ?? []) as any[];
    const complaints = (complaintsRes.data ?? []) as any[];
    const waste = (wasteRes.data ?? []) as any[];
    const menuItems = (itemsRes.data ?? []) as any[];

    // Calculate metrics
    const totalOrders = orders.length;
    const paidOrders = orders.filter((o) => o.status === "paid");
    const pendingOrders = orders.filter(
      (o) => o.status === "new" || o.status === "preparing"
    );
    const totalRevenue = orders.reduce(
      (sum, o) => sum + ((o.total as number) ?? 0),
      0
    );
    const paidRevenue = paidOrders.reduce(
      (sum, o) => sum + ((o.total as number) ?? 0),
      0
    );

    // By type
    const byType: Record<string, { count: number; revenue: number }> = {
      dine_in: { count: 0, revenue: 0 },
      takeaway: { count: 0, revenue: 0 },
      delivery: { count: 0, revenue: 0 },
    };
    for (const o of paidOrders) {
      const t = (o.order_type as string) ?? "dine_in";
      if (!byType[t]) byType[t] = { count: 0, revenue: 0 };
      byType[t].count++;
      byType[t].revenue += (o.total as number) ?? 0;
    }

    // Low stock
    const lowStockItems = ingredients
      .filter((i) => i.current_stock <= i.alert_threshold)
      .map((i) => ({
        name: i.name,
        current: i.current_stock,
        threshold: i.alert_threshold,
        unit: i.unit,
      }));

    // Top items
    const itemCounts: Record<string, number> = {};
    for (const o of orders) {
      if (o.items && Array.isArray(o.items)) {
        for (const item of o.items) {
          const name = item.name ?? item.menu_item_name ?? "";
          if (name) itemCounts[name] = (itemCounts[name] ?? 0) + (item.quantity ?? 1);
        }
      }
    }
    const topItems = Object.entries(itemCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, count]) => ({ name, count }));

    // Hourly breakdown
    const hourlyMap: Record<string, { count: number; revenue: number }> = {};
    for (const o of orders) {
      const hour = new Date(o.created_at).getHours().toString().padStart(2, "0") + ":00";
      if (!hourlyMap[hour]) hourlyMap[hour] = { count: 0, revenue: 0 };
      hourlyMap[hour].count++;
      hourlyMap[hour].revenue += (o.total as number) ?? 0;
    }
    const hourlyBreakdown = Object.entries(hourlyMap)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([hour, data]) => ({ hour, ...data }));

    const newReport: DailyReport = {
      date: now.toLocaleDateString("ar-DZ", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      }),
      totalOrders,
      paidOrders: paidOrders.length,
      pendingOrders: pendingOrders.length,
      totalRevenue,
      paidRevenue,
      averageOrder: paidOrders.length > 0 ? Math.round(paidRevenue / paidOrders.length) : 0,
      dineIn: byType.dine_in ?? { count: 0, revenue: 0 },
      takeaway: byType.takeaway ?? { count: 0, revenue: 0 },
      delivery: byType.delivery ?? { count: 0, revenue: 0 },
      lowStockItems,
      openComplaints: complaints.length,
      wasteToday: waste.length,
      topItems,
      hourlyBreakdown,
    };

    // Check if data changed (for notification)
    const reportStr = JSON.stringify(newReport);
    if (prevReportRef.current && prevReportRef.current !== reportStr) {
      showNotification("📊 تحديث التقرير اليومي", "تم تحديث بيانات التقرير");
    }
    prevReportRef.current = reportStr;

    setReport(newReport);
    setLastRefresh(new Date());
    setLoading(false);
  }

  function showNotification(title: string, body: string) {
    if ("Notification" in window && Notification.permission === "granted") {
      new Notification(title, { body, icon: "/icon-192.png" });
    }
  }

  if (loading || rLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--background)]">
        <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!report) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--background)] p-4">
        <div className="text-center space-y-2">
          <FileText className="w-12 h-12 text-muted-foreground mx-auto" />
          <p className="text-muted-foreground">لا توجد بيانات اليوم</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--background)] pb-24">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-card/95 backdrop-blur-lg border-b border-border/40 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-amber-500" />
            <h1 className="font-bold text-lg">التقرير اليومي</h1>
          </div>
          <div className="flex items-center gap-1">
            <a
              href="/mobile/weekly-report"
              className="px-3 py-1.5 rounded-lg text-xs font-semibold text-amber-600 bg-amber-500/10 hover:bg-amber-500/20 transition-colors"
            >
              تقرير الأسبوع ←
            </a>
            <button
              onClick={() => loadReport(restaurantId!)}
              className="p-2 rounded-lg hover:bg-muted transition-colors"
            >
              <RefreshCw className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>
        </div>
        <p className="text-xs text-muted-foreground mt-1">{report.date}</p>
      </div>

      <div className="p-4 space-y-4">
        {/* Main KPIs */}
        <div className="grid grid-cols-2 gap-3">
          <KPICard
            icon={DollarSign}
            label="إجمالي الإيراد"
            value={formatDZD(report.paidRevenue)}
            color="text-green-500"
            bgColor="bg-green-500/10"
          />
          <KPICard
            icon={ShoppingBag}
            label="الطلبات المدفوعة"
            value={`${report.paidOrders}`}
            color="text-blue-500"
            bgColor="bg-blue-500/10"
          />
          <KPICard
            icon={Clock}
            label="معلّقة"
            value={`${report.pendingOrders}`}
            color="text-orange-500"
            bgColor="bg-orange-500/10"
          />
          <KPICard
            icon={TrendingUp}
            label="متوسط الطلب"
            value={formatDZD(report.averageOrder)}
            color="text-purple-500"
            bgColor="bg-purple-500/10"
          />
        </div>

        {/* Order Types */}
        <div className="rounded-2xl border border-border/60 bg-card p-4 space-y-3">
          <h3 className="font-bold text-sm flex items-center gap-2">
            <Utensils className="w-4 h-4 text-amber-500" />
            حسب النوع
          </h3>
          <div className="space-y-2">
            <TypeRow
              label="🍽️ دينين"
              count={report.dineIn.count}
              revenue={report.dineIn.revenue}
            />
            <TypeRow
              label="🥡 تيك أواي"
              count={report.takeaway.count}
              revenue={report.takeaway.revenue}
            />
            <TypeRow
              label="🛵 توصيل"
              count={report.delivery.count}
              revenue={report.delivery.revenue}
            />
          </div>
        </div>

        {/* Top Items */}
        {report.topItems.length > 0 && (
          <div className="rounded-2xl border border-border/60 bg-card p-4 space-y-3">
            <h3 className="font-bold text-sm flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-amber-500" />
              الأكثر طلباً
            </h3>
            <div className="space-y-2">
              {report.topItems.map((item, i) => (
                <div key={i} className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-amber-500/10 flex items-center justify-center text-xs font-bold text-amber-500">
                      {i + 1}
                    </span>
                    {item.name}
                  </span>
                  <span className="text-muted-foreground">{item.count}×</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Hourly Breakdown */}
        {report.hourlyBreakdown.length > 0 && (
          <div className="rounded-2xl border border-border/60 bg-card p-4 space-y-3">
            <h3 className="font-bold text-sm flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-500" />
              الطلبات حسب الساعة
            </h3>
            <div className="space-y-1">
              {report.hourlyBreakdown.map((h, i) => (
                <div key={i} className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">{h.hour}</span>
                  <div className="flex-1 mx-3 h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-amber-500 rounded-full"
                      style={{
                        width: `${Math.min(
                          100,
                          (h.count /
                            Math.max(
                              ...report.hourlyBreakdown.map((x) => x.count)
                            )) *
                            100
                        )}%`,
                      }}
                    />
                  </div>
                  <span className="font-medium">{h.count}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Alerts */}
        {(report.lowStockItems.length > 0 || report.openComplaints > 0 || report.wasteToday > 0) && (
          <div className="rounded-2xl border border-red-500/30 bg-red-500/5 p-4 space-y-3">
            <h3 className="font-bold text-sm text-red-500 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              تنبيهات اليوم
            </h3>
            <div className="space-y-2">
              {report.lowStockItems.map((item, i) => (
                <div key={i} className="flex items-center justify-between text-sm">
                  <span className="text-red-400">⚠️ {item.name}</span>
                  <span className="text-xs text-red-400">
                    {item.current} {item.unit} متبقي
                  </span>
                </div>
              ))}
              {report.openComplaints > 0 && (
                <div className="text-sm text-orange-400">
                  📝 {report.openComplaints} شكوى مفتوحة
                </div>
              )}
              {report.wasteToday > 0 && (
                <div className="text-sm text-rose-400">
                  🗑️ {report.wasteToday} تسجيل نفايات
                </div>
              )}
            </div>
          </div>
        )}

        {/* Refresh time */}
        <div className="text-center text-xs text-muted-foreground py-2">
          آخر تحديث:{" "}
          {lastRefresh.toLocaleTimeString("ar-DZ", {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </div>
      </div>
    </div>
  );
}

function KPICard({
  icon: Icon,
  label,
  value,
  color,
  bgColor,
}: {
  icon: any;
  label: string;
  value: string;
  color: string;
  bgColor: string;
}) {
  return (
    <div className="rounded-2xl border border-border/60 bg-card p-4 space-y-2">
      <div className={`w-10 h-10 rounded-xl ${bgColor} flex items-center justify-center`}>
        <Icon className={`w-5 h-5 ${color}`} />
      </div>
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="font-bold text-lg">{value}</p>
      </div>
    </div>
  );
}

function TypeRow({
  label,
  count,
  revenue,
}: {
  label: string;
  count: number;
  revenue: number;
}) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span>{label}</span>
      <div className="flex items-center gap-3">
        <span className="text-muted-foreground">{count} طلب</span>
        <span className="font-medium">{formatDZD(revenue)}</span>
      </div>
    </div>
  );
}
