import { createServerFn } from "@tanstack/react-start";
import { getRequestHeader } from "@tanstack/react-start/server";
import { supabase } from "@/integrations/supabase/client";
import { getFirebaseDb } from "@/integrations/firebase/config";
import { requireRestaurantId } from "@/lib/server-staff-auth";

function generateTakeawayToken(restaurantId: string): string {
  const rand = Math.random().toString(36).slice(2, 10);
  return `tw_${restaurantId.slice(0, 8)}_${rand}`;
}

export const getTakeawayStatus = createServerFn({ method: "GET" }).handler(
  async () => {
    if (!getFirebaseDb())
      return { enabled: false, token: null as string | null };

    const rid = await requireRestaurantId(getRequestHeader("authorization"));
    const { data: rest } = await supabase
      .from("restaurants")
      .select("takeaway_enabled,takeaway_link_token")
      .eq("id", rid)
      .maybeSingle();

    const r = rest as any;
    return {
      enabled: r?.takeaway_enabled === true,
      token: (r?.takeaway_link_token as string | null) ?? null,
    };
  },
);

export const enableTakeaway = createServerFn({ method: "POST" }).handler(
  async () => {
    if (!getFirebaseDb())
      return { enabled: true, token: null as string | null };

    const rid = await requireRestaurantId(getRequestHeader("authorization"));
    const token = generateTakeawayToken(rid);
    const { error } = await supabase
      .from("restaurants")
      .update({ takeaway_enabled: true, takeaway_link_token: token })
      .eq("id", rid);
    if (error) throw new Error(error.message);
    return { enabled: true, token };
  },
);

export const disableTakeaway = createServerFn({ method: "POST" }).handler(
  async () => {
    if (!getFirebaseDb())
      return { enabled: false, token: null as string | null };

    const rid = await requireRestaurantId(getRequestHeader("authorization"));
    const { error } = await supabase
      .from("restaurants")
      .update({ takeaway_enabled: false })
      .eq("id", rid);
    if (error) throw new Error(error.message);
    return { enabled: false, token: null };
  },
);

export const regenerateTakeawayToken = createServerFn({
  method: "POST",
}).handler(async () => {
  if (!getFirebaseDb()) return { token: null as string | null };

  const rid = await requireRestaurantId(getRequestHeader("authorization"));
  const token = generateTakeawayToken(rid);
  const { error } = await supabase
    .from("restaurants")
    .update({ takeaway_link_token: token })
    .eq("id", rid);
  if (error) throw new Error(error.message);
  return { token };
});
