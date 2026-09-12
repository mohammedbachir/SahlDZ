import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { requireOpsAccess, useAreaPermission } from "@/lib/permissions";
import { CanWrite } from "@/components/PermissionsGate";
import { Plus, Printer, Lock, Minus, Check } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useRestaurantId, formatDZD } from "@/lib/restaurant";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { tx } from "@/lib/ops-tx";
import { useTranslation } from "react-i18next";


export const Route = createFileRoute("/ops/inventory-count")({
  beforeLoad: requireOpsAccess("inventoryCount"),
  component: OpsInventoryCount,
});

type CountRow = {
  id: string;
  count_date: string;
  status: string;
  notes: string | null;
  total_variance_value: number;
};
type Ingredient = { id: string; name: string; unit: string; current_stock: number; cost_per_unit: number };
type CountItem = {
  id: string;
  ingredient_id: string;
  expected_qty: number;
  counted_qty: number;
  variance: number;
  variance_value: number;
};

function OpsInventoryCount() {
  useTranslation();
  const { restaurantId } = useRestaurantId();
  const { canWrite } = useAreaPermission("inventoryCount");
  const [counts, setCounts] = useState<CountRow[]>([]);
  const [active, setActive] = useState<CountRow | null>(null);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [items, setItems] = useState<CountItem[]>([]);
  const [loading, setLoading] = useState(false);

  async function loadCounts() {
    if (!restaurantId) return;
    const { data } = await supabase
      .from("inventory_counts")
      .select("*")
      .eq("restaurant_id", restaurantId);
    const rows = (data as CountRow[]) ?? [];
    rows.sort((a, b) => String(b.count_date).localeCompare(String(a.count_date)));
    setCounts(rows);
  }
  useEffect(() => {
    if (!restaurantId) {
      // Mock data for preview
      setCounts([
        { id: "c1", count_date: "2025-07-30", status: "open", notes: null, total_variance_value: 0 },
        { id: "c2", count_date: "2025-07-25", status: "closed", notes: null, total_variance_value: -15000 },
      ]);
      return;
    }
    loadCounts();
  }, [restaurantId]);

  async function loadActive(c: CountRow) {
    if (!restaurantId) {
      // Mock data for preview
      setActive(c);
      setIngredients([
        { id: "ing1", name: "دجاج طازج", unit: "كيلو", current_stock: 25, cost_per_unit: 450 },
        { id: "ing2", name: "لحم بقري", unit: "كيلو", current_stock: 15, cost_per_unit: 1200 },
        { id: "ing3", name: "أرز بسمتي", unit: "كيلو", current_stock: 50, cost_per_unit: 200 },
        { id: "ing4", name: "طماطم", unit: "كيلو", current_stock: 10, cost_per_unit: 80 },
        { id: "ing5", name: "بصل", unit: "كيلو", current_stock: 8, cost_per_unit: 60 },
        { id: "ing6", name: "زيت زيتون", unit: "لتر", current_stock: 5, cost_per_unit: 800 },
      ]);
      setItems([
        { id: "ci1", ingredient_id: "ing1", expected_qty: 25, counted_qty: 23, variance: -2, variance_value: -900 },
        { id: "ci2", ingredient_id: "ing2", expected_qty: 15, counted_qty: 14, variance: -1, variance_value: -1200 },
        { id: "ci3", ingredient_id: "ing3", expected_qty: 50, counted_qty: 52, variance: 2, variance_value: 400 },
        { id: "ci4", ingredient_id: "ing4", expected_qty: 10, counted_qty: 9, variance: -1, variance_value: -80 },
        { id: "ci5", ingredient_id: "ing5", expected_qty: 8, counted_qty: 8, variance: 0, variance_value: 0 },
        { id: "ci6", ingredient_id: "ing6", expected_qty: 5, counted_qty: 4.5, variance: -0.5, variance_value: -400 },
      ]);
      return;
    }
    setActive(c);
    setLoading(true);
    const [{ data: ings }, { data: its }] = await Promise.all([
      supabase.from("ingredients").select("id, name, unit, current_stock, cost_per_unit").eq("restaurant_id", restaurantId!),
      supabase.from("inventory_count_items").select("*").eq("count_id", c.id),
    ]);
    setIngredients((ings as Ingredient[]) ?? []);
    setItems((its as CountItem[]) ?? []);
    setLoading(false);
  }

  async function startNew() {
    if (!restaurantId) {
      // Mock new count for preview
      const newCount: CountRow = {
        id: `c${Date.now()}`,
        count_date: new Date().toISOString().slice(0, 10),
        status: "open",
        notes: null,
        total_variance_value: 0,
      };
      setCounts((prev) => [newCount, ...prev]);
      setActive(newCount);
      setIngredients([
        { id: "ing1", name: "دجاج طازج", unit: "كيلو", current_stock: 25, cost_per_unit: 450 },
        { id: "ing2", name: "لحم بقري", unit: "كيلو", current_stock: 15, cost_per_unit: 1200 },
        { id: "ing3", name: "أرز بسمتي", unit: "كيلو", current_stock: 50, cost_per_unit: 200 },
        { id: "ing4", name: "طماطم", unit: "كيلو", current_stock: 10, cost_per_unit: 80 },
        { id: "ing5", name: "بصل", unit: "كيلو", current_stock: 8, cost_per_unit: 60 },
        { id: "ing6", name: "زيت زيتون", unit: "لتر", current_stock: 5, cost_per_unit: 800 },
      ]);
      setItems([
        { id: "ci1", ingredient_id: "ing1", expected_qty: 25, counted_qty: 0, variance: -25, variance_value: -11250 },
        { id: "ci2", ingredient_id: "ing2", expected_qty: 15, counted_qty: 0, variance: -15, variance_value: -18000 },
        { id: "ci3", ingredient_id: "ing3", expected_qty: 50, counted_qty: 0, variance: -50, variance_value: -10000 },
        { id: "ci4", ingredient_id: "ing4", expected_qty: 10, counted_qty: 0, variance: -10, variance_value: -800 },
        { id: "ci5", ingredient_id: "ing5", expected_qty: 8, counted_qty: 0, variance: -8, variance_value: -480 },
        { id: "ci6", ingredient_id: "ing6", expected_qty: 5, counted_qty: 0, variance: -5, variance_value: -4000 },
      ]);
      toast.success(tx("تم بدء جرد جديد"));
      return;
    }
    const { data: c, error } = await supabase
      .from("inventory_counts")
      .insert({ restaurant_id: restaurantId, count_date: new Date().toISOString().slice(0, 10), status: "open" })
      .select("*")
      .single();
    if (error || !c) return toast.error(error?.message ?? tx("خطأ"));
    const { data: ings } = await supabase
      .from("ingredients")
      .select("id, current_stock, cost_per_unit")
      .eq("restaurant_id", restaurantId);
    if (ings && ings.length > 0) {
      await supabase.from("inventory_count_items").insert(
        ings.map((i: any) => ({
          count_id: c.id,
          ingredient_id: i.id,
          expected_qty: Number(i.current_stock) || 0,
          counted_qty: 0,
          variance: -Number(i.current_stock) || 0,
          variance_value: 0,
        })),
      );
    }
    await loadCounts();
    await loadActive(c as CountRow);
    toast.success(tx("تم بدء جرد جديد"));
  }

  async function saveCountedQty(itemId: string, counted: number) {
    if (!restaurantId) return;
    const item = items.find((i) => i.id === itemId);
    const ing = ingredients.find((g) => g.id === item?.ingredient_id);
    if (!item || !ing) return;
    const safe = Math.max(0, counted);
    const variance = safe - Number(item.expected_qty);
    const variance_value = variance * Number(ing.cost_per_unit || 0);
    const prev = { ...item };
    setItems((prevItems) => prevItems.map((i) => i.id === itemId ? { ...i, counted_qty: safe, variance, variance_value } : i));
    const { error } = await supabase
      .from("inventory_count_items")
      .update({ counted_qty: safe, variance, variance_value })
      .eq("id", itemId);
    if (error) {
      toast.error(tx("فشل حفظ الكمية"));
      setItems((prevItems) => prevItems.map((i) => i.id === itemId ? { ...prev, id: i.id } : i));
    }
  }

  async function closeCount() {
    if (!active) return;
    const total = items.reduce((s, i) => s + Number(i.variance_value), 0);
    const { error } = await supabase
      .from("inventory_counts")
      .update({ status: "closed", closed_at: new Date().toISOString(), total_variance_value: total })
      .eq("id", active.id);
    if (error) return toast.error(error.message);
    toast.success(tx("تم إقفال الجرد"));
    await loadCounts();
    setActive({ ...active, status: "closed", total_variance_value: total });
  }

  const totalVariance = useMemo(() => items.reduce((s, i) => s + Number(i.variance_value), 0), [items]);

  if (active) {
    const isClosed = active.status === "closed";
    return (
      <div dir="rtl" className="space-y-3">
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-lg p-3 flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="font-bold text-sm">جرد بتاريخ {active.count_date}</div>
            <div className="text-xs text-[var(--muted-foreground)]">
              {isClosed ? tx("مُقفل") : tx("مفتوح")} · إجمالي الفرق: {formatDZD(totalVariance)}
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => window.print()}><Printer className="w-3.5 h-3.5 ml-1" /> {tx("طباعة")}</Button>
            {!isClosed && canWrite && <Button size="sm" className="h-8 text-xs" onClick={closeCount}><Lock className="w-3.5 h-3.5 ml-1" /> {tx("إقفال")}</Button>}
            <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => setActive(null)}>{tx("عودة")}</Button>
          </div>
        </div>

        <div className="bg-[var(--card)] border border-[var(--border)] rounded-lg p-3 overflow-x-auto">
          {loading ? (
            <div className="text-center py-6 text-[var(--muted-foreground)] text-sm">{tx("جار التحميل...")}</div>
          ) : (
            <table className="w-full text-xs">
              <thead className="text-[var(--muted-foreground)]">
                <tr className="border-b border-[var(--border)]">
                  <th className="text-right p-2">{tx("المكوّن")}</th>
                  <th className="text-right p-2">{tx("الوحدة")}</th>
                  <th className="text-right p-2">{tx("المتوقع")}</th>
                  <th className="text-right p-2">{tx("المعدود")}</th>
                  <th className="text-right p-2">{tx("الفرق")}</th>
                  <th className="text-right p-2">{tx("قيمة الفرق")}</th>
                </tr>
              </thead>
              <tbody>
                {items.map((it) => {
                  const ing = ingredients.find((g) => g.id === it.ingredient_id);
                  return (
                    <tr key={it.id} className="border-b border-[var(--border)]/50">
                      <td className="p-2">{ing?.name ?? "—"}</td>
                      <td className="p-2 text-[var(--muted-foreground)]">{ing?.unit}</td>
                      <td className="p-2">{Number(it.expected_qty).toFixed(2)}</td>
                      <td className="p-2 w-44">
                        {isClosed || !canWrite ? (
                          Number(it.counted_qty).toFixed(2)
                        ) : (
                          <div className="flex items-center gap-1" dir="rtl">
                            <Button
                              size="icon"
                              variant="outline"
                              className="h-7 w-7"
                              onClick={() => saveCountedQty(it.id, Number(it.counted_qty) + 1)}
                            >
                              <Plus className="w-3.5 h-3.5" />
                            </Button>
                            <span className="w-14 text-center tabular-nums text-sm font-medium">
                              {Number(it.counted_qty).toFixed(2)}
                            </span>
                            <Button
                              size="icon"
                              variant="outline"
                              className="h-7 w-7"
                              onClick={() => saveCountedQty(it.id, Math.max(0, Number(it.counted_qty) - 1))}
                            >
                              <Minus className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7"
                              title={tx("تطابق مع المتوقع")}
                              onClick={() => saveCountedQty(it.id, Number(it.expected_qty))}
                            >
                              <Check className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        )}
                      </td>
                      <td className={`p-2 ${it.variance < 0 ? "text-[var(--destructive)]" : it.variance > 0 ? "text-emerald-600" : ""}`}>
                        {Number(it.variance).toFixed(2)}
                      </td>
                      <td className="p-2">{formatDZD(it.variance_value)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    );
  }

  return (
    <div dir="rtl" className="space-y-3">
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-lg p-3 flex items-center justify-between">
        <div>
          <h3 className="font-bold text-sm">{tx("جرد المخزون")}</h3>
          <p className="text-xs text-[var(--muted-foreground)]">{tx("قارن المخزون الفعلي بالمخزون النظري واستخرج الفروقات.")}</p>
        </div>
        {canWrite && <Button onClick={startNew} size="sm" className="h-8 text-xs"><Plus className="w-3.5 h-3.5 ml-1" /> {tx("جرد جديد")}</Button>}
      </div>

      <div className="space-y-1.5">
        {counts.map((c) => (
          <div key={c.id} className="bg-[var(--card)] border border-[var(--border)] rounded-lg p-2.5 cursor-pointer hover:bg-[var(--muted)]/50 flex items-center justify-between transition-colors" onClick={() => loadActive(c)}>
            <div>
              <div className="font-medium text-sm">{c.count_date}</div>
              <div className="text-xs text-[var(--muted-foreground)]">فرق: {formatDZD(c.total_variance_value)}</div>
            </div>
            <Badge variant={c.status === "closed" ? "secondary" : "default"} className="text-[11px]">
              {c.status === "closed" ? tx("مُقفل") : tx("مفتوح")}
            </Badge>
          </div>
        ))}
        {counts.length === 0 && (
          <div className="text-center text-[var(--muted-foreground)] py-10 text-sm">{tx("لا توجد عمليات جرد")}</div>
        )}
      </div>
    </div>
  );
}
