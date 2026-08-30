import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { UtensilsCrossed, LogOut, RefreshCw, CheckCircle2, Clock, ChefHat, Loader2, Bell } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useServerFn } from "@tanstack/react-start";
import { getWaiterContext, waiterLogout, waiterListReadyOrders, waiterClaimOrder, waiterMarkServed } from "@/lib/waiter.functions";
import { supabase } from "@/integrations/supabase/client";
import { isPreviewToken } from "@/lib/preview-mode";
import { tx } from "@/lib/ops-tx";


export const Route = createFileRoute("/waiter-screen")({
  component: Page,
});

type Order = {
  id: string;
  total: number;
  status: string;
  created_at: string;
  order_type: string;
  customer_name: string | null;
  daily_number: number | null;
  notes: string | null;
  table_number: number | null;
  is_mine: boolean;
};

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  new: { label: tx("waiter.statusNew"), color: "bg-yellow-100 text-yellow-800 border-yellow-200" },
  preparing: { label: tx("waiter.statusPreparing"), color: "bg-orange-100 text-orange-800 border-orange-200" },
  ready: { label: tx("waiter.statusReady"), color: "bg-green-100 text-green-800 border-green-200" },
};

const MOCK_ORDERS: Order[] = [
  {
    id: "mock-o1",
    total: 2500,
    status: "ready",
    created_at: new Date().toISOString(),
    order_type: "dine_in",
    customer_name: null,
    daily_number: 1,
    notes: null,
    table_number: 5,
    is_mine: false,
  },
  {
    id: "mock-o2",
    total: 1800,
    status: "ready",
    created_at: new Date().toISOString(),
    order_type: "delivery",
    customer_name: "أحمد بن علي",
    daily_number: 2,
    notes: "بدون بصل",
    table_number: null,
    is_mine: false,
  },
  {
    id: "mock-o3",
    total: 3200,
    status: "preparing",
    created_at: new Date().toISOString(),
    order_type: "takeaway",
    customer_name: null,
    daily_number: 3,
    notes: null,
    table_number: null,
    is_mine: true,
  },
];

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("ar-DZ", { hour: "2-digit", minute: "2-digit" });
}

/** Search params for /waiter-login, so the waiter returns to their restaurant's login. */
function waiterLoginSearch(): { rid: string } {
  try {
    const r = JSON.parse(sessionStorage.getItem("waiter_restaurant") ?? "null") as { id?: unknown } | null;
    return { rid: typeof r?.id === "string" ? r.id : "" };
  } catch {
    return { rid: "" };
  }
}

function clearWaiterSession() {
  sessionStorage.removeItem("waiter_token");
  sessionStorage.removeItem("waiter_expires");
  sessionStorage.removeItem("waiter_name");
  sessionStorage.removeItem("waiter_id");
  sessionStorage.removeItem("waiter_restaurant");
}

function Page() {
  const navigate = useNavigate();
  const getContext = useServerFn(getWaiterContext);
  const logout = useServerFn(waiterLogout);
  const listOrders = useServerFn(waiterListReadyOrders);
  const claimOrder = useServerFn(waiterClaimOrder);
  const markServed = useServerFn(waiterMarkServed);

  const [waiterName, setWaiterName] = useState("");
  const [restaurantName, setRestaurantName] = useState("");
  const [restaurantId, setRestaurantId] = useState<string | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loadingCtx, setLoadingCtx] = useState(true);
  const [servingId, setServingId] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [filter, setFilter] = useState<"all" | "ready" | "mine">("ready");

  const token = typeof window !== "undefined" ? sessionStorage.getItem("waiter_token") ?? "" : "";

  const fetchOrders = useCallback(async () => {
    if (!token) return;
    if (isPreviewToken(token)) {
      setOrders(MOCK_ORDERS);
      return;
    }
    try {
      const res = await listOrders({ data: { token } });
      setOrders(res.orders as Order[]);
    } catch {
      // session expired
    }
  }, [token]);

  useEffect(() => {
    if (!token) { navigate({ to: "/waiter-login", search: waiterLoginSearch() }); return; }
    if (!isPreviewToken(token) && (Date.now() >= Number(token.split(".")[2]) || !token.startsWith("stf."))) {
      sessionStorage.removeItem("waiter_token");
      navigate({ to: "/waiter-login", search: waiterLoginSearch() });
      return;
    }
    if (isPreviewToken(token)) {
      setWaiterName(sessionStorage.getItem("waiter_name") ?? tx("waiter.defaultWaiterName"));
      try {
        const r = JSON.parse(sessionStorage.getItem("waiter_restaurant") ?? "null");
        if (r?.name) setRestaurantName(r.name);
      } catch { /* ignore */ }
      setLoadingCtx(false);
      fetchOrders();
      pollRef.current = setInterval(fetchOrders, 6000);
      return () => { if (pollRef.current) clearInterval(pollRef.current); };
    }
    getContext({ data: { token } })
      .then((ctx) => {
        setWaiterName(ctx.waiterName);
        setRestaurantName(ctx.restaurant.name);
        setRestaurantId(ctx.restaurant.id);
        setLoadingCtx(false);
      })
      .catch(() => {
        sessionStorage.removeItem("waiter_token");
        navigate({ to: "/waiter-login", search: waiterLoginSearch() });
      });
    fetchOrders();
    pollRef.current = setInterval(fetchOrders, 6000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [token]);

  // Realtime: subscribe to order changes for instant updates
  useEffect(() => {
    if (!token || isPreviewToken(token) || !restaurantId) return;
    const channel = supabase
      .channel(`waiter-orders-${restaurantId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders", filter: `restaurant_id=eq.${restaurantId}` },
        () => fetchOrders(),
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [token, restaurantId, fetchOrders]);

  // Heartbeat: re-check session expiry every 60s
  useEffect(() => {
    if (!token || isPreviewToken(token)) return;
    const id = setInterval(() => {
      const exp = sessionStorage.getItem("waiter_expires");
      if (!exp || new Date(exp) < new Date()) {
        clearWaiterSession();
        navigate({ to: "/waiter-login", search: waiterLoginSearch() });
      }
    }, 60_000);
    return () => clearInterval(id);
  }, [token]);

  async function handleLogout() {
    const search = waiterLoginSearch();
    try { await logout({ data: { token } }); } catch { /* ignore */ }
    clearWaiterSession();
    navigate({ to: "/waiter-login", search });
  }

  async function handleClaim(orderId: string) {
    try {
      await claimOrder({ data: { token, orderId } });
      await fetchOrders();
      toast.success(tx("waiter.claimSuccess"));
    } catch (e) {
      toast.error((e as Error).message || tx("waiter.claimFailed"));
    }
  }

  async function handleServe(orderId: string) {
    setServingId(orderId);
    try {
      await markServed({ data: { token, orderId } });
      setOrders((prev) => prev.filter((o) => o.id !== orderId));
      toast.success(tx("waiter.serveSuccess"));
    } catch (e) {
      toast.error((e as Error).message || tx("waiter.serveFailed"));
    } finally {
      setServingId(null);
    }
  }

  const filtered = orders.filter((o) => {
    if (filter === "ready") return o.status === "ready";
    if (filter === "mine") return o.is_mine;
    return true;
  });

  const readyCount = orders.filter((o) => o.status === "ready").length;

  if (loadingCtx) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--background)]">
        <Loader2 className="w-6 h-6 animate-spin text-[var(--muted-foreground)]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--background)] flex flex-col" dir="rtl">
      {/* Header */}
      <header className="bg-[var(--card)] border-b border-[var(--border)] px-4 py-2.5 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[var(--primary)] flex items-center justify-center">
            <UtensilsCrossed className="w-4 h-4 text-[var(--primary-foreground)]" />
          </div>
          <div>
            <p className="font-bold text-sm leading-tight text-[var(--foreground)]">{waiterName}</p>
            <p className="text-[11px] text-[var(--muted-foreground)] leading-tight">{restaurantName}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {readyCount > 0 && (
            <div className="flex items-center gap-1 bg-[var(--primary)]/10 rounded-md px-2 py-1">
              <Bell className="w-3.5 h-3.5 text-[var(--primary)]" />
              <span className="text-xs font-bold text-[var(--primary)]">{readyCount}</span>
            </div>
          )}
          <button onClick={fetchOrders} className="text-[var(--muted-foreground)] hover:text-[var(--foreground)] p-1.5 rounded-md hover:bg-[var(--muted)] transition-colors">
            <RefreshCw className="w-4 h-4" />
          </button>
          <button onClick={handleLogout} className="text-[var(--muted-foreground)] hover:text-[var(--foreground)] p-1.5 rounded-md hover:bg-[var(--muted)] transition-colors">
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Filter tabs */}
      <div className="flex gap-1 p-2 bg-[var(--card)] border-b border-[var(--border)] sticky top-[49px] z-10">
        {(["ready", "all", "mine"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`flex-1 py-1.5 rounded-md text-xs font-medium transition-colors ${
              filter === f ? "bg-[var(--primary)] text-[var(--primary-foreground)]" : "text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--muted)]"
            }`}
          >
            {f === "ready" ? `${tx("waiter.filterReady")} (${readyCount})` : f === "all" ? tx("waiter.filterAll") : tx("waiter.filterMine")}
          </button>
        ))}
      </div>

      {/* Orders list */}
      <main className="flex-1 p-3 space-y-2 pb-6">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-[var(--muted-foreground)] gap-3">
            <CheckCircle2 className="w-10 h-10 opacity-20" />
            <p className="text-sm">
              {filter === "ready" ? tx("waiter.noReadyOrders") : tx("waiter.noOrders")}
            </p>
          </div>
        ) : (
          filtered.map((order) => (
            <div
              key={order.id}
              className={`bg-[var(--card)] border border-[var(--border)] rounded-lg p-3 space-y-2 ${
                order.status === "ready" ? "border-emerald-300 dark:border-emerald-700" : order.is_mine ? "border-blue-300 dark:border-blue-700" : ""
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-sm">
                      {order.daily_number ? `#${String(order.daily_number).padStart(3, "0")}` : "—"}
                    </span>
                    {order.table_number && (
                      <span className="text-xs bg-[var(--primary)]/10 text-[var(--primary)] px-1.5 py-0.5 rounded">
                        {tx("waiter.table")} {order.table_number}
                      </span>
                    )}
                    {order.order_type === "delivery" && (
                      <span className="text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded dark:bg-amber-900/30 dark:text-amber-300">
                        {tx("waiter.delivery")}
                      </span>
                    )}
                    {order.order_type === "takeaway" && (
                      <span className="text-xs bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded dark:bg-purple-900/30 dark:text-purple-300">
                        {tx("waiter.fastTakeaway")}
                      </span>
                    )}
                    {order.is_mine && (
                      <span className="text-[11px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded dark:bg-blue-900/30 dark:text-blue-300">{tx("waiter.yourOrders")}</span>
                    )}
                  </div>
                  {order.customer_name && (
                    <p className="text-xs text-[var(--muted-foreground)] mt-0.5">{order.customer_name}</p>
                  )}
                </div>
                <div className="text-left shrink-0">
                  <span className={`text-[11px] px-1.5 py-0.5 rounded border ${STATUS_LABELS[order.status]?.color ?? "bg-gray-100 text-gray-700 border-gray-200"}`}>
                    {STATUS_LABELS[order.status]?.label ?? order.status}
                  </span>
                  <p className="text-[11px] text-[var(--muted-foreground)] mt-1 flex items-center gap-1 justify-end">
                    <Clock className="w-3 h-3" />
                    {formatTime(order.created_at)}
                  </p>
                </div>
              </div>

              {order.notes && (
                <p className="text-xs text-amber-700 bg-amber-50 rounded px-2 py-1 dark:bg-amber-900/20 dark:text-amber-300">
                  {tx("waiter.note")} {order.notes}
                </p>
              )}

              <div className="flex gap-2">
                {!order.is_mine && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleClaim(order.id)}
                    className="flex-1 h-8 text-xs"
                  >
                    <UtensilsCrossed className="w-3.5 h-3.5 ms-1" />
                    {tx("waiter.iWillServe")}
                  </Button>
                )}
                {order.status === "ready" && (
                  <Button
                    size="sm"
                    onClick={() => handleServe(order.id)}
                    disabled={servingId === order.id}
                    className="flex-1 h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                  >
                    {servingId === order.id ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin ms-1" />
                    ) : (
                      <CheckCircle2 className="w-3.5 h-3.5 ms-1" />
                    )}
                    {tx("waiter.delivered")}
                  </Button>
                )}
                {order.status !== "ready" && order.is_mine && (
                  <div className="flex-1 flex items-center justify-center gap-1 text-xs text-[var(--muted-foreground)]">
                    <ChefHat className="w-3.5 h-3.5" />
                    {tx("waiter.preparingEllipsis")}
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </main>
    </div>
  );
}
