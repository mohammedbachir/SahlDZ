import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  UtensilsCrossed,
  LogOut,
  CheckCircle2,
  Clock,
  ChefHat,
  Loader2,
  Bell,
  Undo2,
  Bike,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useServerFn } from "@tanstack/react-start";
import {
  getWaiterContext,
  waiterLogout,
  waiterListReadyOrders,
  waiterClaimOrder,
  waiterUnclaimOrder,
  waiterMarkServed,
} from "@/lib/waiter.functions";
import { isPreviewToken } from "@/lib/preview-mode";
import { tx } from "@/lib/ops-tx";
import { clearKioskRole } from "@/lib/kiosk-session";
import { staffLoginFailPath } from "@/lib/staff-session";
import { StaffTabs } from "@/components/staff-tabs";

export const Route = createFileRoute("/waiter-screen")({
  component: Page,
});

type OrderItem = {
  name: string;
  qty: number;
  note?: string | null;
  options?: Array<{ label: string; choice: string; price_delta: number }>;
};

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
  items?: OrderItem[];
};

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  new: {
    label: tx("waiter.statusNew"),
    color: "bg-yellow-100 text-yellow-800 border-yellow-200",
  },
  preparing: {
    label: tx("waiter.statusPreparing"),
    color: "bg-orange-100 text-orange-800 border-orange-200",
  },
  ready: {
    label: tx("waiter.statusReady"),
    color: "bg-green-100 text-green-800 border-green-200",
  },
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
    items: [
      { name: "برجر دجاج", qty: 2 },
      { name: "بطاطا مقلية", qty: 1 },
    ],
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
    items: [
      { name: "بيتزا مارغريتا", qty: 1 },
      { name: "مشروب غازي", qty: 2 },
    ],
  },
  {
    id: "mock-o3",
    total: 3200,
    status: "preparing",
    created_at: new Date().toISOString(),
    order_type: "delivery",
    customer_name: "أحمد",
    daily_number: 3,
    notes: null,
    table_number: null,
    is_mine: true,
    items: [
      { name: "طبق كسكس", qty: 1 },
      { name: "شوربة", qty: 2 },
    ],
  },
];

function getTimerColor(minutes: number) {
  if (minutes < 5)
    return {
      bg: "bg-blue-50",
      border: "border-blue-300",
      text: "text-blue-600",
      dot: "bg-blue-500",
    };
  if (minutes < 10)
    return {
      bg: "bg-yellow-50",
      border: "border-yellow-300",
      text: "text-yellow-600",
      dot: "bg-yellow-500",
    };
  if (minutes < 15)
    return {
      bg: "bg-orange-50",
      border: "border-orange-300",
      text: "text-orange-600",
      dot: "bg-orange-500",
    };
  return {
    bg: "bg-red-50",
    border: "border-red-400",
    text: "text-red-600",
    dot: "bg-red-500",
  };
}

function getElapsedMinutes(iso: string) {
  return Math.max(
    0,
    Math.floor((Date.now() - new Date(iso).getTime()) / 60000),
  );
}

function formatElapsed(iso: string) {
  const sec = Math.max(
    0,
    Math.floor((Date.now() - new Date(iso).getTime()) / 1000),
  );
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

/** Search params for /waiter-login, so the waiter returns to their restaurant's login. */
function waiterLoginSearch(): { rid: string } {
  try {
    const r = JSON.parse(
      localStorage.getItem("waiter_restaurant") ?? "null",
    ) as { id?: unknown } | null;
    return { rid: typeof r?.id === "string" ? r.id : "" };
  } catch {
    return { rid: "" };
  }
}

function clearWaiterSession() {
  localStorage.removeItem("waiter_token");
  localStorage.removeItem("waiter_expires");
  localStorage.removeItem("waiter_name");
  localStorage.removeItem("waiter_id");
  localStorage.removeItem("waiter_restaurant");
  clearKioskRole("waiter");
}

function waiterFailPath(): { to: string; search: { rid: string } } {
  return staffLoginFailPath(waiterLoginSearch().rid, "/waiter-login");
}

function Page() {
  const navigate = useNavigate();
  const getContext = useServerFn(getWaiterContext);
  const logout = useServerFn(waiterLogout);
  const listOrders = useServerFn(waiterListReadyOrders);
  const claimOrder = useServerFn(waiterClaimOrder);
  const unclaimOrder = useServerFn(waiterUnclaimOrder);
  const markServed = useServerFn(waiterMarkServed);

  const [waiterName, setWaiterName] = useState("");
  const [restaurantName, setRestaurantName] = useState("");
  const [restaurantId, setRestaurantId] = useState<string | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loadingCtx, setLoadingCtx] = useState(true);
  const [servingId, setServingId] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const skipRefreshUntil = useRef(0);
  const [filter, setFilter] = useState<"all" | "ready" | "mine">("ready");
  const prevReadyIdsRef = useRef<Set<string>>(new Set());
  const soundEnabledRef = useRef(true);

  const [tick, setTick] = useState(0);

  useEffect(() => {
    const i = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(i);
  }, []);

  const token =
    typeof window !== "undefined"
      ? (localStorage.getItem("waiter_token") ?? "")
      : "";

  const playReadySound = useCallback(() => {
    if (!soundEnabledRef.current) return;
    try {
      const Ctx = window.AudioContext ?? (window as any).webkitAudioContext;
      if (!Ctx) return;
      const ctx = new Ctx();
      const playTone = (freq: number, start: number, dur: number) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.001, ctx.currentTime + start);
        gain.gain.exponentialRampToValueAtTime(
          0.25,
          ctx.currentTime + start + 0.02,
        );
        gain.gain.exponentialRampToValueAtTime(
          0.001,
          ctx.currentTime + start + dur,
        );
        osc.connect(gain).connect(ctx.destination);
        osc.start(ctx.currentTime + start);
        osc.stop(ctx.currentTime + start + dur + 0.05);
      };
      playTone(880, 0, 0.22);
      playTone(1175, 0.28, 0.28);
      setTimeout(() => ctx.close().catch(() => {}), 2000);
    } catch {
      /* audio not available */
    }
  }, []);

  const fetchOrders = useCallback(async () => {
    if (!token) return;
    if (Date.now() < skipRefreshUntil.current) return;
    if (isPreviewToken(token)) {
      setOrders(MOCK_ORDERS);
      return;
    }
    try {
      const res = await listOrders({ data: { token } });
      const incoming = res.orders as Order[];
      setOrders(incoming);

      const readyIds = new Set(
        incoming.filter((o) => o.status === "ready").map((o) => o.id),
      );
      const newlyReady = Array.from(readyIds).filter(
        (id) => !prevReadyIdsRef.current.has(id),
      );
      // Prime on first poll so we don't beep for orders that were already ready.
      if (prevReadyIdsRef.current.size > 0 && newlyReady.length > 0) {
        playReadySound();
      }
      prevReadyIdsRef.current = readyIds;
    } catch {
      // session expired
    }
  }, [token, playReadySound]);

  useEffect(() => {
    if (!token) {
      navigate({ to: "/waiter-login", search: waiterLoginSearch() });
      return;
    }
    if (
      !isPreviewToken(token) &&
      (Date.now() >= Number(token.split(".")[2]) || !token.startsWith("stf."))
    ) {
      localStorage.removeItem("waiter_token");
      navigate(waiterFailPath());
      return;
    }
    if (isPreviewToken(token)) {
      setWaiterName(
        localStorage.getItem("waiter_name") ?? tx("waiter.defaultWaiterName"),
      );
      try {
        const r = JSON.parse(
          localStorage.getItem("waiter_restaurant") ?? "null",
        );
        if (r?.name) setRestaurantName(r.name);
      } catch {
        /* ignore */
      }
      setLoadingCtx(false);
      fetchOrders();
      pollRef.current = setInterval(fetchOrders, 6000);
      return () => {
        if (pollRef.current) clearInterval(pollRef.current);
      };
    }
    getContext({ data: { token } })
      .then((ctx) => {
        setWaiterName(ctx.waiterName);
        setRestaurantName(ctx.restaurant.name);
        setRestaurantId(ctx.restaurant.id);
        setLoadingCtx(false);
      })
      .catch(() => {
        localStorage.removeItem("waiter_token");
        navigate(waiterFailPath());
      });
    fetchOrders();
    pollRef.current = setInterval(fetchOrders, 6000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [token]);

  // Heartbeat: re-check session expiry every 60s
  useEffect(() => {
    if (!token || isPreviewToken(token)) return;
    const id = setInterval(() => {
      const exp = localStorage.getItem("waiter_expires");
      if (!exp || new Date(exp) < new Date()) {
        clearWaiterSession();
        navigate(waiterFailPath());
      }
    }, 60_000);
    return () => clearInterval(id);
  }, [token]);

  async function handleLogout() {
    try {
      await logout({ data: { token } });
    } catch {
      /* ignore */
    }
    clearWaiterSession();
    navigate(waiterFailPath());
  }

  async function handleClaim(orderId: string) {
    if (isPreviewToken(token)) {
      setOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, is_mine: true } : o)),
      );
      toast.success(tx("waiter.claimSuccess"));
      skipRefreshUntil.current = Date.now() + 6000;
      return;
    }
    skipRefreshUntil.current = Date.now() + 6000;
    try {
      await claimOrder({ data: { token, orderId } });
      await fetchOrders();
      toast.success(tx("waiter.claimSuccess"));
    } catch (e) {
      skipRefreshUntil.current = 0;
      toast.error((e as Error).message || tx("waiter.claimFailed"));
    }
  }

  async function handleUnclaim(orderId: string) {
    if (isPreviewToken(token)) {
      setOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, is_mine: false } : o)),
      );
      toast.success(tx("waiter.unclaimSuccess"));
      return;
    }
    skipRefreshUntil.current = Date.now() + 6000;
    try {
      await unclaimOrder({ data: { token, orderId } });
      await fetchOrders();
      toast.success(tx("waiter.unclaimSuccess"));
    } catch (e) {
      skipRefreshUntil.current = 0;
      toast.error((e as Error).message || tx("waiter.unclaimFailed"));
    }
  }

  async function handleServe(orderId: string) {
    setServingId(orderId);
    skipRefreshUntil.current = Date.now() + 6000;
    try {
      if (isPreviewToken(token)) {
        setOrders((prev) => prev.filter((o) => o.id !== orderId));
      } else {
        await markServed({ data: { token, orderId } });
        setOrders((prev) => prev.filter((o) => o.id !== orderId));
      }
      toast.success(tx("waiter.serveSuccess"));
    } catch (e) {
      skipRefreshUntil.current = 0;
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
    <div
      className="min-h-screen bg-[var(--background)] flex flex-col"
      dir="rtl"
    >
      <StaffTabs />
      {/* Header */}
      <header className="h-14 bg-[var(--card)] border-b border-[var(--border)] flex items-center justify-between px-4 md:px-6 sticky top-0 z-20">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-lg bg-[var(--primary)] flex items-center justify-center text-[var(--primary-foreground)] font-bold text-sm shrink-0">
            <UtensilsCrossed className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="font-bold text-sm truncate flex items-center gap-1.5 text-[var(--foreground)]">
              {waiterName}
            </div>
            <div className="text-[11px] text-[var(--muted-foreground)] truncate">
              {restaurantName}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="hidden md:flex items-center gap-1 bg-[var(--muted)] rounded-lg p-1">
            {(["ready", "all", "mine"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  filter === f
                    ? "bg-[var(--card)] text-[var(--primary)] shadow-sm"
                    : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                }`}
              >
                {f === "ready"
                  ? `${tx("waiter.filterReady")} (${readyCount})`
                  : f === "all"
                    ? tx("waiter.filterAll")
                    : tx("waiter.filterMine")}
              </button>
            ))}
          </div>
          {readyCount > 0 && (
            <span className="flex items-center gap-1.5 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 rounded-lg px-2.5 py-1.5 text-sm font-bold me-4">
              <Bell className="w-4 h-4" />
              {readyCount}
            </span>
          )}
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 text-sm font-bold text-[var(--foreground)] bg-[var(--muted)] hover:bg-[var(--muted)]/80 rounded-lg px-3 py-2 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">خروج</span>
          </button>
        </div>
      </header>

      {/* Mobile filter tabs */}
      <div className="md:hidden px-4 pt-3 sticky top-14 z-10 pb-1">
        <div className="bg-[var(--muted)] rounded-xl p-1 flex gap-1">
          {(["ready", "all", "mine"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all ${
                filter === f
                  ? "bg-[var(--card)] text-[var(--primary)] shadow-sm"
                  : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
              }`}
            >
              {f === "ready"
                ? `${tx("waiter.filterReady")} (${readyCount})`
                : f === "all"
                  ? tx("waiter.filterAll")
                  : tx("waiter.filterMine")}
            </button>
          ))}
        </div>
      </div>

      {/* Orders grid */}
      <main className="flex-1 px-4 md:px-6 py-4 max-w-7xl w-full mx-auto">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-[var(--muted-foreground)] gap-3">
            <CheckCircle2 className="w-12 h-12 opacity-30" />
            <p className="text-sm">
              {filter === "ready"
                ? tx("waiter.noReadyOrders")
                : tx("waiter.noOrders")}
            </p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filtered.map((order) => {
              const mins = getElapsedMinutes(order.created_at);
              const tc =
                order.status === "ready"
                  ? {
                      bg: "bg-emerald-50",
                      border: "border-emerald-300",
                      text: "text-emerald-600",
                      dot: "bg-emerald-500",
                    }
                  : getTimerColor(mins);
              return (
                <div
                  key={order.id}
                  className={`rounded-xl border-2 p-4 space-y-3 transition-all ${tc.bg} ${tc.border}`}
                >
                  {/* Header */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 flex-wrap">
                      {order.order_type === "delivery" ? (
                        <span className="bg-blue-100 text-blue-800 rounded-lg px-2.5 py-1 text-sm font-bold flex items-center gap-1.5 dark:bg-blue-900/30 dark:text-blue-300">
                          <Bike className="w-4 h-4" />
                          {tx("waiter.delivery")}
                        </span>
                      ) : order.order_type === "takeaway" ? (
                        <span className="bg-emerald-100 text-emerald-800 rounded-lg px-2.5 py-1 text-sm font-bold flex items-center gap-1.5 dark:bg-emerald-900/30 dark:text-emerald-300">
                          <UtensilsCrossed className="w-4 h-4" />
                          {tx("waiter.takeaway")}
                        </span>
                      ) : (
                        <span className="bg-[var(--primary)]/10 text-[var(--primary)] rounded-lg px-2.5 py-1 text-sm font-bold">
                          {tx("waiter.table")} {order.table_number ?? "—"}
                        </span>
                      )}
                      {order.daily_number != null && (
                        <span className="text-[var(--muted-foreground)] font-mono text-sm">
                          #{String(order.daily_number).padStart(3, "0")}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {order.is_mine && (
                        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-lg font-bold dark:bg-blue-900/30 dark:text-blue-300">
                          {tx("waiter.yourOrders")}
                        </span>
                      )}
                      <div
                        className={`flex items-center gap-1.5 ${tc.text} font-mono text-lg font-bold`}
                      >
                        <Clock className="w-4 h-4" />
                        {formatElapsed(order.created_at)}
                      </div>
                    </div>
                  </div>

                  {/* Status */}
                  <div className="flex items-center justify-between">
                    <span
                      className={`rounded-lg px-2.5 py-1 text-sm font-bold border ${STATUS_LABELS[order.status]?.color ?? "bg-gray-100 text-gray-700 border-gray-200"}`}
                    >
                      {STATUS_LABELS[order.status]?.label ?? order.status}
                    </span>
                  </div>

                  {/* Customer */}
                  {order.customer_name && (
                    <div className="bg-[var(--muted)] rounded-lg p-2.5 space-y-1 text-sm">
                      <div className="font-bold text-[var(--foreground)]">
                        {order.customer_name}
                      </div>
                    </div>
                  )}

                  {/* Items */}
                  {order.items && order.items.length > 0 ? (
                    <ul className="space-y-1.5">
                      {order.items.map((it, idx) => (
                        <li
                          key={idx}
                          className="flex items-center gap-3 rounded-lg bg-white/50 dark:bg-black/10 px-2 py-1.5"
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex items-baseline gap-2">
                              <span className="text-[var(--destructive)] font-bold text-lg">
                                ×{it.qty}
                              </span>
                              <span className="text-[var(--foreground)] font-bold text-base truncate">
                                {it.name}
                              </span>
                            </div>
                            {it.options && it.options.length > 0 && (
                              <div className="text-xs text-[var(--muted-foreground)] mt-0.5 leading-relaxed">
                                {it.options
                                  .map((o) => `${o.label}: ${o.choice}`)
                                  .join(" · ")}
                              </div>
                            )}
                            {it.note && (
                              <div className="text-xs text-yellow-800 dark:text-yellow-300 mt-0.5 font-medium">
                                {tx("waiter.note")} {it.note}
                              </div>
                            )}
                          </div>
                        </li>
                      ))}
                    </ul>
                  ) : order.notes ? null : (
                    <div className="text-sm text-[var(--muted-foreground)]">
                      {order.total
                        ? `${order.total.toLocaleString("ar-DZ")} دج`
                        : "—"}
                    </div>
                  )}

                  {/* Notes */}
                  {order.notes && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-2.5 text-sm dark:bg-yellow-900/20 dark:border-yellow-800">
                      <div className="font-bold text-yellow-800 dark:text-yellow-300 mb-0.5 text-xs">
                        ملاحظات:
                      </div>
                      <div className="text-yellow-900 dark:text-yellow-200 whitespace-pre-wrap break-words">
                        {order.notes}
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex gap-2 pt-1">
                    {order.status === "ready" && (
                      <Button
                        onClick={() => handleServe(order.id)}
                        disabled={servingId === order.id}
                        className="flex-1 h-12 text-base font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl"
                      >
                        {servingId === order.id ? (
                          <Loader2 className="w-5 h-5 animate-spin ms-2" />
                        ) : (
                          <CheckCircle2 className="w-5 h-5 ms-2" />
                        )}
                        {tx("waiter.delivered")}
                      </Button>
                    )}
                    {order.status !== "ready" && !order.is_mine && (
                      <Button
                        onClick={() => handleClaim(order.id)}
                        className="flex-1 h-12 text-base font-bold bg-[var(--primary)] hover:bg-[var(--primary)]/90 text-[var(--primary-foreground)] rounded-xl"
                      >
                        <UtensilsCrossed className="w-5 h-5 ms-2" />
                        {tx("waiter.iWillServe")}
                      </Button>
                    )}
                    {order.status !== "ready" && order.is_mine && (
                      <>
                        <Button
                          variant="outline"
                          onClick={() => handleUnclaim(order.id)}
                          className="flex-1 h-12 text-base font-bold text-[var(--destructive)] border-[var(--destructive)]/30 hover:bg-[var(--destructive)]/10 rounded-xl"
                        >
                          <Undo2 className="w-5 h-5 ms-2" />
                          {tx("waiter.unclaim")}
                        </Button>
                        <div className="flex-1 flex items-center justify-center gap-2 text-base text-[var(--muted-foreground)] font-bold">
                          <ChefHat className="w-5 h-5" />
                          {tx("waiter.preparingEllipsis")}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
