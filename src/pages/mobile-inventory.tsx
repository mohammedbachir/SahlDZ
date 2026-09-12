import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useRestaurantId, formatDZD } from "@/lib/restaurant";
import { getFirebaseDb } from "@/integrations/firebase/config";
import {
  Package,
  Boxes,
  AlertTriangle,
  CheckCircle2,
  ClipboardList,
  RefreshCw,
  Wallet,
} from "lucide-react";

type IngredientRow = {
  id: string;
  name: string;
  unit: string;
  current_stock: number;
  alert_threshold: number;
  cost_per_unit: number;
};

type CountRow = {
  count_date: string;
  status: string;
  total_variance_value: number;
};

type Status = "empty" | "low" | "ok";

function statusOf(row: IngredientRow): Status {
  if (Number(row.current_stock) <= 0) return "empty";
  if (Number(row.current_stock) < Number(row.alert_threshold)) return "low";
  return "ok";
}

const STATUS_META: Record<
  Status,
  { label: string; badge: string; icon: any }
> = {
  empty: {
    label: "فارغ",
    badge: "bg-red-500/10 text-red-500 border-red-500/30",
    icon: AlertTriangle,
  },
  low: {
    label: "ناقص",
    badge: "bg-amber-500/10 text-amber-600 border-amber-500/30",
    icon: AlertTriangle,
  },
  ok: {
    label: "متوفر",
    badge: "bg-emerald-500/10 text-emerald-600 border-emerald-500/30",
    icon: CheckCircle2,
  },
};

const STATUS_ORDER: Record<Status, number> = { empty: 0, low: 1, ok: 2 };

export default function MobileInventory() {
  const { restaurantId, loading: rLoading } = useRestaurantId();
  const [ingredients, setIngredients] = useState<IngredientRow[]>([]);
  const [counts, setCounts] = useState<CountRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [preview, setPreview] = useState(false);

  useEffect(() => {
    if (!restaurantId || !getFirebaseDb()) {
      setPreview(!restaurantId ? false : !getFirebaseDb());
      setLoading(false);
      return;
    }
    void load(restaurantId);
    const iv = setInterval(() => void load(restaurantId), 60000);
    return () => clearInterval(iv);
  }, [restaurantId]);

  async function load(rid: string) {
    const [ingRes, countsRes] = await Promise.all([
      supabase
        .from("ingredients")
        .select("id,name,unit,current_stock,alert_threshold,cost_per_unit")
        .eq("restaurant_id", rid),
      supabase
        .from("inventory_counts")
        .select("count_date,status,total_variance_value")
        .eq("restaurant_id", rid)
        .order("count_date", { ascending: false })
        .limit(5),
    ]);

    const rows = (ingRes.data ?? []) as IngredientRow[];
    rows.sort((a, b) => {
      const ord = STATUS_ORDER[statusOf(a)] - STATUS_ORDER[statusOf(b)];
      if (ord !== 0) return ord;
      return a.name.localeCompare(b.name, "ar");
    });

    setIngredients(rows);
    setCounts((countsRes.data ?? []) as CountRow[]);
    setLoading(false);
  }

  const totalValue = ingredients.reduce(
    (s, i) => s + (Number(i.current_stock) || 0) * (Number(i.cost_per_unit) || 0),
    0,
  );
  const emptyCount = ingredients.filter((i) => statusOf(i) === "empty").length;
  const lowCount = ingredients.filter((i) => statusOf(i) === "low").length;

  if (rLoading || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[var(--background)] to-[var(--muted)]/30 p-4">
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-20 rounded-2xl bg-[var(--muted)]/20 animate-pulse"
            />
          ))}
        </div>
      </div>
    );
  }

  if (preview && ingredients.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[var(--background)] to-[var(--muted)]/30 p-4 pb-24">
        <div className="flex items-center gap-2 mb-6">
          <Package className="w-6 h-6 text-amber-500" />
          <h1 className="text-2xl font-bold">المخزون</h1>
        </div>
        <div className="rounded-2xl border border-border/40 bg-card/80 p-8 text-center">
          <Boxes className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">
            بيانات المخزون تظهر عند الاتصال بحساب المطعم
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[var(--background)] to-[var(--muted)]/30 p-4 pb-24">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Package className="w-6 h-6 text-amber-500" />
          <h1 className="text-2xl font-bold">المخزون</h1>
        </div>
        <button
          onClick={() => restaurantId && void load(restaurantId)}
          className="p-2 rounded-lg hover:bg-muted transition-colors"
        >
          <RefreshCw className="w-4 h-4 text-muted-foreground" />
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <div className="rounded-2xl border border-border/40 bg-card/80 p-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Wallet className="w-3.5 h-3.5" />
            قيمة المخزون
          </div>
          <div className="text-xl font-bold mt-1">{formatDZD(totalValue)}</div>
        </div>
        <div className="rounded-2xl border border-border/40 bg-card/80 p-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Boxes className="w-3.5 h-3.5" />
            عدد المكونات
          </div>
          <div className="text-xl font-bold mt-1">{ingredients.length}</div>
        </div>
        <div className="rounded-2xl border border-red-500/30 bg-red-500/5 p-4">
          <div className="flex items-center gap-2 text-xs text-red-500">
            <AlertTriangle className="w-3.5 h-3.5" />
            فارغ
          </div>
          <div className="text-xl font-bold mt-1 text-red-500">{emptyCount}</div>
        </div>
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-4">
          <div className="flex items-center gap-2 text-xs text-amber-600">
            <AlertTriangle className="w-3.5 h-3.5" />
            ناقص
          </div>
          <div className="text-xl font-bold mt-1 text-amber-600">{lowCount}</div>
        </div>
      </div>

      {/* Full stock list */}
      <div className="rounded-2xl border border-border/40 bg-card/80 p-4 mb-6">
        <h2 className="font-bold mb-3 flex items-center gap-2">
          <Boxes className="w-4 h-4 text-amber-500" />
          حالة المخزون
        </h2>
        {ingredients.length === 0 ? (
          <div className="text-center py-6 text-sm text-muted-foreground">
            لا توجد مكونات مسجلة
          </div>
        ) : (
          <div className="space-y-2">
            {ingredients.map((i) => {
              const st = statusOf(i);
              const meta = STATUS_META[st];
              const value = (Number(i.current_stock) || 0) * (Number(i.cost_per_unit) || 0);
              return (
                <div
                  key={i.id}
                  className="flex items-center justify-between py-2 border-b border-border/20 last:border-0"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className={`w-8 h-8 rounded-lg border flex items-center justify-center shrink-0 ${meta.badge}`}
                    >
                      <meta.icon className="w-4 h-4" />
                    </span>
                    <div className="min-w-0">
                      <div className="text-sm font-medium truncate">{i.name}</div>
                      <div className="text-[11px] text-muted-foreground">
                        {value > 0 ? `${formatDZD(value)}` : "—"} · وحدة {i.unit}
                      </div>
                    </div>
                  </div>
                  <div className="text-left shrink-0">
                    <div className="text-sm font-bold tabular-nums">
                      {Number(i.current_stock)} {i.unit}
                    </div>
                    <div
                      className={`text-[11px] rounded-full border px-2 py-0.5 mt-0.5 inline-block ${meta.badge}`}
                    >
                      {meta.label}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Recent inventory counts */}
      <div className="rounded-2xl border border-border/40 bg-card/80 p-4">
        <h2 className="font-bold mb-3 flex items-center gap-2">
          <ClipboardList className="w-4 h-4 text-amber-500" />
          آخر الجرد
        </h2>
        {counts.length === 0 ? (
          <div className="text-center py-6 text-sm text-muted-foreground">
            لم يتم إجراء جرد بعد
          </div>
        ) : (
          <div className="space-y-2">
            {counts.map((c, i) => {
              const closed = c.status === "closed";
              const variance = Number(c.total_variance_value) || 0;
              return (
                <div
                  key={`${c.count_date}-${i}`}
                  className="flex items-center justify-between py-2 border-b border-border/20 last:border-0"
                >
                  <div>
                    <div className="text-sm font-medium">
                      {new Date(c.count_date + "T00:00:00").toLocaleDateString("ar-DZ", {
                        day: "numeric",
                        month: "long",
                      })}
                    </div>
                    <span
                      className={`text-[11px] rounded-full border px-2 py-0.5 mt-0.5 inline-block ${
                        closed
                          ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/30"
                          : "bg-amber-500/10 text-amber-600 border-amber-500/30"
                      }`}
                    >
                      {closed ? "مُقفل" : "مفتوح"}
                    </span>
                  </div>
                  <div className="text-left">
                    <div
                      className={`text-sm font-bold tabular-nums ${
                        variance < 0 ? "text-red-500" : variance > 0 ? "text-emerald-600" : "text-muted-foreground"
                      }`}
                    >
                      {formatDZD(variance)}
                    </div>
                    <div className="text-[11px] text-muted-foreground">
                      {variance === 0 ? "لا فرق" : "فرق"}{" "}
                      {variance === 0 ? "" : variance < 0 ? "ناقص" : "زائد"}
                    </div>
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