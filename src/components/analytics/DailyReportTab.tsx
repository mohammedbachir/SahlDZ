import { useState } from "react";
import { motion } from "framer-motion";
import {
  Calendar,
  DollarSign,
  ShoppingBag,
  Receipt,
  AlertTriangle,
  UtensilsCrossed,
  Bike,
  Clock,
  ChevronLeft,
  ChevronRight,
  User,
  Phone,
  MapPin,
  XCircle,
  Ban,
  CheckCircle2,
  RotateCcw,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { formatDZD } from "@/lib/restaurant";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cancelReasonLabel } from "@/lib/order-cancel";
import type { DailyDetailSummary, OrderRecord } from "./types";

/** Localised HH:MM label, or a dash when the timestamp is missing. */
function fmtTime(value?: string | null): string {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleTimeString("ar", { hour: "2-digit", minute: "2-digit" });
}

/** Arabic label for a stored cancellation reason (with free-text fallback). */
function reasonLabel(o: OrderRecord): string {
  if (!o.cancel_reason) return "ملغى بدون سبب";
  if (o.cancel_reason === "other" && o.cancel_reason_other)
    return `أخرى: ${o.cancel_reason_other}`;
  return cancelReasonLabel(o.cancel_reason);
}

interface DailyReportTabProps {
  daily: DailyDetailSummary;
  selectedDate: string; // YYYY-MM-DD
  onDateChange: (dateStr: string) => void;
}

export function DailyReportTab({
  daily,
  selectedDate,
  onDateChange,
}: DailyReportTabProps) {
  const [filterType, setFilterType] = useState<"all" | "paid" | "cancelled">("all");
  const [selectedOrder, setSelectedOrder] = useState<OrderRecord | null>(null);

  const todayStr = new Date().toISOString().slice(0, 10);
  const yesterdayStr = new Date(Date.now() - 86400000).toISOString().slice(0, 10);

  const prevDay = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() - 1);
    onDateChange(d.toISOString().slice(0, 10));
  };

  const nextDay = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + 1);
    onDateChange(d.toISOString().slice(0, 10));
  };

  const filteredOrders = daily.orders.filter((o) => {
    if (filterType === "all") return true;
    return o.status === filterType;
  });

  return (
    <div className="space-y-4">
      {/* Date Selector Header */}
      <div className="bg-card border border-border rounded-sm p-3 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-1.5">
          <Button
            variant="outline"
            size="icon"
            onClick={nextDay}
            className="h-8 w-8 rounded-sm"
            title="اليوم التالي"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </Button>
          <div className="flex items-center gap-1.5">
            <Button
              variant={selectedDate === todayStr ? "default" : "outline"}
              size="sm"
              onClick={() => onDateChange(todayStr)}
              className="text-xs font-semibold rounded-sm h-8"
            >
              اليوم
            </Button>
            <Button
              variant={selectedDate === yesterdayStr ? "default" : "outline"}
              size="sm"
              onClick={() => onDateChange(yesterdayStr)}
              className="text-xs font-semibold rounded-sm h-8"
            >
              أمس
            </Button>
            <div className="relative">
              <Input
                type="date"
                value={selectedDate}
                onChange={(e) => e.target.value && onDateChange(e.target.value)}
                className="h-8 w-auto text-xs font-bold rounded-sm pr-2.5"
              />
            </div>
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={prevDay}
            className="h-8 w-8 rounded-sm"
            title="اليوم السابق"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </Button>
        </div>

        <div className="text-xs font-bold text-foreground flex items-center gap-1.5">
          <Calendar className="w-3.5 h-3.5 text-primary" />
          <span>{daily.displayDate}</span>
        </div>
      </div>

      {/* Daily Summary Ribbon (Administrative Ledger Grid) */}
      <div className="rounded-sm border border-border bg-card overflow-hidden grid grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x sm:divide-x-reverse divide-border">
        <div className="p-3.5 flex flex-col justify-between">
          <span className="text-xs font-medium text-muted-foreground">
            مبيعات اليوم المحصلة
          </span>
          <div className="text-xl font-bold text-foreground tabular-nums my-1">
            {formatDZD(daily.totalRevenue)}
          </div>
          <span className="text-[11px] text-muted-foreground">
            إجمالي الفواتير المدفوعة
          </span>
        </div>

        <div className="p-3.5 flex flex-col justify-between">
          <span className="text-xs font-medium text-muted-foreground">
            الطلبات المكتملة
          </span>
          <div className="text-xl font-bold text-[#27734F] tabular-nums my-1">
            {daily.completedCount} <span className="text-xs font-normal text-muted-foreground">طلب</span>
          </div>
          <span className="text-[11px] text-muted-foreground">
            طلبات ناجحة تم تسليمها
          </span>
        </div>

        <div className="p-3.5 flex flex-col justify-between">
          <span className="text-xs font-medium text-muted-foreground">
            متوسط قيمة الطلب
          </span>
          <div className="text-xl font-bold text-foreground tabular-nums my-1">
            {formatDZD(daily.avgTicket)}
          </div>
          <span className="text-[11px] text-muted-foreground">
            متوسط الفاتورة للعميل
          </span>
        </div>

        {/* Cancellation Box in Red */}
        <div className="p-3.5 flex flex-col justify-between bg-[#B33F35]/5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[#B33F35]">
              الطلبات الملغاة (هدر مالي)
            </span>
            <AlertTriangle className="w-3.5 h-3.5 text-[#B33F35]" />
          </div>
          <div className="text-xl font-bold text-[#B33F35] tabular-nums my-1">
            {daily.cancelledCount > 0 ? `-${formatDZD(daily.cancelledTotal)}` : "0 دج"}
          </div>
          <span className="text-[11px] font-medium text-[#B33F35]">
            {daily.cancelledCount} طلبات ملغاة بأسبابها
          </span>
        </div>
      </div>

      {/* Breakdown by Order Type */}
      <div className="bg-card border border-border rounded-sm overflow-hidden">
        <div className="px-4 py-2.5 bg-secondary/30 border-b border-border flex items-center justify-between">
          <h3 className="text-xs font-bold text-foreground flex items-center gap-2">
            <UtensilsCrossed className="w-3.5 h-3.5 text-primary" />
            <span>توزيع قنوات البيع (الصالة، السفري، التوصيل)</span>
          </h3>
        </div>

        <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Dine-in */}
          <div className="rounded-sm border border-border bg-secondary/20 p-3 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <UtensilsCrossed className="w-3.5 h-3.5 text-primary" />
                طاولات الصالة
              </span>
              <span className="text-xs font-bold text-primary tabular-nums">
                {daily.byType.dine_in.percentage}%
              </span>
            </div>
            <div className="text-lg font-bold text-foreground tabular-nums">
              {formatDZD(daily.byType.dine_in.revenue)}
            </div>
            <div className="text-[11px] text-muted-foreground flex justify-between">
              <span>عدد الطلبات:</span>
              <span className="font-bold text-foreground">{daily.byType.dine_in.count}</span>
            </div>
            <div className="h-1.5 bg-secondary rounded-full overflow-hidden mt-1">
              <div
                className="h-full bg-primary rounded-full transition-all"
                style={{ width: `${daily.byType.dine_in.percentage}%` }}
              />
            </div>
          </div>

          {/* Takeaway */}
          <div className="rounded-sm border border-border bg-secondary/20 p-3 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <ShoppingBag className="w-3.5 h-3.5 text-[#3D6F9E]" />
                طلبات سفري (استلام)
              </span>
              <span className="text-xs font-bold text-[#3D6F9E] tabular-nums">
                {daily.byType.takeaway.percentage}%
              </span>
            </div>
            <div className="text-lg font-bold text-foreground tabular-nums">
              {formatDZD(daily.byType.takeaway.revenue)}
            </div>
            <div className="text-[11px] text-muted-foreground flex justify-between">
              <span>عدد الطلبات:</span>
              <span className="font-bold text-foreground">{daily.byType.takeaway.count}</span>
            </div>
            <div className="h-1.5 bg-secondary rounded-full overflow-hidden mt-1">
              <div
                className="h-full bg-[#3D6F9E] rounded-full transition-all"
                style={{ width: `${daily.byType.takeaway.percentage}%` }}
              />
            </div>
          </div>

          {/* Delivery */}
          <div className="rounded-sm border border-border bg-secondary/20 p-3 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <Bike className="w-3.5 h-3.5 text-[#B86D16]" />
                طلبات التوصيل
              </span>
              <span className="text-xs font-bold text-[#B86D16] tabular-nums">
                {daily.byType.delivery.percentage}%
              </span>
            </div>
            <div className="text-lg font-bold text-foreground tabular-nums">
              {formatDZD(daily.byType.delivery.revenue)}
            </div>
            <div className="text-[11px] text-muted-foreground flex justify-between">
              <span>عدد الطلبات:</span>
              <span className="font-bold text-foreground">{daily.byType.delivery.count}</span>
            </div>
            <div className="h-1.5 bg-secondary rounded-full overflow-hidden mt-1">
              <div
                className="h-full bg-[#B86D16] rounded-full transition-all"
                style={{ width: `${daily.byType.delivery.percentage}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Hourly Chart for this day */}
      <div className="bg-card border border-border rounded-sm overflow-hidden">
        <div className="px-4 py-2.5 bg-secondary/30 border-b border-border flex items-center justify-between">
          <h3 className="text-xs font-bold text-foreground flex items-center gap-2">
            <Clock className="w-3.5 h-3.5 text-primary" />
            <span>ساعات الذروة والمبيعات (ساعة بساعة)</span>
          </h3>
          <span className="text-[11px] text-muted-foreground">على مدار اليوم</span>
        </div>
        <div className="p-4">
          <div className="h-48" dir="ltr">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={daily.hourly}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" strokeOpacity={0.6} vertical={false} />
                <XAxis
                  dataKey="hour"
                  tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(h) => `${h}:00`}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
                  axisLine={false}
                  tickLine={false}
                  width={35}
                />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (!active || !payload?.length) return null;
                    const item = payload[0].payload;
                    return (
                      <div className="bg-card border border-border rounded-sm p-2 text-xs shadow-sm">
                        <div className="font-bold text-foreground mb-0.5">
                          الساعة {label}:00
                        </div>
                        <div className="text-muted-foreground">
                          عدد الطلبات: <b className="text-foreground">{item.count}</b>
                        </div>
                        <div className="text-primary font-bold mt-0.5">
                          المبيعات: {formatDZD(item.revenue)}
                        </div>
                      </div>
                    );
                  }}
                />
                <Bar
                  dataKey="revenue"
                  fill="var(--primary)"
                  radius={[2, 2, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Full Daily Orders Log */}
      <div className="bg-card border border-border rounded-sm overflow-hidden">
        <div className="px-4 py-2.5 bg-secondary/30 border-b border-border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5">
          <h3 className="text-xs font-bold text-foreground flex items-center gap-2">
            <Receipt className="w-3.5 h-3.5 text-primary" />
            <span>سجل فواتير اليوم ({filteredOrders.length})</span>
          </h3>

          <div className="flex items-center gap-1 bg-secondary/70 p-0.5 rounded-sm text-xs">
            <button
              onClick={() => setFilterType("all")}
              className={`px-2.5 py-1 rounded-sm text-xs transition-colors cursor-pointer ${
                filterType === "all"
                  ? "bg-card text-foreground font-bold shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              الكل ({daily.orders.length})
            </button>
            <button
              onClick={() => setFilterType("paid")}
              className={`px-2.5 py-1 rounded-sm text-xs transition-colors cursor-pointer ${
                filterType === "paid"
                  ? "bg-card text-[#27734F] font-bold shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              مدفوعة ({daily.completedCount})
            </button>
            <button
              onClick={() => setFilterType("cancelled")}
              className={`px-2.5 py-1 rounded-sm text-xs transition-colors cursor-pointer ${
                filterType === "cancelled"
                  ? "bg-card text-[#B33F35] font-bold shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              ملغاة ({daily.cancelledCount})
            </button>
          </div>
        </div>

        {filteredOrders.length === 0 ? (
          <div className="text-center py-10 text-xs text-muted-foreground">
            لا توجد طلبات مسجلة في هذا اليوم بهذا التصنيف
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-right border-collapse">
              <thead>
                <tr className="border-b border-border text-muted-foreground bg-secondary/15">
                  <th className="py-2 px-3 font-semibold">رقم الطلب</th>
                  <th className="py-2 px-3 font-semibold">وقت الطلب</th>
                  <th className="py-2 px-3 font-semibold">وقت الدفع</th>
                  <th className="py-2 px-3 font-semibold">النوع / الطاولة</th>
                  <th className="py-2 px-3 font-semibold">العميل</th>
                  <th className="py-2 px-3 font-semibold">الحالة / سبب الإلغاء</th>
                  <th className="py-2 px-3 font-semibold text-left">المبلغ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredOrders.map((o) => {
                  const isCancelled = o.status === "cancelled";
                  const orderNum = o.daily_number
                    ? `#${String(o.daily_number).padStart(3, "0")}`
                    : `#${o.id.slice(-5)}`;
                  const time = fmtTime(o.created_at);
                  const paidTime = fmtTime(o.served_at);
                  const tableLabel =
                    o.order_type === "dine_in" && o.table_number != null
                      ? `طاولة ${o.table_number}`
                      : null;

                  return (
                    <tr
                      key={o.id}
                      onClick={() => setSelectedOrder(selectedOrder?.id === o.id ? null : o)}
                      className={`cursor-pointer transition-colors hover:bg-secondary/40 ${
                        isCancelled ? "bg-[#B33F35]/5" : ""
                      }`}
                    >
                      <td className="py-2.5 px-3 font-mono font-bold text-foreground">
                        {orderNum}
                      </td>
                      <td className="py-2.5 px-3 text-muted-foreground tabular-nums">
                        {time}
                      </td>
                      <td className="py-2.5 px-3 text-muted-foreground tabular-nums">
                        {paidTime}
                      </td>
                      <td className="py-2.5 px-3">
                        {o.order_type === "delivery" ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-[#B86D16] bg-[#B86D16]/10 px-1.5 py-0.5 rounded-sm">
                            <Bike className="w-3 h-3" /> توصيل
                          </span>
                        ) : o.order_type === "takeaway" ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-[#3D6F9E] bg-[#3D6F9E]/10 px-1.5 py-0.5 rounded-sm">
                            <ShoppingBag className="w-3 h-3" /> سفري
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-foreground bg-secondary px-1.5 py-0.5 rounded-sm">
                            <UtensilsCrossed className="w-3 h-3" /> {tableLabel ?? "طاولة"}
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-foreground">
                        {o.customer_name ? (
                          <div className="font-medium">{o.customer_name}</div>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3">
                        {isCancelled ? (
                          <div className="flex flex-col items-start gap-1">
                            <div className="inline-flex items-center gap-1.5 text-[11px] font-medium text-[#B33F35] bg-[#B33F35]/10 px-2 py-0.5 rounded-sm border border-[#B33F35]/20">
                              <Ban className="w-3 h-3 shrink-0" />
                              <span>{reasonLabel(o)}</span>
                            </div>
                            {o.refunded && (
                              <div className="inline-flex items-center gap-1 text-[11px] font-medium text-[#B86D16] bg-[#B86D16]/10 px-2 py-0.5 rounded-sm border border-[#B86D16]/20">
                                <RotateCcw className="w-3 h-3 shrink-0" />
                                <span>
                                  مُسترجَع: {formatDZD(o.refund_amount ?? o.total)}
                                </span>
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-[#27734F] bg-[#27734F]/10 px-1.5 py-0.5 rounded-sm">
                            <CheckCircle2 className="w-3 h-3" /> مدفوع
                          </span>
                        )}
                      </td>
                      <td
                        className={`py-2.5 px-3 text-left font-bold tabular-nums text-xs ${
                          isCancelled
                            ? "text-[#B33F35] line-through"
                            : "text-foreground"
                        }`}
                      >
                        {formatDZD(o.total)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
