import { createServerFn } from "@tanstack/react-start";
import { getRequestHeader } from "@tanstack/react-start/server";
import { supabase } from "@/integrations/supabase/client";
import { getFirebaseDb } from "@/integrations/firebase/config";

function readConfig(): Record<string, string> {
  if (typeof process === "undefined" || !process.env) return {};
  return process.env as Record<string, string>;
}

export type RestaurantManagerRow = {
  restaurant_id: string;
  restaurant_name: string;
  owner_name: string;
  owner_email: string;
  owner_phone: string;
  whatsapp_number: string;
  phone: string;
  marketing_consent: boolean;
  created_at: string;
};

export const listRestaurantManagers = createServerFn({
  method: "POST",
}).handler(async () => {
  const adminKey = getRequestHeader("x-admin-key");
  const expected = readConfig().SAHLDZ_ADMIN_KEY;
  if (!expected || !adminKey || adminKey !== expected) {
    return {
      ok: false as const,
      reason: "unauthorized" as const,
      managers: [],
    };
  }
  if (!getFirebaseDb()) {
    return { ok: false as const, reason: "preview" as const, managers: [] };
  }

  const { data, error } = await supabase
    .from("restaurants")
    .select(
      "id,owner_id,name,owner_name,owner_email,owner_phone,whatsapp_number,phone,marketing_consent,created_at",
    )
    .order("created_at", { ascending: false });

  if (error) {
    return { ok: false as const, reason: error.message, managers: [] };
  }

  const managers: RestaurantManagerRow[] = ((data ?? []) as any[]).map((r) => ({
    restaurant_id: (r.id as string) ?? "",
    restaurant_name: (r.name as string | null) ?? "—",
    owner_name: (r.owner_name as string | null) ?? "",
    owner_email: (r.owner_email as string | null) ?? "",
    owner_phone: (r.owner_phone as string | null) ?? "",
    whatsapp_number: (r.whatsapp_number as string | null) ?? "",
    phone: (r.phone as string | null) ?? "",
    marketing_consent: (r.marketing_consent as boolean) === true,
    created_at: (r.created_at as string | null) ?? "",
  }));

  return {
    ok: true as const,
    reason: undefined as string | undefined,
    managers,
  };
});
