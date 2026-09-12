import { createServerFn } from "@tanstack/react-start";
import { getRequestHeader } from "@tanstack/react-start/server";
import {
  collection,
  doc,
  getDoc,
  setDoc,
  deleteDoc,
} from "firebase/firestore";
import { supabase } from "@/integrations/supabase/client";
import { getFirebaseDb } from "@/integrations/firebase/config";
import { requireRestaurantId } from "@/lib/server-staff-auth";

const TELEGRAM_API = "https://api.telegram.org";
const SESSIONS_COLL = "telegram_driver_sessions";
const STATE_COLL = "delivery_bot_state";

function getServerEnv(name: string): string | undefined {
  try {
    if (typeof process !== "undefined" && process.env) {
      return process.env[name];
    }
  } catch {
    // ignore
  }
  return undefined;
}

const DELIVERY_BOT_TOKEN = getServerEnv("DELIVERY_BOT_TOKEN") || "";
const BOT_USERNAME =
  getServerEnv("BOT_USERNAME") || "sahldzDelivery_bot";

type DriverSession = {
  chat_id: string;
  step: "restaurant" | "firstname" | "surname";
  restaurant_id?: string;
  restaurant_name?: string;
  first_name?: string;
  target_staff_id?: string;
  updated_at: string;
};

async function tgPost(
  method: string,
  params: Record<string, unknown>,
): Promise<any> {
  try {
    const res = await fetch(`${TELEGRAM_API}/bot${DELIVERY_BOT_TOKEN}/${method}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params),
    });
    return await res.json();
  } catch {
    return { ok: false };
  }
}

async function sendReply(chatId: string, text: string) {
  await tgPost("sendMessage", {
    chat_id: Number(chatId),
    text,
    parse_mode: "Markdown",
  });
}

async function findStaffByChat(chatId: string): Promise<any[]> {
  const { data } = await supabase
    .from("staff")
    .select("*")
    .eq("telegram_chat_id", chatId)
    .limit(1);
  return (data as any[]) ?? [];
}

async function findRestaurantByName(name: string): Promise<any | null> {
  const { data } = await supabase
    .from("restaurants")
    .select("id,name")
    .eq("name", name)
    .limit(5);
  const rows = (data as any[]) ?? [];
  if (rows.length === 1) return rows[0];
  return null;
}

async function nextDriverSerial(restaurantId: string): Promise<string> {
  const { data: existing } = await supabase
    .from("staff")
    .select("serial")
    .eq("restaurant_id", restaurantId)
    .eq("role", "driver")
    .order("serial", { ascending: false })
    .limit(1);
  const rows = (existing as any[]) ?? [];
  let nextNum = 1;
  if (rows.length > 0) {
    const lastSerial = rows[0].serial ?? "DR000";
    const num = parseInt(String(lastSerial).replace("DR", ""), 10);
    if (!isNaN(num)) nextNum = num + 1;
  }
  return `DR${String(nextNum).padStart(3, "0")}`;
}

async function linkedDriverReply(chatId: string) {
  const staff = await findStaffByChat(chatId);
  const s = staff[0];
  if (!s) return false;
  let restName = "";
  if (s.restaurant_id) {
    const { data: rest } = await supabase
      .from("restaurants")
      .select("name")
      .eq("id", s.restaurant_id)
      .limit(1);
    restName = ((rest as any[])?.[0]?.name as string) ?? "";
  }
  await sendReply(
    chatId,
    `أنت مسجل بالفعل كمندوب توصيل${
      restName ? ` لمطعم «${restName}»` : ""
    }. ستصلك طلبات التوصيل الجديدة هنا مباشرة.`,
  );
  return true;
}

async function finalizeDriver(db: any, chatId: string, session: DriverSession, surnameText: string, tgUsername: string | null) {
  const rid = session.restaurant_id;
  if (!rid) return;
  const fullName = `${session.first_name ?? ""} ${surnameText}`.trim();
  const restName = session.restaurant_name ?? "";

  let staff = (await findStaffByChat(chatId))[0];
  if (!staff && session.target_staff_id) {
    const { data } = await supabase
      .from("staff")
      .select("*")
      .eq("id", session.target_staff_id)
      .limit(1);
    staff = (data as any[])?.[0];
  }

  if (staff && staff.restaurant_id === rid) {
    await supabase
      .from("staff")
      .update({
        name: fullName,
        telegram_username: tgUsername,
        telegram_linked: true,
        telegram_chat_id: chatId,
      })
      .eq("id", staff.id);
  } else {
    const serial = await nextDriverSerial(rid);
    await supabase.from("staff").insert({
      restaurant_id: rid,
      name: fullName,
      role: "driver",
      serial,
      pin: "0000",
      frozen: false,
      telegram_linked: true,
      telegram_chat_id: chatId,
      telegram_username: tgUsername,
      created_at: new Date().toISOString(),
    });
  }

  await deleteDoc(doc(collection(db, SESSIONS_COLL), chatId));
  await sendReply(
    chatId,
    `تم التسجيل بنجاح.\nمرحباً ${fullName} في فريق التوصيل${
      restName ? ` لمطعم «${restName}»` : ""
    }.\nستصلك إشعارات الطلبات الجديدة هنا مباشرة.`,
  );
}

/**
 * Core: poll Telegram for delivery-bot updates and drive the driver
 * registration conversation (restaurant name → first name → surname).
 */
export async function processDeliveryBotUpdatesCore(): Promise<{
  processed: number;
  configured: boolean;
}> {
  if (!getFirebaseDb()) return { processed: 0, configured: false };
  if (!DELIVERY_BOT_TOKEN) return { processed: 0, configured: false };

  const db = getFirebaseDb() as any;
  const sessionsColl = collection(db, SESSIONS_COLL);

  const stateRef = doc(collection(db, STATE_COLL), "state");
  let offset = 0;
  try {
    const stateSnap = await getDoc(stateRef);
    if (stateSnap.exists() && typeof stateSnap.data().offset === "number") {
      offset = stateSnap.data().offset as number;
    }
  } catch {
    // ignore
  }

  const res = await tgPost("getUpdates", {
    offset,
    timeout: 0,
    limit: 20,
  });

  const updates: any[] = res?.ok ? (res.result ?? []) : [];
  let nextOffset = offset;

  for (const update of updates) {
    nextOffset = Math.max(nextOffset, (update.update_id ?? 0) + 1);
    const msg = update.message;
    if (!msg || !msg.chat?.id) continue;

    const chatId = String(msg.chat.id);
    const text = String(msg.text ?? "").trim();
    const tgUsername = msg.from?.username ?? null;

    if (!chatId || !text) continue;

    if (text.toLowerCase() === "/cancel") {
      await deleteDoc(doc(sessionsColl, chatId)).catch(() => {});
      await sendReply(chatId, "تم إلغاء التسجيل. أرسل /start للبدء من جديد.");
      continue;
    }

    if (text.startsWith("/start")) {
      const payload = text.split(/\s+/)?.[1] ?? "";
      if (await linkedDriverReply(chatId)) continue;

      const session: DriverSession = {
        chat_id: chatId,
        step: "restaurant",
        updated_at: new Date().toISOString(),
      };
      if (payload.startsWith("drv_")) {
        // Legacy owner-created driver deep link: bind to that staff row.
        const staffId = payload.split("_")[1];
        if (staffId) {
          const { data } = await supabase
            .from("staff")
            .select("id,restaurant_id")
            .eq("id", staffId)
            .limit(1);
          const row = (data as any[])?.[0];
          if (row) {
            session.restaurant_id = row.restaurant_id as string;
            session.target_staff_id = row.id as string;
            session.step = "firstname";
          }
        }
      }
      await setDoc(doc(sessionsColl, chatId), session, { merge: true });
      await sendReply(
        chatId,
        session.step === "firstname"
          ? "مرحباً بك في بوت التوصيل.\nاكتب اسمك الأول."
          : "مرحباً بك في بوت التوصيل.\nللتسجيل كمندوب توصيل اكتب اسم المطعم كما يظهر في التطبيق بالضبط (مثال: مطعم السهل).",
      );
      continue;
    }

    const sessionSnap = await getDoc(doc(sessionsColl, chatId)).catch(() => null);
    if (!sessionSnap || !sessionSnap.exists()) {
      await sendReply(
        chatId,
        "لم أتعرف على الرسالة. ابدأ التسجيل بإرسال /start.",
      );
      continue;
    }

    const session = sessionSnap.data() as DriverSession;

    if (session.step === "restaurant") {
      const rest = await findRestaurantByName(text);
      if (!rest) {
        await sendReply(
          chatId,
          `لم أجد مطعماً باسم «${text}». تأكد من كتابة الاسم مطابقاً تماماً كما يظهر في تطبيق المطعم، ثم أعد المحاولة.`,
        );
        continue;
      }
      await setDoc(
        doc(sessionsColl, chatId),
        {
          restaurant_id: rest.id as string,
          restaurant_name: rest.name as string,
          step: "firstname",
          updated_at: new Date().toISOString(),
        },
        { merge: true },
      );
      await sendReply(chatId, `تم التعرف على مطعم «${rest.name}». اكتب الآن اسمك الأول.`);
      continue;
    }

    if (session.step === "firstname") {
      if (!session.restaurant_id) {
        await deleteDoc(doc(sessionsColl, chatId)).catch(() => {});
        await sendReply(chatId, "انتهت صلاحية التسجيل. أرسل /start للبدء من جديد.");
        continue;
      }
      await setDoc(
        doc(sessionsColl, chatId),
        {
          first_name: text,
          step: "surname",
          updated_at: new Date().toISOString(),
        },
        { merge: true },
      );
      await sendReply(chatId, "اكتب الآن لقبك (اسم العائلة).");
      continue;
    }

    if (session.step === "surname") {
      if (!session.restaurant_id || !session.first_name) {
        await deleteDoc(doc(sessionsColl, chatId)).catch(() => {});
        await sendReply(chatId, "انتهت صلاحية التسجيل. أرسل /start للبدء من جديد.");
        continue;
      }
      await finalizeDriver(db, chatId, session, text, tgUsername);
      continue;
    }
  }

  if (nextOffset !== offset) {
    await setDoc(stateRef, { offset: nextOffset }, { merge: true }).catch(
      () => {},
    );
  }

  return { processed: updates.length, configured: true };
}

export const processDeliveryBotUpdates = createServerFn({
  method: "POST",
}).handler(async () => {
  if (!getFirebaseDb()) return { processed: 0, configured: false };
  try {
    await requireRestaurantId(getRequestHeader("authorization"));
  } catch {
    return { processed: 0, configured: false };
  }
  return processDeliveryBotUpdatesCore();
});

export const getDeliveryBotStatus = createServerFn({ method: "GET" }).handler(
  async () => {
    if (!getFirebaseDb()) {
      return { configured: false, bot_username: BOT_USERNAME };
    }
    try {
      await requireRestaurantId(getRequestHeader("authorization"));
    } catch {
      return { configured: false, bot_username: BOT_USERNAME };
    }
    return { configured: !!DELIVERY_BOT_TOKEN, bot_username: BOT_USERNAME };
  },
);