import { createServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { getFirebaseDb } from "@/integrations/firebase/config";

const TELEGRAM_API = "https://api.telegram.org";

type RestaurantRow = {
  id: string;
  name: string | null;
  telegram_bot_token: string | null;
  telegram_chat_id: string | null;
  telegram_chat_linked: boolean | null;
};

type IngredientRow = {
  id: string;
  name: string;
  unit: string;
  current_stock: number;
  alert_threshold: number;
  cost_per_unit: number;
};

/**
 * يرسل إشعار تلقرام لما مكون ينقص عن الحد الأدنى.
 * يُستدعى من stock-consumption.ts بعد كل خصم.
 * لا يُرجع خطأ لو ما فيه بوت مربوط — يسكت بس.
 */
export async function sendLowStockAlert(
  restaurantId: string,
  ingredientId: string,
): Promise<{ sent: boolean }> {
  if (!getFirebaseDb()) return { sent: false };

  const { data: rest } = await supabase
    .from("restaurants")
    .select("id,name,telegram_bot_token,telegram_chat_id,telegram_chat_linked")
    .eq("id", restaurantId)
    .single();
  const r = rest as RestaurantRow | null;

  if (
    !r?.telegram_bot_token ||
    !r.telegram_chat_id ||
    !r.telegram_chat_linked
  ) {
    return { sent: false };
  }

  const { data: ing } = await supabase
    .from("ingredients")
    .select("id,name,unit,current_stock,alert_threshold,cost_per_unit")
    .eq("id", ingredientId)
    .single();
  const i = ing as IngredientRow | null;
  if (!i) return { sent: false };

  const lines = [
    `⚠️ *تنبيه مخزون ناقص*`,
    ``,
    `🏪 المطعم: ${r.name ?? "—"}`,
    `📦 المكون: *${i.name}*`,
    `📊 المخزون الحالي: *${i.current_stock} ${i.unit}*`,
    `🚨 الحد الأدنى: ${i.alert_threshold} ${i.unit}`,
    `💰 التكلفة: ${i.cost_per_unit} دج / ${i.unit}`,
    ``,
    `⏰ ${new Date().toLocaleTimeString("ar-DZ", { hour: "2-digit", minute: "2-digit" })}`,
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
    return { sent: true };
  } catch {
    return { sent: false };
  }
}

/**
 * يرسل إشعار شراء مكون عبر تلقرام.
 */
export async function sendPurchaseNotification(
  restaurantId: string,
  itemCount: number,
  totalCost: number,
  source: string,
): Promise<{ sent: boolean }> {
  if (!getFirebaseDb()) return { sent: false };

  const { data: rest } = await supabase
    .from("restaurants")
    .select("id,name,telegram_bot_token,telegram_chat_id,telegram_chat_linked")
    .eq("id", restaurantId)
    .single();
  const r = rest as RestaurantRow | null;

  if (
    !r?.telegram_bot_token ||
    !r.telegram_chat_id ||
    !r.telegram_chat_linked
  ) {
    return { sent: false };
  }

  const lines = [
    `🛒 *إشعار شراء مخزون*`,
    ``,
    `🏪 المطعم: ${r.name ?? "—"}`,
    `📦 عدد العناصر: *${itemCount}*`,
    `💰 الإجمالي: *${totalCost.toLocaleString("ar-DZ")} دج*`,
    `📝 المصدر: ${source}`,
    ``,
    `⏰ ${new Date().toLocaleTimeString("ar-DZ", { hour: "2-digit", minute: "2-digit" })}`,
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
    return { sent: true };
  } catch {
    return { sent: false };
  }
}

/* Server function wrappers (for TanStack Start callers) */
export const sendLowStockAlertFn = createServerFn({ method: "POST" })
  .validator((d: { restaurantId: string; ingredientId: string }) => d)
  .handler(async ({ data }) =>
    sendLowStockAlert(data.restaurantId, data.ingredientId),
  );

export const sendPurchaseNotificationFn = createServerFn({ method: "POST" })
  .validator(
    (d: {
      restaurantId: string;
      itemCount: number;
      totalCost: number;
      source: string;
    }) => d,
  )
  .handler(async ({ data }) =>
    sendPurchaseNotification(
      data.restaurantId,
      data.itemCount,
      data.totalCost,
      data.source,
    ),
  );
