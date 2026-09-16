import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { loadUnifiedStaffSession } from "@/lib/staff-session";

const PREVIEW_RESTAURANT_ID = "mock-restaurant-id";

const numberFormat = new Intl.NumberFormat("ar-DZ", {
  maximumFractionDigits: 2,
});

export function formatDZD(n: number): string {
  return `${numberFormat.format(n)} دج`;
}

export function useRestaurantId(): {
  restaurantId: string | null;
  loading: boolean;
} {
  const [restaurantId, setRestaurantId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function resolve() {
      try {
        if (typeof window === "undefined") return;

        // Fast path: unified staff session carries the restaurant directly.
        const staffSession = loadUnifiedStaffSession();
        if (staffSession?.restaurant?.id) {
          if (!cancelled) setRestaurantId(staffSession.restaurant.id);
          return;
        }

        const { data } = await supabase.auth.getUser();
        const userId = data.user?.id;
        if (!userId) {
          if (!cancelled) setRestaurantId(null);
          return;
        }

        const { data: owned } = await supabase
          .from("restaurants")
          .select("id")
          .eq("owner_id", userId)
          .maybeSingle();

        if (owned?.id) {
          if (!cancelled) setRestaurantId(owned.id);
          return;
        }

        const { data: roles } = await supabase
          .from("user_roles")
          .select("restaurant_id")
          .eq("user_id", userId)
          .maybeSingle();

        if (!cancelled) setRestaurantId(roles?.restaurant_id ?? null);
      } catch {
        if (!cancelled) setRestaurantId(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void resolve();
    return () => {
      cancelled = true;
    };
  }, []);

  return { restaurantId, loading };
}

export { PREVIEW_RESTAURANT_ID };
