import { createServerFn } from "@tanstack/react-start";

export const listDeliveryDrivers = createServerFn({ method: "GET" }).handler(async () => ({
  drivers: [],
}));

export const addDeliveryDriver = createServerFn({ method: "POST" })
  .validator((d: { display_name: string; phone?: string }) => d)
  .handler(async () => ({ ok: true, deep_link: "" }));

export const removeDeliveryDriver = createServerFn({ method: "POST" })
  .validator((d: { id: string }) => d)
  .handler(async () => ({ ok: true }));

export const toggleDeliveryDriver = createServerFn({ method: "POST" })
  .validator((d: { id: string; is_active: boolean }) => d)
  .handler(async () => ({ ok: true }));
