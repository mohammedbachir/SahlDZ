import { useCallback, useEffect, useState } from "react";
import { useRestaurantId, formatDZD } from "@/lib/restaurant";
import { getFirebaseDb } from "@/integrations/firebase/config";
import {
  buildWeeklyReport,
  weeklyReportPlainText,
  type WeeklyReport,
} from "@/lib/weekly-report";
import {
  Calendar,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  ShoppingBag,
  Utensils,
  AlertTriangle,
  MessageSquare,
  Trash2,
  Copy,
  Check,
  Award,
} from "lucide-react";

export default function MobileWeeklyReport() {
  const { restaurantId, loading: rLoading } = useRestaurantId();
  const [report, setReport] = useState<WeeklyReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  const load = useCallback(async (rid: string) => {
    const r = await buildWeeklyReport(rid);
    setReport(r);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!restaurantId || !getFirebaseDb()) {
      setLoading(false);
      return;
    }
    void load(restaurantId);
  }, [restaurantId, load]);

  async function copySummary() {
    if (!report) return;
    try {
      await navigator.clipboard.writeText(weeklyReportPlainText(report));
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* silent */
    }
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

  if (!report) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--background)] p-4">
        <p className="text-muted-foreground">لا توجد بيانات هذا الأسبوع</p>
      </div>
    );
  }

  const maxSales = Math.max(...report.daily.map((d) => d.sales), 1);
  const growth = report.revenuePct >= 0;

  return (
    <div className="min-h-screen bg-gradient-to-b from-[var(--background)] to-[var(--muted)]/30 p-4 pb-10">
      {/* Header */}
      <div className="sticky top-0 z-10 -mx-4 mb-6 bg-card/95 backdrop-blur-lg border-b border-border/40 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-amber-500" />
            <h1 className="font-bold text-lg">التقرير الأسبوعي</h1>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={copySummary}
              className="p-2 rounded-lg hover:bg-muted transition-colors"
              title="نسخ الملخص"
            >
              {copied ? (
                <Check className="w-4 h-4 text-green-500" />
              ) : (
                <Copy className="w-4 h-4 text-muted-foreground" />
              )}
            </button>
            <button
              onClick={() => restaurantId && load(restaurantId)}
              className="p-2 rounded-lg hover:bg-muted transition-colors"
            >
              <RefreshCw className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          {report.start} ← {report.end}
        </p>
      </div>

      {/* Main KPIs */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <div className="rounded-2xl border border-border/40 bg-card/80 p-4">
          <div className="text-xs text-muted-foreground flex items-center gap-1">
            إيراد الأسبوع
          </div>
          <div className="text-xl font-bold mt-1">
            {formatDZD(report.totalRevenue)}
          </div>
          {report.prevWeekRevenue > 0 && (
            <div
              className={`text-[11px] mt-1 flex items-center gap-1 ${
                growth ? "text-green-500" : "text-red-500"
              }`}
            >
              {growth ? (
                <TrendingUp className="w-3 h-3" />
              ) : (
                <TrendingDown className="w-3 h-3" />
              )}
              {growth ? "+" : ""}
              {report.revenuePct}% عن الأسبوع السابق
            </div>
          )}
        </div>
        <div className="rounded-2xl border border-border/40 bg-card/80 p-4">
          <div className="text-xs text-muted-foreground flex items-center gap-1">
            <ShoppingBag className="w-3 h-3" />
            الطلبات المدفوعة
          </div>
          <div className="text-xl font-bold mt-1">{report.paidOrders}</div>
          <div className="text-[11px] text-muted-foreground mt-1">
            {report.totalOrders} إجمالاً · {report.pendingOrders} معلّقة
          </div>
        </div>
        <div className="rounded-2xl border border-border/40 bg-card/80 p-4">
          <div className="text-xs text-muted-foreground">متوسط الطلب</div>
          <div className="text-xl font-bold mt-1">
            {formatDZD(report.averageOrder)}
          </div>
        </div>
        <div className="rounded-2xl border border-border/40 bg-card/80 p-4">
          <div className="text-xs text-muted-foreground flex items-center gap-1">
            <Trash2 className="w-3 h-3" />
            الهدر
          </div>
          <div className="text-xl font-bold mt-1 text-red-500">
            {formatDZD(report.wasteCost)}
          </div>
          <div className="text-[11px] text-muted-foreground mt-1">
            {report.wasteCount} تسجيل
          </div>
        </div>
      </div>

      {/* Best day */}
      {report.bestDay && report.bestDay.sales > 0 && (
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-4 mb-6 flex items-center gap-3">
          <Award className="w-5 h-5 text-amber-500" />
          <div>
            <div className="text-sm font-semibold">
              أفضل يوم: {report.bestDay.date}
            </div>
            <div className="text-xs text-muted-foreground">
              {formatDZD(report.bestDay.sales)} من إجمالي الإيراد
            </div>
          </div>
        </div>
      )}

      {/* Daily chart */}
      <div className="rounded-2xl border border-border/40 bg-card/80 p-4 mb-6">
        <h2 className="font-bold mb-4 text-sm">المبيعات يومياً</h2>
        <div className="flex items-end gap-1 h-32">
          {report.daily.map((d, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-1">
              <div className="text-[10px] text-muted-foreground">
                {d.sales > 0 ? Math.round(d.sales / 1000) : ""}
              </div>
              <div
                className="w-full rounded-t bg-gradient-to-t from-primary to-primary/60 transition-all"
                style={{
                  height: `${Math.max((d.sales / maxSales) * 100, 3)}%`,
                }}
              />
              <div className="text-[10px] text-muted-foreground">
                {new Date(d.date).getDate()}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Order types */}
      <div className="rounded-2xl border border-border/40 bg-card/80 p-4 mb-6 space-y-3">
        <h2 className="font-bold text-sm flex items-center gap-2">
          <Utensils className="w-4 h-4 text-amber-500" />
          حسب النوع
        </h2>
        {[
          { label: "🍽️ دينين", row: report.byType.dine_in },
          { label: "🥡 تيك أواي", row: report.byType.takeaway },
          { label: "🛵 توصيل", row: report.byType.delivery },
        ].map(({ label, row }) => (
          <div
            key={label}
            className="flex items-center justify-between text-sm"
          >
            <span>{label}</span>
            <div className="flex items-center gap-3">
              <span className="text-muted-foreground">{row.count} طلب</span>
              <span className="font-medium">{formatDZD(row.revenue)}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Top items */}
      {report.topItems.length > 0 && (
        <div className="rounded-2xl border border-border/40 bg-card/80 p-4 mb-6">
          <h2 className="font-bold text-sm mb-3 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-amber-500" />
            الأكثر طلباً
          </h2>
          <div className="space-y-2">
            {report.topItems.map((item, i) => (
              <div
                key={i}
                className="flex items-center justify-between text-sm"
              >
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

      {/* Alerts */}
      {(report.lowStock.length > 0 ||
        report.openComplaints > 0 ||
        report.wasteCount > 0) && (
        <div className="rounded-2xl border border-red-500/30 bg-red-500/5 p-4 space-y-3">
          <h2 className="font-bold text-sm text-red-500 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            تنبيهات الأسبوع
          </h2>
          {report.lowStock.map((item, i) => (
            <div key={i} className="flex items-center justify-between text-sm">
              <span className="text-red-400">⚠️ {item.name}</span>
              <span className="text-xs text-red-400">
                {item.current} {item.unit} متبقٍ (الحد {item.threshold})
              </span>
            </div>
          ))}
          {report.openComplaints > 0 && (
            <div className="text-sm text-orange-400 flex items-center gap-2">
              <MessageSquare className="w-4 h-4" />
              {report.openComplaints} شكوى مفتوحة
            </div>
          )}
          {report.wasteCount > 0 && (
            <div className="text-sm text-rose-400 flex items-center gap-2">
              <Trash2 className="w-4 h-4" />
              {report.wasteCount} تسجيل هدر هذا الأسبوع
            </div>
          )}
        </div>
      )}

      <button
        onClick={copySummary}
        className="w-full mt-4 py-3 rounded-2xl bg-[var(--primary)] text-white text-sm font-semibold flex items-center justify-center gap-2"
      >
        {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
        {copied ? "تم نسخ الملخص" : "نسخ ملخص الأسبوع"}
      </button>
    </div>
  );
}
