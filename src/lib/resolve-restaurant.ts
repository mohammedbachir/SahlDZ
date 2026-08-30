import { supabase } from "@/integrations/supabase/client";
import { getFirebaseDb } from "@/integrations/firebase/config";

let cachedRestaurantId: string | null = null;

export async function resolveDefaultRestaurantId(): Promise<string | null> {
  if (cachedRestaurantId) return cachedRestaurantId;
  if (!getFirebaseDb()) return null;

  try {
    const { data } = await supabase
      .from("restaurants")
      .select("id")
      .limit(1)
      .maybeSingle();
    if (data?.id) {
      cachedRestaurantId = data.id;
      return data.id;
    }
  } catch {
    // ignore
  }
  return null;
}
