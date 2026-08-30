import { createServerFn } from "@tanstack/react-start";
import { getRequestHeader } from "@tanstack/react-start/server";
import { supabase } from "@/integrations/supabase/client";
import { getFirebaseDb } from "@/integrations/firebase/config";
import { requireRestaurantId } from "@/lib/server-staff-auth";

const TELEGRAM_API = "https://api.telegram.org";

async function getTelegramBotInfo(token: string): Promise<{ ok: boolean; username?: string; bot_id?: number }> {
  try {
    const res = await fetch(`${TELEGRAM_API}/bot${token}/getMe`);
    const json: any = await res.json();
    return { ok: json.ok === true, username: json.result?.username, bot_id: json.result?.id };
  } catch {
    return { ok: false };
  }
}

export const getTelegramStatus = createServerFn({ method: "GET" }).handler(async () => {
  if (!getFirebaseDb()) {
    return {
      enabled: false,
      linked: false,
      username: null as string | null,
      botUsername: null as string | null,
      botConfigured: false,
      bot_username: null as string | null,
      chat_linked: false,
      is_admin: false,
      token: null as string | null,
      pending_days: 3,
    };
  }

  const rid = await requireRestaurantId(getRequestHeader("authorization"));
  const { data: rest } = await supabase
    .from("restaurants")
    .select("*")
    .eq("id", rid)
    .maybeSingle();

  const r = rest as any;
  const botToken = r?.telegram_bot_token ?? null;
  const chatId = r?.telegram_chat_id ?? null;
  const botUsername = r?.telegram_bot_username ?? null;

  return {
    enabled: !!botToken,
    linked: !!botToken && !!chatId,
    username: null as string | null,
    botUsername: botUsername as string | null,
    botConfigured: !!botToken,
    bot_username: botUsername as string | null,
    chat_linked: !!chatId,
    is_admin: !!r?.owner_id,
    token: botToken as string | null,
    pending_days: 3,
  };
});

export const generateTelegramLinkToken = createServerFn({ method: "POST" }).handler(async () => {
  if (!getFirebaseDb()) {
    return {
      linkToken: null as string | null,
      expiresAt: null as string | null,
      deepLink: null as string | null,
      botUsername: "" as string,
    };
  }

  const rid = await requireRestaurantId(getRequestHeader("authorization"));
  const { data: rest } = await supabase
    .from("restaurants")
    .select("telegram_bot_token,telegram_bot_username")
    .eq("id", rid)
    .maybeSingle();

  const r = rest as any;
  if (!r?.telegram_bot_token) {
    throw new Error("أدخل رمز البوت أولاً");
  }

  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
  const linkToken = `tg_${rid}_${Date.now()}`;

  return {
    linkToken,
    expiresAt,
    deepLink: `https://t.me/${r.telegram_bot_username}?start=${linkToken}`,
    botUsername: r.telegram_bot_username as string,
  };
});

export const unlinkTelegram = createServerFn({ method: "POST" }).handler(async () => {
  if (!getFirebaseDb()) return { ok: true };

  const rid = await requireRestaurantId(getRequestHeader("authorization"));
  const { error } = await supabase
    .from("restaurants")
    .update({ telegram_chat_id: null, telegram_chat_linked: false })
    .eq("id", rid);
  if (error) throw new Error(error.message);
  return { ok: true };
});

export const setRestaurantBotToken = createServerFn({ method: "POST" })
  .validator((d: { bot_token: string; app_origin: string }) => d)
  .handler(async ({ data }) => {
    if (!getFirebaseDb()) return { ok: true, botUsername: "" as string };

    const rid = await requireRestaurantId(getRequestHeader("authorization"));
    const { ok, username } = await getTelegramBotInfo(data.bot_token);
    if (!ok) throw new Error("رمز البوت غير صحيح — تحقق من BotFather");

    const { error } = await supabase
      .from("restaurants")
      .update({
        telegram_bot_token: data.bot_token,
        telegram_bot_username: username ?? null,
      })
      .eq("id", rid);
    if (error) throw new Error(error.message);
    return { ok: true, botUsername: username ?? "" };
  });

export const clearRestaurantBotToken = createServerFn({ method: "POST" }).handler(async () => {
  if (!getFirebaseDb()) return { ok: true };

  const rid = await requireRestaurantId(getRequestHeader("authorization"));
  const { error } = await supabase
    .from("restaurants")
    .update({
      telegram_bot_token: null,
      telegram_bot_username: null,
      telegram_chat_id: null,
      telegram_chat_linked: false,
    })
    .eq("id", rid);
  if (error) throw new Error(error.message);
  return { ok: true };
});
