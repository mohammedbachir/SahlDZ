import { useEffect, useMemo, useState } from "react";
import {
  Calculator,
  TrendingUp,
  TrendingDown,
  ShoppingCart,
  Users,
  Trash2,
  Receipt,
  FileSpreadsheet,
  FileText,
  Wallet,
  Loader2,
  Landmark,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { formatDZD } from "@/lib/restaurant";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import {
  loadAccountingReport,
  resolveRestaurantId,
  periodBounds,
  type AccountingReport,
  type AccountingPeriod,
} from "@/lib/accounting-data";
import {
  exportAccountingExcel,
  exportAccountingPDF,
  type AccountingExportPayload,
} from "@/lib/exportReports";

const PRESETS: { value: string; label: string }[] = [
  { value: "today", label: "اليوم" },
  { value: "week", label: "هذا الأسبوع" },
  { value: "month", label: "هذا الشهر" },
  { value: "lastMonth", label: "الشهر الماضي" },
  { value: "custom", label: "مخصص" },
];

const CHANNEL_NAMES: Record<string, string> = {
  dine_in: "inside المطعم",
  takeaway: "سفري",
  delivery: "توصيل",
};

export default function AccountingPage() {
  const [restaurantId, setRestaurantId] = useState<string | null>(null);
  const [restaurantName, setRestaurantName] = useState("");
  const [preset, setPreset] = useState("month");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");

  const period: AccountingPeriod = useMemo(
    () => periodBounds(preset, customFrom, customTo),
    [preset, customFrom, customTo],
  );

  const [report, setReport] = useState<AccountingReport | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    resolveRestaurantId()
      .then((rid) => {
        if (cancelled) return;
        setRestaurantId(rid);
        if (rid) {
          supabase
            .from("restaurants")
            .select("name")
            .eq("id", rid)
            .maybeSingle()
            .then(({ data }: { data: { name?: string } | null }) => {
              if (data?.name) setRestaurantName(data.name);
            });
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!restaurantId) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    loadAccountingReport(restaurantId, period)
      .then((r) => {
        if (!cancelled) setReport(r);
      })
      .catch((e) => {
        console.error("[accounting] load error", e);
        if (!cancelled) toast.error("فشل تحميل التقرير المحاسبي");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [restaurantId, period]);

  const handleExport = async (kind: "excel" | "pdf") => {
    if (!report) return;
    const payload: AccountingExportPayload = {
      restaurantName: restaurantName || "تقرير المحاسبة",
      periodLabel: report.period.label,
      from: report.period.from,
      to: report.period.to,
      revenue: report.revenue,
      ordersCount: report.ordersCount,
      avgOrder: report.avgOrder,
      cogs: report.cogs,
      grossProfit: report.grossProfit,
      grossMarginPct: report.grossMarginPct,
      purchases: report.expenses.purchases,
      salaries: report.expenses.salaries,
      waste: report.expenses.waste,
      other: report.expenses.other,
      totalExpenses: report.expenses.total,
      netProfit: report.netProfit,
      netMarginPct: report.netMarginPct,
      byChannel: report.byChannel,
      daily: report.daily.map((d) => ({
        date: d.date,
        revenue: d.revenue,
        expenses: d.expenses,
        net: d.net,
      })),
    };
    try {
      if (kind === "excel") await exportAccountingExcel(payload);
      else exportAccountingPDF(payload);
      toast.success(kind === "excel" ? "تم تصدير Excel" : "تم تصدير PDF");
    } catch (e) {
      console.error(e);
      toast.error("فشل التصدير");
    }
  };

  return (
    <div className="space-y-4" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-lg bg-secondary text-primary flex items-center justify-center">
            <Calculator className="w-4.5 h-4.5 w-[18px] h-[18px]" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-[var(--foreground)]">المحاسبة</h1>
            <p className="text-[11px] text-[var(--muted-foreground)]">
              تقرير الربح والخسارة حسب الفترة
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => handleExport("excel")} className="gap-1.5">
            <FileSpreadsheet className="w-4 h-4" />
            Excel
          </Button>
          <Button variant="outline" size="sm" onClick={() => handleExport("pdf")} className="gap-1.5">
            <FileText className="w-4 h-4" />
            PDF
          </Button>
        </div>
      </div>

      {/* Period selector */}
      <Card className="p-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-medium text-[var(--muted-foreground)]">الفترة</span>
            <Select value={preset} onValueChange={setPreset}>
              <SelectTrigger className="h-8 w-36 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PRESETS.map((p) => (
                  <SelectItem key={p.value} value={p.value}>
                    {p.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {preset === "custom" && (
            <>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-medium text-[var(--muted-foreground)]">من</span>
                <Input
                  type="date"
                  value={customFrom}
                  onChange={(e) => setCustomFrom(e.target.value)}
                  className="h-8 w-32 text-xs"
                />
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-medium text-[var(--muted-foreground)]">إلى</span>
                <Input
                  type="date"
                  value={customTo}
                  onChange={(e) => setCustomTo(e.target.value)}
                  className="h-8 w-32 text-xs"
                />
              </div>
            </>
          )}
          <Badge variant="secondary" className="text-[11px] ps-2 pe-2">
            {period.from} ← {period.to}
          </Badge>
        </div>
      </Card>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-[var(--primary)]" />
        </div>
      ) : !report ? (
        <Card className="p-12 text-center text-sm text-[var(--muted-foreground)]">
          لا يمكن تحميل التقرير — تحقق من تسجيل الدخول أو بيانات المطعم
        </Card>
      ) : (
        <>
          {/* KPI cards */}
          <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
            <Card className="p-4">
              <div className="flex items-center gap-2 text-[var(--muted-foreground)] text-xs mb-1">
                <TrendingUp className="w-3.5 h-3.5" />
                الإيرادات
              </div>
              <div className="text-xl font-extrabold text-[var(--foreground)] tabular-nums">
                {formatDZD(report.revenue)}
              </div>
              <div className="text-[11px] text-[var(--muted-foreground)] mt-0.5">
                {report.ordersCount} طلب · متوسط {formatDZD(report.avgOrder)}
              </div>
            </Card>
            <Card className="p-4">
              <div className="flex items-center gap-2 text-[var(--muted-foreground)] text-xs mb-1">
                <Landmark className="w-3.5 h-3.5" />
                صافي الربح / الخسارة
              </div>
              <div className={`text-xl font-extrabold tabular-nums ${report.netProfit >= 0 ? "text-[#27734F]" : "text-[#B33F35]"}`}>
                {report.netProfit >= 0 ? "+" : ""}{formatDZD(report.netProfit)}
              </div>
              <div className="text-[11px] text-[var(--muted-foreground)] mt-0.5">
                هامش {report.netMarginPct}%
              </div>
            </Card>
            <Card className="p-4">
              <div className="flex items-center gap-2 text-[var(--muted-foreground)] text-xs mb-1">
                <Wallet className="w-3.5 h-3.5" />
                إجمالي المصروفات
              </div>
              <div className="text-xl font-extrabold text-red-600 tabular-nums">
                {formatDZD(report.expenses.total)}
              </div>
              <div className="text-[11px] text-[var(--muted-foreground)] mt-0.5">
                − الإيرادات = {formatDZD(report.revenue - report.expenses.total)}
              </div>
            </Card>
            <Card className="p-4">
              <div className="flex items-center gap-2 text-[var(--muted-foreground)] text-xs mb-1">
                <Receipt className="w-3.5 h-3.5" />
                عدد الطلبات المدفوعة
              </div>
              <div className="text-xl font-extrabold text-[var(--foreground)] tabular-nums">
                {report.ordersCount}
              </div>
              <div className="text-[11px] text-[var(--muted-foreground)] mt-0.5">
                متوسط {formatDZD(report.avgOrder)} للطلب
              </div>
            </Card>
          </div>

          {/* Income statement */}
          <Card className="p-5">
            <div className="flex items-center gap-2 mb-4">
              <Calculator className="w-4 h-4 text-[var(--primary)]" />
              <h2 className="font-bold text-sm text-[var(--foreground)]">قائمة الدخل</h2>
              <Badge variant="secondary" className="text-[10px]">
                {report.period.label}
              </Badge>
            </div>

            <div className="space-y-1.5 text-sm">
              <StatementRow label="الإيرادات (طلبات مدفوعة)" value={report.revenue} tone="normal" />
              <StatementRow label="تكلفة الأصناف المباعة (COGS)" value={-report.cogs} tone="muted" />
              <StatementDivider />
              <StatementRow label="الربح الإجمالي" value={report.grossProfit} tone="bold" />
              <div className="text-[11px] text-[var(--muted-foreground)] ps-2">
                هامش إجمالي {report.grossMarginPct}% — من المبيعات بعد تكلفة المكونات حسب الوصفات
              </div>

              <div className="pt-3">
                <div className="text-xs font-semibold text-[var(--muted-foreground)] mb-1.5">
                  المصروفات التشغيلية
                </div>
                <div className="space-y-1.5 border-s-2 border-[var(--border)] ps-3">
                  <StatementRowSmall icon={ShoppingCart} label="المشتريات والمواد" value={report.expenses.purchases} />
                  <StatementRowSmall icon={Users} label="الرواتب" value={report.expenses.salaries} />
                  <StatementRowSmall icon={Trash2} label="الهدر" value={report.expenses.waste} />
                  <StatementRowSmall icon={Wallet} label="مصاريف أخرى (دفعات/سلف/مرتجعات)" value={report.expenses.other} />
                </div>
              </div>

              <StatementDivider />
              <StatementRow label="إجمالي المصروفات" value={-report.expenses.total} tone="bold" />
              <StatementDivider />
              <div className="flex items-center justify-between py-2">
                <span className="font-extrabold text-base text-[var(--foreground)]">
                  صافي الربح / الخسارة
                </span>
                <span className={`font-extrabold text-base tabular-nums ${report.netProfit >= 0 ? "text-[#27734F]" : "text-[#B33F35]"}`} dir="ltr">
                  {report.netProfit >= 0 ? "+" : ""}{formatDZD(report.netProfit)}
                </span>
              </div>
              <div className="text-[11px] text-[var(--muted-foreground)] ps-2">
                هامش صافي {report.netMarginPct}% من الإيرادات
              </div>
            </div>
          </Card>

          {/* Channels + daily chart */}
          <div className="grid gap-3 md:grid-cols-2">
            <Card className="p-5">
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp className="w-4 h-4 text-[var(--primary)]" />
                <h2 className="font-bold text-sm text-[var(--foreground)]">الإيرادات حسب القناة</h2>
              </div>
              <div className="space-y-3">
                {report.byChannel.map((c) => {
                  const pct = report.revenue > 0 ? Math.round((c.revenue / report.revenue) * 100) : 0;
                  return (
                    <div key={c.key}>
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="font-medium text-[var(--foreground)]">
                          {CHANNEL_NAMES[c.key] ?? c.key}
                        </span>
                        <span className="text-[var(--muted-foreground)] tabular-nums">
                          {c.count} طلب · {formatDZD(c.revenue)} · {pct}%
                        </span>
                      </div>
                      <div className="h-2 rounded-full bg-[var(--muted)]/70 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-primary transition-all duration-500"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
                {report.revenue === 0 && (
                  <p className="text-xs text-[var(--muted-foreground)]">لا توجد إيرادات في هذه الفترة</p>
                )}
              </div>
            </Card>

            <Card className="p-5">
              <div className="flex items-center gap-2 mb-4">
                <TrendingDown className="w-4 h-4 text-[var(--primary)]" />
                <h2 className="font-bold text-sm text-[var(--foreground)]">الإيرادات اليومية</h2>
              </div>
              <div className="h-44" dir="ltr">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={report.daily.map((d) => ({ label: d.date.slice(5), revenue: d.revenue, net: d.net }))}>
                    <defs>
                      <linearGradient id="accBarRev" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.95} />
                        <stop offset="100%" stopColor="var(--primary)" stopOpacity={0.35} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="4 8" stroke="var(--border)" strokeOpacity={0.5} vertical={false} />
                    <XAxis dataKey="label" fontSize={10} fill="var(--muted-foreground)" axisLine={false} tickLine={false} />
                    <YAxis fontSize={10} fill="var(--muted-foreground)" axisLine={false} tickLine={false} width={38} />
                    <Tooltip
                      cursor={{ fill: "var(--muted)", opacity: 0.4 }}
                      contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12, fontSize: 12 }}
                      formatter={(v: any) => [formatDZD(Number(v)), "الإيرادات"]}
                    />
                    <Bar dataKey="revenue" fill="url(#accBarRev)" radius={[4, 4, 0, 0]} maxBarSize={28} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </div>

          {/* Daily breakdown table */}
          <Card>
            <div className="p-4 pb-0">
              <div className="flex items-center gap-2 mb-3">
                <Receipt className="w-4 h-4 text-[var(--primary)]" />
                <h2 className="font-bold text-sm text-[var(--foreground)]">تفاصيل يومية</h2>
              </div>
            </div>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">التاريخ</TableHead>
                    <TableHead className="text-xs text-left">الإيراد</TableHead>
                    <TableHead className="text-xs text-left">تكلفة الأصناف</TableHead>
                    <TableHead className="text-xs text-left">المصاريف اليومية</TableHead>
                    <TableHead className="text-xs text-left">الصافي</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {report.daily.map((d) => (
                    <TableRow key={d.date}>
                      <TableCell className="text-xs font-mono">{d.date}</TableCell>
                      <TableCell className="text-xs font-bold text-left tabular-nums">
                        {formatDZD(d.revenue)}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground text-left tabular-nums">
                        {d.cogs > 0 ? formatDZD(d.cogs) : "—"}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground text-left tabular-nums">
                        {d.expenses > 0 ? formatDZD(d.expenses) : "—"}
                      </TableCell>
                      <TableCell className={`text-xs font-bold text-left tabular-nums ${d.net >= 0 ? "text-[#27734F]" : "text-[#B33F35]"}`}>
                        {d.net >= 0 ? "+" : ""}{formatDZD(d.net)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}

function StatementDivider() {
  return <div className="border-t border-dashed border-[var(--border)] my-1" />;
}

function StatementRow({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "normal" | "muted" | "bold";
}) {
  const cls =
    tone === "bold"
      ? "font-extrabold text-[var(--foreground)]"
      : tone === "muted"
        ? "text-[var(--muted-foreground)]"
        : "font-semibold text-[var(--foreground)]";
  return (
    <div className="flex items-center justify-between">
      <span className={cls}>{label}</span>
      <span className={`tabular-nums ${cls}`} dir="ltr">
        {tone === "muted" ? "−" : ""}{formatDZD(Math.abs(value))}
      </span>
    </div>
  );
}

function StatementRowSmall({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
}) {
  return (
    <div className="flex items-center justify-between text-xs">
      <span className="flex items-center gap-1.5 text-[var(--foreground)]">
        <Icon className="w-3.5 h-3.5 text-[var(--muted-foreground)]" />
        {label}
      </span>
      <span className="tabular-nums text-[var(--foreground)]" dir="ltr">
        {formatDZD(value)}
      </span>
    </div>
  );
}