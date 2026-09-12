import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useRestaurantId, formatDZD } from "@/lib/restaurant";
import { getFirebaseDb } from "@/integrations/firebase/config";
import { Calendar, Package } from "lucide-react";

type DayData = {
  date: string;
  sales: number;
  orders: number;
  waste: number;
  avgOrder: number;
};

export default function MobileReports() {
  const { restaurantId, loading: rLoading } = useRestaurantId();
  const [days, setDays] = useState<DayData[]>([]);
  const [period, setPeriod] = useState<"week" | "month">("week");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!restaurantId || !getFirebaseDb()) {
      setLoading(false);
      return;
    }
    loadReport(restaurantId, period);
  }, [restaurantId, period]);

  async function loadReport(rid: string, p: "week" | "month") {
    const now = new Date();
    const daysBack = p === "week" ? 7 : 30;
    const startDate = new Date(now);
    startDate.setDate(startDate.getDate() - daysBack);
    startDate.setHours(0, 0, 0, 0);

    const [ordersRes, wasteRes] = await Promise.all([
      supabase
        .from("orders")
        .select("id,total,status,created_at")
        .eq("restaurant_id", rid)
        .gte("created_at", startDate.toISOString())
        .order("created_at", { ascending: true }),
      supabase
        .from("waste_logs")
        .select("id,cost,created_at")
        .eq("restaurant_id", rid)
        .gte("created_at", startDate.toISOString())
        .order("created_at", { ascending: true }),
    ]);

    const orders = (ordersRes.data ?? []) as any[];
    const waste = (wasteRes.data ?? []) as any[];

    // Group by day
    const dayMap = new Map<string, DayData>();
    for (let i = 0; i < daysBack; i++) {
      const d = new Date(startDate);
      d.setDate(d.getDate() + i);
      const key = d.toISOString().slice(0, 10);
      dayMap.set(key, {
        date: key,
        sales: 0,
        orders: 0,
        waste: 0,
        avgOrder: 0,
      });
    }

    for (const o of orders) {
      if (o.status !== "paid") continue;
      const key = o.created_at.slice(0, 10);
      const day = dayMap.get(key);
      if (day) {
        day.sales += Number(o.total) || 0;
        day.orders += 1;
      }
    }

    for (const w of waste) {
      const key = w.created_at.slice(0, 10);
      const day = dayMap.get(key);
      if (day) {
        day.waste += Number(w.cost) || 0;
      }
    }

    for (const day of dayMap.values()) {
      day.avgOrder = day.orders > 0 ? Math.round(day.sales / day.orders) : 0;
    }

    setDays(Array.from(dayMap.values()));
    setLoading(false);
  }

  if (rLoading || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[var(--background)] to-[var(--muted)]/30 p-4">
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-20 rounded-2xl bg-[var(--muted)]/20 animate-pulse"
            />
          ))}
        </div>
      </div>
    );
  }

  const totalSales = days.reduce((s, d) => s + d.sales, 0);
  const totalOrders = days.reduce((s, d) => s + d.orders, 0);
  const totalWaste = days.reduce((s, d) => s + d.waste, 0);
  const avgDaily = days.length > 0 ? Math.round(totalSales / days.length) : 0;

  const maxSales = Math.max(...days.map((d) => d.sales), 1);

  return (
    <div className="min-h-screen bg-gradient-to-b from-[var(--background)] to-[var(--muted)]/30 p-4 pb-24">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Calendar className="w-6 h-6" />
          التقارير
        </h1>
        <div className="flex bg-muted rounded-xl p-1">
          <button
            onClick={() => setPeriod("week")}
            className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
              period === "week"
                ? "bg-background shadow text-foreground"
                : "text-muted-foreground"
            }`}
          >
            أسبوع
          </button>
          <button
            onClick={() => setPeriod("month")}
            className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
              period === "month"
                ? "bg-background shadow text-foreground"
                : "text-muted-foreground"
            }`}
          >
            شهر
          </button>
        </div>
      </div>

      <a
        href="/mobile/weekly-report"
        className="flex items-center justify-center gap-2 mb-6 py-2.5 rounded-2xl border border-amber-500/40 bg-amber-500/10 text-amber-600 text-sm font-semibold"
      >
        <Calendar className="w-4 h-4" />
        التقرير الأسبوعي الكامل (إيراد · هدر · مخزون)
      </a>
      <a
        href="/mobile/inventory"
        className="flex items-center justify-center gap-2 mb-6 py-2.5 rounded-2xl border border-blue-500/40 bg-blue-500/10 text-blue-600 text-sm font-semibold"
      >
        <Package className="w-4 h-4" />
        تقرير المخزون (كميات · حالة · قيمة · جرد)
      </a>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <div className="rounded-2xl border border-border/40 bg-card/80 p-4">
          <div className="text-xs text-muted-foreground">إجمالي المبيعات</div>
          <div className="text-xl font-bold mt-1">{formatDZD(totalSales)}</div>
        </div>
        <div className="rounded-2xl border border-border/40 bg-card/80 p-4">
          <div className="text-xs text-muted-foreground">إجمالي الطلبات</div>
          <div className="text-xl font-bold mt-1">{totalOrders}</div>
        </div>
        <div className="rounded-2xl border border-border/40 bg-card/80 p-4">
          <div className="text-xs text-muted-foreground">متوسط يومي</div>
          <div className="text-xl font-bold mt-1">{formatDZD(avgDaily)}</div>
        </div>
        <div className="rounded-2xl border border-border/40 bg-card/80 p-4">
          <div className="text-xs text-muted-foreground">إجمالي الهدر</div>
          <div className="text-xl font-bold mt-1 text-red-500">
            {formatDZD(totalWaste)}
          </div>
        </div>
      </div>

      {/* Sales Chart */}
      <div className="rounded-2xl border border-border/40 bg-card/80 p-4 mb-6">
        <h2 className="font-bold mb-4">المبيعات اليومية</h2>
        <div className="flex items-end gap-1 h-40">
          {days.map((d, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-1">
              <div className="text-[10px] text-muted-foreground">
                {d.sales > 0 ? `${Math.round(d.sales / 1000)}k` : ""}
              </div>
              <div
                className="w-full rounded-t bg-gradient-to-t from-primary to-primary/60 transition-all"
                style={{
                  height: `${Math.max((d.sales / maxSales) * 100, 4)}%`,
                }}
              />
              <div className="text-[10px] text-muted-foreground">
                {new Date(d.date).getDate()}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Daily Breakdown */}
      <div className="rounded-2xl border border-border/40 bg-card/80 p-4">
        <h2 className="font-bold mb-3">تفاصيل يومي</h2>
        <div className="space-y-2">
          {days
            .filter((d) => d.sales > 0 || d.waste > 0)
            .slice(-7)
            .reverse()
            .map((d) => (
              <div
                key={d.date}
                className="flex items-center justify-between py-2 border-b border-border/20 last:border-0"
              >
                <div>
                  <div className="text-sm font-medium">
                    {new Date(d.date).toLocaleDateString("ar-DZ", {
                      weekday: "short",
                      day: "numeric",
                    })}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {d.orders} طلبات
                  </div>
                </div>
                <div className="text-left">
                  <div className="text-sm font-bold">{formatDZD(d.sales)}</div>
                  {d.waste > 0 && (
                    <div className="text-xs text-red-500">
                      هدر: {formatDZD(d.waste)}
                    </div>
                  )}
                </div>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}
