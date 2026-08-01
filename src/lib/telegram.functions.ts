import { createServerFn } from "@tanstack/react-start";

export const getTelegramStatus = createServerFn({ method: "GET" }).handler(async () => ({
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
}));

export const generateTelegramLinkToken = createServerFn({ method: "POST" }).handler(async () => ({
  linkToken: null as string | null,
  expiresAt: null as string | null,
  deepLink: null as string | null,
  botUsername: "" as string,
}));

export const unlinkTelegram = createServerFn({ method: "POST" }).handler(async () => ({ ok: true }));

export const setRestaurantBotToken = createServerFn({ method: "POST" })
  .validator((d: { bot_token: string; app_origin: string }) => d)
  .handler(async () => ({ ok: true, botUsername: "" as string }));

export const clearRestaurantBotToken = createServerFn({ method: "POST" }).handler(async () => ({
  ok: true,
}));
