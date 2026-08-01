import { createServerFn } from "@tanstack/react-start";
import { previewExpiry } from "@/lib/preview-mode";

export const getIndividualChefContext = createServerFn({ method: "GET" })
  .validator((d: { token: string }) => d)
  .handler(async () => ({
    restaurant: { id: "mock-restaurant-id", name: "مطعم السهل", logo_url: null },
    chefName: "الشيف يوسف",
  }));

export const individualChefListActive = createServerFn({ method: "GET" })
  .validator((d: { token: string }) => d)
  .handler(async () => ({ orders: [] }));

export const individualChefStartPreparing = createServerFn({ method: "POST" })
  .validator((d: { token: string; orderId: string }) => d)
  .handler(async () => ({ ok: true }));

export const individualChefMarkReady = createServerFn({ method: "POST" })
  .validator((d: { token: string; orderId: string }) => d)
  .handler(async () => ({ ok: true }));

export const individualChefLogout = createServerFn({ method: "POST" })
  .validator((d: { token: string }) => d)
  .handler(async () => ({ ok: true }));

export const getPublicChefList = createServerFn({ method: "GET" })
  .validator((d: { restaurantId: string }) => d)
  .handler(async () => ({
    found: true,
    name: "مطعم السهل",
    logo_url: null,
    chefs: [{ id: "mock-c1", name: "الشيف يوسف" }],
  }));

export const verifyIndividualChefPin = createServerFn({ method: "POST" })
  .validator((d: { chefId: string; pin: string }) => d)
  .handler(async () => ({
    token: "mock_chef",
    expiresAt: previewExpiry(),
    chefName: "الشيف يوسف",
    chefId: "mock-c1",
    restaurant: { id: "mock-restaurant-id", name: "مطعم السهل", logo_url: null },
  }));

export const listIndividualChefs = createServerFn({ method: "GET" }).handler(async () => ({
  chefs: [],
}));

export const addIndividualChef = createServerFn({ method: "POST" })
  .validator((d: { name: string; pin: string }) => d)
  .handler(async () => ({ ok: true }));

export const updateIndividualChefPin = createServerFn({ method: "POST" })
  .validator((d: { chefId: string; pin: string }) => d)
  .handler(async () => ({ ok: true }));

export const toggleIndividualChef = createServerFn({ method: "POST" })
  .validator((d: { chefId: string; is_active: boolean }) => d)
  .handler(async () => ({ ok: true }));

export const deleteIndividualChef = createServerFn({ method: "POST" })
  .validator((d: { chefId: string }) => d)
  .handler(async () => ({ ok: true }));
