import { supabase } from "@/integrations/supabase/client";

export type WeeklyTypeRow = { count: number; revenue: number };
export type WeeklyDailyRow = {
  date: string;
  sales: number;
  orders: number;
  waste: number;
};

export type WeeklyReport = {
  start: string;
  end: string;
  totalRevenue: number;
  totalOrders: number;
  paidOrders: number;
  pendingOrders: number;
  averageOrder: number;
  byType: Record<"dine_in" | "takeaway" | "delivery", WeeklyTypeRow>;
  topItems: { name: string; count: number }[];
  wasteCount: number;
  wasteCost: number;
  lowStock: {
    name: string;
    current: number;
    threshold: number;
    unit: string;
  }[];
  openComplaints: number;
  complaintsThisWeek: number;
  daily: WeeklyDailyRow[];
  bestDay: { date: string; sales: number } | null;
  prevWeekRevenue: number;
  revenuePct: number;
};

export async function buildWeeklyReport(
  rid: string,
): Promise<WeeklyReport | null> {
  const now = new Date();
  const startDate = new Date(now);
  startDate.setDate(startDate.getDate() - 6);
  startDate.setHours(0, 0, 0, 0);
  const startISO = startDate.toISOString();
  const endISO = now.toISOString();

  const prevStart = new Date(startDate);
  prevStart.setDate(prevStart.getDate() - 7);
  const prevStartISO = prevStart.toISOString();
  const prevEndISO = startISO;

  const [ordersRes, prevOrdersRes, ingredientsRes, complaintsRes, wasteRes] =
    await Promise.all([
      supabase
        .from("orders")
        .select("id,total,order_type,status,created_at,items")
        .eq("restaurant_id", rid)
        .gte("created_at", startISO)
        .lte("created_at", endISO),
      supabase
        .from("orders")
        .select("total,status")
        .eq("restaurant_id", rid)
        .gte("created_at", prevStartISO)
        .lt("created_at", prevEndISO),
      supabase
        .from("ingredients")
        .select("id,name,current_stock,alert_threshold,unit")
        .eq("restaurant_id", rid),
      supabase
        .from("complaints")
        .select("id,title,status,severity,created_at")
        .eq("restaurant_id", rid),
      supabase
        .from("waste_logs")
        .select("id,quantity,cost,created_at")
        .eq("restaurant_id", rid)
        .gte("created_at", startISO)
        .lte("created_at", endISO),
    ]);

  const orders = (ordersRes.data ?? []) as any[];
  const prevOrders = (prevOrdersRes.data ?? []) as any[];
  const ingredients = (ingredientsRes.data ?? []) as any[];
  const complaints = (complaintsRes.data ?? []) as any[];
  const waste = (wasteRes.data ?? []) as any[];

  const paid = orders.filter((o) => o.status === "paid");
  const totalRevenue = paid.reduce((s, o) => s + (Number(o.total) || 0), 0);
  const prevRevenue = prevOrders
    .filter((o) => o.status === "paid")
    .reduce((s, o) => s + (Number(o.total) || 0), 0);
  const revenuePct =
    prevRevenue > 0
      ? Math.round(((totalRevenue - prevRevenue) / prevRevenue) * 100)
      : totalRevenue > 0
        ? 100
        : 0;

  const byType: Record<"dine_in" | "takeaway" | "delivery", WeeklyTypeRow> = {
    dine_in: { count: 0, revenue: 0 },
    takeaway: { count: 0, revenue: 0 },
    delivery: { count: 0, revenue: 0 },
  };
  for (const o of paid) {
    const t = (o.order_type as string) ?? "dine_in";
    const row =
      byType[t as keyof typeof byType] ?? (byType.delivery as WeeklyTypeRow);
    row.count++;
    row.revenue += Number(o.total) || 0;
  }

  const itemCounts: Record<string, number> = {};
  for (const o of orders) {
    if (o.items && Array.isArray(o.items)) {
      for (const item of o.items) {
        const name = item.name ?? item.menu_item_name ?? "";
        if (name)
          itemCounts[name] =
            (itemCounts[name] ?? 0) + (Number(item.quantity) || 1);
      }
    }
  }
  const topItems = Object.entries(itemCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, count]) => ({ name, count }));

  const dayMap = new Map<string, WeeklyDailyRow>();
  for (let i = 0; i < 7; i++) {
    const d = new Date(startDate);
    d.setDate(d.getDate() + i);
    const key = d.toISOString().slice(0, 10);
    dayMap.set(key, { date: key, sales: 0, orders: 0, waste: 0 });
  }
  for (const o of paid) {
    const key = (o.created_at as string).slice(0, 10);
    const day = dayMap.get(key);
    if (day) {
      day.sales += Number(o.total) || 0;
      day.orders += 1;
    }
  }
  let wasteCost = 0;
  for (const w of waste) {
    const key = (w.created_at as string).slice(0, 10);
    const day = dayMap.get(key);
    const wCost = Number(w.cost) || 0;
    if (day) day.waste += wCost || Number(w.quantity) || 0;
    wasteCost += wCost;
  }

  let bestDay: { date: string; sales: number } | null = null;
  for (const day of dayMap.values()) {
    if (!bestDay || day.sales > bestDay.sales)
      bestDay = { date: day.date, sales: day.sales };
  }

  const lowStock = ingredients
    .filter((i) => Number(i.current_stock) <= Number(i.alert_threshold))
    .map((i) => ({
      name: i.name,
      current: Number(i.current_stock),
      threshold: Number(i.alert_threshold),
      unit: i.unit,
    }));

  const openComplaints = complaints.filter((c) => c.status === "open").length;
  const complaintsThisWeek = complaints.filter(
    (c) => c.created_at >= startISO && c.created_at <= endISO,
  ).length;

  return {
    start: startISO.slice(0, 10),
    end: endISO.slice(0, 10),
    totalRevenue,
    totalOrders: orders.length,
    paidOrders: paid.length,
    pendingOrders: orders.filter(
      (o) => o.status === "new" || o.status === "preparing",
    ).length,
    averageOrder: paid.length > 0 ? Math.round(totalRevenue / paid.length) : 0,
    byType,
    topItems,
    wasteCount: waste.length,
    wasteCost,
    lowStock,
    openComplaints,
    complaintsThisWeek,
    daily: Array.from(dayMap.values()),
    bestDay,
    prevWeekRevenue: prevRevenue,
    revenuePct,
  };
}

export function weeklyReportPlainText(r: WeeklyReport): string {
  const lines = [
    `📊 التقرير الأسبوعي`,
    `الفترة: ${r.start} ← ${r.end}`,
    ``,
    `💰 الإيراد الأسبوعي: ${r.totalRevenue} دج`,
    `🧾 الطلبات المدفوعة: ${r.paidOrders} (من ${r.totalOrders})`,
    `📈 متوسط الطلب: ${r.averageOrder} دج`,
    r.prevWeekRevenue > 0
      ? `↔️ مقارنة بالأسبوع السابق: ${r.revenuePct >= 0 ? "+" : ""}${r.revenuePct}%`
      : ``,
    ``,
    `🍽️ دينين: ${r.byType.dine_in.count} — ${r.byType.dine_in.revenue} دج`,
    `🥡 تيك أواي: ${r.byType.takeaway.count} — ${r.byType.takeaway.revenue} دج`,
    `🛵 توصيل: ${r.byType.delivery.count} — ${r.byType.delivery.revenue} دج`,
    ``,
    `🏆 أفضل يوم: ${r.bestDay ? `${r.bestDay.date} (${r.bestDay.sales} دج)` : "—"}`,
    ``,
    ...r.topItems.map((t, i) => `${i + 1}. ${t.name} — ${t.count}×`),
    ``,
    `🗑️ الهدر: ${r.wasteCount} تسجيل — ${r.wasteCost} دج`,
    ...r.lowStock.map(
      (i) => `⚠️ ${i.name}: ${i.current} ${i.unit} متبقٍ (الحد ${i.threshold})`,
    ),
    r.complaintsThisWeek > 0
      ? `📝 شكاوى هذا الأسبوع: ${r.complaintsThisWeek}`
      : ``,
  ];
  return lines.filter(Boolean).join("\n");
}
