import {
  AlertTriangle,
  Ban,
  Clock,
  DollarSign,
  TrendingDown,
  UserX,
  XCircle,
  HelpCircle,
  UtensilsCrossed,
  Bike,
  ShoppingBag,
  RotateCcw,
} from "lucide-react";
import { formatDZD } from "@/lib/restaurant";
import { cancelReasonLabel } from "@/lib/order-cancel";
import type { FullAnalyticsData, OrderRecord } from "./types";

/** Arabic label for a stored cancellation reason (with free-text fallback). */
function reasonLabel(o: OrderRecord): string {
  if (!o.cancel_reason) return "غير محدد";
  if (o.cancel_reason === "other" && o.cancel_reason_other)
    return `أخرى: ${o.cancel_reason_other}`;
  return cancelReasonLabel(o.cancel_reason);
}

interface CancellationsReportTabProps {
  cancellations: FullAnalyticsData["cancellations"];
  totalOrdersCount: number;
}

export function CancellationsReportTab({
  cancellations,
  totalOrdersCount,
}: CancellationsReportTabProps) {
  const { reasons, cancelledOrders, totalLost, count, mostCommonReason } =
    cancellations;

  const cancellationRate =
    totalOrdersCount > 0 ? Math.round((count / totalOrdersCount) * 100) : 0;

  return (
    <div className="space-y-4">
      {/* Warning Hero Box */}
      <div className="bg-[#B33F35]/10 border border-[#B33F35]/30 rounded-sm p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-sm bg-[#B33F35]/20 text-[#B33F35] flex items-center justify-center shrink-0 border border-[#B33F35]/30">
            <AlertTriangle className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-[#B33F35]">
              سجل الهدر والمشاكل التشغيلية والطلبات الملغاة
            </h3>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              تتبع أسباب إلغاء الطلبات وتكرارها لمعالجة مواطن الخلل في المطبخ أو الصالة
            </p>
          </div>
        </div>

        <div className="bg-card border border-[#B33F35]/30 rounded-sm px-3 py-1.5 text-left shrink-0">
          <span className="text-[10px] text-muted-foreground block">
            إجمالي الهدر المالي
          </span>
          <span className="text-sm font-bold text-[#B33F35] tabular-nums">
            {count > 0 ? `-${formatDZD(totalLost)}` : "0 دج"}
          </span>
        </div>
      </div>

      {/* KPI Ribbon for Cancellations */}
      <div className="rounded-sm border border-border bg-card overflow-hidden grid grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x sm:divide-x-reverse divide-border">
        <div className="p-3.5 flex flex-col justify-between">
          <span className="text-xs font-medium text-muted-foreground">
            المبالغ الملغاة
          </span>
          <div className="text-xl font-bold text-[#B33F35] tabular-nums my-1">
            {count > 0 ? `-${formatDZD(totalLost)}` : "0 دج"}
          </div>
          <span className="text-[11px] text-muted-foreground">
            قيمة الفواتير المفقودة
          </span>
        </div>

        <div className="p-3.5 flex flex-col justify-between">
          <span className="text-xs font-medium text-muted-foreground">
            عدد الطلبات الملغاة
          </span>
          <div className="text-xl font-bold text-[#B33F35] tabular-nums my-1">
            {count} <span className="text-xs font-normal text-muted-foreground">طلب</span>
          </div>
          <span className="text-[11px] text-muted-foreground">
            تم إلغاؤها خلال الفترة
          </span>
        </div>

        <div className="p-3.5 flex flex-col justify-between">
          <span className="text-xs font-medium text-muted-foreground">
            نسبة الإلغاء
          </span>
          <div className="text-xl font-bold text-foreground tabular-nums my-1">
            {cancellationRate}%
          </div>
          <span className="text-[11px] text-muted-foreground">
            من إجمالي الطلبات
          </span>
        </div>

        <div className="p-3.5 flex flex-col justify-between">
          <span className="text-xs font-medium text-muted-foreground">
            السبب الأكثر تكراراً
          </span>
          <div className="text-xs font-bold text-foreground truncate my-1">
            {mostCommonReason || "لا يوجد"}
          </div>
          <span className="text-[11px] text-muted-foreground">
            المشكلة الرئيسية
          </span>
        </div>
      </div>

      {/* Reasons Breakdown */}
      <div className="bg-card border border-border rounded-sm overflow-hidden">
        <div className="px-4 py-2.5 bg-secondary/30 border-b border-border flex items-center justify-between">
          <h3 className="text-xs font-bold text-foreground flex items-center gap-2">
            <Ban className="w-3.5 h-3.5 text-[#B33F35]" />
            <span>توزيع أسباب الإلغاء ونسب الخسائر</span>
          </h3>
          <span className="text-[11px] text-muted-foreground">{reasons.length} أسباب مسجلة</span>
        </div>

        {reasons.length === 0 ? (
          <div className="text-center py-10 text-xs text-muted-foreground">
            لا توجد أي طلبات ملغاة مسجلة في هذه الفترة
          </div>
        ) : (
          <div className="divide-y divide-border">
            {reasons.map((r, idx) => (
              <div
                key={idx}
                className="p-3.5 space-y-2 hover:bg-secondary/20 transition-colors"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-sm bg-[#B33F35]/15 text-[#B33F35] flex items-center justify-center font-bold text-xs">
                      {idx + 1}
                    </span>
                    <span className="font-medium text-xs text-foreground">
                      {r.reason}
                    </span>
                    <span className="text-[11px] text-muted-foreground">
                      ({r.count} طلبات)
                    </span>
                  </div>

                  <div className="text-left shrink-0">
                    <span className="font-bold text-[#B33F35] text-xs tabular-nums">
                      -{formatDZD(r.totalAmount)}
                    </span>
                    <span className="text-[11px] text-muted-foreground ms-2">
                      ({r.percentage}%)
                    </span>
                  </div>
                </div>

                <div className="h-1.5 w-full bg-secondary rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#B33F35] rounded-full transition-all"
                    style={{ width: `${Math.max(r.percentage, 3)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      {/* Detailed Cancelled Orders Log */}
      <div className="bg-card border border-border rounded-sm overflow-hidden">
        <div className="px-4 py-2.5 bg-secondary/30 border-b border-border flex items-center justify-between">
          <h3 className="text-xs font-bold text-foreground flex items-center gap-2">
            <XCircle className="w-3.5 h-3.5 text-[#B33F35]" />
            <span>سجل الطلبات الملغاة بالتفصيل ({cancelledOrders.length})</span>
          </h3>
          <span className="text-[11px] text-muted-foreground">تتضمن سبب الإلغاء والمسؤول</span>
        </div>

        {cancelledOrders.length === 0 ? (
          <div className="text-center py-10 text-xs text-muted-foreground">
            لا توجد طلبات ملغاة في هذا السجل
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-right border-collapse">
              <thead>
                <tr className="border-b border-border text-muted-foreground bg-secondary/15">
                  <th className="py-2 px-3 font-semibold">رقم الطلب</th>
                  <th className="py-2 px-3 font-semibold">وقت الإلغاء</th>
                  <th className="py-2 px-3 font-semibold">النوع / الطاولة</th>
                  <th className="py-2 px-3 font-semibold">سبب الإلغاء</th>
                  <th className="py-2 px-3 font-semibold">من قام بالإلغاء</th>
                  <th className="py-2 px-3 font-semibold text-left">المبلغ الضائع</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {cancelledOrders.map((o) => {
                  const orderNum = o.daily_number
                    ? `#${String(o.daily_number).padStart(3, "0")}`
                    : `#${o.id.slice(-5)}`;
                  const dateStr = o.cancelled_at || o.created_at;
                  const time = new Date(dateStr).toLocaleString("ar", {
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  });
                  const tableLabel =
                    o.order_type === "dine_in" && o.table_number != null
                      ? `طاولة ${o.table_number}`
                      : null;

                  return (
                    <tr
                      key={o.id}
                      className="bg-[#B33F35]/5 hover:bg-[#B33F35]/10 transition-colors"
                    >
                      <td className="py-2.5 px-3 font-mono font-bold text-foreground">
                        {orderNum}
                      </td>
                      <td className="py-2.5 px-3 text-muted-foreground tabular-nums">
                        {time}
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
                      <td className="py-2.5 px-3">
                        <div className="flex flex-col items-start gap-1">
                          <div className="inline-flex items-center gap-1.5 text-xs font-medium text-[#B33F35] bg-[#B33F35]/10 px-2 py-0.5 rounded-sm border border-[#B33F35]/25">
                            <Ban className="w-3 h-3 shrink-0" />
                            <span>{reasonLabel(o)}</span>
                          </div>
                          {o.refunded && (
                            <div className="inline-flex items-center gap-1 text-[11px] font-medium text-[#B86D16] bg-[#B86D16]/10 px-2 py-0.5 rounded-sm border border-[#B86D16]/25">
                              <RotateCcw className="w-3 h-3 shrink-0" />
                              <span>
                                مُسترجَع: {formatDZD(o.refund_amount ?? o.total)}
                              </span>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="py-2.5 px-3 text-muted-foreground">
                        {o.cancelled_by_name || o.cancelled_by || "الإدارة"}
                      </td>
                      <td className="py-2.5 px-3 text-left font-bold text-[#B33F35] tabular-nums text-xs">
                        -{formatDZD(o.total)}
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
