import { createServerFn } from "@tanstack/react-start";
import { getRequestHeader } from "@tanstack/react-start/server";
import { supabase } from "@/integrations/supabase/client";
import { getFirebaseDb } from "@/integrations/firebase/config";
import { requireRestaurantId } from "@/lib/server-staff-auth";

function generateDeliveryToken(restaurantId: string): string {
  const rand = Math.random().toString(36).slice(2, 10);
  return `del_${restaurantId.slice(0, 8)}_${rand}`;
}

export const getDeliveryStatus = createServerFn({ method: "GET" }).handler(
  async () => {
    if (!getFirebaseDb())
      return { enabled: false, token: null as string | null };

    const rid = await requireRestaurantId(getRequestHeader("authorization"));
    const { data: rest } = await supabase
      .from("restaurants")
      .select("delivery_enabled,delivery_link_token")
      .eq("id", rid)
      .maybeSingle();

    const r = rest as any;
    return {
      enabled: r?.delivery_enabled === true,
      token: (r?.delivery_link_token as string | null) ?? null,
    };
  },
);

export const enableDelivery = createServerFn({ method: "POST" }).handler(
  async () => {
    if (!getFirebaseDb())
      return { enabled: true, token: null as string | null };

    const rid = await requireRestaurantId(getRequestHeader("authorization"));
    const token = generateDeliveryToken(rid);
    const { error } = await supabase
      .from("restaurants")
      .update({ delivery_enabled: true, delivery_link_token: token })
      .eq("id", rid);
    if (error) throw new Error(error.message);
    return { enabled: true, token };
  },
);

export const disableDelivery = createServerFn({ method: "POST" }).handler(
  async () => {
    if (!getFirebaseDb())
      return { enabled: false, token: null as string | null };

    const rid = await requireRestaurantId(getRequestHeader("authorization"));
    const { error } = await supabase
      .from("restaurants")
      .update({ delivery_enabled: false })
      .eq("id", rid);
    if (error) throw new Error(error.message);
    return { enabled: false, token: null };
  },
);

export const regenerateDeliveryToken = createServerFn({
  method: "POST",
}).handler(async () => {
  if (!getFirebaseDb()) return { token: null as string | null };

  const rid = await requireRestaurantId(getRequestHeader("authorization"));
  const token = generateDeliveryToken(rid);
  const { error } = await supabase
    .from("restaurants")
    .update({ delivery_link_token: token })
    .eq("id", rid);
  if (error) throw new Error(error.message);
  return { token };
});
