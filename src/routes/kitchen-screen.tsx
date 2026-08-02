import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { LogOut, ChefHat, Volume2, VolumeX, Loader2, Bell, ChefHat as ChefIcon, Bike, Phone, MapPin } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useServerFn } from "@tanstack/react-start";
import {
  getIndividualChefContext,
  individualChefListActive,
  individualChefStartPreparing,
  individualChefMarkReady,
  individualChefLogout,
} from "@/lib/individual-chef.functions";
import { supabase } from "@/integrations/supabase/client";
import { decrementStockForOrder } from "@/lib/stock-consumption";
import { isPreviewToken, PREVIEW_RESTAURANT } from "@/lib/preview-mode";

export const Route = createFileRoute("/kitchen-screen")({
  component: Page,
});

type Restaurant = { id: string; name: string; logo_url: string | null };
type Order = {
  id: string;
  status: string;
  created_at: string;
  acknowledged: boolean;
  table_number: number | null;
  notes: string | null;
  order_type: string;
  customer_name: string | null;
  customer_phone: string | null;
  customer_address: string | null;
  daily_number: number | null;
  items: Array<{ name: string; qty: number }>;
};

const MOCK_KITCHEN_ORDERS: Order[] = [
  {
    id: "mock-k1",
    status: "new",
    created_at: new Date().toISOString(),
    acknowledged: false,
    table_number: 5,
    notes: null,
    order_type: "dine_in",
    customer_name: null,
    customer_phone: null,
    customer_address: null,
    daily_number: 1,
    items: [
      { name: "شاورما لحم", qty: 2 },
      { name: "فرينش فرايز", qty: 1 },
    ],
  },
  {
    id: "mock-k2",
    status: "preparing",
    created_at: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
    acknowledged: true,
    table_number: 12,
    notes: "بدون بصل",
    order_type: "delivery",
    customer_name: "أحمد بن علي",
    customer_phone: "0555123456",
    customer_address: "شارع الاستقلال، الجزائر",
    daily_number: 2,
    items: [
      { name: "برغر دجاج", qty: 1 },
      { name: "عصير برتقال", qty: 2 },
    ],
  },
  {
    id: "mock-k3",
    status: "new",
    created_at: new Date(Date.now() - 3 * 60 * 1000).toISOString(),
    acknowledged: false,
    table_number: null,
    notes: null,
    order_type: "takeaway",
    customer_name: null,
    customer_phone: null,
    customer_address: null,
    daily_number: 3,
    items: [
      { name: "بيتزا مارغريتا", qty: 1 },
      { name: "سلطة سيزر", qty: 1 },
    ],
  },
];

function timeAgo(iso: string) {
  const sec = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (sec < 60) return `${sec}ث`;
  const m = Math.floor(sec / 60);
  if (m < 60) return `${m} د`;
  return `${Math.floor(m / 60)} س`;
}

function Page() {
  const navigate = useNavigate();
  const iCtxFn = useServerFn(getIndividualChefContext);
  const iListFn = useServerFn(individualChefListActive);
  const iStartFn = useServerFn(individualChefStartPreparing);
  const iReadyFn = useServerFn(individualChefMarkReady);
  const iLogoutFn = useServerFn(individualChefLogout);

  const [token, setToken] = useState<string | null>(null);
  const [chefName, setChefName] = useState<string | null>(null);
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [soundOn, setSoundOn] = useState(true);
  const [, setTick] = useState(0);

  // tick every 30s for elapsed time refresh
  useEffect(() => {
    const i = setInterval(() => setTick((t) => t + 1), 30_000);
    return () => clearInterval(i);
  }, []);

  // Auth — individual chef sessions
  useEffect(() => {
    const goLogin = () => {
      const r = sessionStorage.getItem("individual_chef_restaurant");
      const rid = r ? (JSON.parse(r) as Restaurant).id : "";
      sessionStorage.removeItem("individual_chef_token");
      sessionStorage.removeItem("individual_chef_expires");
      navigate({ to: "/kitchen-login", search: { rid } });
    };
    const it = sessionStorage.getItem("individual_chef_token");
    const iexp = sessionStorage.getItem("individual_chef_expires");
    if (!it || !iexp || new Date(iexp) < new Date()) {
      goLogin();
      return;
    }
    setToken(it);
    if (isPreviewToken(it)) {
      setRestaurant(PREVIEW_RESTAURANT);
      setChefName(sessionStorage.getItem("individual_chef_name"));
      return;
    }
    iCtxFn({ data: { token: it } })
      .then((res) => {
        setRestaurant(res.restaurant);
        setChefName(res.chefName);
      })
      .catch(goLogin);
  }, [iCtxFn, navigate]);

  const refresh = useCallback(async () => {
    if (!token) return;
    if (isPreviewToken(token)) {
      setOrders(MOCK_KITCHEN_ORDERS);
      return;
    }
    try {
      const res = await iListFn({ data: { token } });
      setOrders(res.orders);
    } catch {
      // silent
    }
  }, [token, iListFn]);

  useEffect(() => {
    if (!token || !restaurant) return;
    refresh();
    const channel = supabase
      .channel(`kitchen-${restaurant.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders", filter: `restaurant_id=eq.${restaurant.id}` },
        () => refresh(),
      )
      .subscribe();
    const poll = setInterval(refresh, 8000);
    return () => {
      supabase.removeChannel(channel);
      clearInterval(poll);
    };
  }, [token, restaurant, refresh]);

  // Audio beep loop while there are unacknowledged new orders
  const audioCtxRef = useRef<AudioContext | null>(null);
  const hasUnack = useMemo(
    () => orders.some((o) => o.status === "new" && !o.acknowledged),
    [orders],
  );

  useEffect(() => {
    if (!soundOn || !hasUnack) return;
    let cancelled = false;
    function beep() {
      if (cancelled) return;
      try {
        if (!audioCtxRef.current) {
          const Ctx = (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext);
          audioCtxRef.current = new Ctx();
        }
        const ctx = audioCtxRef.current!;
        if (ctx.state === "suspended") ctx.resume().catch(() => {});
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.frequency.value = 800;
        osc.type = "sine";
        gain.gain.value = 0.3;
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.2);
        osc.stop(ctx.currentTime + 0.22);
      } catch {
        // ignore
      }
    }
    beep();
    const i = setInterval(beep, 3000);
    return () => {
      cancelled = true;
      clearInterval(i);
    };
  }, [soundOn, hasUnack]);

  async function onStart(o: Order) {
    if (!token) return;
    setBusy(o.id);
    try {
      await iStartFn({ data: { token, orderId: o.id } });
      void decrementStockForOrder(o.id);
      setOrders((prev) =>
        prev.map((x) => (x.id === o.id ? { ...x, status: "preparing", acknowledged: true } : x)),
      );
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  async function onReady(o: Order) {
    if (!token) return;
    setBusy(o.id);
    try {
      await iReadyFn({ data: { token, orderId: o.id } });
      setOrders((prev) => prev.filter((x) => x.id !== o.id));
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  async function onLogout() {
    if (token) {
      try {
        await iLogoutFn({ data: { token } });
      } catch {
        // ignore
      }
    }
    const r = sessionStorage.getItem("individual_chef_restaurant");
    const rid = r ? (JSON.parse(r) as Restaurant).id : "";
    sessionStorage.removeItem("individual_chef_token");
    sessionStorage.removeItem("individual_chef_expires");
    sessionStorage.removeItem("individual_chef_name");
    sessionStorage.removeItem("individual_chef_id");
    navigate({ to: "/kitchen-login", search: { rid } });
  }

  if (!restaurant) {
    return (
      <div className="min-h-screen flex items-center justify-center" dir="rtl">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const newOrders = orders.filter((o) => o.status === "new");
  const prepOrders = orders.filter((o) => o.status === "preparing");

  return (
    <div className="min-h-screen bg-[var(--background)] flex flex-col" dir="rtl">
      <header className="h-14 bg-[var(--card)] border-b border-[var(--border)] flex items-center justify-between gap-3 px-4 md:px-6 sticky top-0 z-20">
        <div className="flex items-center gap-3 min-w-0">
          {restaurant.logo_url ? (
            <img src={restaurant.logo_url} alt={restaurant.name} className="w-9 h-9 rounded-lg object-cover" />
          ) : (
            <div className="w-9 h-9 rounded-lg bg-[var(--primary)] flex items-center justify-center text-[var(--primary-foreground)] font-bold text-sm">
              {restaurant.name?.[0] ?? "م"}
            </div>
          )}
          <div className="leading-tight min-w-0">
            <div className="font-bold text-sm truncate flex items-center gap-1.5 text-[var(--foreground)]">
              <ChefIcon className="w-4 h-4 text-[var(--primary)]" />
              {restaurant.name}
            </div>
            {chefName && (
              <div className="text-[11px] text-[var(--muted-foreground)] truncate">{chefName}</div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant={soundOn ? "default" : "outline"}
            size="sm"
            onClick={() => setSoundOn((s) => !s)}
            className="gap-1.5 h-8"
          >
            {soundOn ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            <span className="hidden sm:inline">{soundOn ? "صوت" : "صامت"}</span>
          </Button>
          <Button variant="outline" size="sm" onClick={onLogout} className="gap-1.5 h-8">
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">خروج</span>
          </Button>
        </div>
      </header>

      <main className="flex-1 p-3 md:p-4">
        <div className="grid gap-3 md:grid-cols-2 max-w-6xl mx-auto">
          {/* New orders */}
          <section className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-3 md:p-4">
            <div className="flex items-center gap-2 mb-3">
              <h2 className="text-lg font-bold text-[var(--foreground)]">طلبات جديدة</h2>
              <span className="bg-[var(--destructive)] text-[var(--destructive-foreground)] rounded-md px-2 py-0.5 text-xs font-bold">
                {newOrders.length}
              </span>
            </div>
            <div className="space-y-3">
              <AnimatePresence>
                {newOrders.map((o) => (
                  <motion.div
                    key={o.id}
                    layout
                    initial={{ opacity: 0, x: 30 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="bg-[var(--background)] rounded-lg border border-[var(--border)] p-3 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {o.order_type === "delivery" ? (
                          <span className="bg-blue-100 text-blue-800 rounded px-2 py-0.5 text-sm font-bold flex items-center gap-1 dark:bg-blue-900/30 dark:text-blue-300">
                            <Bike className="w-4 h-4" />
                            توصيل
                          </span>
                        ) : o.order_type === "takeaway" ? (
                          <span className="bg-emerald-100 text-emerald-800 rounded px-2 py-0.5 text-sm font-bold dark:bg-emerald-900/30 dark:text-emerald-300">
                            سفري
                          </span>
                        ) : (
                          <span className="bg-[var(--primary)]/10 text-[var(--primary)] rounded px-2 py-0.5 text-sm font-bold">
                            طاولة {o.table_number ?? "—"}
                          </span>
                        )}
                        {o.daily_number != null && (
                          <span className="font-mono text-sm font-bold text-[var(--foreground)]">
                            #{String(o.daily_number).padStart(3, "0")}
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-[var(--muted-foreground)] font-mono">
                        {timeAgo(o.created_at)}
                      </div>
                    </div>
                    {(o.order_type === "delivery" || o.order_type === "takeaway") && (
                      <div className="rounded-lg bg-[var(--muted)] p-2 space-y-0.5 text-xs">
                        <div className="font-bold text-[var(--foreground)]">{o.customer_name ?? "—"}</div>
                        {o.customer_phone && (
                          <div className="flex items-center gap-1 text-[var(--muted-foreground)]">
                            <Phone className="w-3 h-3" />
                            <a href={`tel:${o.customer_phone}`} dir="ltr" className="font-mono">{o.customer_phone}</a>
                          </div>
                        )}
                        {o.customer_address && (
                          <div className="flex items-start gap-1 text-[var(--muted-foreground)]">
                            <MapPin className="w-3 h-3 mt-0.5 shrink-0" />
                            <span className="break-words">{o.customer_address}</span>
                          </div>
                        )}
                      </div>
                    )}
                    <ul className="space-y-0.5">
                      {o.items.map((it, idx) => (
                        <li key={idx} className="flex items-baseline gap-2 text-sm">
                          <span className="font-bold text-[var(--destructive)]">×{it.qty}</span>
                          <span className="text-[var(--foreground)]">{it.name}</span>
                        </li>
                      ))}
                    </ul>
                    {o.notes && (
                      <div className="rounded-lg bg-yellow-50 border border-yellow-200 p-2 text-xs dark:bg-yellow-900/20 dark:border-yellow-800">
                        <div className="font-bold text-yellow-800 dark:text-yellow-300 mb-0.5">ملاحظة</div>
                        <div className="text-yellow-900 dark:text-yellow-200 whitespace-pre-wrap break-words">{o.notes}</div>
                      </div>
                    )}
                    <Button
                      onClick={() => onStart(o)}
                      disabled={busy === o.id}
                      className="w-full h-10 text-sm font-bold"
                    >
                      {busy === o.id ? (
                        <Loader2 className="w-4 h-4 animate-spin ms-2" />
                      ) : (
                        "بدء التحضير"
                      )}
                    </Button>
                  </motion.div>
                ))}
              </AnimatePresence>
              {newOrders.length === 0 && (
                <div className="text-center text-muted-foreground py-8">لا توجد طلبات جديدة</div>
              )}
            </div>
          </section>

          {/* Preparing */}
          <section className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-3 md:p-4">
            <div className="flex items-center gap-2 mb-3">
              <h2 className="text-lg font-bold text-[var(--foreground)]">قيد التحضير</h2>
              <span className="bg-orange-100 text-orange-800 rounded-md px-2 py-0.5 text-xs font-bold dark:bg-orange-900/30 dark:text-orange-300">
                {prepOrders.length}
              </span>
            </div>
            <div className="space-y-3">
              <AnimatePresence>
                {prepOrders.map((o) => (
                  <motion.div
                    key={o.id}
                    layout
                    initial={{ opacity: 0, x: -30 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="bg-[var(--background)] rounded-lg border border-[var(--border)] p-3 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {o.order_type === "delivery" ? (
                          <span className="bg-blue-100 text-blue-800 rounded px-2 py-0.5 text-sm font-bold flex items-center gap-1 dark:bg-blue-900/30 dark:text-blue-300">
                            <Bike className="w-4 h-4" />
                            توصيل
                          </span>
                        ) : o.order_type === "takeaway" ? (
                          <span className="bg-emerald-100 text-emerald-800 rounded px-2 py-0.5 text-sm font-bold dark:bg-emerald-900/30 dark:text-emerald-300">
                            سفري
                          </span>
                        ) : (
                          <span className="bg-orange-100 text-orange-800 rounded px-2 py-0.5 text-sm font-bold dark:bg-orange-900/30 dark:text-orange-300">
                            طاولة {o.table_number ?? "—"}
                          </span>
                        )}
                        {o.daily_number != null && (
                          <span className="font-mono text-sm font-bold text-[var(--foreground)]">
                            #{String(o.daily_number).padStart(3, "0")}
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-[var(--muted-foreground)] font-mono">
                        {timeAgo(o.created_at)}
                      </div>
                    </div>
                    {(o.order_type === "delivery" || o.order_type === "takeaway") && (
                      <div className="rounded-lg bg-[var(--muted)] p-2 space-y-0.5 text-xs">
                        <div className="font-bold text-[var(--foreground)]">{o.customer_name ?? "—"}</div>
                        {o.customer_phone && (
                          <div className="flex items-center gap-1 text-[var(--muted-foreground)]">
                            <Phone className="w-3 h-3" />
                            <a href={`tel:${o.customer_phone}`} dir="ltr" className="font-mono">{o.customer_phone}</a>
                          </div>
                        )}
                        {o.customer_address && (
                          <div className="flex items-start gap-1 text-[var(--muted-foreground)]">
                            <MapPin className="w-3 h-3 mt-0.5 shrink-0" />
                            <span className="break-words">{o.customer_address}</span>
                          </div>
                        )}
                      </div>
                    )}
                    <ul className="space-y-0.5">
                      {o.items.map((it, idx) => (
                        <li key={idx} className="flex items-baseline gap-2 text-sm">
                          <span className="font-bold text-orange-600">×{it.qty}</span>
                          <span className="text-[var(--foreground)]">{it.name}</span>
                        </li>
                      ))}
                    </ul>
                    {o.notes && (
                      <div className="rounded-lg bg-yellow-50 border border-yellow-200 p-2 text-xs dark:bg-yellow-900/20 dark:border-yellow-800">
                        <div className="font-bold text-yellow-800 dark:text-yellow-300 mb-0.5">ملاحظة</div>
                        <div className="text-yellow-900 dark:text-yellow-200 whitespace-pre-wrap break-words">{o.notes}</div>
                      </div>
                    )}
                    <Button
                      onClick={() => onReady(o)}
                      disabled={busy === o.id}
                      className="w-full h-10 text-sm font-bold bg-emerald-600 hover:bg-emerald-700 text-white"
                    >
                      {busy === o.id ? (
                        <Loader2 className="w-4 h-4 animate-spin ms-2" />
                      ) : (
                        "جاهز"
                      )}
                    </Button>
                  </motion.div>
                ))}
              </AnimatePresence>
              {prepOrders.length === 0 && (
                <div className="text-center text-muted-foreground py-8">لا يوجد قيد التحضير</div>
              )}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}