import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { formatDistanceToNow } from "date-fns";
import { ar, enUS, fr as frLocale } from "date-fns/locale";
import type { Locale } from "date-fns";
import {
  Inbox,
  ChefHat,
  CheckCheck,
  Wallet,
  Bell,
  BellOff,
  Bike,
  Phone,
  MapPin,
  User,
  Clock,
  ArrowRight,
  Filter,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useRestaurantId } from "@/lib/restaurant";
import { Button } from "@/components/ui/button";
import { formatDZD } from "@/lib/restaurant";
import { useNewOrderNotifications } from "@/hooks/useNewOrderNotifications";
import { decrementStockForOrder } from "@/lib/stock-consumption";
import { useTranslation } from "react-i18next";

type OrderStatus = "new" | "preparing" | "ready" | "paid";

type OrderItem = {
  id: string;
  name_snapshot: string;
  quantity: number;
  price_snapshot: number;
};

type Order = {
  id: string;
  restaurant_id: string;
  table_id: string | null;
  status: OrderStatus;
  total: number;
  acknowledged: boolean;
  created_at: string;
  table_number?: number | null;
  items?: OrderItem[];
  order_type?: string | null;
  customer_name?: string | null;
  customer_phone?: string | null;
  customer_address?: string | null;
};

type ColumnDef = {
  status: OrderStatus;
  label: string;
  accent: string;
  icon: React.ComponentType<{ className?: string }>;
};

const COLUMNS: ColumnDef[] = [
  { status: "new", label: "جديدة", accent: "#B33F35", icon: Inbox },
  { status: "preparing", label: "قيد التحضير", accent: "#B86D16", icon: ChefHat },
  { status: "ready", label: "جاهزة", accent: "#27734F", icon: CheckCheck },
  { status: "paid", label: "مدفوعة", accent: "#746C61", icon: Wallet },
];

function getNextStatus(o: Pick<Order, "status" | "order_type">): { label: string; next: OrderStatus } | null {
  const isDelivery = o.order_type === "delivery";
  switch (o.status) {
    case "new":
      return { label: "بدء التحضير", next: "preparing" };
    case "preparing":
      return { label: isDelivery ? "جاهز للتوصيل" : "تحديد كجاهز", next: "ready" };
    case "ready":
      return { label: isDelivery ? "✓ تم التسليم والدفع" : "تحديد كمدفوع", next: "paid" };
    default:
      return null;
  }
}

export default function OrdersPage() {
  const { t, i18n } = useTranslation();
  const { restaurantId, loading: rLoading } = useRestaurantId();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeMobileTab, setActiveMobileTab] = useState<OrderStatus>("new");
  const [, force] = useState(0);
  const notif = useNewOrderNotifications();
  const [filterType, setFilterType] = useState<string>("all");

  // Tick for relative time
  useEffect(() => {
    const t = setInterval(() => force((n) => n + 1), 30_000);
    return () => clearInterval(t);
  }, []);

  async function loadAll(rid: string) {
    setLoading(true);
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const { data: orderRows, error } = await supabase
      .from("orders")
      .select("*")
      .eq("restaurant_id", rid)
      .gte("created_at", start.toISOString())
      .order("created_at", { ascending: false });
    if (error) {
      toast.error(t("orders.loadFailed"));
      setLoading(false);
      return;
    }
    const ids = (orderRows ?? []).map((o: any) => o.id);
    const tableIds = (orderRows ?? []).map((o: any) => o.table_id).filter(Boolean) as string[];
    const [itemsRes, tablesRes] = await Promise.all([
      ids.length
        ? supabase.from("order_items").select("*").in("order_id", ids)
        : Promise.resolve({ data: [], error: null } as const),
      tableIds.length
        ? supabase.from("tables").select("id, table_number").in("id", tableIds)
        : Promise.resolve({ data: [], error: null } as const),
    ]);
    const itemsByOrder = new Map<string, OrderItem[]>();
    for (const it of (itemsRes.data ?? []) as (OrderItem & { order_id: string })[]) {
      const arr = itemsByOrder.get(it.order_id) ?? [];
      arr.push(it);
      itemsByOrder.set(it.order_id, arr);
    }
    const tableMap = new Map<string, number>();
    for (const t of (tablesRes.data ?? []) as { id: string; table_number: number }[]) {
      tableMap.set(t.id, t.table_number);
    }
    setOrders(
      (orderRows ?? []).map((o: any) => ({
        ...(o as Order),
        total: Number(o.total),
        items: itemsByOrder.get(o.id) ?? [],
        table_number: o.table_id ? tableMap.get(o.table_id) ?? null : null,
      })),
    );
    setLoading(false);
  }

  async function fetchSingleOrder(rid: string, id: string) {
    const { data: o } = await supabase
      .from("orders")
      .select("*")
      .eq("id", id)
      .eq("restaurant_id", rid)
      .maybeSingle();
    if (!o) return null;
    const [{ data: items }, { data: t }] = await Promise.all([
      supabase.from("order_items").select("*").eq("order_id", id),
      o.table_id
        ? supabase.from("tables").select("table_number").eq("id", o.table_id).maybeSingle()
        : Promise.resolve({ data: null } as const),
    ]);
    return {
      ...(o as Order),
      total: Number(o.total),
      items: (items as OrderItem[]) ?? [],
      table_number: t?.table_number ?? null,
    } as Order;
  }

  useEffect(() => {
    if (!restaurantId) {
      setLoading(false);
      return;
    }
    loadAll(restaurantId);
    const ch = supabase
      .channel("orders-rt")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "orders",
          filter: `restaurant_id=eq.${restaurantId}`,
        },
        async (payload: any) => {
          if (payload.eventType === "INSERT") {
            const fresh = await fetchSingleOrder(restaurantId, (payload.new as Order).id);
            if (fresh) {
              setOrders((prev) => [fresh, ...prev.filter((o) => o.id !== fresh.id)]);
              toast.success(t("orders.newOrder"));
              notif.notify(t("orders.newOrder"), `${t("common.table")} ${fresh.table_number ?? "?"} - ${formatDZD(fresh.total)}`);
            }
          } else if (payload.eventType === "UPDATE") {
            const updated = payload.new as Order;
            setOrders((prev) =>
              prev.map((o) =>
                o.id === updated.id
                  ? { ...o, status: updated.status, acknowledged: updated.acknowledged, total: Number(updated.total) }
                  : o,
              ),
            );
          } else if (payload.eventType === "DELETE") {
            const old = payload.old as Order;
            setOrders((prev) => prev.filter((o) => o.id !== old.id));
          }
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restaurantId]);

  const grouped = useMemo(() => {
    const g: Record<OrderStatus, Order[]> = { new: [], preparing: [], ready: [], paid: [] };
    for (const o of orders) {
      if (filterType === "all" || o.order_type === filterType) {
        g[o.status]?.push(o);
      }
    }
    return g;
  }, [orders, filterType]);

  async function advance(o: Order) {
    const cfg = getNextStatus(o);
    if (!cfg) return;
    const next = cfg.next;
    const prev = orders;
    // Optimistic
    setOrders((curr) =>
      curr.map((x) => (x.id === o.id ? { ...x, status: next, acknowledged: true } : x)),
    );
    const now = new Date();
    const patch =
      next === "paid"
        ? {
            status: next,
            payment_status: next === "paid" ? "paid" : undefined,
            acknowledged: true,
            served_at: now.toISOString(),
            review_due_at: new Date(now.getTime() + 35 * 60_000).toISOString(),
          }
        : { status: next, acknowledged: true };
    const { error } = await supabase.from("orders").update(patch).eq("id", o.id);
    if (error) {
      setOrders(prev);
      toast.error(t("orders.updateFailed"));
    } else if (next === "preparing") {
      void decrementStockForOrder(o.id);
    }
  }

  if (rLoading || loading) {
    return (
      <div className="space-y-6">
        {/* Loading stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {COLUMNS.map((c) => (
            <div key={c.status} className="bg-card border border-border rounded-xl p-4 animate-pulse">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-8 h-8 rounded-lg bg-secondary text-primary" />
                <div className="h-4 w-20 bg-muted rounded" />
              </div>
              <div className="h-8 w-12 bg-muted rounded" />
            </div>
          ))}
        </div>
        {/* Loading cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-card border border-border rounded-xl p-4 space-y-3 animate-pulse">
              <div className="h-4 w-20 bg-muted rounded" />
              <div className="h-3 w-full bg-muted rounded" />
              <div className="h-3 w-2/3 bg-muted rounded" />
              <div className="h-10 w-full bg-muted rounded-lg mt-2" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  const totalOrders = orders.length;
  const newOrders = grouped.new.length;

  return (
    <div className="space-y-6">
      {/* Stats bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="bg-card border border-border rounded-lg px-3.5 py-1.5 flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-primary" />
            <span className="text-xs font-medium text-foreground">
              {totalOrders} طلب اليوم
            </span>
          </div>
          {newOrders > 0 && (
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg px-3.5 py-1.5 flex items-center gap-2">
              <Bell className="w-3.5 h-3.5 text-destructive" />
              <span className="text-xs font-medium text-destructive">
                {newOrders} طلب جديد
              </span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {/* Filter */}
          <div className="flex items-center gap-2 bg-card border border-border rounded-lg px-3 py-1.5">
            <Filter className="w-3.5 h-3.5 text-muted-foreground" />
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="bg-transparent text-xs font-medium text-foreground outline-none cursor-pointer"
            >
              <option value="all">الكل</option>
              <option value="dine_in">طاولة</option>
              <option value="delivery">توصيل</option>
              <option value="takeaway">استلام</option>
            </select>
          </div>

          {/* Notification toggle */}
          <Button
            variant={notif.enabled ? "default" : "outline"}
            size="sm"
            onClick={() => (notif.enabled ? notif.disable() : notif.enable())}
            className="gap-2 rounded-xl"
          >
            {notif.enabled ? <Bell className="w-4 h-4" /> : <BellOff className="w-4 h-4" />}
            {notif.enabled ? "صوت مفعّل" : "تفعيل الصوت"}
          </Button>
        </div>
      </div>

      {/* Mobile tabs */}
      <div className="md:hidden flex gap-2 overflow-x-auto pb-2">
        {COLUMNS.map((c) => {
          const Icon = c.icon;
          return (
            <button
              key={c.status}
              onClick={() => setActiveMobileTab(c.status)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-colors border ${
                activeMobileTab === c.status
                  ? "bg-primary text-primary-foreground border-primary font-semibold"
                  : "bg-card border-border text-foreground hover:bg-secondary"
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {c.label}
              <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                activeMobileTab === c.status
                  ? "bg-white/20 text-white"
                  : "bg-secondary text-muted-foreground"
              }`}>
                {grouped[c.status].length}
              </span>
            </button>
          );
        })}
      </div>

      {/* Mobile single column */}
      <div className="md:hidden">
        <Column
          col={COLUMNS.find((c) => c.status === activeMobileTab)!}
          items={grouped[activeMobileTab]}
          onAdvance={advance}
        />
      </div>

      {/* Desktop 4 columns */}
      <div data-annotate="orders-columns" className="hidden md:grid grid-cols-2 lg:grid-cols-4 gap-4">
        {COLUMNS.map((c) => (
          <Column key={c.status} col={c} items={grouped[c.status]} onAdvance={advance} />
        ))}
      </div>
    </div>
  );
}

function Column({
  col,
  items,
  onAdvance,
}: {
  col: ColumnDef;
  items: Order[];
  onAdvance: (o: Order) => void;
}) {
  const { t } = useTranslation();
  const Icon = col.icon;

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden flex flex-col">
      {/* Column header */}
      <div className="bg-secondary/60 border-b border-border px-3.5 py-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Icon className="w-4 h-4 text-foreground" />
            <h2 className="text-xs font-bold text-foreground">{col.label}</h2>
          </div>
          <span className="bg-card border border-border text-foreground text-[11px] font-semibold px-2 py-0.5 rounded-md tabular-nums">
            {items.length}
          </span>
        </div>
      </div>

      {/* Orders list */}
      <div className="p-3 space-y-3 min-h-[200px] max-h-[calc(100vh-300px)] overflow-y-auto">
        <AnimatePresence initial={false}>
          {items.length === 0 ? (
            <div className="text-center text-[var(--muted-foreground)] py-12">
              <Icon className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">لا توجد طلبات</p>
            </div>
          ) : (
            items.map((o) => (
              <motion.div
                key={o.id}
                layout
                initial={{ opacity: 0, y: -10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
              >
                <OrderCard order={o} accent={col.accent} onAdvance={() => onAdvance(o)} />
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function OrderCard({ order, accent, onAdvance }: { order: Order; accent: string; onAdvance: () => void }) {
  const { t, i18n } = useTranslation();
  const cfg = getNextStatus(order);
  const isNew = order.status === "new" && !order.acknowledged;
  const orderNum = order.id.replace(/-/g, "").slice(-6).toUpperCase();
  const base = (i18n.language || "ar").split("-")[0];
  const locale: Locale = base === "en" ? enUS : base === "fr" ? frLocale : ar;
  const ago = formatDistanceToNow(new Date(order.created_at), { addSuffix: true, locale });
  const isDelivery = order.order_type === "delivery";
  const isTakeaway = order.order_type === "takeaway";

  return (
    <div
      data-annotate="orders-card"
      className={`bg-card rounded-lg border border-border p-3.5 space-y-2.5 transition-colors hover:border-primary/40 ${
        isNew ? "ring-1 ring-destructive/40" : ""
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="font-mono font-bold text-xs text-foreground">#{orderNum}</span>
          {isNew && (
            <span className="w-1.5 h-1.5 rounded-full bg-destructive" />
          )}
        </div>
        {isDelivery ? (
          <span className="text-[10px] bg-warning/10 text-warning border border-warning/20 px-2 py-0.5 rounded-md font-medium flex items-center gap-1">
            <Bike className="w-3 h-3" /> توصيل
          </span>
        ) : isTakeaway ? (
          <span className="text-[10px] bg-[#3D6F9E]/10 text-[#3D6F9E] border border-[#3D6F9E]/20 px-2 py-0.5 rounded-md font-medium">
            استلام
          </span>
        ) : order.table_number != null ? (
          <span className="text-[10px] bg-secondary text-foreground border border-border px-2 py-0.5 rounded-md font-medium">
            {t("common.table")} {order.table_number}
          </span>
        ) : null}
      </div>

      {/* Delivery info */}
      {isDelivery && (
        <div className="text-xs space-y-1 bg-secondary/50 rounded-md p-2">
          {order.customer_name && (
            <div className="flex items-center gap-1.5 text-foreground">
              <User className="w-3 h-3 text-muted-foreground" />
              {order.customer_name}
            </div>
          )}
          {order.customer_phone && (
            <a href={`tel:${order.customer_phone}`} className="flex items-center gap-1.5 text-primary hover:underline" dir="ltr">
              <Phone className="w-3 h-3" />
              {order.customer_phone}
            </a>
          )}
          {order.customer_address && (
            <div className="flex items-start gap-1.5 text-foreground">
              <MapPin className="w-3 h-3 text-muted-foreground mt-0.5 shrink-0" />
              <span className="break-words">{order.customer_address}</span>
            </div>
          )}
        </div>
      )}

      {/* Items */}
      <ul className="text-xs space-y-1">
        {(order.items ?? []).map((it) => (
          <li key={it.id} className="flex items-center justify-between">
            <span className="text-foreground">
              <span className="font-bold text-primary">x{it.quantity}</span>{" "}
              {it.name_snapshot}
            </span>
          </li>
        ))}
      </ul>

      {/* Footer */}
      <div className="flex items-center justify-between pt-2 border-t border-border">
        <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
          <Clock className="w-3 h-3" />
          {ago}
        </div>
        <span className="font-bold text-xs text-foreground tabular-nums">{formatDZD(order.total)}</span>
      </div>

      {/* Action button */}
      {cfg && (
        <button
          data-annotate="orders-actions"
          onClick={onAdvance}
          className="w-full py-2 rounded-lg font-semibold text-xs transition-colors flex items-center justify-center gap-1.5 bg-primary text-primary-foreground hover:bg-[#8C5921] cursor-pointer"
        >
          {cfg.label}
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}
