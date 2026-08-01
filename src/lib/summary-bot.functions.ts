import { createServerFn } from "@tanstack/react-start";

export const getSummaryBotStatus = createServerFn({ method: "GET" }).handler(async () => ({
  enabled: false,
  linked: false,
  username: null as string | null,
  botUsername: null as string | null,
  botConfigured: false,
  bot_username: null as string | null,
  chat_linked: false,
  is_admin: false,
  token: null as string | null,
}));

export const setSummaryBotToken = createServerFn({ method: "POST" })
  .validator((d: { bot_token: string; app_origin: string }) => d)
  .handler(async () => ({ ok: true, botUsername: "" as string }));

export const clearSummaryBotToken = createServerFn({ method: "POST" }).handler(async () => ({
  ok: true,
}));

export const generateSummaryLinkToken = createServerFn({ method: "POST" })
  .validator((d: { app_origin: string }) => d)
  .handler(async () => ({
    linkToken: null as string | null,
    expiresAt: null as string | null,
    deepLink: null as string | null,
    botUsername: "" as string,
  }));

export const unlinkSummaryTelegram = createServerFn({ method: "POST" }).handler(async () => ({
  ok: true,
}));
