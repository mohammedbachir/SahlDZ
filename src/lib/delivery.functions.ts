import { createServerFn } from "@tanstack/react-start";

export const getDeliveryStatus = createServerFn({ method: "GET" }).handler(async () => ({
  enabled: false,
  token: null as string | null,
}));

export const enableDelivery = createServerFn({ method: "POST" }).handler(async () => ({
  enabled: true,
  token: null as string | null,
}));

export const disableDelivery = createServerFn({ method: "POST" }).handler(async () => ({
  enabled: false,
  token: null as string | null,
}));

export const regenerateDeliveryToken = createServerFn({ method: "POST" }).handler(async () => ({
  token: null as string | null,
}));
