import { createServerFn } from "@tanstack/react-start";
import { getRequestHeader } from "@tanstack/react-start/server";
import { supabase } from "@/integrations/supabase/client";
import { getFirebaseDb } from "@/integrations/firebase/config";
import { getAuthedUserId } from "@/lib/server-staff-auth";
import { generateActivationCode } from "@/lib/activation";

export const createRestaurant = createServerFn({ method: "POST" })
  .validator(
    (d: {
      name: string;
      address?: string;
      phone?: string;
      owner_name?: string;
      owner_email?: string;
      owner_phone?: string;
      whatsapp_number?: string;
      marketing_consent?: boolean;
    }) => d,
  )
  .handler(async ({ data }) => {
    if (!getFirebaseDb()) {
      return { ok: false, reason: "preview" as const };
    }

    const userId = await getAuthedUserId(getRequestHeader("authorization"));
    if (!userId)
      throw new Error("الجلسة منتهية أو غير مصرح بها — سجّل دخولك من جديد");

    const name = data.name.trim();
    if (name.length < 2) throw new Error("اسم المطعم مطلوب");

    const activation_code = generateActivationCode();
    const { data: created, error } = await supabase
      .from("restaurants")
      .insert({
        name,
        owner_id: userId,
        activation_code,
        address: data.address?.trim() || null,
        phone: data.phone?.trim() || null,
        owner_name: data.owner_name?.trim() || null,
        owner_email: data.owner_email?.trim() || null,
        owner_phone: data.owner_phone?.trim() || null,
        whatsapp_number: data.whatsapp_number?.trim() || null,
        marketing_consent: data.marketing_consent === true,
        created_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (error) throw new Error(error.message);

    const restaurantId = created.id as string;
    await supabase.from("user_roles").insert({
      user_id: userId,
      restaurant_id: restaurantId,
      role: "admin",
    });

    return { ok: true, restaurantId };
  });
