import { createServerFn } from "@tanstack/react-start";
import { getRequestHeader } from "@tanstack/react-start/server";
import { supabase } from "@/integrations/supabase/client";
import { getFirebaseDb } from "@/integrations/firebase/config";
import { requireRestaurantId } from "@/lib/server-staff-auth";

const TELEGRAM_API = "https://api.telegram.org";

export const getDailySummaryStatus = createServerFn({ method: "GET" }).handler(
  async () => {
    if (!getFirebaseDb()) return { enabled: false, time: "23:30" };

    const rid = await requireRestaurantId(getRequestHeader("authorization"));
    const { data: rest } = await supabase
      .from("restaurants")
      .select("daily_summary_enabled,daily_summary_time")
      .eq("id", rid)
      .maybeSingle();

    const r = rest as any;
    return {
      enabled: r?.daily_summary_enabled === true,
      time: (r?.daily_summary_time as string) ?? "23:30",
    };
  },
);

export const setDailySummaryEnabled = createServerFn({ method: "POST" })
  .validator((d: { enabled: boolean; time?: string }) => d)
  .handler(async ({ data }) => {
    if (!getFirebaseDb()) return { ok: true };

    const rid = await requireRestaurantId(getRequestHeader("authorization"));
    const update: Record<string, any> = { daily_summary_enabled: data.enabled };
    if (data.time !== undefined) update.daily_summary_time = data.time;

    const { error } = await supabase
      .from("restaurants")
      .update(update)
      .eq("id", rid);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const sendDailySummaryNow = createServerFn({ method: "POST" }).handler(
  async () => {
    if (!getFirebaseDb()) return { ok: true };

    const rid = await requireRestaurantId(getRequestHeader("authorization"));
    const { data: rest } = await supabase
      .from("restaurants")
      .select("id,name,telegram_bot_token,telegram_chat_id")
      .eq("id", rid)
      .maybeSingle();

    const r = rest as any;
    if (!r?.telegram_bot_token || !r?.telegram_chat_id) {
      throw new Error("البوت غير مُكوّن — اربط تيليgram أولاً");
    }

    const now = new Date();
    const startOfDay = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
    ).toISOString();

    const { data: orders } = await supabase
      .from("orders")
      .select("id,total,order_type,status")
      .eq("restaurant_id", rid)
      .gte("created_at", startOfDay)
      .lte("created_at", now.toISOString());

    const orderList = (orders ?? []) as any[];
    const totalRevenue = orderList.reduce(
      (s, o) => s + ((o.total as number) ?? 0),
      0,
    );
    const totalOrders = orderList.length;
    const paidOrders = orderList.filter((o) => o.status === "paid");
    const paidRevenue = paidOrders.reduce(
      (s, o) => s + ((o.total as number) ?? 0),
      0,
    );

    const byType: Record<string, { count: number; revenue: number }> = {
      dine_in: { count: 0, revenue: 0 },
      takeaway: { count: 0, revenue: 0 },
      delivery: { count: 0, revenue: 0 },
    };
    for (const o of paidOrders) {
      const t = (o.order_type as string) ?? "dine_in";
      if (!byType[t]) byType[t] = { count: 0, revenue: 0 };
      byType[t].count++;
      byType[t].revenue += (o.total as number) ?? 0;
    }

    const dayStr = now.toLocaleDateString("ar-DZ", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    const lines = [
      `📊 *ملخص يومي — ${r.name ?? ""}*`,
      `📅 ${dayStr}`,
      ``,
      `🧾 إجمالي الطلبات: *${totalOrders}*`,
      `💰 إجمالي الإيراد (مدفوعة): *${paidRevenue} دج*`,
      ``,
      `🍽️ دينين: ${byType.dine_in?.count ?? 0} — ${byType.dine_in?.revenue ?? 0} دج`,
      `🥡 تيك أواي: ${byType.takeaway?.count ?? 0} — ${byType.takeaway?.revenue ?? 0} دج`,
      `🛵 توصيل: ${byType.delivery?.count ?? 0} — ${byType.delivery?.revenue ?? 0} دج`,
      ``,
      `⏱️ ${now.toLocaleTimeString("ar-DZ", { hour: "2-digit", minute: "2-digit" })}`,
    ];

    try {
      await fetch(`${TELEGRAM_API}/bot${r.telegram_bot_token}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: r.telegram_chat_id,
          text: lines.join("\n"),
          parse_mode: "Markdown",
        }),
      });
    } catch {
      throw new Error("فشل إرسال الرسالة عبر تيليgram");
    }

    return { ok: true };
  },
);
