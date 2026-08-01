import { createServerFn } from "@tanstack/react-start";
import { previewExpiry } from "@/lib/preview-mode";

export const getWaiterContext = createServerFn({ method: "GET" })
  .validator((d: { token: string }) => d)
  .handler(async () => ({
    waiterName: "أمين",
    restaurant: { name: "مطعم السهل" },
  }));

export const waiterLogout = createServerFn({ method: "POST" })
  .validator((d: { token: string }) => d)
  .handler(async () => ({ ok: true }));

export const waiterListReadyOrders = createServerFn({ method: "GET" })
  .validator((d: { token: string }) => d)
  .handler(async () => ({ orders: [] }));

export const waiterClaimOrder = createServerFn({ method: "POST" })
  .validator((d: { token: string; orderId: string }) => d)
  .handler(async () => ({ ok: true }));

export const waiterMarkServed = createServerFn({ method: "POST" })
  .validator((d: { token: string; orderId: string }) => d)
  .handler(async () => ({ ok: true }));

export const getPublicWaiterList = createServerFn({ method: "GET" })
  .validator((d: { restaurantId: string }) => d)
  .handler(async () => ({
    found: true,
    name: "مطعم السهل",
    logo_url: null,
    waiters: [
      { id: "mock-w1", name: "أمين" },
      { id: "mock-w2", name: "سارة" },
    ],
  }));

export const verifyWaiterPin = createServerFn({ method: "POST" })
  .validator((d: { waiterId: string; pin: string }) => d)
  .handler(async () => ({
    token: "mock_waiter",
    expiresAt: previewExpiry(),
    waiterName: "أمين",
    waiterId: "mock-w1",
    restaurant: { id: "mock-restaurant-id", name: "مطعم السهل", logo_url: null },
  }));

export const listWaiters = createServerFn({ method: "GET" }).handler(async () => ({ waiters: [] }));

export const addWaiter = createServerFn({ method: "POST" })
  .validator((d: { name: string; pin: string }) => d)
  .handler(async () => ({ ok: true }));

export const updateWaiterPin = createServerFn({ method: "POST" })
  .validator((d: { waiterId: string; pin: string }) => d)
  .handler(async () => ({ ok: true }));

export const toggleWaiter = createServerFn({ method: "POST" })
  .validator((d: { waiterId: string; is_active: boolean }) => d)
  .handler(async () => ({ ok: true }));

export const deleteWaiter = createServerFn({ method: "POST" })
  .validator((d: { waiterId: string }) => d)
  .handler(async () => ({ ok: true }));
