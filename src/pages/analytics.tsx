import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShoppingBag,
  DollarSign,
  Receipt,
  TrendingUp,
  ArrowUp,
  ArrowDown,
  Clock,
  Wallet,
  Calendar as CalendarIcon,
  LayoutDashboard,
  CalendarDays,
  Utensils,
  Layers,
  Users,
  AlertOctagon,
  FileSpreadsheet,
  FileText,
  UtensilsCrossed,
  Bike,
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  BarChart,
  Bar,
} from "recharts";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useRestaurantId, formatDZD } from "@/lib/restaurant";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { exportAnalyticsExcel, exportAnalyticsPDF } from "@/lib/exportReports";

import type {
  FullAnalyticsData,
  DateRangePreset,
  OrderRecord,
  OrderItemRecord,
  TablePerformance,
  CategoryPerformance,
  TopItemPerformance,
  CashierPerformance,
  CancellationReasonStat,
  DailyDetailSummary,
} from "@/components/analytics/types";

import { DailyReportTab } from "@/components/analytics/DailyReportTab";
import { TablesReportTab } from "@/components/analytics/TablesReportTab";
import { CategoriesReportTab } from "@/components/analytics/CategoriesReportTab";
import { CashierReportTab } from "@/components/analytics/CashierReportTab";
import { CancellationsReportTab } from "@/components/analytics/CancellationsReportTab";

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function endOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

function fmtDateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}

async function loadFullAnalyticsReport(
  restaurantId: string,
  preset: DateRangePreset,
  customStart: Date | undefined,
  dailyDateStr: string,
): Promise<FullAnalyticsData> {
  const now = new Date();
  const todayStart = startOfDay(now);
  const todayEnd = endOfDay(now);

  let startDate: Date;
  let endDate: Date;
  let dateRangeLabel = "";

  if (preset === "today") {
    startDate = todayStart;
    endDate = todayEnd;
    dateRangeLabel = "اليوم";
  } else if (preset === "yesterday") {
    const yStart = new Date(todayStart);
    yStart.setDate(yStart.getDate() - 1);
    startDate = yStart;
    endDate = endOfDay(yStart);
    dateRangeLabel = "أمس";
  } else if (preset === "week") {
    const wStart = new Date(todayStart);
    wStart.setDate(wStart.getDate() - 6);
    startDate = wStart;
    endDate = todayEnd;
    dateRangeLabel = "آخر 7 أيام";
  } else if (preset === "month") {
    const mStart = new Date(todayStart);
    mStart.setDate(mStart.getDate() - 29);
    startDate = mStart;
    endDate = todayEnd;
    dateRangeLabel = "آخر 30 يوم";
  } else {
    startDate = customStart ? startOfDay(customStart) : startOfDay(new Date(Date.now() - 30 * 86400000));
    endDate = todayEnd;
    dateRangeLabel = `من ${fmtDateKey(startDate)} إلى اليوم`;
  }

  // Fetch orders from 30 days before start date for historical comparisons
  const fetchSince = new Date(startDate);
  fetchSince.setDate(fetchSince.getDate() - 31);

  const [ordersRes, tablesRes, hallsRes, catsRes, menuRes, staffRes] = await Promise.all([
    supabase
      .from("orders")
      .select("*")
      .eq("restaurant_id", restaurantId)
      .gte("created_at", fetchSince.toISOString())
      .limit(10000),
    supabase
      .from("tables")
      .select("id, table_number, hall_id")
      .eq("restaurant_id", restaurantId),
    supabase
      .from("halls")
      .select("id, name")
      .eq("restaurant_id", restaurantId),
    supabase
      .from("categories")
      .select("id, name")
      .eq("restaurant_id", restaurantId),
    supabase
      .from("menu_items")
      .select("id, name, price, category_id, image_url")
      .eq("restaurant_id", restaurantId),
    supabase
      .from("staff")
      .select("id, name, role")
      .eq("restaurant_id", restaurantId),
  ]);

  const rawOrders = (ordersRes.data ?? []) as any[];
  const rawTables = (tablesRes.data ?? []) as any[];
  const rawHalls = (hallsRes.data ?? []) as any[];
  const rawCats = (catsRes.data ?? []) as any[];
  const rawMenu = (menuRes.data ?? []) as any[];
  const rawStaff = (staffRes.data ?? []) as any[];

  // Lookup maps
  const hallMap = new Map<string, string>(rawHalls.map((h) => [h.id, h.name]));
  const catMap = new Map<string, string>(rawCats.map((c) => [c.id, c.name]));
  const itemCatMap = new Map<string, string>();
  const itemImgMap = new Map<string, string | null>();
  const itemPriceMap = new Map<string, number>();

  rawMenu.forEach((m) => {
    if (m.category_id) itemCatMap.set(m.id, m.category_id);
    itemImgMap.set(m.id, m.image_url ?? null);
    itemPriceMap.set(m.id, Number(m.price || 0));
  });

  const staffMap = new Map<string, { name: string; role: string }>();
  rawStaff.forEach((s) => {
    staffMap.set(s.id, { name: s.name, role: s.role ?? "كاشير" });
  });

  const tableInfoMap = new Map<
    string,
    { tableNumber: number; hallName: string }
  >();
  rawTables.forEach((t) => {
    tableInfoMap.set(t.id, {
      tableNumber: Number(t.table_number),
      hallName: t.hall_id ? hallMap.get(t.hall_id) ?? "رئيسية" : "رئيسية",
    });
  });

  // Normalized order objects
  const allOrders: OrderRecord[] = rawOrders.map((o) => ({
    id: o.id,
    restaurant_id: o.restaurant_id,
    total: Number(o.total || 0),
    status: o.status ?? "new",
    created_at: o.created_at,
    order_type: o.order_type ?? "dine_in",
    table_id: o.table_id ?? null,
    daily_number: o.daily_number ?? null,
    customer_name: o.customer_name ?? null,
    customer_phone: o.customer_phone ?? null,
    customer_address: o.customer_address ?? null,
    cashier_staff_id: o.cashier_staff_id ?? null,
    payment_mode: o.payment_mode ?? "full",
    paid_amount: o.paid_amount ? Number(o.paid_amount) : null,
    debt_amount: o.debt_amount ? Number(o.debt_amount) : null,
    discount_amount: o.discount_amount ? Number(o.discount_amount) : null,
    cancel_reason: o.cancel_reason ?? null,
    cancelled_at: o.cancelled_at ?? null,
    cancelled_by: o.cancelled_by ?? null,
  }));

  // Fetch items for in-range orders in chunks
  const inRangeOrders = allOrders.filter((o) => {
    const t = new Date(o.created_at).getTime();
    return t >= startDate.getTime() && t <= endDate.getTime();
  });

  const inRangeIds = inRangeOrders.map((o) => o.id);
  const rawItems: OrderItemRecord[] = [];
  const CHUNK_SIZE = 30;

  for (let i = 0; i < inRangeIds.length; i += CHUNK_SIZE) {
    const chunk = inRangeIds.slice(i, i + CHUNK_SIZE);
    const { data: chunkData } = await supabase
      .from("order_items")
      .select("id, order_id, menu_item_id, category_id, name_snapshot, price_snapshot, quantity")
      .in("order_id", chunk);

    if (chunkData?.length) {
      chunkData.forEach((it: any) => {
        rawItems.push({
          id: it.id,
          order_id: it.order_id,
          menu_item_id: it.menu_item_id ?? null,
          category_id: it.category_id ?? (it.menu_item_id ? itemCatMap.get(it.menu_item_id) : null),
          name_snapshot: it.name_snapshot,
          price_snapshot: Number(it.price_snapshot || 0),
          quantity: Number(it.quantity || 1),
        });
      });
    }
  }

  // Items mapped by order_id
  const itemsByOrder = new Map<string, OrderItemRecord[]>();
  rawItems.forEach((it) => {
    const arr = itemsByOrder.get(it.order_id) ?? [];
    arr.push(it);
    itemsByOrder.set(it.order_id, arr);
  });

  // Attach items to inRangeOrders
  inRangeOrders.forEach((o) => {
    o.items = itemsByOrder.get(o.id) ?? [];
  });

  // 1. KPIs
  const paidOrders = inRangeOrders.filter((o) => o.status === "paid");
  const cancelledOrders = inRangeOrders.filter((o) => o.status === "cancelled");

  const totalRevenue = paidOrders.reduce((sum, o) => sum + o.total, 0);
  const ordersCount = paidOrders.length;
  const avgOrderValue = ordersCount > 0 ? Math.round(totalRevenue / ordersCount) : 0;

  const cancelledCount = cancelledOrders.length;
  const cancelledRevenue = cancelledOrders.reduce((sum, o) => sum + o.total, 0);
  const totalIncoming = ordersCount + cancelledCount;
  const cancellationRate = totalIncoming > 0 ? Math.round((cancelledCount / totalIncoming) * 100) : 0;

  const dineInRevenue = paidOrders
    .filter((o) => o.order_type === "dine_in")
    .reduce((sum, o) => sum + o.total, 0);

  const takeawayRevenue = paidOrders
    .filter((o) => o.order_type === "takeaway")
    .reduce((sum, o) => sum + o.total, 0);

  const deliveryRevenue = paidOrders
    .filter((o) => o.order_type === "delivery")
    .reduce((sum, o) => sum + o.total, 0);

  const kpis = {
    totalRevenue,
    ordersCount,
    avgOrderValue,
    cancelledCount,
    cancelledRevenue,
    cancellationRate,
    dineInRevenue,
    takeawayRevenue,
    deliveryRevenue,
  };

  // 2. Daily Trend (30 days)
  const dailyMap = new Map<string, { total: number; count: number }>();
  const thirtyDaysAgo = new Date(todayStart);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 29);

  for (let i = 0; i < 30; i++) {
    const d = new Date(thirtyDaysAgo);
    d.setDate(d.getDate() + i);
    dailyMap.set(fmtDateKey(d), { total: 0, count: 0 });
  }

  allOrders
    .filter((o) => o.status === "paid")
    .forEach((o) => {
      const d = new Date(o.created_at);
      const key = fmtDateKey(d);
      if (dailyMap.has(key)) {
        const cur = dailyMap.get(key)!;
        cur.total += o.total;
        cur.count++;
      }
    });

  const dailyTrend = Array.from(dailyMap.entries()).map(([date, val]) => ({
    date,
    total: val.total,
    count: val.count,
  }));

  // 3. Hourly Trend
  const hourMap = new Map<number, { count: number; revenue: number }>();
  for (let h = 0; h < 24; h++) hourMap.set(h, { count: 0, revenue: 0 });

  paidOrders.forEach((o) => {
    const h = new Date(o.created_at).getHours();
    const cur = hourMap.get(h)!;
    cur.count++;
    cur.revenue += o.total;
  });

  const hourlyTrend = Array.from(hourMap.entries()).map(([hour, val]) => ({
    hour,
    count: val.count,
    revenue: val.revenue,
  }));

  // 4. Tables Performance & Share
  const tableAgg = new Map<
    string,
    { totalRevenue: number; ordersCount: number }
  >();

  paidOrders
    .filter((o) => o.order_type === "dine_in" && o.table_id)
    .forEach((o) => {
      const tid = o.table_id!;
      const cur = tableAgg.get(tid) ?? { totalRevenue: 0, ordersCount: 0 };
      cur.totalRevenue += o.total;
      cur.ordersCount++;
      tableAgg.set(tid, cur);
    });

  const tables: TablePerformance[] = Array.from(tableInfoMap.entries())
    .map(([tid, info]) => {
      const agg = tableAgg.get(tid) ?? { totalRevenue: 0, ordersCount: 0 };
      const percentage =
        dineInRevenue > 0
          ? Math.round((agg.totalRevenue / dineInRevenue) * 1000) / 10
          : 0;
      return {
        tableId: tid,
        tableNumber: info.tableNumber,
        hallName: info.hallName,
        totalRevenue: agg.totalRevenue,
        ordersCount: agg.ordersCount,
        avgOrderValue:
          agg.ordersCount > 0 ? Math.round(agg.totalRevenue / agg.ordersCount) : 0,
        percentageOfTableSales: percentage,
        rank: 0,
      };
    })
    .sort((a, b) => b.totalRevenue - a.totalRevenue)
    .map((t, i) => ({ ...t, rank: i + 1 }));

  // 5. Categories & Dishes Performance
  const catSalesAgg = new Map<
    string,
    { totalRevenue: number; quantitySold: number; items: Map<string, number> }
  >();

  const itemAgg = new Map<
    string,
    {
      name: string;
      qty: number;
      revenue: number;
      menuItemId: string | null;
      catId: string | null;
    }
  >();

  rawItems.forEach((it) => {
    const parentOrder = inRangeOrders.find((o) => o.id === it.order_id);
    if (!parentOrder || parentOrder.status !== "paid") return;

    const catId = it.category_id || "uncategorized";
    const lineRev = it.price_snapshot * it.quantity;

    // Cat agg
    const cEntry = catSalesAgg.get(catId) ?? {
      totalRevenue: 0,
      quantitySold: 0,
      items: new Map<string, number>(),
    };
    cEntry.totalRevenue += lineRev;
    cEntry.quantitySold += it.quantity;
    const curItemQty = cEntry.items.get(it.name_snapshot) ?? 0;
    cEntry.items.set(it.name_snapshot, curItemQty + it.quantity);
    catSalesAgg.set(catId, cEntry);

    // Item agg
    const iKey = it.menu_item_id ?? it.name_snapshot;
    const iEntry = itemAgg.get(iKey) ?? {
      name: it.name_snapshot,
      qty: 0,
      revenue: 0,
      menuItemId: it.menu_item_id,
      catId: it.category_id ?? null,
    };
    iEntry.qty += it.quantity;
    iEntry.revenue += lineRev;
    itemAgg.set(iKey, iEntry);
  });

  const categories: CategoryPerformance[] = Array.from(catSalesAgg.entries())
    .map(([catId, data]) => {
      const catName = catMap.get(catId) ?? (catId === "uncategorized" ? "أصناف أخرى" : "تصنيف عام");
      let topItemName: string | null = null;
      let topQty = 0;
      data.items.forEach((qty, name) => {
        if (qty > topQty) {
          topQty = qty;
          topItemName = name;
        }
      });
      const percentage =
        totalRevenue > 0
          ? Math.round((data.totalRevenue / totalRevenue) * 1000) / 10
          : 0;

      return {
        categoryId: catId,
        categoryName: catName,
        totalRevenue: data.totalRevenue,
        quantitySold: data.quantitySold,
        percentageOfFoodSales: percentage,
        topItemName,
        itemsCount: data.items.size,
      };
    })
    .sort((a, b) => b.totalRevenue - a.totalRevenue);

  const allItemsSorted: TopItemPerformance[] = Array.from(itemAgg.values())
    .map((item) => ({
      menuItemId: item.menuItemId,
      name: item.name,
      imageUrl: item.menuItemId ? itemImgMap.get(item.menuItemId) ?? null : null,
      categoryName: item.catId ? catMap.get(item.catId) ?? "عام" : "عام",
      quantity: item.qty,
      revenue: item.revenue,
      percentageOfSales:
        totalRevenue > 0
          ? Math.round((item.revenue / totalRevenue) * 1000) / 10
          : 0,
    }))
    .sort((a, b) => b.quantity - a.quantity);

  const topItems = allItemsSorted.slice(0, 10);
  const bottomItems = allItemsSorted
    .slice()
    .sort((a, b) => a.quantity - b.quantity)
    .slice(0, 5);

  // 6. Cashier Performance
  const cashierAgg = new Map<
    string,
    {
      totalRevenue: number;
      ordersCount: number;
      fullCount: number;
      debtCount: number;
    }
  >();

  paidOrders.forEach((o) => {
    const staffId = o.cashier_staff_id || "general";
    const cur = cashierAgg.get(staffId) ?? {
      totalRevenue: 0,
      ordersCount: 0,
      fullCount: 0,
      debtCount: 0,
    };
    cur.totalRevenue += o.total;
    cur.ordersCount++;
    if (o.payment_mode === "debt" || o.payment_mode === "partial") {
      cur.debtCount++;
    } else {
      cur.fullCount++;
    }
    cashierAgg.set(staffId, cur);
  });

  const cashiers: CashierPerformance[] = Array.from(cashierAgg.entries())
    .map(([staffId, data]) => {
      const staffInfo = staffMap.get(staffId);
      const name = staffInfo ? staffInfo.name : "كاشير عام / غير محدد";
      const role = staffInfo ? staffInfo.role : "صندوق";
      const pct =
        totalRevenue > 0
          ? Math.round((data.totalRevenue / totalRevenue) * 1000) / 10
          : 0;

      return {
        staffId,
        name,
        role,
        totalRevenue: data.totalRevenue,
        ordersCount: data.ordersCount,
        avgOrderValue:
          data.ordersCount > 0 ? Math.round(data.totalRevenue / data.ordersCount) : 0,
        percentageOfTotalSales: pct,
        fullPaymentsCount: data.fullCount,
        debtPaymentsCount: data.debtCount,
      };
    })
    .sort((a, b) => b.totalRevenue - a.totalRevenue);

  // 7. Cancellations Analysis
  const reasonsMap = new Map<string, { count: number; totalAmount: number }>();
  cancelledOrders.forEach((o) => {
    const r = o.cancel_reason?.trim() || "غير محدد";
    const cur = reasonsMap.get(r) ?? { count: 0, totalAmount: 0 };
    cur.count++;
    cur.totalAmount += o.total;
    reasonsMap.set(r, cur);
  });

  let mostCommonReason: string | null = null;
  let highestCount = 0;

  const reasons: CancellationReasonStat[] = Array.from(reasonsMap.entries())
    .map(([reason, val]) => {
      if (val.count > highestCount) {
        highestCount = val.count;
        mostCommonReason = reason;
      }
      const pct =
        cancelledCount > 0
          ? Math.round((val.count / cancelledCount) * 100)
          : 0;
      return {
        reason,
        count: val.count,
        totalAmount: val.totalAmount,
        percentage: pct,
      };
    })
    .sort((a, b) => b.count - a.count);

  const cancellations = {
    reasons,
    cancelledOrders,
    totalLost: cancelledRevenue,
    count: cancelledCount,
    mostCommonReason,
  };

  // 8. Daily Detail Summary for selected calendar day
  const targetDayStart = `${dailyDateStr}T00:00:00`;
  const targetDayEnd = `${dailyDateStr}T23:59:59`;

  const dayOrders = allOrders.filter((o) => {
    return o.created_at >= targetDayStart && o.created_at <= targetDayEnd;
  });

  // Attach items if present
  dayOrders.forEach((o) => {
    if (!o.items) o.items = itemsByOrder.get(o.id) ?? [];
  });

  const dayPaid = dayOrders.filter((o) => o.status === "paid");
  const dayCancelled = dayOrders.filter((o) => o.status === "cancelled");
  const dayRevenue = dayPaid.reduce((s, o) => s + o.total, 0);
  const dayLost = dayCancelled.reduce((s, o) => s + o.total, 0);

  const dayDineIn = dayPaid.filter((o) => o.order_type === "dine_in");
  const dayTakeaway = dayPaid.filter((o) => o.order_type === "takeaway");
  const dayDelivery = dayPaid.filter((o) => o.order_type === "delivery");

  const dayDineInRev = dayDineIn.reduce((s, o) => s + o.total, 0);
  const dayTakeawayRev = dayTakeaway.reduce((s, o) => s + o.total, 0);
  const dayDeliveryRev = dayDelivery.reduce((s, o) => s + o.total, 0);

  const dayHourlyMap = new Map<number, { revenue: number; count: number }>();
  for (let h = 0; h < 24; h++) dayHourlyMap.set(h, { revenue: 0, count: 0 });

  dayPaid.forEach((o) => {
    const h = new Date(o.created_at).getHours();
    const cur = dayHourlyMap.get(h)!;
    cur.revenue += o.total;
    cur.count++;
  });

  const dayDisplayDate = new Date(targetDayStart).toLocaleDateString("ar-DZ", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const dailyDetail: DailyDetailSummary = {
    dateKey: dailyDateStr,
    displayDate: dayDisplayDate,
    totalRevenue: dayRevenue,
    completedCount: dayPaid.length,
    cancelledCount: dayCancelled.length,
    cancelledTotal: dayLost,
    avgTicket: dayPaid.length > 0 ? Math.round(dayRevenue / dayPaid.length) : 0,
    byType: {
      dine_in: {
        count: dayDineIn.length,
        revenue: dayDineInRev,
        percentage:
          dayRevenue > 0 ? Math.round((dayDineInRev / dayRevenue) * 100) : 0,
      },
      takeaway: {
        count: dayTakeaway.length,
        revenue: dayTakeawayRev,
        percentage:
          dayRevenue > 0 ? Math.round((dayTakeawayRev / dayRevenue) * 100) : 0,
      },
      delivery: {
        count: dayDelivery.length,
        revenue: dayDeliveryRev,
        percentage:
          dayRevenue > 0 ? Math.round((dayDeliveryRev / dayRevenue) * 100) : 0,
      },
    },
    hourly: Array.from(dayHourlyMap.entries()).map(([hour, v]) => ({
      hour,
      revenue: v.revenue,
      count: v.count,
    })),
    orders: dayOrders,
  };

  return {
    dateRangeLabel,
    kpis,
    dailyTrend,
    hourlyTrend,
    tables,
    categories,
    topItems,
    bottomItems,
    cashiers,
    cancellations,
    dailyDetail,
  };
}

/* ---------------------------------------------------------------------- */
/* Main Analytics Component                                               */
/* ---------------------------------------------------------------------- */

type AnalyticsTab =
  | "overview"
  | "daily"
  | "tables"
  | "categories"
  | "cashier"
  | "issues";

export default function AnalyticsPage() {
  const { restaurantId, loading: rLoading } = useRestaurantId();
  const [data, setData] = useState<FullAnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [restaurantName, setRestaurantName] = useState<string>("");

  const [activeTab, setActiveTab] = useState<AnalyticsTab>(() => {
    if (typeof window !== "undefined") {
      const v = new URLSearchParams(window.location.search).get("view");
      if (
        v &&
        [
          "overview",
          "daily",
          "tables",
          "categories",
          "cashier",
          "issues",
        ].includes(v)
      ) {
        return v as AnalyticsTab;
      }
    }
    return "overview";
  });

  useEffect(() => {
    const handlePop = () => {
      const v = new URLSearchParams(window.location.search).get("view");
      if (
        v &&
        [
          "overview",
          "daily",
          "tables",
          "categories",
          "cashier",
          "issues",
        ].includes(v)
      ) {
        setActiveTab(v as AnalyticsTab);
      }
    };
    window.addEventListener("popstate", handlePop);
    return () => window.removeEventListener("popstate", handlePop);
  }, []);

  const [preset, setPreset] = useState<DateRangePreset>("month");
  const [customStart, setCustomStart] = useState<Date | undefined>(undefined);
  const [dailyDate, setDailyDate] = useState<string>(() =>
    new Date().toISOString().slice(0, 10),
  );

  useEffect(() => {
    if (!restaurantId) return;
    supabase
      .from("restaurants")
      .select("name")
      .eq("id", restaurantId)
      .maybeSingle()
      .then(({ data }: { data: any }) => setRestaurantName(data?.name ?? ""));
  }, [restaurantId]);

  const refreshData = () => {
    if (!restaurantId) return;
    setLoading(true);
    loadFullAnalyticsReport(restaurantId, preset, customStart, dailyDate)
      .then((d) => setData(d))
      .catch((e) => {
        console.error("[analytics] error loading reports:", e);
        toast.error("فشل تحميل بيانات التقارير");
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    refreshData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restaurantId, preset, customStart, dailyDate]);

  const handleExport = (kind: "pdf" | "excel") => {
    if (!data) return;
    const payload = {
      restaurantName,
      kpis: {
        ordersToday: data.kpis.ordersCount,
        salesToday: data.kpis.totalRevenue,
        avgOrderWeek: data.kpis.avgOrderValue,
        salesMonth: data.kpis.totalRevenue,
        cancelledCount: data.kpis.cancelledCount,
        cancelledRevenue: data.kpis.cancelledRevenue,
      },
      daily: data.dailyTrend.map((d) => ({ date: d.date, total: d.total })),
      topItems: data.topItems.map((i) => ({
        name: i.name,
        qty: i.quantity,
        revenue: i.revenue,
      })),
      bottomItems: data.bottomItems.map((i) => ({
        name: i.name,
        qty: i.quantity,
        revenue: i.revenue,
      })),
      tables: data.tables.map((t) => ({
        tableNumber: t.tableNumber,
        hallName: t.hallName,
        totalRevenue: t.totalRevenue,
        ordersCount: t.ordersCount,
        percentage: t.percentageOfTableSales,
      })),
      categories: data.categories.map((c) => ({
        categoryName: c.categoryName,
        totalRevenue: c.totalRevenue,
        quantitySold: c.quantitySold,
        percentage: c.percentageOfFoodSales,
      })),
      cashiers: data.cashiers.map((c) => ({
        name: c.name,
        totalRevenue: c.totalRevenue,
        ordersCount: c.ordersCount,
        percentage: c.percentageOfTotalSales,
      })),
      cancellations: data.cancellations.cancelledOrders.map((o) => ({
        orderNum: o.daily_number ? `#${o.daily_number}` : `#${o.id.slice(-5)}`,
        reason: o.cancel_reason || "غير محدد",
        amount: o.total,
        time: new Date(o.cancelled_at || o.created_at).toLocaleDateString("ar"),
      })),
    };

    try {
      if (kind === "pdf") exportAnalyticsPDF(payload);
      else exportAnalyticsExcel(payload);
      toast.success(kind === "pdf" ? "تم تصدير PDF" : "تم تصدير Excel");
    } catch (e) {
      console.error(e);
      toast.error("فشل التصدير");
    }
  };

  if (rLoading || (loading && !data)) {
    return (
      <div className="space-y-6">
        <div className="h-12 rounded-2xl bg-muted animate-pulse" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 rounded-2xl bg-muted animate-pulse" />
          ))}
        </div>
        <div className="h-72 rounded-2xl bg-muted animate-pulse" />
      </div>
    );
  }

  if (!data) return null;

  const TABS: Array<{
    id: AnalyticsTab;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: number | null;
  }> = [
    { id: "overview", label: "نظرة عامة", icon: LayoutDashboard },
    { id: "daily", label: "تقرير اليوم المفصل", icon: CalendarDays },
    { id: "tables", label: "إحصائيات الطاولات", icon: Utensils },
    { id: "categories", label: "عائلات الأصناف", icon: Layers },
    { id: "cashier", label: "أداء الكاشير", icon: Users },
    {
      id: "issues",
      label: "الطلبات الملغاة والمشاكل",
      icon: AlertOctagon,
      badge: data.cancellations.count > 0 ? data.cancellations.count : null,
    },
  ];

  return (
    <div className="space-y-6 text-right" dir="rtl">
      {/* Top Header Bar */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-card border border-border rounded-2xl p-4">
        <div>
          <h2 className="text-xl font-black text-foreground">
            التقارير التفصيلية والإحصائيات
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            متابعة شاملة للمبيعات، الطاولات الأكثر طلباً، عائلات الأصناف، أداء الكاشير، وأسباب الإلغاء
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Preset Selector */}
          <Select
            value={preset}
            onValueChange={(v) => setPreset(v as DateRangePreset)}
          >
            <SelectTrigger className="w-36 h-9 rounded-xl text-xs font-bold">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">اليوم</SelectItem>
              <SelectItem value="yesterday">أمس</SelectItem>
              <SelectItem value="week">آخر 7 أيام</SelectItem>
              <SelectItem value="month">آخر 30 يوم</SelectItem>
              <SelectItem value="custom">تاريخ مخصص</SelectItem>
            </SelectContent>
          </Select>

          {preset === "custom" && (
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className={cn(
                    "h-9 gap-1.5 text-xs font-bold rounded-xl",
                    !customStart && "text-muted-foreground",
                  )}
                >
                  <CalendarIcon className="w-3.5 h-3.5" />
                  {customStart ? fmtDateKey(customStart) : "اختر البداية"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <Calendar
                  mode="single"
                  selected={customStart}
                  onSelect={setCustomStart}
                  initialFocus
                  className="p-3"
                />
              </PopoverContent>
            </Popover>
          )}

          {/* Export buttons */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleExport("excel")}
            className="h-9 gap-1.5 text-xs font-bold rounded-xl"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
            Excel
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleExport("pdf")}
            className="h-9 gap-1.5 text-xs font-bold rounded-xl"
          >
            <FileText className="w-3.5 h-3.5 text-rose-600" />
            PDF
          </Button>
        </div>
      </div>

      {/* Main Navigation Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-b border-border/80">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          const isDanger = tab.id === "issues";

          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                isActive
                  ? isDanger
                    ? "bg-destructive text-destructive-foreground shadow-sm"
                    : "bg-primary text-primary-foreground shadow-sm"
                  : isDanger && tab.badge
                    ? "text-destructive hover:bg-destructive/10"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary/70"
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span>{tab.label}</span>
              {tab.badge != null && (
                <span
                  className={`px-1.5 py-0.5 rounded-md text-[10px] font-black ${
                    isActive
                      ? "bg-white/20 text-white"
                      : "bg-destructive/15 text-destructive"
                  }`}
                >
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Tab Contents */}
      <div className="pt-2">
        {activeTab === "overview" && (
          <div className="space-y-6">
            {/* Overview KPIs */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-card border border-border rounded-2xl p-5 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-muted-foreground">
                    إجمالي المبيعات ({data.dateRangeLabel})
                  </span>
                  <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                    <DollarSign className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-2xl sm:text-3xl font-black text-foreground tabular-nums">
                  {formatDZD(data.kpis.totalRevenue)}
                </div>
                <div className="text-[11px] text-muted-foreground">
                  المبيعات المدفوعة المحصلة
                </div>
              </div>

              <div className="bg-card border border-border rounded-2xl p-5 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-muted-foreground">
                    الطلبات المكتملة
                  </span>
                  <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                    <ShoppingBag className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-2xl sm:text-3xl font-black text-foreground tabular-nums">
                  {data.kpis.ordersCount}
                </div>
                <div className="text-[11px] text-muted-foreground">
                  طلب ناجح تم تحضيره
                </div>
              </div>

              <div className="bg-card border border-border rounded-2xl p-5 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-muted-foreground">
                    متوسط الفاتورة
                  </span>
                  <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center">
                    <Receipt className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-2xl sm:text-3xl font-black text-foreground tabular-nums">
                  {formatDZD(data.kpis.avgOrderValue)}
                </div>
                <div className="text-[11px] text-muted-foreground">
                  متوسط إنفاق الطلب الواحد
                </div>
              </div>

              {/* Cancelled Loss in Alert Box */}
              <div
                onClick={() => setActiveTab("issues")}
                className="bg-destructive/10 border border-destructive/25 rounded-2xl p-5 space-y-2 cursor-pointer transition-all hover:bg-destructive/15"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-destructive">
                    خسائر الإلغاء ({data.kpis.cancelledCount} طلب)
                  </span>
                  <div className="w-9 h-9 rounded-xl bg-destructive/20 text-destructive flex items-center justify-center">
                    <AlertOctagon className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-2xl sm:text-3xl font-black text-destructive tabular-nums">
                  {data.kpis.cancelledCount > 0
                    ? `-${formatDZD(data.kpis.cancelledRevenue)}`
                    : "0 دج"}
                </div>
                <div className="text-[11px] font-bold text-destructive/80 flex items-center justify-between">
                  <span>معدل الإلغاء: {data.kpis.cancellationRate}%</span>
                  <span>عرض التفاصيل ←</span>
                </div>
              </div>
            </div>

            {/* Channels Breakdown */}
            <div className="bg-card border border-border rounded-2xl p-5 space-y-3">
              <h3 className="text-sm font-bold text-foreground">
                توزيع المبيعات حسب القناة
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="p-3.5 rounded-xl border border-border bg-muted/30 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <UtensilsCrossed className="w-5 h-5 text-primary" />
                    <div>
                      <div className="text-xs font-bold text-foreground">
                        مبيعات الصالة (الطاولات)
                      </div>
                      <div className="text-[11px] text-muted-foreground">
                        {data.kpis.totalRevenue > 0
                          ? Math.round(
                              (data.kpis.dineInRevenue /
                                data.kpis.totalRevenue) *
                                100,
                            )
                          : 0}
                        % من الإجمالي
                      </div>
                    </div>
                  </div>
                  <div className="text-base font-black text-foreground tabular-nums">
                    {formatDZD(data.kpis.dineInRevenue)}
                  </div>
                </div>

                <div className="p-3.5 rounded-xl border border-border bg-muted/30 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <ShoppingBag className="w-5 h-5 text-[#3D6F9E]" />
                    <div>
                      <div className="text-xs font-bold text-foreground">
                        طلبات سفري (استلام)
                      </div>
                      <div className="text-[11px] text-muted-foreground">
                        {data.kpis.totalRevenue > 0
                          ? Math.round(
                              (data.kpis.takeawayRevenue /
                                data.kpis.totalRevenue) *
                                100,
                            )
                          : 0}
                        % من الإجمالي
                      </div>
                    </div>
                  </div>
                  <div className="text-base font-black text-foreground tabular-nums">
                    {formatDZD(data.kpis.takeawayRevenue)}
                  </div>
                </div>

                <div className="p-3.5 rounded-xl border border-border bg-muted/30 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <Bike className="w-5 h-5 text-amber-500" />
                    <div>
                      <div className="text-xs font-bold text-foreground">
                        طلبات التوصيل
                      </div>
                      <div className="text-[11px] text-muted-foreground">
                        {data.kpis.totalRevenue > 0
                          ? Math.round(
                              (data.kpis.deliveryRevenue /
                                data.kpis.totalRevenue) *
                                100,
                            )
                          : 0}
                        % من الإجمالي
                      </div>
                    </div>
                  </div>
                  <div className="text-base font-black text-foreground tabular-nums">
                    {formatDZD(data.kpis.deliveryRevenue)}
                  </div>
                </div>
              </div>
            </div>

            {/* Daily Trend Area Chart */}
            <div className="bg-card border border-border rounded-2xl p-5 md:p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-foreground">
                    تطور المبيعات اليومية
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    آخر 30 يوماً من النشاط
                  </p>
                </div>
              </div>

              <div className="h-64" dir="ltr">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={data.dailyTrend.map((d) => ({
                      label: d.date.slice(5),
                      total: d.total,
                    }))}
                  >
                    <defs>
                      <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.4} />
                        <stop offset="100%" stopColor="var(--primary)" stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="4 8" stroke="var(--border)" strokeOpacity={0.6} vertical={false} />
                    <XAxis dataKey="label" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} width={45} />
                    <Tooltip
                      content={({ active, payload, label }) => {
                        if (!active || !payload?.length) return null;
                        const v = payload[0].value as number;
                        return (
                          <div className="bg-card border border-border rounded-xl p-3 text-xs shadow-md">
                            <div className="text-muted-foreground mb-1">
                              التاريخ: {label}
                            </div>
                            <div className="font-bold text-foreground">
                              المبيعات: {formatDZD(v)}
                            </div>
                          </div>
                        );
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="total"
                      stroke="var(--primary)"
                      strokeWidth={2}
                      fill="url(#areaGrad)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Peak Hours Chart */}
            <div className="bg-card border border-border rounded-2xl p-5 md:p-6 space-y-4">
              <div>
                <h3 className="text-base font-bold text-foreground">
                  ساعات الذروة
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  أوقات الازدحام على مدار الـ 24 ساعة
                </p>
              </div>

              <div className="h-56" dir="ltr">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.hourlyTrend}>
                    <CartesianGrid strokeDasharray="4 8" stroke="var(--border)" strokeOpacity={0.6} vertical={false} />
                    <XAxis
                      dataKey="hour"
                      tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(h) => `${h}:00`}
                    />
                    <YAxis tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} width={30} />
                    <Tooltip
                      content={({ active, payload, label }) => {
                        if (!active || !payload?.length) return null;
                        const item = payload[0].payload;
                        return (
                          <div className="bg-card border border-border rounded-xl p-3 text-xs shadow-md">
                            <div className="font-bold text-foreground mb-1">
                              الساعة {label}:00
                            </div>
                            <div className="text-muted-foreground">
                              الطلبات: {item.count}
                            </div>
                            <div className="text-primary font-bold mt-1">
                              المبيعات: {formatDZD(item.revenue)}
                            </div>
                          </div>
                        );
                      }}
                    />
                    <Bar
                      dataKey="count"
                      fill="var(--primary)"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {activeTab === "daily" && (
          <DailyReportTab
            daily={data.dailyDetail}
            selectedDate={dailyDate}
            onDateChange={setDailyDate}
          />
        )}

        {activeTab === "tables" && (
          <TablesReportTab
            tables={data.tables}
            totalDineInRevenue={data.kpis.dineInRevenue}
          />
        )}

        {activeTab === "categories" && (
          <CategoriesReportTab
            categories={data.categories}
            topItems={data.topItems}
            bottomItems={data.bottomItems}
            totalSales={data.kpis.totalRevenue}
          />
        )}

        {activeTab === "cashier" && (
          <CashierReportTab
            cashiers={data.cashiers}
            totalSales={data.kpis.totalRevenue}
          />
        )}

        {activeTab === "issues" && (
          <CancellationsReportTab
            cancellations={data.cancellations}
            totalOrdersCount={data.kpis.ordersCount + data.kpis.cancelledCount}
          />
        )}
      </div>
    </div>
  );
}
