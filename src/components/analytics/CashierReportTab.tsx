import { Users, DollarSign, Receipt, CreditCard, Award } from "lucide-react";
import { formatDZD } from "@/lib/restaurant";
import type { CashierPerformance } from "./types";

interface CashierReportTabProps {
  cashiers: CashierPerformance[];
  totalSales: number;
}

export function CashierReportTab({
  cashiers,
  totalSales,
}: CashierReportTabProps) {
  const totalOrders = cashiers.reduce((s, c) => s + c.ordersCount, 0);

  return (
    <div className="space-y-4">
      {/* Top Cashier KPIs - Administrative Ribbon */}
      <div className="rounded-sm border border-border bg-card overflow-hidden grid grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x sm:divide-x-reverse divide-border">
        <div className="p-3.5 flex flex-col justify-between">
          <span className="text-xs font-medium text-muted-foreground">
            إجمالي تحصيلات الكاشير
          </span>
          <div className="text-xl font-bold text-foreground tabular-nums my-1">
            {formatDZD(totalSales)}
          </div>
          <span className="text-[11px] text-muted-foreground">
            المبالغ المقبوضة نقدياً أو إلكترونياً
          </span>
        </div>

        <div className="p-3.5 flex flex-col justify-between">
          <span className="text-xs font-medium text-muted-foreground">
            عدد عمليات الدفع
          </span>
          <div className="text-xl font-bold text-foreground tabular-nums my-1">
            {totalOrders} <span className="text-xs font-normal text-muted-foreground">فاتورة</span>
          </div>
          <span className="text-[11px] text-muted-foreground">
            إجمالي فواتير الصندوق
          </span>
        </div>

        <div className="p-3.5 flex flex-col justify-between">
          <span className="text-xs font-medium text-muted-foreground">
            موظفو الصندوق النشطون
          </span>
          <div className="text-xl font-bold text-[#27734F] tabular-nums my-1">
            {cashiers.length}
          </div>
          <span className="text-[11px] text-muted-foreground">
            كاشير نفذوا عمليات بالفترة
          </span>
        </div>

        <div className="p-3.5 flex flex-col justify-between">
          <span className="text-xs font-medium text-muted-foreground">
            متوسط تحصيل العملية
          </span>
          <div className="text-xl font-bold text-foreground tabular-nums my-1">
            {totalOrders > 0 ? formatDZD(Math.round(totalSales / totalOrders)) : "0 دج"}
          </div>
          <span className="text-[11px] text-muted-foreground">
            متوسط قيمة الفاتورة المقبوضة
          </span>
        </div>
      </div>

      {/* Cashier Cards */}
      <div className="bg-card border border-border rounded-sm overflow-hidden">
        <div className="px-4 py-2.5 bg-secondary/30 border-b border-border flex items-center justify-between">
          <h3 className="text-xs font-bold text-foreground flex items-center gap-2">
            <Award className="w-3.5 h-3.5 text-primary" />
            <span>تفصيل أداء موظفي الكاشير والصندوق</span>
          </h3>
          <span className="text-[11px] text-muted-foreground">{cashiers.length} موظف</span>
        </div>

        {cashiers.length === 0 ? (
          <div className="text-center py-10 text-xs text-muted-foreground">
            لا توجد بيانات كاشير مسجلة في هذه الفترة
          </div>
        ) : (
          <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
            {cashiers.map((c) => (
              <div
                key={c.staffId}
                className="rounded-sm border border-border bg-secondary/20 p-3.5 space-y-2.5 transition-colors hover:bg-secondary/40"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-sm bg-secondary text-primary flex items-center justify-center font-bold text-xs border border-border">
                      {c.name.slice(0, 2)}
                    </div>
                    <div>
                      <h4 className="font-bold text-xs text-foreground">
                        {c.name}
                      </h4>
                      <span className="text-[11px] text-muted-foreground">
                        {c.role || "كاشير"} · {c.ordersCount} فاتورة
                      </span>
                    </div>
                  </div>

                  <span className="text-xs font-bold text-primary tabular-nums">
                    {c.percentageOfTotalSales}% من التحصيل
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border text-xs">
                  <div className="bg-card p-2 rounded-sm border border-border">
                    <span className="text-muted-foreground block text-[10px]">
                      المبالغ المحصلة
                    </span>
                    <span className="font-bold text-foreground text-xs tabular-nums">
                      {formatDZD(c.totalRevenue)}
                    </span>
                  </div>
                  <div className="bg-card p-2 rounded-sm border border-border">
                    <span className="text-muted-foreground block text-[10px]">
                      متوسط الفاتورة
                    </span>
                    <span className="font-bold text-foreground text-xs tabular-nums">
                      {formatDZD(c.avgOrderValue)}
                    </span>
                  </div>
                </div>

                <div className="h-1.5 w-full bg-secondary rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full transition-all"
                    style={{ width: `${Math.max(c.percentageOfTotalSales, 2)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
