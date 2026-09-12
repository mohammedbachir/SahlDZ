import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useRestaurantId, formatDZD } from "@/lib/restaurant";
import { getFirebaseDb } from "@/integrations/firebase/config";
import {
  TrendingUp,
  ShoppingBag,
  AlertTriangle,
  MessageSquare,
  Clock,
  DollarSign,
  Package,
  Truck,
  BarChart3,
} from "lucide-react";

type KPIs = {
  salesToday: number;
  ordersToday: number;
  avgOrder: number;
  pendingOrders: number;
  lowStockCount: number;
  openComplaints: number;
  wasteToday: number;
  deliveryPending: number;
};

export default function MobileDashboard() {
  const { restaurantId, loading: rLoading } = useRestaurantId();
  const [kpis, setKpis] = useState<KPIs>({
    salesToday: 0,
    ordersToday: 0,
    avgOrder: 0,
    pendingOrders: 0,
    lowStockCount: 0,
    openComplaints: 0,
    wasteToday: 0,
    deliveryPending: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!restaurantId || !getFirebaseDb()) {
      setLoading(false);
      return;
    }
    loadKPIs(restaurantId);
    const iv = setInterval(() => loadKPIs(restaurantId), 30000);
    return () => clearInterval(iv);
  }, [restaurantId]);

  async function loadKPIs(rid: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString();

    const [ordersRes, ingredientsRes, complaintsRes, wasteRes] = await Promise.all([
      supabase
        .from("orders")
        .select("id,status,total,order_type,created_at")
        .eq("restaurant_id", rid)
        .gte("created_at", todayStr),
      supabase
        .from("ingredients")
        .select("id,current_stock,alert_threshold")
        .eq("restaurant_id", rid),
      supabase
        .from("complaints")
        .select("id,status")
        .eq("restaurant_id", rid)
        .eq("status", "open"),
      supabase
        .from("waste_logs")
        .select("id,cost,created_at")
        .eq("restaurant_id", rid)
        .gte("created_at", todayStr),
    ]);

    const orders = (ordersRes.data ?? []) as any[];
    const ingredients = (ingredientsRes.data ?? []) as any[];
    const complaints = (complaintsRes.data ?? []) as any[];
    const waste = (wasteRes.data ?? []) as any[];

    const paidOrders = orders.filter((o) => o.status === "paid");
    const salesToday = paidOrders.reduce((s, o) => s + (o.total ?? 0), 0);
    const pendingOrders = orders.filter(
      (o) => o.status === "new" || o.status === "preparing"
    ).length;
    const deliveryPending = orders.filter(
      (o) => o.order_type === "delivery" && (o.status === "new" || o.status === "preparing")
    ).length;
    const lowStockCount = ingredients.filter(
      (i) => Number(i.current_stock) < Number(i.alert_threshold)
    ).length;
    const wasteToday = waste.reduce((s, w) => s + (w.cost ?? 0), 0);

    setKpis({
      salesToday,
      ordersToday: orders.length,
      avgOrder: paidOrders.length > 0 ? Math.round(salesToday / paidOrders.length) : 0,
      pendingOrders,
      lowStockCount,
      openComplaints: complaints.length,
      wasteToday,
      deliveryPending,
    });
    setLoading(false);
  }

  if (rLoading || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[var(--background)] to-[var(--muted)]/30 p-4">
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 rounded-2xl bg-[var(--muted)]/20 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  const cards = [
    {
      icon: DollarSign,
      label: "إيراد اليوم",
      value: formatDZD(kpis.salesToday),
      color: "from-emerald-500 to-emerald-600",
      textColor: "text-emerald-600",
    },
    {
      icon: ShoppingBag,
      label: "طلبات اليوم",
      value: String(kpis.ordersToday),
      sub: `متوسط: ${formatDZD(kpis.avgOrder)}`,
      color: "from-blue-500 to-blue-600",
      textColor: "text-blue-600",
    },
    {
      icon: Clock,
      label: "قيد الانتظار",
      value: String(kpis.pendingOrders),
      alert: kpis.pendingOrders > 5,
      color: "from-amber-500 to-amber-600",
      textColor: "text-amber-600",
    },
    {
      icon: Truck,
      label: "توصيل معلق",
      value: String(kpis.deliveryPending),
      alert: kpis.deliveryPending > 0,
      color: "from-purple-500 to-purple-600",
      textColor: "text-purple-600",
    },
    {
      icon: Package,
      label: "مخزون ناقص",
      value: String(kpis.lowStockCount),
      alert: kpis.lowStockCount > 0,
      color: "from-red-500 to-red-600",
      textColor: "text-red-600",
    },
    {
      icon: MessageSquare,
      label: "شكاوى مفتوحة",
      value: String(kpis.openComplaints),
      alert: kpis.openComplaints > 0,
      color: "from-orange-500 to-orange-600",
      textColor: "text-orange-600",
    },
    {
      icon: AlertTriangle,
      label: "هدر اليوم",
      value: formatDZD(kpis.wasteToday),
      color: "from-rose-500 to-rose-600",
      textColor: "text-rose-600",
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-[var(--background)] to-[var(--muted)]/30 p-4 pb-24">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold">لوحة التحكم</h1>
        <p className="text-sm text-muted-foreground">تحديث مباشر كل 30 ثانية</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-3">
        {cards.map((c) => (
          <div
            key={c.label}
            className={`relative rounded-2xl border border-border/40 bg-card/80 backdrop-blur p-4 ${
              c.alert ? "ring-2 ring-red-400 animate-pulse" : ""
            }`}
          >
            <div
              className={`w-10 h-10 rounded-xl bg-gradient-to-br ${c.color} flex items-center justify-center mb-3`}
            >
              <c.icon className="w-5 h-5 text-white" />
            </div>
            <div className="text-2xl font-bold">{c.value}</div>
            <div className="text-xs text-muted-foreground mt-1">{c.label}</div>
            {c.sub && (
              <div className="text-xs text-muted-foreground mt-0.5">{c.sub}</div>
            )}
            {c.alert && (
              <div className="absolute top-2 right-2 w-2.5 h-2.5 rounded-full bg-red-500 animate-ping" />
            )}
          </div>
        ))}
      </div>

      {/* Reports Navigation */}
      <div className="mt-6 space-y-3">
        <h2 className="text-lg font-bold">التقارير</h2>
        <div className="grid grid-cols-2 gap-3">
          <a
            href="/mobile/daily-summary"
            className="flex items-center gap-3 rounded-2xl border border-border/40 bg-card/80 p-4 hover:bg-accent transition-colors"
          >
            <DollarSign className="w-5 h-5 text-emerald-500" />
            <span className="text-sm font-medium">تقرير اليوم</span>
          </a>
          <a
            href="/mobile/weekly-report"
            className="flex items-center gap-3 rounded-2xl border border-border/40 bg-card/80 p-4 hover:bg-accent transition-colors"
          >
            <TrendingUp className="w-5 h-5 text-blue-500" />
            <span className="text-sm font-medium">تقرير الأسبوع</span>
          </a>
          <a
            href="/mobile/inventory"
            className="flex items-center gap-3 rounded-2xl border border-border/40 bg-card/80 p-4 hover:bg-accent transition-colors"
          >
            <Package className="w-5 h-5 text-amber-500" />
            <span className="text-sm font-medium">المخزون</span>
          </a>
          <a
            href="/mobile/reports"
            className="flex items-center gap-3 rounded-2xl border border-border/40 bg-card/80 p-4 hover:bg-accent transition-colors"
          >
            <BarChart3 className="w-5 h-5 text-purple-500" />
            <span className="text-sm font-medium">الإحصائيات</span>
          </a>
        </div>
      </div>
    </div>
  );
}
