import { createServerFn } from "@tanstack/react-start";
import { getRequestHeader } from "@tanstack/react-start/server";
import { supabase } from "@/integrations/supabase/client";
import { getFirebaseDb } from "@/integrations/firebase/config";
import { requireRestaurantId } from "@/lib/server-staff-auth";

// Bot username — set via BOT_USERNAME env var or hardcoded after creating the bot via BotFather
const BOT_USERNAME = process.env.BOT_USERNAME || "sahldzDelivery_bot";

type StaffRow = {
  id: string;
  name: string;
  restaurant_id: string;
  role: string;
  serial: string;
  frozen: boolean | null;
  telegram_chat_id: string | null;
  telegram_linked: boolean | null;
  telegram_username: string | null;
};

/**
 * List all delivery drivers for the authenticated restaurant.
 * Drivers are staff members with role = "driver".
 */
export const listDeliveryDrivers = createServerFn({ method: "GET" }).handler(
  async () => {
    if (!getFirebaseDb()) return { drivers: [] };

    const restaurantId = await requireRestaurantId(
      getRequestHeader("authorization"),
    );

    const { data: rows } = await supabase
      .from("staff")
      .select(
        "id,name,restaurant_id,role,serial,frozen,telegram_chat_id,telegram_linked,telegram_username",
      )
      .eq("restaurant_id", restaurantId)
      .eq("role", "driver");

    const staff = (rows as StaffRow[]) ?? [];

    const drivers = staff.map((s) => {
      const linked = Boolean(s.telegram_linked && s.telegram_chat_id);
      const linkToken = linked ? null : `drv_${s.id}_${Date.now()}`;
      const deepLink = linked
        ? null
        : `https://t.me/${BOT_USERNAME}?start=${linkToken}`;

      return {
        id: s.id,
        display_name: s.name,
        telegram_username: s.telegram_username ?? null,
        linked,
        is_active: !s.frozen,
        link_token: linkToken,
        deep_link: deepLink,
      };
    });

    return { drivers };
  },
);

/**
 * Add a new delivery driver. Creates a staff record with role="driver"
 * and returns a deep link for the driver to click on Telegram.
 */
export const addDeliveryDriver = createServerFn({ method: "POST" })
  .validator((d: { display_name: string }) => d)
  .handler(async ({ data }) => {
    if (!getFirebaseDb()) throw new Error("Firebase not configured");

    const restaurantId = await requireRestaurantId(
      getRequestHeader("authorization"),
    );

    const name = data.display_name.trim();
    if (!name) throw new Error("اسم الديلفري مطلوب");

    // Generate serial: DR + 3-digit number
    const { data: existing } = await supabase
      .from("staff")
      .select("serial")
      .eq("restaurant_id", restaurantId)
      .eq("role", "driver")
      .order("serial", { ascending: false })
      .limit(1);

    let nextNum = 1;
    if (existing && existing.length > 0) {
      const lastSerial = existing[0].serial ?? "DR000";
      const num = parseInt(lastSerial.replace("DR", ""), 10);
      if (!isNaN(num)) nextNum = num + 1;
    }
    const serial = `DR${String(nextNum).padStart(3, "0")}`;

    // Insert staff record
    const { data: newRow, error } = await supabase
      .from("staff")
      .insert({
        restaurant_id: restaurantId,
        name,
        serial,
        pin: "0000", // Drivers don't use PIN login
        role: "driver",
        frozen: false,
        created_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (error) throw new Error(error.message);

    const driverId = newRow.id as string;
    const linkToken = `drv_${driverId}_${Date.now()}`;
    const deepLink = `https://t.me/${BOT_USERNAME}?start=${linkToken}`;

    return { ok: true, deep_link: deepLink };
  });

/**
 * Remove a delivery driver.
 */
export const removeDeliveryDriver = createServerFn({ method: "POST" })
  .validator((d: { id: string }) => d)
  .handler(async ({ data }) => {
    if (!getFirebaseDb()) throw new Error("Firebase not configured");

    await requireRestaurantId(getRequestHeader("authorization"));

    const { error } = await supabase
      .from("staff")
      .delete()
      .eq("id", data.id)
      .eq("role", "driver");

    if (error) throw new Error(error.message);
    return { ok: true };
  });

/**
 * Toggle a delivery driver active/frozen.
 */
export const toggleDeliveryDriver = createServerFn({ method: "POST" })
  .validator((d: { id: string; is_active: boolean }) => d)
  .handler(async ({ data }) => {
    if (!getFirebaseDb()) throw new Error("Firebase not configured");

    await requireRestaurantId(getRequestHeader("authorization"));

    const { error } = await supabase
      .from("staff")
      .update({ frozen: !data.is_active })
      .eq("id", data.id)
      .eq("role", "driver");

    if (error) throw new Error(error.message);
    return { ok: true };
  });

const TELEGRAM_API = "https://api.telegram.org";

/**
 * Notify all linked drivers about a new delivery order.
 * Called from the app when a delivery order is created.
 */
export const notifyDriversForOrder = createServerFn({ method: "POST" })
  .validator(
    (d: {
      restaurantId: string;
      orderId: string;
      total: number;
      customerName: string | null;
      customerPhone: string | null;
      customerAddress: string | null;
      items: Array<{ name: string; quantity: number }>;
      dailyNumber: number | null;
    }) => d,
  )
  .handler(async ({ data }) => {
    if (!getFirebaseDb()) return { notified: 0 };

    // Find the restaurant's bot token
    const { data: rest } = await supabase
      .from("restaurants")
      .select(
        "id,name,telegram_bot_token,telegram_chat_id,telegram_chat_linked",
      )
      .eq("id", data.restaurantId)
      .single();
    const r = rest as any;

    if (!r?.telegram_bot_token) return { notified: 0 };

    // Find linked drivers
    const { data: drivers } = await supabase
      .from("staff")
      .select("id,name,telegram_chat_id,telegram_linked")
      .eq("restaurant_id", data.restaurantId)
      .eq("role", "driver")
      .eq("telegram_linked", true);

    const driverList = (drivers as any[]) ?? [];
    const linkedDrivers = driverList.filter(
      (d) => d.telegram_chat_id && d.telegram_linked,
    );

    if (linkedDrivers.length === 0) return { notified: 0 };

    // Build message
    const itemsList = data.items
      .map((it) => `  • ${it.name} × ${it.quantity}`)
      .join("\n");

    const msg = [
      `🛵 *طلب توصيل جديد!*`,
      ``,
      `🔢 رقم الطلب: *${data.dailyNumber ?? data.orderId.slice(0, 8)}*`,
      `💰 الإجمالي: *${Number(data.total).toLocaleString("ar-DZ")} دج*`,
      ``,
      `📋 الأصناف:`,
      itemsList || "  (بدون أصناف)",
      ``,
      `👤 العميل: ${data.customerName ?? "—"}`,
      `📞 الهاتف: ${data.customerPhone ?? "—"}`,
      `📍 العنوان: ${data.customerAddress ?? "—"}`,
      ``,
      `⏰ ${new Date().toLocaleTimeString("ar-DZ", { hour: "2-digit", minute: "2-digit" })}`,
    ].join("\n");

    let notified = 0;
    for (const driver of linkedDrivers) {
      try {
        await fetch(`${TELEGRAM_API}/bot${r.telegram_bot_token}/sendMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: driver.telegram_chat_id,
            text: msg,
            parse_mode: "Markdown",
          }),
        });
        notified++;
      } catch {
        // skip failed notifications
      }
    }

    return { notified };
  });
