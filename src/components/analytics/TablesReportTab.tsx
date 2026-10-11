import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import {
  Utensils,
  Trophy,
  TrendingUp,
  Percent,
  Receipt,
  LayoutGrid,
  ArrowUpDown,
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
import type { TablePerformance } from "./types";

interface TablesReportTabProps {
  tables: TablePerformance[];
  totalDineInRevenue: number;
}

export function TablesReportTab({
  tables,
  totalDineInRevenue,
}: TablesReportTabProps) {
  const [sortBy, setSortBy] = useState<"revenue" | "orders" | "avg">("revenue");

  const sortedTables = useMemo(() => {
    return [...tables].sort((a, b) => {
      if (sortBy === "revenue") return b.totalRevenue - a.totalRevenue;
      if (sortBy === "orders") return b.ordersCount - a.ordersCount;
      return b.avgOrderValue - a.avgOrderValue;
    });
  }, [tables, sortBy]);

  const topTable = sortedTables[0];
  const totalTableOrders = tables.reduce((s, t) => s + t.ordersCount, 0);
  const avgTableBill =
    totalTableOrders > 0 ? Math.round(totalDineInRevenue / totalTableOrders) : 0;

  const chartData = sortedTables.slice(0, 10).map((t) => ({
    name: `طاولة ${t.tableNumber}`,
    revenue: t.totalRevenue,
    orders: t.ordersCount,
    percentage: t.percentageOfTableSales,
  }));

  return (
    <div className="space-y-4">
      {/* Top Table KPIs - Administrative Ribbon */}
      <div className="rounded-sm border border-border bg-card overflow-hidden grid grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x sm:divide-x-reverse divide-border">
        <div className="p-3.5 flex flex-col justify-between">
          <span className="text-xs font-medium text-muted-foreground">
            إجمالي مبيعات الطاولات
          </span>
          <div className="text-xl font-bold text-foreground tabular-nums my-1">
            {formatDZD(totalDineInRevenue)}
          </div>
          <span className="text-[11px] text-muted-foreground">
            مجموع دخل زبائن الصالة
          </span>
        </div>

        <div className="p-3.5 flex flex-col justify-between">
          <span className="text-xs font-medium text-muted-foreground">
            الطاولة الأكثر مبيعاً
          </span>
          <div className="text-xl font-bold text-[#A96F2E] tabular-nums my-1">
            {topTable ? `طاولة ${topTable.tableNumber}` : "—"}
          </div>
          <span className="text-[11px] text-muted-foreground">
            {topTable
              ? `${formatDZD(topTable.totalRevenue)} (${topTable.percentageOfTableSales}%)`
              : "لا توجد مبيعات"}
          </span>
        </div>

        <div className="p-3.5 flex flex-col justify-between">
          <span className="text-xs font-medium text-muted-foreground">
            إجمالي طلبات الصالة
          </span>
          <div className="text-xl font-bold text-foreground tabular-nums my-1">
            {totalTableOrders} <span className="text-xs font-normal text-muted-foreground">طلب</span>
          </div>
          <span className="text-[11px] text-muted-foreground">
            عدد الجلسات والفواتير
          </span>
        </div>

        <div className="p-3.5 flex flex-col justify-between">
          <span className="text-xs font-medium text-muted-foreground">
            متوسط فاتورة الطاولة
          </span>
          <div className="text-xl font-bold text-foreground tabular-nums my-1">
            {formatDZD(avgTableBill)}
          </div>
          <span className="text-[11px] text-muted-foreground">
            متوسط الاستهلاك لكل جلسة
          </span>
        </div>
      </div>

      {/* Chart: Top 10 Tables comparison */}
      <div className="bg-card border border-border rounded-sm overflow-hidden">
        <div className="px-4 py-2.5 bg-secondary/30 border-b border-border flex items-center justify-between flex-wrap gap-2.5">
          <h3 className="text-xs font-bold text-foreground flex items-center gap-2">
            <TrendingUp className="w-3.5 h-3.5 text-primary" />
            <span>مقارنة مبيعات الطاولات الأكثر دخلاً</span>
          </h3>
          <div className="flex items-center gap-1 bg-secondary/70 p-0.5 rounded-sm text-xs">
            <button
              onClick={() => setSortBy("revenue")}
              className={`px-2.5 py-1 rounded-sm text-xs transition-colors cursor-pointer ${
                sortBy === "revenue"
                  ? "bg-card text-foreground font-bold shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              حسب المبيعات (دج)
            </button>
            <button
              onClick={() => setSortBy("orders")}
              className={`px-2.5 py-1 rounded-sm text-xs transition-colors cursor-pointer ${
                sortBy === "orders"
                  ? "bg-card text-foreground font-bold shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              حسب عدد الطلبات
            </button>
          </div>
        </div>

        <div className="h-64" dir="ltr">
          {chartData.length === 0 ? (
            <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
              لا توجد مبيعات طاولات مسجلة في هذه الفترة
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="4 8" stroke="var(--border)" strokeOpacity={0.6} vertical={false} />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                  axisLine={false}
                  tickLine={false}
                  width={50}
                />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (!active || !payload?.length) return null;
                    const item = payload[0].payload;
                    return (
                      <div className="bg-card border border-border rounded-xl p-3 text-xs shadow-md">
                        <div className="font-bold text-foreground mb-1">
                          {label}
                        </div>
                        <div className="text-primary font-bold">
                          المبيعات: {formatDZD(item.revenue)} ({item.percentage}%)
                        </div>
                        <div className="text-muted-foreground mt-0.5">
                          عدد الطلبات: {item.orders}
                        </div>
                      </div>
                    );
                  }}
                />
                <Bar
                  dataKey="revenue"
                  fill="var(--primary)"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Detailed Tables List with Percentages and Progress Bars */}
      <div className="bg-card border border-border rounded-sm overflow-hidden">
        <div className="px-4 py-2.5 bg-secondary/30 border-b border-border flex items-center justify-between">
          <h3 className="text-xs font-bold text-foreground flex items-center gap-2">
            <Percent className="w-3.5 h-3.5 text-primary" />
            <span>ترتيب مساهمة الطاولات في إجمالي مبيعات الصالة</span>
          </h3>
          <span className="text-[11px] text-muted-foreground">{sortedTables.length} طاولة نشطة</span>
        </div>

        {sortedTables.length === 0 ? (
          <div className="text-center py-10 text-xs text-muted-foreground">
            لا توجد طاولات أو مبيعات مسجلة
          </div>
        ) : (
          <div className="divide-y divide-border">
            {sortedTables.map((t, idx) => {
              const rankIcon =
                idx === 0 ? "🥇" : idx === 1 ? "🥈" : idx === 2 ? "🥉" : `#${idx + 1}`;

              return (
                <div
                  key={t.tableId}
                  className="p-3.5 space-y-2 transition-colors hover:bg-secondary/40"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <span className="w-6 h-6 rounded-sm bg-secondary flex items-center justify-center font-bold text-xs text-foreground border border-border">
                        {rankIcon}
                      </span>
                      <div>
                        <div className="font-bold text-xs text-foreground">
                          طاولة {t.tableNumber}
                          {t.hallName && (
                            <span className="text-[11px] text-muted-foreground font-normal ms-2">
                              ({t.hallName})
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-muted-foreground">
                          {t.ordersCount} طلب · متوسط الفاتورة:{" "}
                          <span className="font-medium text-foreground">
                            {formatDZD(t.avgOrderValue)}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="text-left shrink-0">
                      <div className="text-sm font-bold text-foreground tabular-nums">
                        {formatDZD(t.totalRevenue)}
                      </div>
                      <div className="text-xs font-semibold text-primary tabular-nums">
                        {t.percentageOfTableSales}% من الصالة
                      </div>
                    </div>
                  </div>

                  {/* Percentage Progress Bar */}
                  <div className="h-1.5 w-full bg-secondary rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        idx === 0
                          ? "bg-[#A96F2E]"
                          : idx === 1
                            ? "bg-slate-500"
                            : idx === 2
                              ? "bg-amber-800"
                              : "bg-primary"
                      }`}
                      style={{ width: `${Math.max(t.percentageOfTableSales, 2)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
