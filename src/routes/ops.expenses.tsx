import { useEffect, useState, useMemo } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Wallet, TrendingDown, ShoppingBag, Users, Loader2, Filter } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useRestaurantId, formatDZD } from "@/lib/restaurant";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { tx } from "@/lib/ops-tx";


export const Route = createFileRoute("/ops/expenses")({
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

const TYPE_LABELS: Record<string, { label: string; color: string }> = {
  purchase: { label: tx("شراء"), color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300" },
  payment: { label: tx("دفعة"), color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300" },
  advance: { label: tx("advance"), color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300" },
  return: { label: tx("مرتجع"), color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300" },
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
      const { data: txs } = await supabase
        .from("supplier_transactions")
        .select("*")
        .eq("restaurant_id", restaurantId)
        .gte("date", from)
        .lte("date", to)
        .order("date", { ascending: false });
      if (cancel) return;

      const supplierIds = [...new Set((txs ?? []).map((t: any) => t.supplier_id).filter(Boolean))];
      let supplierMap = new Map<string, string>();
      if (supplierIds.length) {
        const { data: sups } = await supabase.from("suppliers").select("id,name").in("id", supplierIds);
        for (const s of sups ?? []) supplierMap.set((s as any).id, (s as any).name);
      }

      setTxRows(
        (txs ?? []).map((t: any) => ({
          id: t.id,
          supplier_name: supplierMap.get(t.supplier_id) ?? "—",
          type: t.type ?? "purchase",
          amount: Number(t.amount ?? 0),
          date: t.date ?? "",
          notes: t.notes ?? null,
        }))
      );
      setLoading(false);
    })();
    return () => { cancel = true; };
  }, [restaurantId, from, to]);

  const filtered = useMemo(() => {
    if (typeFilter === "all") return txRows;
    return txRows.filter((t) => t.type === typeFilter);
  }, [txRows, typeFilter]);

  const summary = useMemo<Summary>(() => {
    let purchases = 0, payments = 0;
    for (const t of txRows) {
      if (t.type === "purchase") purchases += t.amount;
      else payments += t.amount;
    }
    return { purchases, salaries: 0, waste: 0, total: purchases - payments };
  }, [txRows]);

  return (
    <div className="p-2 space-y-4" dir="rtl">
      <div className="flex items-center gap-2">
        <Wallet className="w-5 h-5 text-[var(--primary)]" />
        <h1 className="text-lg font-bold">{tx("المصاريف")}</h1>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
        <Card className="p-3">
          <div className="flex items-center gap-2 text-[var(--muted-foreground)] text-xs mb-1">
            <ShoppingBag className="w-3.5 h-3.5" />
            {tx("المشتريات")}
          </div>
          <div className="text-lg font-bold text-red-600">{formatDZD(summary.purchases)}</div>
        </Card>
        <Card className="p-3">
          <div className="flex items-center gap-2 text-[var(--muted-foreground)] text-xs mb-1">
            <Wallet className="w-3.5 h-3.5" />
            {tx("المدفوعات")}
          </div>
          <div className="text-lg font-bold text-green-600">{formatDZD(summary.purchases - summary.total)}</div>
        </Card>
        <Card className="p-3">
          <div className="flex items-center gap-2 text-[var(--muted-foreground)] text-xs mb-1">
            <TrendingDown className="w-3.5 h-3.5" />
            {tx("صافي المصروفات")}
          </div>
          <div className="text-lg font-bold">{formatDZD(summary.total)}</div>
        </Card>
        <Card className="p-3">
          <div className="flex items-center gap-2 text-[var(--muted-foreground)] text-xs mb-1">
            <Users className="w-3.5 h-3.5" />
            {tx("الرواتب")}
          </div>
          <div className="text-lg font-bold text-amber-600">{formatDZD(summary.salaries)}</div>
        </Card>
      </div>

      {/* Filters */}
      <Card className="p-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5">
            <Filter className="w-4 h-4 text-[var(--muted-foreground)]" />
            <span className="text-xs font-medium">{tx("من")}</span>
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="h-8 w-32 text-xs" />
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-medium">{tx("إلى")}</span>
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="h-8 w-32 text-xs" />
          </div>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="h-8 w-32 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{tx("الكل")}</SelectItem>
              <SelectItem value="purchase">{tx("شراء")}</SelectItem>
              <SelectItem value="payment">{tx("دفعة")}</SelectItem>
              <SelectItem value="advance">{tx("advance")}</SelectItem>
              <SelectItem value="return">{tx("مرتجع")}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Card>

      {/* Transactions Table */}
      <Card>
        {loading ? (
          <div className="p-8 flex items-center justify-center">
            <Loader2 className="w-5 h-5 animate-spin text-[var(--muted-foreground)]" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-sm text-[var(--muted-foreground)]">
            {tx("لا توجد معاملات في هذه الفترة")}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">{tx("التاريخ")}</TableHead>
                  <TableHead className="text-xs">{tx("المورد")}</TableHead>
                  <TableHead className="text-xs">{tx("النوع")}</TableHead>
                  <TableHead className="text-xs text-left">{tx("المبلغ")}</TableHead>
                  <TableHead className="text-xs">{tx("ملاحظات")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((row) => {
                  const typeInfo = TYPE_LABELS[row.type] ?? TYPE_LABELS.purchase;
                  return (
                    <TableRow key={row.id}>
                      <TableCell className="text-xs font-mono">{row.date}</TableCell>
                      <TableCell className="text-xs font-medium">{row.supplier_name}</TableCell>
                      <TableCell>
                        <Badge variant="secondary" className={`text-[10px] ${typeInfo.color}`}>
                          {typeInfo.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs font-bold text-left tabular-nums">
                        {row.type === "purchase" ? "+" : "−"}{formatDZD(row.amount)}
                      </TableCell>
                      <TableCell className="text-xs text-[var(--muted-foreground)] max-w-[200px] truncate">
                        {row.notes ?? "—"}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>
    </div>
  );
}
