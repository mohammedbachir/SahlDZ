import { createServerFn } from "@tanstack/react-start";
import { getRequestHeader } from "@tanstack/react-start/server";
import { supabase } from "@/integrations/supabase/client";
import { getFirebaseDb } from "@/integrations/firebase/config";
import { requireRestaurantId } from "@/lib/server-staff-auth";

const TELEGRAM_API = "https://api.telegram.org";

async function getTelegramBotInfo(
  token: string,
): Promise<{ ok: boolean; username?: string }> {
  try {
    const res = await fetch(`${TELEGRAM_API}/bot${token}/getMe`);
    const json: any = await res.json();
    return { ok: json.ok === true, username: json.result?.username };
  } catch {
    return { ok: false };
  }
}

export const getSummaryBotStatus = createServerFn({ method: "GET" }).handler(
  async () => {
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
      };
    }

    const rid = await requireRestaurantId(getRequestHeader("authorization"));
    const { data: rest } = await supabase
      .from("restaurants")
      .select(
        "summary_bot_token,summary_bot_username,summary_chat_id,summary_chat_linked,owner_id",
      )
      .eq("id", rid)
      .maybeSingle();

    const r = rest as any;
    const botToken = r?.summary_bot_token ?? null;
    const chatId = r?.summary_chat_id ?? null;

    return {
      enabled: !!botToken,
      linked: !!botToken && !!chatId,
      username: null as string | null,
      botUsername: (r?.summary_bot_username as string | null) ?? null,
      botConfigured: !!botToken,
      bot_username: (r?.summary_bot_username as string | null) ?? null,
      chat_linked: !!chatId,
      is_admin: !!r?.owner_id,
      token: botToken as string | null,
    };
  },
);

export const setSummaryBotToken = createServerFn({ method: "POST" })
  .validator((d: { bot_token: string; app_origin: string }) => d)
  .handler(async ({ data }) => {
    if (!getFirebaseDb()) return { ok: true, botUsername: "" as string };

    const rid = await requireRestaurantId(getRequestHeader("authorization"));
    const { ok, username } = await getTelegramBotInfo(data.bot_token);
    if (!ok) throw new Error("رمز البوت غير صحيح — تحقق من BotFather");

    const { error } = await supabase
      .from("restaurants")
      .update({
        summary_bot_token: data.bot_token,
        summary_bot_username: username ?? null,
      })
      .eq("id", rid);
    if (error) throw new Error(error.message);
    return { ok: true, botUsername: username ?? "" };
  });

export const clearSummaryBotToken = createServerFn({ method: "POST" }).handler(
  async () => {
    if (!getFirebaseDb()) return { ok: true };

    const rid = await requireRestaurantId(getRequestHeader("authorization"));
    const { error } = await supabase
      .from("restaurants")
      .update({
        summary_bot_token: null,
        summary_bot_username: null,
        summary_chat_id: null,
        summary_chat_linked: false,
      })
      .eq("id", rid);
    if (error) throw new Error(error.message);
    return { ok: true };
  },
);

export const generateSummaryLinkToken = createServerFn({ method: "POST" })
  .validator((d: { app_origin: string }) => d)
  .handler(async ({ data }) => {
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
      .select("summary_bot_token,summary_bot_username")
      .eq("id", rid)
      .maybeSingle();

    const r = rest as any;
    if (!r?.summary_bot_token) {
      throw new Error("أدخل رمز البوت أولاً");
    }

    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
    const linkToken = `sb_${rid}_${Date.now()}`;

    return {
      linkToken,
      expiresAt,
      deepLink: `https://t.me/${r.summary_bot_username}?start=${linkToken}`,
      botUsername: r.summary_bot_username as string,
    };
  });

export const unlinkSummaryTelegram = createServerFn({ method: "POST" }).handler(
  async () => {
    if (!getFirebaseDb()) return { ok: true };

    const rid = await requireRestaurantId(getRequestHeader("authorization"));
    const { error } = await supabase
      .from("restaurants")
      .update({ summary_chat_id: null, summary_chat_linked: false })
      .eq("id", rid);
    if (error) throw new Error(error.message);
    return { ok: true };
  },
);
