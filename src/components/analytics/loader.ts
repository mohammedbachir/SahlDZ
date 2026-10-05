import { supabase } from "@/integrations/supabase/client";
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
} from "./types";

export function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export function endOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

export function fmtDateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}

export async function loadFullAnalyticsReport(
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
    startDate = customStart
      ? startOfDay(customStart)
      : startOfDay(new Date(Date.now() - 30 * 86400000));
    endDate = todayEnd;
    dateRangeLabel = `من ${fmtDateKey(startDate)} إلى اليوم`;
  }

  // Fetch orders from 30 days before start date for historical comparisons
  const fetchSince = new Date(startDate);
  fetchSince.setDate(fetchSince.getDate() - 31);

  const [ordersRes, tablesRes, hallsRes, catsRes, menuRes, staffRes] =
    await Promise.all([
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
      .select(
        "id, order_id, menu_item_id, category_id, name_snapshot, price_snapshot, quantity",
      )
      .in("order_id", chunk);

    if (chunkData?.length) {
      chunkData.forEach((it: any) => {
        rawItems.push({
          id: it.id,
          order_id: it.order_id,
          menu_item_id: it.menu_item_id ?? null,
          category_id:
            it.category_id ??
            (it.menu_item_id ? itemCatMap.get(it.menu_item_id) : null),
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
  const avgOrderValue =
    ordersCount > 0 ? Math.round(totalRevenue / ordersCount) : 0;

  const cancelledCount = cancelledOrders.length;
  const cancelledRevenue = cancelledOrders.reduce((sum, o) => sum + o.total, 0);
  const totalIncoming = ordersCount + cancelledCount;
  const cancellationRate =
    totalIncoming > 0 ? Math.round((cancelledCount / totalIncoming) * 100) : 0;

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
          agg.ordersCount > 0
            ? Math.round(agg.totalRevenue / agg.ordersCount)
            : 0,
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
      const catName =
        catMap.get(catId) ??
        (catId === "uncategorized" ? "أصناف أخرى" : "تصنيف عام");
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
      imageUrl: item.menuItemId
        ? itemImgMap.get(item.menuItemId) ?? null
        : null,
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
          data.ordersCount > 0
            ? Math.round(data.totalRevenue / data.ordersCount)
            : 0,
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
        cancelledCount > 0 ? Math.round((val.count / cancelledCount) * 100) : 0;
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
