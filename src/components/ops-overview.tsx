import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  AlertTriangle,
  Users,
  Trash2,
  CheckCircle2,
  MessageSquareWarning,
  ArrowUpRight,
  ArrowDownLeft,
  ArrowLeft,
  FileSpreadsheet,
  PlusCircle,
  TrendingUp,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { tx } from "@/lib/ops-tx";
import { useTranslation } from "react-i18next";
import { ensureMonthlyArchive } from "@/lib/report-archive";

type Kpis = {
  monthExpenses: number;
  lowStock: number;
  pendingSalaries: number;
  weekWaste: number;
  monthRevenue: number;
  monthNet: number;
  todayRevenue: number;
  todayOrders: number;
};

type RecentEntry = {
  id: string;
  type: "sale" | "purchase" | "waste";
  title: string;
  ref: string;
  amount: number;
  date: string;
  status: string;
};

function fmt(n: number) {
  return new Intl.NumberFormat("ar-DZ", { maximumFractionDigits: 2 }).format(n);
}

async function resolveRestaurantId(userId: string): Promise<string | null> {
  const { data: owned } = await supabase
    .from("restaurants")
    .select("id")
    .eq("owner_id", userId)
    .limit(1);
  if (owned && owned.length > 0) return owned[0].id;

  const { data: roles } = await supabase
    .from("user_roles")
    .select("restaurant_id, role")
    .eq("user_id", userId)
    .limit(1);
  return roles?.[0]?.restaurant_id ?? null;
}

const HIDDEN_KPIS: Record<string, string[]> = {
  production_manager: ["إيرادات هذا الشهر", "صافي الربح", "مصاريف هذا الشهر", "رواتب معلقة"],
  purchasing_manager: ["إيرادات هذا الشهر", "صافي الربح", "رواتب معلقة"],
  hr_manager: ["إيرادات هذا الشهر", "صافي الربح", "مصاريف هذا الشهر"],
};

export function OpsOverview() {
  useTranslation();
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<string>("admin");
  const [openComplaintsCount, setOpenComplaintsCount] = useState(0);
  const [recentEntries, setRecentEntries] = useState<RecentEntry[]>([]);
  const [kpis, setKpis] = useState<Kpis>({
    monthExpenses: 0,
    lowStock: 0,
    pendingSalaries: 0,
    weekWaste: 0,
    monthRevenue: 0,
    monthNet: 0,
    todayRevenue: 0,
    todayOrders: 0,
  });
  const lastUpdatedRef = useRef<string>("");
  const [dataState, setDataState] = useState<
    "loading" | "no-auth" | "no-restaurant" | "ready"
  >("loading");

  useEffect(() => {
    const load = async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) {
        setDataState("no-auth");
        setLoading(false);
        return;
      }

      const { data: roleRow } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", u.user.id)
        .maybeSingle();
      const role = roleRow?.role ?? "admin";
      setUserRole(role);

      const rid = await resolveRestaurantId(u.user.id);
      if (!rid) {
        setDataState("no-restaurant");
        setLoading(false);
        return;
      }

      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const sevenDaysAgo = new Date(now.getTime() - 7 * 86400000).toISOString();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();

      const [ingRes, salariesRes, wasteRes, ordersRes, todayOrdersRes, poRes, compRes] =
        await Promise.all([
          supabase
            .from("ingredients")
            .select("id, name, current_stock, alert_threshold, unit")
            .eq("restaurant_id", rid),
          supabase.from("staff_salaries").select("id, is_paid, amount").eq("restaurant_id", rid),
          supabase
            .from("waste_logs")
            .select("cost")
            .eq("restaurant_id", rid)
            .gte("created_at", sevenDaysAgo),
          supabase
            .from("orders")
            .select("total, paid_amount, discount_amount")
            .eq("restaurant_id", rid)
            .eq("status", "paid")
            .gte("created_at", monthStart),
          supabase
            .from("orders")
            .select("total, paid_amount, discount_amount")
            .eq("restaurant_id", rid)
            .eq("status", "paid")
            .gte("created_at", todayStart),
          supabase
            .from("purchase_orders")
            .select("total")
            .eq("restaurant_id", rid)
            .gte("created_at", monthStart),
          supabase
            .from("customer_complaints")
            .select("id", { count: "exact" })
            .eq("restaurant_id", rid)
            .in("status", ["open", "in_progress"]),
        ]);

      setOpenComplaintsCount(compRes.count ?? 0);

const lowStock = (ingRes.data ?? []).filter(
        (i: any) => Number(i.current_stock) <= Number(i.alert_threshold),
      ).length;

      const pendingSalaries = (salariesRes.data ?? []).filter((s: any) => !s.is_paid).length;
      const salariesPaid = (salariesRes.data ?? [])
        .filter((s: any) => s.is_paid)
        .reduce((sum: number, s: any) => sum + Number(s.amount || 0), 0);

      const moneyIn = (o: any) => Number(o.paid_amount ?? o.total ?? 0);

      const weekWaste = (wasteRes.data ?? []).reduce((sum: number, w: any) => sum + Number(w.cost || 0), 0);
      const monthRevenue = (ordersRes.data ?? []).reduce((sum: number, o: any) => sum + moneyIn(o), 0);
      const todayRevenue = (todayOrdersRes.data ?? []).reduce((sum: number, o: any) => sum + moneyIn(o), 0);
      const purchases = (poRes.data ?? []).reduce((sum: number, p: any) => sum + Number(p.total || 0), 0);

      const monthExpensesAll = purchases + salariesPaid + weekWaste;

      // Ensure monthly archive runs in the background
      const { data: restRow } = await supabase
        .from("restaurants")
        .select("name")
        .eq("id", rid)
        .maybeSingle();
      void ensureMonthlyArchive(rid, (restRow as any)?.name ?? "").catch(() => {});

      // Fetch recent transactions (orders and purchase orders)
      const [recentOrdersRes, recentPoRes] = await Promise.all([
        supabase
          .from("orders")
          .select("id, order_number, total, created_at")
          .eq("restaurant_id", rid)
          .eq("status", "paid")
          .order("created_at", { ascending: false })
          .limit(4),
        supabase
          .from("purchase_orders")
          .select("id, total, created_at, status")
          .eq("restaurant_id", rid)
          .order("created_at", { ascending: false })
          .limit(4),
      ]);

      const entries: RecentEntry[] = [];
      for (const o of (recentOrdersRes.data ?? []) as any[]) {
        entries.push({
          id: `order-${o.id}`,
          type: "sale",
          title: tx("طلب مبيعات مدفوع"),
          ref: o.order_number ? `#${o.order_number}` : `#${o.id.slice(0, 6)}`,
          amount: Number(o.total || 0),
          date: o.created_at,
          status: tx("مكتمل"),
        });
      }
      for (const p of (recentPoRes.data ?? []) as any[]) {
        entries.push({
          id: `po-${p.id}`,
          type: "purchase",
          title: tx("أمر شراء توريد"),
          ref: `#${p.id.slice(0, 8)}`,
          amount: Number(p.total || 0),
          date: p.created_at,
          status: p.status || tx("مسجل"),
        });
      }
      entries.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setRecentEntries(entries.slice(0, 6));

      setKpis({
        monthExpenses: purchases + salariesPaid,
        lowStock,
        pendingSalaries,
        weekWaste,
        monthRevenue,
        monthNet: monthRevenue - monthExpensesAll,
        todayRevenue,
        todayOrders: (todayOrdersRes.data ?? []).length,
      });
      lastUpdatedRef.current = new Date().toLocaleTimeString("ar-DZ");
      setDataState("ready");
      setLoading(false);
    };
    void load();
    const id = setInterval(() => void load(), 20_000);
    return () => clearInterval(id);
  }, []);

  const hiddenKeys = HIDDEN_KPIS[userRole] ?? [];
  const showRevenue = !hiddenKeys.includes("إيرادات هذا الشهر");
  const showNet = !hiddenKeys.includes("صافي الربح");
  const showExpenses = !hiddenKeys.includes("مصاريف هذا الشهر");
  const showPendingSalaries = !hiddenKeys.includes("رواتب معلقة");

  // Operational items for Work Queue
  const workQueueItems = [
    {
      id: "lowStock",
      show: kpis.lowStock > 0,
      priority: "عاجل",
      category: tx("نقص المخزون"),
      problem: `يوجد ${kpis.lowStock} صنف انخفض عن حد الأمان الأدنى ويحتاج لإصدار أمر شراء فوري.`,
      countLabel: `${kpis.lowStock} صنف`,
      badgeStyle: "bg-[#B86D16]/10 text-[#B86D16] border-[#B86D16]/20",
      to: "/ops/inventory",
      actionText: tx("فتح سجل المخزون والشراء"),
      icon: AlertTriangle,
    },
    {
      id: "pendingSalaries",
      show: showPendingSalaries && kpis.pendingSalaries > 0,
      priority: "هام",
      category: tx("مستحقات الرواتب"),
      problem: `يوجد ${kpis.pendingSalaries} موظف لم يتم تسجيل سداد رواتبهم لهذا الشهر حتى الآن.`,
      countLabel: `${kpis.pendingSalaries} موظف`,
      badgeStyle: "bg-[#B33F35]/10 text-[#B33F35] border-[#B33F35]/20",
      to: "/ops/employees",
      actionText: tx("مراجعة واعتماد الرواتب"),
      icon: Users,
    },
    {
      id: "weekWaste",
      show: kpis.weekWaste > 0,
      priority: "رقابة",
      category: tx("الهدر التشغيلي"),
      problem: `تم تسجيل تكلفة هدر وتالف بمبلغ ${fmt(kpis.weekWaste)} دج خلال الأسبوع الجاري.`,
      countLabel: `${fmt(kpis.weekWaste)} دج`,
      badgeStyle: "bg-muted text-muted-foreground border-border",
      to: "/ops/waste",
      actionText: tx("فحص تقرير الهدر"),
      icon: Trash2,
    },
    {
      id: "openComplaints",
      show: openComplaintsCount > 0,
      priority: "فوري",
      category: tx("شكاوى العملاء"),
      problem: `يوجد ${openComplaintsCount} شكوى عميل مفتوحة بحاجة للمعالجة والتواصل المباشر.`,
      countLabel: `${openComplaintsCount} شكوى`,
      badgeStyle: "bg-[#B33F35]/10 text-[#B33F35] border-[#B33F35]/20",
      to: "/ops/complaints",
      actionText: tx("معالجة الشكاوى المفتوحة"),
      icon: MessageSquareWarning,
    },
  ].filter((item) => item.show);

  return (
    <div className="space-y-6" data-annotate="ops-overview-ledger">
      {/* ========================================================= */}
      {/* 0. RESTAURANT CONTROL DESK HEADER / TOOLBAR               */}
      {/* ========================================================= */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg sm:text-xl font-bold tracking-tight text-foreground">
              {tx("مكتب متابعة العمليات اليومي")}
            </h1>
            <span className="text-[11px] font-medium px-2 py-0.5 rounded-sm bg-primary/10 text-primary border border-primary/20">
              {tx("نشط ومباشر")}
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            {tx("طابور المهام العاجلة، موجز الأداء المالي، وسجل العمليات والقيود المسجلة")}
          </p>
        </div>

        {/* Action Shortcuts Toolbar */}
        <div className="flex items-center gap-2 flex-wrap">
          <Link
            to="/ops/inventory"
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-sm text-xs font-medium bg-card border border-border text-foreground hover:bg-secondary transition-colors"
          >
            <PlusCircle className="w-3.5 h-3.5 text-primary" />
            <span>{tx("إضافة مخزون")}</span>
          </Link>
          <Link
            to="/ops/expenses"
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-sm text-xs font-medium bg-card border border-border text-foreground hover:bg-secondary transition-colors"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-muted-foreground" />
            <span>{tx("تسجيل مصروف")}</span>
          </Link>
          <Link
            to="/ops/reports"
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-sm text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            <TrendingUp className="w-3.5 h-3.5" />
            <span>{tx("كشف الدخل")}</span>
          </Link>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 1. WORK QUEUE (FIRST!) — ACTIONABLE REAL ISSUES           */}
      {/* ========================================================= */}
      <section className="rounded-md border border-border bg-card overflow-hidden">
        <div className="px-4 py-2.5 bg-secondary/20 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-primary" />
            <h2 className="text-xs font-bold text-foreground uppercase tracking-wide">
              {tx("طابور العمل والمتابعة — قرارات وإجراءات تتطلب تدخلك")}
            </h2>
          </div>
          <div className="text-[11px] font-medium text-muted-foreground">
            {workQueueItems.length > 0 ? (
              <span className="text-[#B86D16] font-semibold">
                {workQueueItems.length} {tx("تنبيهات قائمة")}
              </span>
            ) : (
              <span className="text-[#27734F] font-semibold">{tx("كل شيء منتظم")}</span>
            )}
          </div>
        </div>

        {/* Work Queue Content */}
        {workQueueItems.length > 0 ? (
          <div className="divide-y divide-border">
            {workQueueItems.map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.id}
                  className="p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-secondary/15 transition-colors"
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="p-1.5 rounded-sm bg-muted/60 text-muted-foreground mt-0.5 shrink-0 border border-border/50">
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="space-y-0.5 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-xs border ${item.badgeStyle}`}
                        >
                          {item.priority} · {item.category}
                        </span>
                        <span className="text-xs font-semibold text-foreground truncate">
                          {item.problem}
                        </span>
                      </div>
                      <div className="text-[11px] text-muted-foreground">
                        {tx("النطاق المستهدف:")} {item.countLabel}
                      </div>
                    </div>
                  </div>

                  <Link
                    to={item.to}
                    className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-sm text-xs font-medium border border-border bg-card text-foreground hover:bg-primary/10 hover:text-primary hover:border-primary/40 transition-colors shrink-0"
                  >
                    <span>{item.actionText}</span>
                    <ArrowLeft className="w-3.5 h-3.5" />
                  </Link>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-6 text-center space-y-2">
            <div className="inline-flex p-2 rounded-full bg-[#27734F]/10 text-[#27734F] mb-1">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div className="text-xs font-semibold text-foreground">
              {tx("طابور العمل خالٍ تماماً — لا توجد إجراءات أو تنبيهات معلقة اليوم")}
            </div>
            <p className="text-[11px] text-muted-foreground max-w-md mx-auto">
              {tx("جميع أصناف المخزون فوق حد الأمان، لا توجد شكاوى مفتوحة، والرواتب منتظمة.")}
            </p>
            <div className="pt-2 flex items-center justify-center gap-2">
              <Link
                to="/ops/inventory"
                className="text-xs text-primary font-medium hover:underline px-2 py-1"
              >
                {tx("مراجعة كامل المخزون ←")}
              </Link>
              <span className="text-border">·</span>
              <Link
                to="/ops/reports"
                className="text-xs text-primary font-medium hover:underline px-2 py-1"
              >
                {tx("عرض كشف الدخل المالي ←")}
              </Link>
            </div>
          </div>
        )}
      </section>

      {/* ========================================================= */}
      {/* 2. PERFORMANCE BRIEF (SECOND) — CONNECTED HORIZONTAL STRIP */}
      {/* ========================================================= */}
      <section className="rounded-md border border-border bg-card overflow-hidden">
        <div className="px-4 py-2 bg-secondary/20 border-b border-border flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-foreground">
              {tx("موجز الأداء المالي والتشغيلي")}
            </span>
            <span className="text-muted-foreground">· {tx("قراءة متصلة للفترة الحالية")}</span>
          </div>
          <div className="flex items-center gap-2 text-[11px] text-muted-foreground font-mono">
            {dataState === "ready" && lastUpdatedRef.current && (
              <span className="text-[#27734F] font-semibold">
                {tx("آخر تحديث:")} {lastUpdatedRef.current}
              </span>
            )}
            <span>{tx("العملة: دج")}</span>
          </div>
        </div>

        {dataState === "no-auth" && (
          <div className="px-4 py-3 bg-[#B86D16]/10 border-b border-[#B86D16]/25 text-xs text-[#B86D16] font-medium">
            {tx("سجّل الدخول بحساب مالك المطعم لعرض موجز الأداء المالي. الأرقام تظهر صفراً لأن الجلسة غير مصرّح لها.")}
          </div>
        )}
        {dataState === "no-restaurant" && (
          <div className="px-4 py-3 bg-[#B86D16]/10 border-b border-[#B86D16]/25 text-xs text-[#B86D16] font-medium">
            {tx("حسابك غير مرتبط بأي مطعم — اربط الحساب بمطعم ليتم احتساب العمليات والمداخيل.")}
          </div>
        )}

        {/* Connected Horizontal Columns (No individual cards) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x sm:divide-x-reverse divide-border">
          {/* Revenue */}
          {showRevenue ? (
            <div className="p-4 sm:p-5 flex flex-col justify-between">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium text-muted-foreground">
                  {tx("إيرادات هذا الشهر")}
                </span>
                <span className="text-[10px] font-medium text-primary px-1.5 py-0.5 rounded-sm bg-primary/10">
                  {tx("مبيعات")}
                </span>
              </div>
              <div className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground tabular-nums my-1">
                {loading ? "…" : `${fmt(kpis.monthRevenue)} دج`}
              </div>
              <div className="text-[11px] text-muted-foreground">
                {tx("إجمالي الطلبات المدفوعة المسجلة")}
              </div>
              <div className="mt-1.5 flex items-center justify-between border-t border-border/60 pt-1.5">
                <span className="text-[11px] font-medium text-[#27734F]">
                  {tx("مداخيل اليوم:")}{" "}
                  <span className="font-bold tabular-nums">
                    {loading ? "…" : `${fmt(kpis.todayRevenue)} دج`}
                  </span>
                </span>
                <span className="text-[10px] text-muted-foreground">
                  {loading ? "" : `${kpis.todayOrders} ${tx("طلب")}`}
                </span>
              </div>
            </div>
          ) : (
            <div className="p-4 sm:p-5 flex flex-col justify-between bg-muted/10">
              <span className="text-xs text-muted-foreground">{tx("الإيرادات")}</span>
              <span className="text-xs text-muted-foreground">{tx("غير مصرح بالعرض")}</span>
            </div>
          )}

          {/* Expenses */}
          {showExpenses ? (
            <div className="p-4 sm:p-5 flex flex-col justify-between">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium text-muted-foreground">
                  {tx("مصاريف هذا الشهر")}
                </span>
                <span className="text-[10px] font-medium text-muted-foreground px-1.5 py-0.5 rounded-sm bg-secondary">
                  {tx("تشغيلي")}
                </span>
              </div>
              <div className="text-xl sm:text-2xl font-bold tracking-tight text-foreground tabular-nums my-1">
                {loading ? "…" : `${fmt(kpis.monthExpenses)} دج`}
              </div>
              <div className="text-[11px] text-muted-foreground">
                {tx("مشتريات الموردين + الرواتب المصروفة")}
              </div>
            </div>
          ) : (
            <div className="p-4 sm:p-5 flex flex-col justify-between bg-muted/10">
              <span className="text-xs text-muted-foreground">{tx("المصاريف")}</span>
              <span className="text-xs text-muted-foreground">{tx("غير مصرح بالعرض")}</span>
            </div>
          )}

          {/* Net Profit */}
          {showNet ? (
            <div className="p-4 sm:p-5 flex flex-col justify-between bg-secondary/15">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium text-muted-foreground">
                  {tx("صافي الربح التقديري")}
                </span>
                <span
                  className={`text-[10px] font-medium px-1.5 py-0.5 rounded-sm ${
                    kpis.monthNet >= 0
                      ? "bg-[#27734F]/10 text-[#27734F]"
                      : "bg-[#B33F35]/10 text-[#B33F35]"
                  }`}
                >
                  {kpis.monthNet >= 0 ? tx("فائض") : tx("عجز")}
                </span>
              </div>
              <div
                className={`text-2xl sm:text-3xl font-bold tracking-tight tabular-nums my-1 ${
                  kpis.monthNet >= 0 ? "text-[#27734F]" : "text-[#B33F35]"
                }`}
              >
                {loading ? "…" : `${fmt(kpis.monthNet)} دج`}
              </div>
              <div className="text-[11px] text-muted-foreground">
                {tx("الإيرادات − (المشتريات + الرواتب + الهدر)")}
              </div>
            </div>
          ) : (
            <div className="p-4 sm:p-5 flex flex-col justify-between bg-muted/10">
              <span className="text-xs text-muted-foreground">{tx("صافي الربح")}</span>
              <span className="text-xs text-muted-foreground">{tx("غير مصرح بالعرض")}</span>
            </div>
          )}

          {/* Weekly Waste */}
          <div className="p-4 sm:p-5 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium text-muted-foreground">
                {tx("الهدر والتالف (أسبوعي)")}
              </span>
              <span className="text-[10px] font-medium text-[#B86D16] px-1.5 py-0.5 rounded-sm bg-[#B86D16]/10">
                {tx("هدر")}
              </span>
            </div>
            <div className="text-xl sm:text-2xl font-bold tracking-tight text-foreground tabular-nums my-1">
              {loading ? "…" : `${fmt(kpis.weekWaste)} دج`}
            </div>
            <div className="text-[11px] text-muted-foreground">
              {tx("تكلفة التالف المسجلة خلال 7 أيام")}
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================= */}
      {/* 3. RECENT ACTIVITY (THIRD) — DESKTOP ERP TRANSACTION TABLE */}
      {/* ========================================================= */}
      <section className="rounded-md border border-border bg-card overflow-hidden">
        <div className="px-4 py-3 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-xs font-bold text-foreground">
              {tx("سجل العمليات والقيود المسجلة مؤخراً")}
            </h3>
            <p className="text-[11px] text-muted-foreground">
              {tx("أحدث المعاملات التشغيلية والمبيعات وأوامر الشراء المسجلة بالفرع")}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/ops/expenses" className="text-xs text-primary font-medium hover:underline">
              {tx("سجل المصاريف ←")}
            </Link>
            <span className="text-border">·</span>
            <Link to="/ops/reports" className="text-xs text-primary font-medium hover:underline">
              {tx("كشف التقارير الكامل ←")}
            </Link>
          </div>
        </div>

        {loading ? (
          <div className="p-8 text-center text-xs text-muted-foreground">
            {tx("جاري تحميل السجل…")}
          </div>
        ) : recentEntries.length > 0 ? (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-secondary/20">
                <TableRow>
                  <TableHead className="text-right text-xs font-semibold">
                    {tx("المعاملة والقيد")}
                  </TableHead>
                  <TableHead className="text-right text-xs font-semibold">{tx("المرجع")}</TableHead>
                  <TableHead className="text-right text-xs font-semibold">
                    {tx("التاريخ")}
                  </TableHead>
                  <TableHead className="text-right text-xs font-semibold">{tx("المبلغ")}</TableHead>
                  <TableHead className="text-right text-xs font-semibold">{tx("الحالة")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentEntries.map((entry) => (
                  <TableRow key={entry.id} className="hover:bg-secondary/20">
                    <TableCell className="text-xs font-medium py-2.5">
                      <div className="flex items-center gap-2">
                        {entry.type === "sale" ? (
                          <ArrowDownLeft className="w-3.5 h-3.5 text-[#27734F] shrink-0" />
                        ) : (
                          <ArrowUpRight className="w-3.5 h-3.5 text-[#B33F35] shrink-0" />
                        )}
                        <span>{entry.title}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground font-mono py-2.5">
                      {entry.ref}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground py-2.5">
                      {new Date(entry.date).toLocaleDateString("ar-DZ", {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </TableCell>
                    <TableCell className="text-xs font-bold tabular-nums py-2.5">
                      <span
                        className={entry.type === "sale" ? "text-[#27734F]" : "text-foreground"}
                      >
                        {entry.type === "sale" ? "+" : "−"} {fmt(entry.amount)} دج
                      </span>
                    </TableCell>
                    <TableCell className="text-xs py-2.5">
                      <Badge
                        variant={entry.type === "sale" ? "default" : "secondary"}
                        className="text-[10px] font-medium py-0 px-2 rounded-xs"
                      >
                        {entry.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="p-8 text-center space-y-2">
            <div className="text-xs text-muted-foreground">
              {tx("لا توجد معاملات مسجلة حتى الآن في الفترة الحالية.")}
            </div>
            <div className="flex items-center justify-center gap-3">
              <Link to="/ops/expenses" className="text-xs text-primary font-medium hover:underline">
                {tx("تسجيل أمر شراء أو مصروف جديد ←")}
              </Link>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
