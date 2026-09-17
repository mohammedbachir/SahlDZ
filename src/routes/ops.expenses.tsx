import { useEffect, useState, useMemo } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { requireOpsAccess } from "@/lib/permissions";
import { Wallet, Loader2, Calendar } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useRestaurantId, formatDZD } from "@/lib/restaurant";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { tx } from "@/lib/ops-tx";

export const Route = createFileRoute("/ops/expenses")({
  beforeLoad: requireOpsAccess("expenses"),
  component: OpsExpenses,
});

type TxRow = {
  id: string;
  supplier_name: string;
  type: string;
  amount: number;
  date: string;
  notes: string | null;
};

type Summary = {
  purchases: number;
  salaries: number;
  waste: number;
  total: number;
};

const TYPE_LABELS: Record<
  string,
  { label: string; variant: "destructive" | "success" | "secondary" | "warning" }
> = {
  purchase: { label: tx("شراء"), variant: "destructive" },
  payment: { label: tx("دفعة"), variant: "success" },
  advance: { label: tx("سلفة"), variant: "secondary" },
  return: { label: tx("مرتجع"), variant: "warning" },
};

function startOfMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function OpsExpenses() {
  const { restaurantId } = useRestaurantId();

  const [txRows, setTxRows] = useState<TxRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [from, setFrom] = useState(startOfMonth());
  const [to, setTo] = useState(today());
  const [typeFilter, setTypeFilter] = useState("all");

  useEffect(() => {
    if (restaurantId === undefined) return;
    if (!restaurantId) {
      setLoading(false);
      return;
    }
    let cancel = false;
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("supplier_transactions")
        .select("id, type, amount, date, notes, suppliers(name)")
        .eq("restaurant_id", restaurantId)
        .gte("date", from)
        .lte("date", to)
        .order("date", { ascending: false });

      if (cancel) return;
      if (error) {
        console.error(error);
        setLoading(false);
        return;
      }

      const rows: TxRow[] = (data ?? []).map((d: any) => ({
        id: d.id,
        supplier_name: d.suppliers?.name ?? tx("مورد غير محدد"),
        type: d.type,
        amount: Number(d.amount || 0),
        date: d.date,
        notes: d.notes,
      }));

      setTxRows(rows);
      setLoading(false);
    })();
    return () => {
      cancel = true;
    };
  }, [restaurantId, from, to]);

  const [summary, setSummary] = useState<Summary>({
    purchases: 0,
    salaries: 0,
    waste: 0,
    total: 0,
  });

  useEffect(() => {
    if (!restaurantId) return;
    let cancel = false;
    (async () => {
      const [salRes, wasteRes] = await Promise.all([
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

      const purchases = txRows
        .filter((r) => r.type === "purchase")
        .reduce((s, r) => s + r.amount, 0);

      const payments = txRows.filter((r) => r.type === "payment").reduce((s, r) => s + r.amount, 0);

      const salaries = (salRes.data ?? []).reduce(
        (s: number, r: any) => s + Number(r.net_salary || 0),
        0,
      );
      const waste = (wasteRes.data ?? []).reduce((s: number, r: any) => s + Number(r.cost || 0), 0);

      setSummary({
        purchases,
        salaries,
        waste,
        total: purchases - payments + salaries + waste,
      });
    })();
    return () => {
      cancel = true;
    };
  }, [restaurantId, txRows, from, to]);

  const filtered = useMemo(() => {
    if (typeFilter === "all") return txRows;
    return txRows.filter((r) => r.type === typeFilter);
  }, [txRows, typeFilter]);

  return (
    <div className="space-y-4" dir="rtl">
      {/* Contextual Page Toolbar */}
      <div className="rounded-md border border-border bg-card p-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-sm bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <Wallet className="w-4 h-4" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-foreground">{tx("سجل المصاريف والمدفوعات")}</h1>
            <p className="text-[11px] text-muted-foreground">
              {tx("إدارة قيود المشتريات والمدفوعات والرواتب")}
            </p>
          </div>
        </div>

        {/* Date & Type Filters */}
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

          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="h-8 w-28 text-xs rounded-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{tx("كل القيود")}</SelectItem>
              <SelectItem value="purchase">{tx("شراء")}</SelectItem>
              <SelectItem value="payment">{tx("دفعة")}</SelectItem>
              <SelectItem value="advance">{tx("سلفة")}</SelectItem>
              <SelectItem value="return">{tx("مرتجع")}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Horizontal Financial Summary Ribbon */}
      <div className="rounded-md border border-border bg-card overflow-hidden grid grid-cols-2 md:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x sm:divide-x-reverse divide-border">
        <div className="p-3.5 flex flex-col justify-between">
          <span className="text-xs text-muted-foreground font-medium">
            {tx("إجمالي المشتريات")}
          </span>
          <div className="text-xl font-bold text-foreground tabular-nums my-1">
            {formatDZD(summary.purchases)}
          </div>
          <span className="text-[11px] text-muted-foreground">{tx("فواتير الموردين المسجلة")}</span>
        </div>

        <div className="p-3.5 flex flex-col justify-between">
          <span className="text-xs text-muted-foreground font-medium">
            {tx("المدفوعات المسددة")}
          </span>
          <div className="text-xl font-bold text-[#27734F] tabular-nums my-1">
            {formatDZD(summary.purchases - summary.total + summary.salaries + summary.waste)}
          </div>
          <span className="text-[11px] text-muted-foreground">{tx("دفعات نقدية وبنكية")}</span>
        </div>

        <div className="p-3.5 flex flex-col justify-between">
          <span className="text-xs text-muted-foreground font-medium">{tx("رواتب وأجور")}</span>
          <div className="text-xl font-bold text-foreground tabular-nums my-1">
            {formatDZD(summary.salaries)}
          </div>
          <span className="text-[11px] text-muted-foreground">{tx("مسيرات الشهر المدفوعة")}</span>
        </div>

        <div className="p-3.5 flex flex-col justify-between bg-secondary/15">
          <span className="text-xs text-muted-foreground font-medium">
            {tx("صافي الالتزام والتشغيل")}
          </span>
          <div className="text-xl font-bold text-foreground tabular-nums my-1">
            {formatDZD(summary.total)}
          </div>
          <span className="text-[11px] text-muted-foreground">
            {tx("إجمالي التكلفة التشغيلية")}
          </span>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="rounded-md border border-border bg-card overflow-hidden">
        <div className="px-4 py-2.5 bg-secondary/30 border-b border-border flex items-center justify-between">
          <h2 className="text-xs font-semibold text-foreground">
            {tx("تفاصيل المعاملات والقيود")}
          </h2>
          <span className="text-[11px] text-muted-foreground">
            {filtered.length} {tx("معاملة مسجلة")}
          </span>
        </div>

        {loading ? (
          <div className="p-8 flex items-center justify-center">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-xs text-muted-foreground">
            {tx("لا توجد معاملات مسجلة في هذه الفترة")}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">{tx("التاريخ")}</TableHead>
                  <TableHead className="text-xs">{tx("المورد / الجهة")}</TableHead>
                  <TableHead className="text-xs">{tx("نوع القيد")}</TableHead>
                  <TableHead className="text-xs text-left">{tx("المبلغ")}</TableHead>
                  <TableHead className="text-xs">{tx("ملاحظات")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((row) => {
                  const typeInfo = TYPE_LABELS[row.type] ?? TYPE_LABELS.purchase;
                  return (
                    <TableRow key={row.id}>
                      <TableCell className="text-xs font-mono text-muted-foreground">
                        {row.date}
                      </TableCell>
                      <TableCell className="text-xs font-medium text-foreground">
                        {row.supplier_name}
                      </TableCell>
                      <TableCell>
                        <Badge variant={typeInfo.variant} className="text-[10px]">
                          {typeInfo.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs font-bold text-left tabular-nums">
                        <span
                          className={row.type === "payment" ? "text-[#27734F]" : "text-foreground"}
                        >
                          {row.type === "purchase" ? "+" : "−"}
                          {formatDZD(row.amount)}
                        </span>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground max-w-[240px] truncate">
                        {row.notes ?? "—"}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  );
}
