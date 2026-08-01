import { createServerFn } from "@tanstack/react-start";

export const getTakeawayStatus = createServerFn({ method: "GET" }).handler(async () => ({
  enabled: false,
  token: null as string | null,
}));

export const enableTakeaway = createServerFn({ method: "POST" }).handler(async () => ({
  enabled: true,
  token: null as string | null,
}));

export const disableTakeaway = createServerFn({ method: "POST" }).handler(async () => ({
  enabled: false,
  token: null as string | null,
}));

export const regenerateTakeawayToken = createServerFn({ method: "POST" }).handler(async () => ({
  token: null as string | null,
}));
