import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { requireOpsAccess } from "@/lib/permissions";
import { BarChart3, Printer, Loader2, Calendar } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useRestaurantId, formatDZD } from "@/lib/restaurant";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
};

function startOfMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function OpsReports() {
  const { restaurantId } = useRestaurantId();

  const [report, setReport] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [from, setFrom] = useState(startOfMonth());
  const [to, setTo] = useState(today());

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
      });
      setLoading(false);
      return;
    }
    let cancel = false;
    (async () => {
      setLoading(true);
      const [ordersRes, purchasesRes, salariesRes, wasteRes] = await Promise.all([
        supabase
          .from("orders")
          .select("total")
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
      const revenue = orders.reduce((s: number, o: any) => s + Number(o.total ?? 0), 0);
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
      });
      setLoading(false);
    })();
    return () => {
      cancel = true;
    };
  }, [restaurantId, from, to]);

  const profitPct =
    report && report.revenue > 0 ? Math.round((report.netProfit / report.revenue) * 100) : 0;

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
  <div class="center"><div class="name">تقرير الفترة المالية</div>
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

  return (
    <div className="space-y-4" dir="rtl">
      {/* Contextual Page Toolbar */}
      <div className="rounded-md border border-border bg-card p-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-sm bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <BarChart3 className="w-4 h-4" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-foreground">
              {tx("التقارير المالية والتشغيلية")}
            </h1>
            <p className="text-[11px] text-muted-foreground">
              {tx("كشف الحساب الإجمالي والدخل للفترة المحددة")}
            </p>
          </div>
        </div>

        {/* Date Filters and Action */}
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <div className="flex items-center gap-1.5 border border-border rounded-sm px-2 py-1 bg-secondary/30 text-xs">
            <Calendar className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
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

          <Button
            variant="outline"
            size="sm"
            onClick={printReport}
            disabled={!report || loading}
            className="h-8 gap-1.5 rounded-sm text-xs font-medium shrink-0"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>{tx("طباعة التقرير")}</span>
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="rounded-md border border-border bg-card p-12 flex items-center justify-center">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        </div>
      ) : report ? (
        <div className="space-y-4">
          {/* Horizontal Financial Summary Ribbon */}
          <div className="rounded-md border border-border bg-card overflow-hidden grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x sm:divide-x-reverse divide-border">
            <div className="p-4 flex flex-col justify-between">
              <span className="text-xs font-medium text-muted-foreground">
                {tx("إجمالي الإيرادات")}
              </span>
              <div className="text-2xl font-bold text-foreground tabular-nums my-1">
                {formatDZD(report.revenue)}
              </div>
              <span className="text-[11px] text-muted-foreground">
                {report.ordersCount} {tx("طلب")} · {tx("متوسط")} {formatDZD(report.avgOrder)}
              </span>
            </div>

            <div className="p-4 flex flex-col justify-between">
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

            <div className="p-4 flex flex-col justify-between bg-secondary/15">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">
                  {tx("صافي النتيجة")}
                </span>
                <Badge
                  variant={report.netProfit >= 0 ? "success" : "destructive"}
                  className="text-[10px] px-1.5 py-0"
                >
                  {report.netProfit >= 0 ? tx("ربح") : tx("خسارة")}
                </Badge>
              </div>
              <div
                className={`text-2xl font-bold tabular-nums my-1 ${
                  report.netProfit >= 0 ? "text-[#27734F]" : "text-[#B33F35]"
                }`}
              >
                {report.netProfit >= 0 ? "+" : ""}
                {formatDZD(report.netProfit)}
              </div>
              <span className="text-[11px] text-muted-foreground">
                {tx("هامش الربح")}: {profitPct}%
              </span>
            </div>

            <div className="p-4 flex flex-col justify-between">
              <span className="text-xs font-medium text-muted-foreground">
                {tx("حجم العمليات")}
              </span>
              <div className="text-xl font-bold text-foreground tabular-nums my-1">
                {report.ordersCount} {tx("عملية بيع")}
              </div>
              <span className="text-[11px] text-muted-foreground">
                {tx("خلال الفترة المحددة أعلاه")}
              </span>
            </div>
          </div>

          {/* Table-First Income Statement Ledger */}
          <div className="rounded-md border border-border bg-card overflow-hidden">
            <div className="px-4 py-2.5 bg-secondary/30 border-b border-border flex items-center justify-between">
              <h2 className="text-xs font-semibold text-foreground">
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
                    <TableHead className="text-right text-xs">{tx("البند المحاسبي")}</TableHead>
                    <TableHead className="text-right text-xs">{tx("التصنيف")}</TableHead>
                    <TableHead className="text-right text-xs">{tx("البيان الإيضاحي")}</TableHead>
                    <TableHead className="text-right text-xs">{tx("المبلغ")}</TableHead>
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
                      {tx("مبيعات الطلبات المدفوعة المسجلة عبر النظام")} ({report.ordersCount}{" "}
                      {tx("طلب")})
                    </TableCell>
                    <TableCell className="font-bold text-xs tabular-nums text-[#27734F]">
                      +{formatDZD(report.revenue)}
                    </TableCell>
                  </TableRow>

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
                      {tx("تكاليف المواد الغذائية التالفة والمحروقة المسجلة")}
                    </TableCell>
                    <TableCell className="font-medium text-xs tabular-nums text-foreground">
                      −{formatDZD(report.wasteCost)}
                    </TableCell>
                  </TableRow>

                  {/* Net Profit Summary Row */}
                  <TableRow className="bg-secondary/20 font-bold border-t-2 border-border">
                    <TableCell className="text-xs font-bold text-foreground">
                      {tx("صافي النتيجة التشغيلية (الربح / الخسارة)")}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={report.netProfit >= 0 ? "success" : "destructive"}
                        className="text-[10px]"
                      >
                        {report.netProfit >= 0 ? tx("صافي ربح") : tx("صافي خسارة")}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground font-normal">
                      {tx("الإيرادات مطروحاً منها كافة المصروفات والهدر")}
                    </TableCell>
                    <TableCell
                      className={`text-sm font-bold tabular-nums ${
                        report.netProfit >= 0 ? "text-[#27734F]" : "text-[#B33F35]"
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
        </div>
      ) : null}
    </div>
  );
}
