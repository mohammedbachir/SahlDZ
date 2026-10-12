import { useCallback, useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { requireOpsAccess } from "@/lib/permissions";
import {
  BarChart3,
  Printer,
  Loader2,
  Calendar as CalendarIcon,
  CalendarDays,
  Utensils,
  Layers,
  Users,
  AlertOctagon,
  Calculator,
  FileSpreadsheet,
  FileText,
  DollarSign,
  TrendingUp,
  Receipt,
  UtensilsCrossed,
  Bike,
  ShoppingBag,
  Search,
  Wallet,
  CheckCircle2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useRestaurantId, formatDZD } from "@/lib/restaurant";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { tx } from "@/lib/ops-tx";
import { toast } from "sonner";
import { exportAnalyticsExcel, exportAnalyticsPDF } from "@/lib/exportReports";

import type {
  FullAnalyticsData,
  DateRangePreset,
} from "@/components/analytics/types";
import { loadFullAnalyticsReport } from "@/components/analytics/loader";
import { DailyReportTab } from "@/components/analytics/DailyReportTab";
import { TablesReportTab } from "@/components/analytics/TablesReportTab";
import { CategoriesReportTab } from "@/components/analytics/CategoriesReportTab";
import { CashierReportTab } from "@/components/analytics/CashierReportTab";
import { CancellationsReportTab } from "@/components/analytics/CancellationsReportTab";

export const Route = createFileRoute("/ops/reports")({
  beforeLoad: requireOpsAccess("reports"),
  component: OpsReports,
});

type ReportData = {
  revenue: number;
  ordersCount: number;
  purchases: number;
  salaries: number;
  wasteCost: number;
  totalExpenses: number;
  netProfit: number;
  avgOrder: number;
  discounts: number;
  debts: number;
};

type PaymentRow = {
  id: string;
  order_id: string;
  daily_number: number | null;
  table_number: number | null;
  order_type: string;
  customer_name: string | null;
  customer_phone: string | null;
  mode: string;
  total: number;
  paid: number;
  debt: number;
  discount: number;
  settled?: boolean;
  created_at: string;
};

type RestaurantInfo = {
  name: string;
  phone: string | null;
  address: string | null;
};

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function paymentModeLabel(mode: string): string {
  return mode === "full"
    ? "دفع كامل"
    : mode === "partial"
      ? "دفع جزئي"
      : mode === "debt"
        ? "دين"
        : mode === "gift"
          ? "إهداء"
          : mode === "prepayment"
            ? "دفعة مقدمة"
            : mode;
}

function orderTypeLabel(t: string): string {
  return t === "takeaway" ? "سفري" : t === "delivery" ? "توصيل" : "قاعة";
}

type OpsReportTab =
  | "daily"
  | "tables"
  | "categories"
  | "cashier"
  | "issues"
  | "financial";

function startOfMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function OpsReports() {
  const { restaurantId } = useRestaurantId();

  // Tab selection: Defaults to "daily" so owner immediately sees today's report
  const [activeTab, setActiveTab] = useState<OpsReportTab>("daily");

  // Detailed Analytics Data
  const [analyticsData, setAnalyticsData] = useState<FullAnalyticsData | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(true);
  const [preset, setPreset] = useState<DateRangePreset>("month");
  const [dailyDate, setDailyDate] = useState<string>(today());
  const [restaurantName, setRestaurantName] = useState<string>("");

  // Ledger / Accounting Data
  const [report, setReport] = useState<ReportData | null>(null);
  const [ledgerLoading, setLedgerLoading] = useState(true);
  const [from, setFrom] = useState(startOfMonth());
  const [to, setTo] = useState(today());

  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [paymentsLoading, setPaymentsLoading] = useState(false);
  const [paySearch, setPaySearch] = useState("");
  const [settlingId, setSettlingId] = useState<string | null>(null);
  const [restInfo, setRestInfo] = useState<RestaurantInfo | null>(null);

  const loadPayments = useCallback(async () => {
    if (!restaurantId) return;
    setPaymentsLoading(true);
    try {
      const { data } = await supabase
        .from("payments")
        .select("*")
        .eq("restaurant_id", restaurantId);
      const rows = ((data as PaymentRow[]) ?? [])
        .slice()
        .sort((a, b) =>
          String(b.created_at).localeCompare(String(a.created_at)),
        );
      setPayments(rows);
    } catch {
      setPayments([]);
    } finally {
      setPaymentsLoading(false);
    }
  }, [restaurantId]);

  useEffect(() => {
    if (restaurantId === undefined || !restaurantId) return;
    void loadPayments();
    (async () => {
      const { data } = await supabase
        .from("restaurants")
        .select("name,phone,address")
        .eq("id", restaurantId)
        .maybeSingle();
      if (data)
        setRestInfo({
          name: (data as any).name ?? "",
          phone: (data as any).phone ?? null,
          address: (data as any).address ?? null,
        });
    })();
  }, [restaurantId, loadPayments]);

  // Restaurant Name
  useEffect(() => {
    if (!restaurantId) return;
    supabase
      .from("restaurants")
      .select("name")
      .eq("id", restaurantId)
      .maybeSingle()
      .then((res: any) => setRestaurantName(res.data?.name ?? ""));
  }, [restaurantId]);

  // Load Detailed Reports
  const refreshAnalytics = () => {
    if (!restaurantId) return;
    setAnalyticsLoading(true);
    loadFullAnalyticsReport(restaurantId, preset, undefined, dailyDate)
      .then((d) => setAnalyticsData(d))
      .catch((e) => {
        console.error("[ops.reports] analytics error:", e);
        toast.error("فشل تحميل التقارير اليومية");
      })
      .finally(() => setAnalyticsLoading(false));
  };

  useEffect(() => {
    refreshAnalytics();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restaurantId, preset, dailyDate]);

  // Load Ledger
  useEffect(() => {
    if (restaurantId === undefined) return;
    if (!restaurantId) {
      setReport({
        revenue: 0,
        ordersCount: 0,
        purchases: 0,
        salaries: 0,
        wasteCost: 0,
        totalExpenses: 0,
        netProfit: 0,
        avgOrder: 0,
        discounts: 0,
        debts: 0,
      });
      setLedgerLoading(false);
      return;
    }
    let cancel = false;
    (async () => {
      setLedgerLoading(true);
      const [ordersRes, purchasesRes, salariesRes, wasteRes] = await Promise.all([
        supabase
          .from("orders")
          .select("total,paid_amount,debt_amount,discount_amount,payment_mode")
          .eq("restaurant_id", restaurantId)
          .eq("status", "paid")
          .gte("created_at", from + "T00:00:00")
          .lte("created_at", to + "T23:59:59"),
        supabase
          .from("purchase_orders")
          .select("total")
          .eq("restaurant_id", restaurantId)
          .gte("created_at", from + "T00:00:00")
          .lte("created_at", to + "T23:59:59"),
        supabase
          .from("employee_salary_payments")
          .select("net_salary")
          .eq("restaurant_id", restaurantId)
          .gte("paid_at", from + "T00:00:00")
          .lte("paid_at", to + "T23:59:59"),
        supabase
          .from("waste_logs")
          .select("cost")
          .eq("restaurant_id", restaurantId)
          .gte("created_at", from + "T00:00:00")
          .lte("created_at", to + "T23:59:59"),
      ]);

      if (cancel) return;

      const orders = ordersRes.data ?? [];
      // Revenue = cash actually collected (paid_amount), falling back to the
      // full total for legacy paid orders that predate payment breakdowns.
      const revenue = orders.reduce(
        (s: number, o: any) => s + Number(o.paid_amount ?? o.total ?? 0),
        0,
      );
      const discounts = orders.reduce(
        (s: number, o: any) => s + Number(o.discount_amount ?? 0),
        0,
      );
      const debts = orders.reduce(
        (s: number, o: any) => s + Number(o.debt_amount ?? 0),
        0,
      );
      const ordersCount = orders.length;
      const purchases = (purchasesRes.data ?? []).reduce(
        (s: number, p: any) => s + Number(p.total ?? 0),
        0,
      );
      const salaries = (salariesRes.data ?? []).reduce(
        (s: number, p: any) => s + Number(p.net_salary ?? 0),
        0,
      );
      const wasteCost = (wasteRes.data ?? []).reduce(
        (s: number, w: any) => s + Number(w.cost ?? 0),
        0,
      );
      const totalExpenses = purchases + salaries + wasteCost;

      setReport({
        revenue,
        ordersCount,
        purchases,
        salaries,
        wasteCost,
        totalExpenses,
        netProfit: revenue - totalExpenses,
        avgOrder: ordersCount > 0 ? Math.round(revenue / ordersCount) : 0,
        discounts,
        debts,
      });
      setLedgerLoading(false);
    })();
    return () => {
      cancel = true;
    };
  }, [restaurantId, from, to]);

  const profitPct =
    report && report.revenue > 0
      ? Math.round((report.netProfit / report.revenue) * 100)
      : 0;

  function printReport() {
    if (!report) return;
    const w = window.open("", "_blank", "width=420,height=600");
    if (!w) return;
    const html = `<!doctype html>
<html dir="rtl" lang="ar"><head><meta charset="utf-8"/><title>تقرير مالي</title>
<style>
  @page{size:80mm auto;margin:4mm}body{font-family:'Cairo',system-ui,sans-serif;width:72mm;margin:0 auto;color:#000}
  .center{text-align:center}.name{font-size:18px;font-weight:800}.muted{color:#555;font-size:12px}
  hr{border:none;border-top:1px dashed #000;margin:8px 0}
  .row{font-size:13px;display:flex;justify-content:space-between;padding:3px 0}
  .total{font-size:15px;font-weight:800;display:flex;justify-content:space-between}
</style></head><body>
  <div class="center"><div class="name">${restaurantName || "تقرير الفترة المالية"}</div>
    <div class="muted">${from} — ${to}</div></div><hr/>
  <div class="total"><span>الإيرادات</span><span>${report.revenue.toLocaleString("en-US")} دج</span></div>
  <div class="row"><span>عدد الطلبات</span><span>${report.ordersCount}</span></div>
  <div class="row"><span>متوسط الطلب</span><span>${report.avgOrder.toLocaleString("en-US")} دج</span></div>
  <hr/>
  <div class="row"><span>المشتريات</span><span>${report.purchases.toLocaleString("en-US")} دج</span></div>
  <div class="row"><span>الرواتب</span><span>${report.salaries.toLocaleString("en-US")} دج</span></div>
  <div class="row"><span>الهدر</span><span>${report.wasteCost.toLocaleString("en-US")} دج</span></div>
  <div class="total"><span>إجمالي المصروفات</span><span>${report.totalExpenses.toLocaleString("en-US")} دج</span></div>
  <hr/>
  <div class="total"><span>صافي الربح</span><span>${report.netProfit.toLocaleString("en-US")} دج</span></div>
  <script>window.onload=function(){window.focus();window.print();setTimeout(function(){window.close()},300)}</script>
</body></html>`;
    w.document.open();
    w.document.write(html);
    w.document.close();
  }

  const handleExport = (kind: "pdf" | "excel") => {
    if (!analyticsData) return;
    const payload = {
      restaurantName,
      kpis: {
        ordersToday: analyticsData.kpis.ordersCount,
        salesToday: analyticsData.kpis.totalRevenue,
        avgOrderWeek: analyticsData.kpis.avgOrderValue,
        salesMonth: analyticsData.kpis.totalRevenue,
        cancelledCount: analyticsData.kpis.cancelledCount,
        cancelledRevenue: analyticsData.kpis.cancelledRevenue,
      },
      daily: analyticsData.dailyTrend.map((d) => ({ date: d.date, total: d.total })),
      topItems: analyticsData.topItems.map((i) => ({
        name: i.name,
        qty: i.quantity,
        revenue: i.revenue,
      })),
      bottomItems: analyticsData.bottomItems.map((i) => ({
        name: i.name,
        qty: i.quantity,
        revenue: i.revenue,
      })),
      tables: analyticsData.tables.map((t) => ({
        tableNumber: t.tableNumber,
        hallName: t.hallName,
        totalRevenue: t.totalRevenue,
        ordersCount: t.ordersCount,
        percentage: t.percentageOfTableSales,
      })),
      categories: analyticsData.categories.map((c) => ({
        categoryName: c.categoryName,
        totalRevenue: c.totalRevenue,
        quantitySold: c.quantitySold,
        percentage: c.percentageOfFoodSales,
      })),
      cashiers: analyticsData.cashiers.map((c) => ({
        name: c.name,
        totalRevenue: c.totalRevenue,
        ordersCount: c.ordersCount,
        percentage: c.percentageOfTotalSales,
      })),
      cancellations: analyticsData.cancellations.cancelledOrders.map((o) => ({
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

  const TABS: Array<{
    id: OpsReportTab;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: number | null;
  }> = [
    { id: "daily", label: "تقرير اليوم المفصل", icon: CalendarDays },
    { id: "tables", label: "إحصائيات الطاولات ونسبها", icon: Utensils },
    { id: "categories", label: "عائلات الأصناف", icon: Layers },
    { id: "cashier", label: "أداء الكاشير", icon: Users },
    {
      id: "issues",
      label: "الطلبات الملغاة والمشاكل",
      icon: AlertOctagon,
      badge:
        analyticsData && analyticsData.cancellations.count > 0
          ? analyticsData.cancellations.count
          : null,
    },
    { id: "financial", label: "كشف الحساب والبيان المالي", icon: Calculator },
  ];

  function printPaymentReceipt(p: PaymentRow) {
    const w = window.open("", "_blank", "width=420,height=600");
    if (!w) return;
    const dateStr = new Date(p.created_at).toLocaleString("ar", {
      dateStyle: "short",
      timeStyle: "short",
    });
    const orderNo =
      p.daily_number != null ? String(p.daily_number).padStart(3, "0") : "—";
    const html = `<!doctype html>
<html dir="rtl" lang="ar"><head><meta charset="utf-8"/><title>إيصال - ${orderNo}</title>
<style>
  @page{size:80mm auto;margin:4mm}body{font-family:'Cairo',system-ui,sans-serif;width:72mm;margin:0 auto;color:#000}
  .center{text-align:center}.name{font-size:18px;font-weight:800}.muted{color:#555;font-size:12px}
  hr{border:none;border-top:1px dashed #000;margin:8px 0}
  .row{font-size:13px;display:flex;justify-content:space-between;padding:3px 0}
  .total{font-size:15px;font-weight:800;display:flex;justify-content:space-between}
</style></head><body>
  <div class="center"><div class="name">${escapeHtml(restInfo?.name ?? "")}</div>
    ${restInfo?.phone ? `<div class="muted">${escapeHtml(restInfo.phone)}</div>` : ""}
    ${restInfo?.address ? `<div class="muted">${escapeHtml(restInfo.address)}</div>` : ""}
    <div class="muted">إيصال دفع</div></div><hr/>
  <div class="muted">
    <div>رقم الطلب <b>${orderNo}</b></div>
    ${p.order_type === "takeaway" ? "<div>سفري</div>" : p.order_type === "delivery" ? "<div>توصيل</div>" : p.table_number != null ? `<div>الطاولة <b>${p.table_number}</b></div>` : ""}
    ${p.customer_name ? `<div>${escapeHtml(p.customer_name)}</div>` : ""}
    ${p.customer_phone ? `<div>${escapeHtml(p.customer_phone)}</div>` : ""}
    <div>${dateStr}</div>
  </div><hr/>
  <div class="row"><span>طريقة الدفع</span><span>${paymentModeLabel(p.mode)}</span></div>
  <div class="row"><span>الإجمالي</span><span>${Number(p.total).toLocaleString("en-US")} دج</span></div>
  <div class="row"><span>المدفوع</span><span>${Number(p.paid).toLocaleString("en-US")} دج</span></div>
  ${Number(p.discount) > 0 ? `<div class="row"><span>الخصم</span><span>${Number(p.discount).toLocaleString("en-US")} دج</span></div>` : ""}
  ${Number(p.debt) > 0 ? `<div class="total"><span>الدين المتبقي</span><span>${Number(p.debt).toLocaleString("en-US")} دج</span></div>` : ""}
  <hr/><div class="center muted">شكراً لتعاملكم معنا</div>
  <script>window.onload=function(){window.focus();window.print();setTimeout(function(){window.close()},300)}</script>
</body></html>`;
    w.document.open();
    w.document.write(html);
    w.document.close();
  }

  async function settleDebt(p: PaymentRow) {
    if (!restaurantId) return;
    setSettlingId(p.id);
    try {
      await supabase
        .from("payments")
        .update({ debt: 0, settled: true, settled_at: new Date().toISOString() })
        .eq("id", p.id);
      setPayments((prev) =>
        prev.map((x) => (x.id === p.id ? { ...x, debt: 0, settled: true } : x)),
      );
    } finally {
      setSettlingId(null);
    }
  }

  const filteredPayments = payments.filter((p) => {
    const q = paySearch.trim();
    if (!q) return true;
    return (
      String(p.daily_number ?? "").includes(q) ||
      String(p.table_number ?? "").includes(q) ||
      (p.customer_name ?? "").includes(q) ||
      (p.customer_phone ?? "").includes(q)
    );
  });
  const debtPayments = payments.filter((p) => Number(p.debt) > 0);
  const debtTotal = debtPayments.reduce((s, p) => s + Number(p.debt ?? 0), 0);

  return (
    <div className="space-y-4 text-right" dir="rtl">
      {/* Contextual Page Toolbar */}
      <div className="rounded-sm border border-border bg-card p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-sm bg-secondary text-foreground flex items-center justify-center shrink-0 border border-border">
            <BarChart3 className="w-4 h-4 text-primary" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-foreground">
              {tx("مركز التقارير اليومية والأداء التشغيلي")}
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              {tx("مبيعات اليوم، إحصائيات الطاولات والأصناف، سجل الإلغاء، وأداء موظفي الصندوق")}
            </p>
          </div>
        </div>

        {/* Global Toolbar Actions */}
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          {activeTab !== "financial" && activeTab !== "daily" && (
            <Select
              value={preset}
              onValueChange={(v) => setPreset(v as DateRangePreset)}
            >
              <SelectTrigger className="w-32 h-8 rounded-sm text-xs font-medium">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="today">اليوم</SelectItem>
                <SelectItem value="yesterday">أمس</SelectItem>
                <SelectItem value="week">آخر 7 أيام</SelectItem>
                <SelectItem value="month">آخر 30 يوم</SelectItem>
              </SelectContent>
            </Select>
          )}

          {activeTab !== "financial" && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleExport("excel")}
                className="h-8 gap-1.5 text-xs font-medium rounded-sm"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-700" />
                <span>Excel</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleExport("pdf")}
                className="h-8 gap-1.5 text-xs font-medium rounded-sm"
              >
                <FileText className="w-3.5 h-3.5 text-[#B33F35]" />
                <span>PDF</span>
              </Button>
            </>
          )}

          {activeTab === "financial" && (
            <Button
              variant="outline"
              size="sm"
              onClick={printReport}
              disabled={!report || ledgerLoading}
              className="h-8 gap-1.5 rounded-sm text-xs font-medium"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>{tx("طباعة البيان المالي")}</span>
            </Button>
          )}
        </div>
      </div>

      {/* Main Tab Navigation - Administrative Ledger Tabstrip */}
      <div className="flex items-center gap-1 overflow-x-auto pb-0 border-b border-border bg-card/60 p-1 rounded-sm border">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          const isDanger = tab.id === "issues";

          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-sm text-xs font-medium whitespace-nowrap transition-colors cursor-pointer ${
                isActive
                  ? isDanger
                    ? "bg-[#B33F35] text-white font-semibold"
                    : "bg-primary text-primary-foreground font-semibold"
                  : isDanger && tab.badge
                    ? "text-[#B33F35] bg-[#B33F35]/10 hover:bg-[#B33F35]/15"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary/60"
              }`}
            >
              <Icon className="w-3.5 h-3.5 shrink-0" />
              <span>{tab.label}</span>
              {tab.badge != null && (
                <span
                  className={`px-1.5 py-0.2 rounded-sm text-[10px] font-bold ${
                    isActive
                      ? "bg-white/25 text-white"
                      : "bg-[#B33F35]/15 text-[#B33F35]"
                  }`}
                >
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Tab 1: Detailed Daily Report */}
      {activeTab === "daily" && (
        <div>
          {analyticsLoading && !analyticsData ? (
            <div className="rounded-2xl border border-border bg-card p-12 flex items-center justify-center">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : analyticsData ? (
            <DailyReportTab
              daily={analyticsData.dailyDetail}
              selectedDate={dailyDate}
              onDateChange={setDailyDate}
            />
          ) : null}
        </div>
      )}

      {/* Tab 2: Tables Performance & Share */}
      {activeTab === "tables" && (
        <div>
          {analyticsLoading && !analyticsData ? (
            <div className="rounded-2xl border border-border bg-card p-12 flex items-center justify-center">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : analyticsData ? (
            <TablesReportTab
              tables={analyticsData.tables}
              totalDineInRevenue={analyticsData.kpis.dineInRevenue}
            />
          ) : null}
        </div>
      )}

      {/* Tab 3: Categories & Dish Families */}
      {activeTab === "categories" && (
        <div>
          {analyticsLoading && !analyticsData ? (
            <div className="rounded-2xl border border-border bg-card p-12 flex items-center justify-center">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : analyticsData ? (
            <CategoriesReportTab
              categories={analyticsData.categories}
              topItems={analyticsData.topItems}
              bottomItems={analyticsData.bottomItems}
              totalSales={analyticsData.kpis.totalRevenue}
            />
          ) : null}
        </div>
      )}

      {/* Tab 4: Cashier & Staff Performance */}
      {activeTab === "cashier" && (
        <div>
          {analyticsLoading && !analyticsData ? (
            <div className="rounded-2xl border border-border bg-card p-12 flex items-center justify-center">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : analyticsData ? (
            <CashierReportTab
              cashiers={analyticsData.cashiers}
              totalSales={analyticsData.kpis.totalRevenue}
            />
          ) : null}
        </div>
      )}

      {/* Tab 5: Cancellations & Issues with Warning Colors */}
      {activeTab === "issues" && (
        <div>
          {analyticsLoading && !analyticsData ? (
            <div className="rounded-2xl border border-border bg-card p-12 flex items-center justify-center">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : analyticsData ? (
            <CancellationsReportTab
              cancellations={analyticsData.cancellations}
              totalOrdersCount={
                analyticsData.kpis.ordersCount +
                analyticsData.kpis.cancelledCount
              }
            />
          ) : null}
        </div>
      )}

      {/* Tab 6: Financial Statement Ledger */}
      {activeTab === "financial" && (
        <div className="space-y-4">
          {/* Date range filter for ledger */}
          <div className="flex items-center gap-1.5 border border-border rounded-xl px-3 py-1.5 bg-card text-xs w-fit">
            <CalendarIcon className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
            <span className="text-[11px] text-muted-foreground">{tx("من")}</span>
            <Input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="h-6 w-28 text-xs border-0 bg-transparent p-0 focus-visible:ring-0"
            />
            <span className="text-border">·</span>
            <span className="text-[11px] text-muted-foreground">{tx("إلى")}</span>
            <Input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="h-6 w-28 text-xs border-0 bg-transparent p-0 focus-visible:ring-0"
            />
          </div>

          {ledgerLoading ? (
            <div className="rounded-sm border border-border bg-card p-12 flex items-center justify-center">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          ) : report ? (
            <div className="space-y-4">
              {/* Horizontal Financial Summary Ribbon */}
              <div className="rounded-sm border border-border bg-card overflow-hidden grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x sm:divide-x-reverse divide-border">
                <div className="p-3.5 flex flex-col justify-between">
                  <span className="text-xs font-medium text-muted-foreground">
                    {tx("إجمالي الإيرادات")}
                  </span>
                  <div className="text-xl font-bold text-foreground tabular-nums my-1">
                    {formatDZD(report.revenue)}
                  </div>
                  <span className="text-[11px] text-muted-foreground">
                    {report.ordersCount} {tx("طلب")} · {tx("متوسط")}{" "}
                    {formatDZD(report.avgOrder)}
                  </span>
                </div>

                <div className="p-3.5 flex flex-col justify-between">
                  <span className="text-xs font-medium text-muted-foreground">
                    {tx("إجمالي المصروفات")}
                  </span>
                  <div className="text-xl font-bold text-foreground tabular-nums my-1">
                    {formatDZD(report.totalExpenses)}
                  </div>
                  <span className="text-[11px] text-muted-foreground">
                    {tx("المشتريات + الرواتب + الهدر")}
                  </span>
                </div>

                <div className="p-3.5 flex flex-col justify-between bg-secondary/15">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-muted-foreground">
                      {tx("صافي النتيجة")}
                    </span>
                    <Badge
                      variant={report.netProfit >= 0 ? "success" : "destructive"}
                      className="text-[10px] px-1.5 py-0 rounded-sm"
                    >
                      {report.netProfit >= 0 ? tx("ربح") : tx("خسارة")}
                    </Badge>
                  </div>
                  <div
                    className={`text-xl font-bold tabular-nums my-1 ${
                      report.netProfit >= 0
                        ? "text-[#27734F]"
                        : "text-[#B33F35]"
                    }`}
                  >
                    {report.netProfit >= 0 ? "+" : ""}
                    {formatDZD(report.netProfit)}
                  </div>
                  <span className="text-[11px] text-muted-foreground">
                    {tx("هامش الربح")}: {profitPct}%
                  </span>
                </div>

                <div className="p-3.5 flex flex-col justify-between">
                  <span className="text-xs font-medium text-muted-foreground">
                    {tx("حجم العمليات")}
                  </span>
                  <div className="text-xl font-bold text-foreground tabular-nums my-1">
                    {report.ordersCount} {tx("عملية بيع")}
                  </div>
                  <span className="text-[11px] text-muted-foreground">
                    {tx("خلال الفترة المحددة")}
                  </span>
                </div>
              </div>

              {/* Table-First Income Statement Ledger */}
              <div className="rounded-sm border border-border bg-card overflow-hidden">
                <div className="px-4 py-3 bg-secondary/30 border-b border-border flex items-center justify-between">
                  <h2 className="text-xs font-bold text-foreground">
                    {tx("بيان الحسابات وبنود التكاليف")}
                  </h2>
                  <span className="text-[11px] text-muted-foreground">
                    {tx("تفصيل حركة الدخل والمصاريف")}
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-right text-xs">
                          {tx("البند المحاسبي")}
                        </TableHead>
                        <TableHead className="text-right text-xs">
                          {tx("التصنيف")}
                        </TableHead>
                        <TableHead className="text-right text-xs">
                          {tx("البيان الإيضاحي")}
                        </TableHead>
                        <TableHead className="text-right text-xs">
                          {tx("المبلغ")}
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {/* Revenue Row */}
                      <TableRow>
                        <TableCell className="font-semibold text-xs text-foreground">
                          {tx("إيرادات المبيعات المحصلة")}
                        </TableCell>
                        <TableCell>
                          <Badge variant="success" className="text-[10px]">
                            {tx("إيراد")}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {tx(
                            "مبيعات الطلبات المدفوعة المسجلة عبر النظام",
                          )}{" "}
                          ({report.ordersCount} {tx("طلب")})
                        </TableCell>
                        <TableCell className="font-bold text-xs tabular-nums text-[#27734F]">
                          +{formatDZD(report.revenue)}
                        </TableCell>
                      </TableRow>

                      {/* Discounts (informational — already excluded from collected revenue) */}
                      {report.discounts > 0 && (
                        <TableRow>
                          <TableCell className="font-medium text-xs text-foreground">
                            {tx("الخصومات الممنوحة")}
                          </TableCell>
                          <TableCell>
                            <Badge variant="warning" className="text-[10px]">
                              {tx("خصم")}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {tx("خصومات وإهداءات مسجلة على الطلبات المدفوعة")}
                          </TableCell>
                          <TableCell className="font-medium text-xs tabular-nums text-[#B7791F]">
                            {formatDZD(report.discounts)}
                          </TableCell>
                        </TableRow>
                      )}

                      {/* Outstanding debts (informational — not yet collected) */}
                      {report.debts > 0 && (
                        <TableRow>
                          <TableCell className="font-medium text-xs text-foreground">
                            {tx("مديونيات غير محصلة")}
                          </TableCell>
                          <TableCell>
                            <Badge variant="destructive" className="text-[10px]">
                              {tx("دين")}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {tx("مبالغ متبقية على العملاء لم تُحصّل بعد")}
                          </TableCell>
                          <TableCell className="font-medium text-xs tabular-nums text-[#B33F35]">
                            {formatDZD(report.debts)}
                          </TableCell>
                        </TableRow>
                      )}

                      {/* Purchases Row */}
                      <TableRow>
                        <TableCell className="font-medium text-xs text-foreground">
                          {tx("مشتريات وفواتير الموردين")}
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="text-[10px]">
                            {tx("مصروف مخزون")}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {tx("أوامر الشراء المعتمدة خلال الفترة")}
                        </TableCell>
                        <TableCell className="font-medium text-xs tabular-nums text-foreground">
                          −{formatDZD(report.purchases)}
                        </TableCell>
                      </TableRow>

                      {/* Salaries Row */}
                      <TableRow>
                        <TableCell className="font-medium text-xs text-foreground">
                          {tx("رواتب وأجور الموظفين")}
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="text-[10px]">
                            {tx("مصروف تشغيلي")}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {tx("مسيرات الرواتب المسددة للموظفين")}
                        </TableCell>
                        <TableCell className="font-medium text-xs tabular-nums text-foreground">
                          −{formatDZD(report.salaries)}
                        </TableCell>
                      </TableRow>

                      {/* Waste Row */}
                      <TableRow>
                        <TableCell className="font-medium text-xs text-foreground">
                          {tx("الهدر والتالف التشغيلي")}
                        </TableCell>
                        <TableCell>
                          <Badge variant="warning" className="text-[10px]">
                            {tx("هدر")}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {tx(
                            "تكاليف المواد الغذائية التالفة والمحروقة المسجلة",
                          )}
                        </TableCell>
                        <TableCell className="font-medium text-xs tabular-nums text-foreground">
                          −{formatDZD(report.wasteCost)}
                        </TableCell>
                      </TableRow>

                      {/* Net Profit Summary Row */}
                      <TableRow className="bg-secondary/20 font-bold border-t-2 border-border">
                        <TableCell className="text-xs font-bold text-foreground">
                          {tx(
                            "صافي النتيجة التشغيلية (الربح / الخسارة)",
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              report.netProfit >= 0
                                ? "success"
                                : "destructive"
                            }
                            className="text-[10px]"
                          >
                            {report.netProfit >= 0
                              ? tx("صافي ربح")
                              : tx("صافي خسارة")}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground font-normal">
                          {tx(
                            "الإيرادات مطروحاً منها كافة المصروفات والهدر",
                          )}
                        </TableCell>
                        <TableCell
                          className={`text-sm font-bold tabular-nums ${
                            report.netProfit >= 0
                              ? "text-[#27734F]"
                              : "text-[#B33F35]"
                          }`}
                        >
                          {report.netProfit >= 0 ? "+" : ""}
                          {formatDZD(report.netProfit)}
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              </div>

              {/* Debts & Partial Payments */}
              {debtPayments.length > 0 && (
                <div className="rounded-md border border-border bg-card overflow-hidden">
                  <div className="px-4 py-2.5 bg-secondary/30 border-b border-border flex items-center justify-between">
                    <h2 className="text-xs font-semibold text-foreground flex items-center gap-2">
                      <Wallet className="w-3.5 h-3.5 text-primary" />
                      {tx("المديونيات والدفعات الجزئية")}
                    </h2>
                    <span className="text-[11px] font-bold text-[#B33F35] tabular-nums">
                      {formatDZD(debtTotal)}
                    </span>
                  </div>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-right text-xs">
                            {tx("الطلب")}
                          </TableHead>
                          <TableHead className="text-right text-xs">
                            {tx("العميل")}
                          </TableHead>
                          <TableHead className="text-right text-xs">
                            {tx("الهاتف")}
                          </TableHead>
                          <TableHead className="text-right text-xs">
                            {tx("الدين المتبقي")}
                          </TableHead>
                          <TableHead className="text-right text-xs">
                            {tx("التاريخ")}
                          </TableHead>
                          <TableHead className="text-right text-xs">
                            {tx("إجراء")}
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {debtPayments.map((p) => (
                          <TableRow key={p.id}>
                            <TableCell className="text-xs">
                              #
                              {p.daily_number != null
                                ? String(p.daily_number).padStart(3, "0")
                                : "—"}
                              {" · "}
                              {orderTypeLabel(p.order_type)}
                            </TableCell>
                            <TableCell className="text-xs font-medium">
                              {p.customer_name || "—"}
                            </TableCell>
                            <TableCell
                              className="text-xs tabular-nums"
                              dir="ltr"
                            >
                              {p.customer_phone || "—"}
                            </TableCell>
                            <TableCell className="text-xs font-bold tabular-nums text-[#B33F35]">
                              {formatDZD(Number(p.debt))}
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground">
                              {new Date(p.created_at).toLocaleDateString("ar")}
                            </TableCell>
                            <TableCell>
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-7 gap-1.5 rounded-sm text-[11px]"
                                disabled={settlingId === p.id}
                                onClick={() => settleDebt(p)}
                              >
                                {settlingId === p.id ? (
                                  <Loader2 className="w-3 h-3 animate-spin" />
                                ) : (
                                  <CheckCircle2 className="w-3 h-3" />
                                )}
                                {tx("تسوية الدين")}
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}

              {/* Payments & Receipts Log */}
              <div className="rounded-md border border-border bg-card overflow-hidden">
                <div className="px-4 py-2.5 bg-secondary/30 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <h2 className="text-xs font-semibold text-foreground flex items-center gap-2">
                    <Receipt className="w-3.5 h-3.5 text-primary" />
                    {tx("سجل المدفوعات والإيصالات")}
                    <span className="text-[11px] font-normal text-muted-foreground">
                      ({payments.length})
                    </span>
                  </h2>
                  <div className="relative w-full sm:w-64">
                    <Search className="w-3.5 h-3.5 text-muted-foreground absolute top-1/2 -translate-y-1/2 start-2.5" />
                    <Input
                      value={paySearch}
                      onChange={(e) => setPaySearch(e.target.value)}
                      placeholder={tx("ابحث برقم الطلب أو اسم العميل أو الهاتف")}
                      className="h-8 ps-8 text-xs rounded-sm"
                    />
                  </div>
                </div>
                {paymentsLoading ? (
                  <div className="p-12 flex items-center justify-center">
                    <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                  </div>
                ) : filteredPayments.length === 0 ? (
                  <div className="p-8 text-center text-xs text-muted-foreground">
                    {tx("لا توجد مدفوعات مسجلة بعد")}
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-right text-xs">
                            {tx("الطلب")}
                          </TableHead>
                          <TableHead className="text-right text-xs">
                            {tx("النوع")}
                          </TableHead>
                          <TableHead className="text-right text-xs">
                            {tx("العميل")}
                          </TableHead>
                          <TableHead className="text-right text-xs">
                            {tx("طريقة الدفع")}
                          </TableHead>
                          <TableHead className="text-right text-xs">
                            {tx("الإجمالي")}
                          </TableHead>
                          <TableHead className="text-right text-xs">
                            {tx("المدفوع")}
                          </TableHead>
                          <TableHead className="text-right text-xs">
                            {tx("الدين")}
                          </TableHead>
                          <TableHead className="text-right text-xs">
                            {tx("التاريخ")}
                          </TableHead>
                          <TableHead className="text-right text-xs">
                            {tx("إيصال")}
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredPayments.map((p) => (
                          <TableRow key={p.id}>
                            <TableCell className="text-xs tabular-nums">
                              #
                              {p.daily_number != null
                                ? String(p.daily_number).padStart(3, "0")
                                : "—"}
                            </TableCell>
                            <TableCell className="text-xs">
                              {orderTypeLabel(p.order_type)}
                              {p.table_number != null
                                ? ` · ${p.table_number}`
                                : ""}
                            </TableCell>
                            <TableCell className="text-xs">
                              <div className="font-medium">
                                {p.customer_name || "—"}
                              </div>
                              {p.customer_phone ? (
                                <div
                                  className="text-[11px] text-muted-foreground tabular-nums"
                                  dir="ltr"
                                >
                                  {p.customer_phone}
                                </div>
                              ) : null}
                            </TableCell>
                            <TableCell>
                              <Badge variant="secondary" className="text-[10px]">
                                {paymentModeLabel(p.mode)}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-xs tabular-nums">
                              {formatDZD(Number(p.total))}
                            </TableCell>
                            <TableCell className="text-xs font-medium tabular-nums text-[#27734F]">
                              {formatDZD(Number(p.paid))}
                            </TableCell>
                            <TableCell
                              className={`text-xs tabular-nums ${
                                Number(p.debt) > 0
                                  ? "font-bold text-[#B33F35]"
                                  : "text-muted-foreground"
                              }`}
                            >
                              {Number(p.debt) > 0
                                ? formatDZD(Number(p.debt))
                                : "—"}
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground">
                              {new Date(p.created_at).toLocaleString("ar", {
                                dateStyle: "short",
                                timeStyle: "short",
                              })}
                            </TableCell>
                            <TableCell>
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-7 gap-1.5 rounded-sm text-[11px]"
                                onClick={() => printPaymentReceipt(p)}
                              >
                                <Printer className="w-3 h-3" />
                                {tx("طباعة")}
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
