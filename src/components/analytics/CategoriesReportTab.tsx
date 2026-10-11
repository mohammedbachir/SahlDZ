import { useState } from "react";
import { motion } from "framer-motion";
import {
  Layers,
  Flame,
  Snowflake,
  TrendingUp,
  Percent,
  Package,
} from "lucide-react";
import { formatDZD } from "@/lib/restaurant";
import type { CategoryPerformance, TopItemPerformance } from "./types";

interface CategoriesReportTabProps {
  categories: CategoryPerformance[];
  topItems: TopItemPerformance[];
  bottomItems: TopItemPerformance[];
  totalSales: number;
}

export function CategoriesReportTab({
  categories,
  topItems,
  bottomItems,
  totalSales,
}: CategoriesReportTabProps) {
  const [subTab, setSubTab] = useState<"categories" | "topItems" | "bottomItems">("categories");

  const totalItemsSold = categories.reduce((s, c) => s + c.quantitySold, 0);

  return (
    <div className="space-y-4">
      {/* Sub tabs navigation */}
      <div className="flex items-center gap-1 bg-card border border-border p-1 rounded-sm w-fit text-xs">
        <button
          onClick={() => setSubTab("categories")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-sm transition-colors cursor-pointer ${
            subTab === "categories"
              ? "bg-primary text-primary-foreground font-semibold"
              : "text-muted-foreground hover:text-foreground hover:bg-secondary/60"
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>عائلات الأصناف ({categories.length})</span>
        </button>
        <button
          onClick={() => setSubTab("topItems")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-sm transition-colors cursor-pointer ${
            subTab === "topItems"
              ? "bg-primary text-primary-foreground font-semibold"
              : "text-muted-foreground hover:text-foreground hover:bg-secondary/60"
          }`}
        >
          <Flame className="w-3.5 h-3.5 text-[#B86D16]" />
          <span>الأطباق الأكثر طلباً</span>
        </button>
        <button
          onClick={() => setSubTab("bottomItems")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-sm transition-colors cursor-pointer ${
            subTab === "bottomItems"
              ? "bg-primary text-primary-foreground font-semibold"
              : "text-muted-foreground hover:text-foreground hover:bg-secondary/60"
          }`}
        >
          <Snowflake className="w-3.5 h-3.5 text-[#3D6F9E]" />
          <span>الأصناف الأقل طلباً (راكدة)</span>
        </button>
      </div>

      {/* Subtab 1: Categories / Families */}
      {subTab === "categories" && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {categories.map((c) => (
              <div
                key={c.categoryId}
                className="bg-card border border-border rounded-sm p-3.5 space-y-2.5 transition-colors hover:bg-secondary/20"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-sm bg-secondary text-foreground flex items-center justify-center font-bold text-xs border border-border">
                      <Layers className="w-3.5 h-3.5 text-primary" />
                    </div>
                    <div>
                      <h4 className="font-bold text-xs text-foreground">
                        {c.categoryName}
                      </h4>
                      <span className="text-[11px] text-muted-foreground">
                        {c.quantitySold} قطعة مباعة
                      </span>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-primary tabular-nums">
                    {c.percentageOfFoodSales}%
                  </span>
                </div>

                <div className="text-lg font-bold text-foreground tabular-nums">
                  {formatDZD(c.totalRevenue)}
                </div>

                {/* Progress bar for category share */}
                <div className="space-y-1">
                  <div className="h-1.5 w-full bg-secondary rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full transition-all"
                      style={{ width: `${Math.max(c.percentageOfFoodSales, 2)}%` }}
                    />
                  </div>
                </div>

                {c.topItemName && (
                  <div className="pt-2 border-t border-border text-xs flex items-center justify-between">
                    <span className="text-muted-foreground text-[11px] flex items-center gap-1">
                      <Flame className="w-3 h-3 text-[#B86D16]" />
                      الأكثر طلباً:
                    </span>
                    <span className="font-medium text-foreground text-xs truncate max-w-[150px]">
                      {c.topItemName}
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>

          {categories.length === 0 && (
            <div className="text-center py-10 text-xs text-muted-foreground">
              لا توجد تصنيفات أو مبيعات مسجلة في هذه الفترة
            </div>
          )}
        </div>
      )}

      {/* Subtab 2: Top Selling Items */}
      {subTab === "topItems" && (
        <div className="bg-card border border-border rounded-sm overflow-hidden">
          <div className="px-4 py-2.5 bg-secondary/30 border-b border-border flex items-center justify-between">
            <h3 className="text-xs font-bold text-foreground flex items-center gap-2">
              <Flame className="w-3.5 h-3.5 text-[#B86D16]" />
              <span>الأطباق والوجبات الأكثر طلباً ومبيعاً</span>
            </h3>
            <span className="text-[11px] text-muted-foreground">{topItems.length} صنف</span>
          </div>

          {topItems.length === 0 ? (
            <div className="text-center py-10 text-xs text-muted-foreground">
              لا توجد أصناف مباعة بعد
            </div>
          ) : (
            <div className="divide-y divide-border">
              {topItems.map((item, idx) => (
                <div
                  key={idx}
                  className="p-3 flex items-center justify-between gap-3 hover:bg-secondary/30 transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="w-6 h-6 rounded-sm bg-secondary flex items-center justify-center font-bold text-xs text-muted-foreground border border-border">
                      {idx + 1}
                    </span>
                    <div>
                      <h4 className="font-bold text-xs text-foreground">
                        {item.name}
                      </h4>
                      <span className="text-[11px] text-muted-foreground">
                        {item.categoryName} · {item.quantity} طلب
                      </span>
                    </div>
                  </div>

                  <div className="text-left shrink-0">
                    <div className="text-xs font-bold text-foreground tabular-nums">
                      {formatDZD(item.revenue)}
                    </div>
                    <div className="text-[11px] font-semibold text-primary tabular-nums">
                      {item.percentageOfSales}% من المبيعات
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Subtab 3: Bottom Selling Items */}
      {subTab === "bottomItems" && (
        <div className="bg-card border border-border rounded-sm overflow-hidden">
          <div className="px-4 py-2.5 bg-secondary/30 border-b border-border flex items-center justify-between">
            <h3 className="text-xs font-bold text-foreground flex items-center gap-2">
              <Snowflake className="w-3.5 h-3.5 text-[#3D6F9E]" />
              <span>الأصناف الراكدة (الأقل طلباً في المنيو)</span>
            </h3>
            <span className="text-[11px] text-muted-foreground">
              بحاجة لمراجعة الأسعار أو التسويق
            </span>
          </div>

          {bottomItems.length === 0 ? (
            <div className="text-center py-10 text-xs text-muted-foreground">
              لا توجد بيانات كافية
            </div>
          ) : (
            <div className="divide-y divide-border">
              {bottomItems.map((item, idx) => (
                <div
                  key={idx}
                  className="p-3 flex items-center justify-between gap-3 hover:bg-secondary/30 transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="w-6 h-6 rounded-sm bg-secondary flex items-center justify-center font-bold text-xs text-muted-foreground border border-border">
                      {idx + 1}
                    </span>
                    <div>
                      <h4 className="font-medium text-xs text-foreground">
                        {item.name}
                      </h4>
                      <span className="text-[11px] text-muted-foreground">
                        {item.categoryName}
                      </span>
                    </div>
                  </div>

                  <div className="text-left shrink-0 text-xs">
                    <span className="font-semibold text-foreground">
                      {item.quantity} طلبات فقط
                    </span>
                    <div className="text-[11px] text-muted-foreground tabular-nums">
                      {formatDZD(item.revenue)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
