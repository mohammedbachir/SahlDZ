import { useEffect, useState, useMemo } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { BarChart3, ShoppingCart, Trash2, Users, Loader2, Printer } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useRestaurantId, formatDZD } from "@/lib/restaurant";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { tx } from "@/lib/ops-tx";


export const Route = createFileRoute("/ops/reports")({
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
      const purchases = (purchasesRes.data ?? []).reduce((s: number, p: any) => s + Number(p.total ?? 0), 0);
      const salaries = (salariesRes.data ?? []).reduce((s: number, p: any) => s + Number(p.net_salary ?? 0), 0);
      const wasteCost = (wasteRes.data ?? []).reduce((s: number, w: any) => s + Number(w.cost ?? 0), 0);
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
    return () => { cancel = true; };
  }, [restaurantId, from, to]);

  const profitPct = report && report.revenue > 0 ? Math.round((report.netProfit / report.revenue) * 100) : 0;

  function printReport() {
    if (!report) return;
    const w = window.open("", "_blank", "width=420,height=600");
    if (!w) return;
    const html = `<!doctype html>
<html dir="rtl" lang="ar"><head><meta charset="utf-8"/><title>تقرير</title>
<style>
  @page{size:80mm auto;margin:4mm}body{font-family:'Cairo',system-ui,sans-serif;width:72mm;margin:0 auto;color:#000}
  .center{text-align:center}.name{font-size:18px;font-weight:800}.muted{color:#555;font-size:12px}
  hr{border:none;border-top:1px dashed #000;margin:8px 0}
  .row{font-size:13px;display:flex;justify-content:space-between;padding:3px 0}
  .total{font-size:15px;font-weight:800;display:flex;justify-content:space-between}
</style></head><body>
  <div class="center"><div class="name">تقرير الفترة</div>
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
    w.document.open(); w.document.write(html); w.document.close();
  }

  return (
    <div className="p-2 space-y-4" dir="rtl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-[var(--primary)]" />
          <h1 className="text-lg font-bold">{tx("التقارير")}</h1>
        </div>
        <Button variant="outline" size="sm" onClick={printReport} disabled={!report} className="gap-1.5">
          <Printer className="w-4 h-4" />
          <span className="hidden sm:inline">{tx("طباعة")}</span>
        </Button>
      </div>

      {/* Date Range */}
      <Card className="p-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium">{tx("من")}</span>
          <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="h-8 w-32 text-xs" />
          <span className="text-xs font-medium">{tx("إلى")}</span>
          <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="h-8 w-32 text-xs" />
        </div>
      </Card>

      {loading ? (
        <div className="p-8 flex items-center justify-center">
          <Loader2 className="w-5 h-5 animate-spin text-[var(--muted-foreground)]" />
        </div>
      ) : report ? (
        <>
          {/* Revenue KPI */}
          <Card className="p-4">
            <div className="text-center">
              <div className="text-xs text-[var(--muted-foreground)] mb-1">{tx("إجمالي الإيرادات")}</div>
              <div className="text-3xl font-extrabold text-[var(--primary)] tabular-nums">{formatDZD(report.revenue)}</div>
              <div className="text-xs text-[var(--muted-foreground)] mt-1">
                {report.ordersCount} {tx("طلب")} · {tx("متوسط")} {formatDZD(report.avgOrder)}
              </div>
            </div>
          </Card>

          {/* Expenses Breakdown */}
          <div className="grid gap-3 grid-cols-3">
            <Card className="p-3 text-center">
              <ShoppingCart className="w-4 h-4 mx-auto text-red-500 mb-1" />
              <div className="text-xs text-[var(--muted-foreground)]">{tx("المشتريات")}</div>
              <div className="text-sm font-bold text-red-600">{formatDZD(report.purchases)}</div>
            </Card>
            <Card className="p-3 text-center">
              <Users className="w-4 h-4 mx-auto text-amber-500 mb-1" />
              <div className="text-xs text-[var(--muted-foreground)]">{tx("الرواتب")}</div>
              <div className="text-sm font-bold text-amber-600">{formatDZD(report.salaries)}</div>
            </Card>
            <Card className="p-3 text-center">
              <Trash2 className="w-4 h-4 mx-auto text-orange-500 mb-1" />
              <div className="text-xs text-[var(--muted-foreground)]">{tx("الهدر")}</div>
              <div className="text-sm font-bold text-orange-600">{formatDZD(report.wasteCost)}</div>
            </Card>
          </div>

          {/* Total Expenses + Net Profit */}
          <div className="grid gap-3 grid-cols-2">
            <Card className="p-4">
              <div className="text-xs text-[var(--muted-foreground)] mb-1">{tx("إجمالي المصروفات")}</div>
              <div className="text-xl font-bold text-red-600">{formatDZD(report.totalExpenses)}</div>
            </Card>
            <Card className="p-4">
              <div className="text-xs text-[var(--muted-foreground)] mb-1">{tx("صافي الربح")}</div>
              <div className={`text-xl font-bold ${report.netProfit >= 0 ? "text-green-600" : "text-red-600"}`}>
                {report.netProfit >= 0 ? "+" : ""}{formatDZD(report.netProfit)}
              </div>
              <div className="text-xs text-[var(--muted-foreground)]">{profitPct}%</div>
            </Card>
          </div>
        </>
      ) : null}
    </div>
  );
}
