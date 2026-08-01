import { createServerFn } from "@tanstack/react-start";

export const sendLowStockAlert = createServerFn({ method: "POST" })
  .validator((d: { ingredientId: string }) => d)
  .handler(async () => ({ sent: false }));

export const sendPurchaseNotification = createServerFn({ method: "POST" })
  .validator((d: { restaurantId: string; itemCount: number; totalCost: number; source: string }) => d)
  .handler(async () => ({ sent: false }));
