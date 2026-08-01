import { createServerFn } from "@tanstack/react-start";

export const getDailySummaryStatus = createServerFn({ method: "GET" }).handler(async () => ({
  enabled: false,
  time: "21:00",
}));

export const setDailySummaryEnabled = createServerFn({ method: "POST" })
  .validator((d: { enabled: boolean; time?: string }) => d)
  .handler(async () => ({ ok: true }));

export const sendDailySummaryNow = createServerFn({ method: "POST" }).handler(async () => ({
  ok: true,
}));
