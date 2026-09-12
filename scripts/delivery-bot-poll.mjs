import { readFileSync, existsSync, appendFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
if (existsSync(path.join(root, ".env"))) {
  try {
    process.loadEnvFile(path.join(root, ".env"));
  } catch {
    // ignore
  }
}

const TOKEN = process.env.DELIVERY_BOT_TOKEN || "";
const PROJECT_ID = process.env.VITE_FIREBASE_PROJECT_ID || "";
const FSREST = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;
const TG = `https://api.telegram.org/bot${TOKEN}`;
const POLL_MS = 2500;
const SESSIONS = "telegram_driver_sessions";
const STATE = "delivery_bot_state";

if (!TOKEN || !PROJECT_ID) {
  console.error(
    "[delivery-bot] missing DELIVERY_BOT_TOKEN or VITE_FIREBASE_PROJECT_ID in .env",
  );
  process.exit(1);
}

// ─── HTTP helpers ───────────────────────────────────────────────
async function tg(method, params = {}) {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) q.set(k, String(v));
  try {
    const res = await fetch(`${TG}/${method}?${q.toString()}`, {
      method: "POST",
    });
    return await res.json();
  } catch {
    return { ok: false };
  }
}

function toFields(obj) {
  const f = {};
  for (const [k, v] of Object.entries(obj ?? {})) {
    if (typeof v === "string") f[k] = { stringValue: v };
    else if (typeof v === "boolean") f[k] = { booleanValue: v };
    else if (typeof v === "number") f[k] = { integerValue: String(Math.trunc(v)) };
    else if (v === null || v === undefined) f[k] = { nullValue: null };
    else f[k] = { stringValue: JSON.stringify(v) };
  }
  return f;
}

function fromFields(fields) {
  const out = {};
  for (const [k, v] of Object.entries(fields ?? {})) {
    if ("stringValue" in v) out[k] = v.stringValue;
    else if ("booleanValue" in v) out[k] = v.booleanValue;
    else if ("integerValue" in v) out[k] = Number(v.integerValue);
    else if ("doubleValue" in v) out[k] = Number(v.doubleValue);
    else if ("mapValue" in v) out[k] = fromFields(v.mapValue.fields);
    else if ("arrayValue" in v) out[k] = (v.arrayValue.values ?? []).map((x) => fromFields({ x }).x);
    else out[k] = null;
  }
  return out;
}

function normVal(v) {
  if (typeof v === "boolean") return { booleanValue: v };
  if (typeof v === "number") return { integerValue: String(Math.trunc(v)) };
  return { stringValue: String(v) };
}

function fsQuery(collectionId, where = [], orderBy = null, limitN = null) {
  const filters = where.map((w) => ({
    fieldFilter: { field: { fieldPath: w.field }, op: w.op, value: normVal(w.value) },
  }));
  const body = { structuredQuery: { from: [{ collectionId }] } };
  if (filters.length === 1) body.structuredQuery.where = filters[0];
  else if (filters.length > 1)
    body.structuredQuery.where = { compositeFilter: { op: "AND", filters } };
  if (orderBy)
    body.structuredQuery.orderBy = [
      { field: { fieldPath: orderBy.field }, direction: orderBy.dir },
    ];
  if (limitN) body.structuredQuery.limit = limitN;
  return body;
}

async function fsGet(docPath) {
  const res = await fetch(`${FSREST}/${encodeURI(docPath)}`);
  if (!res.ok) return null;
  const j = await res.json();
  const id = (j.name ?? "").split("/").pop();
  return { id, ...fromFields(j.fields) };
}

async function fsSet(collection, id, data) {
  const res = await fetch(`${FSREST}/${collection}/${encodeURI(id)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ fields: toFields(data) }),
  });
  return res.ok;
}

async function fsDelete(docPath) {
  const res = await fetch(`${FSREST}/${encodeURI(docPath)}`, { method: "DELETE" });
  return res.ok;
}

async function fsAdd(collection, data) {
  const res = await fetch(`${FSREST}/${collection}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ fields: toFields(data) }),
  });
  if (!res.ok) return null;
  const j = await res.json();
  return (j.name ?? "").split("/").pop() || null;
}

async function fsRunQuery(collectionId, where = [], orderBy = null, limitN = null) {
  const res = await fetch(
    `${FSREST}:runQuery`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(fsQuery(collectionId, where, orderBy, limitN)),
    },
  );
  if (!res.ok) return [];
  const j = await res.json();
  return j
    .filter((r) => r.document)
    .map((r) => {
      const id = r.document.name.split("/").pop();
      return { id, ...fromFields(r.document.fields) };
    });
}

// ─── Conversation helpers ───────────────────────────────────────
async function sendReply(chatId, text) {
  await tg("sendMessage", { chat_id: chatId, text, parse_mode: "Markdown" });
}

async function findStaffByChat(chatId) {
  return fsRunQuery("staff", [{ field: "telegram_chat_id", op: "EQUAL", value: chatId }], null, 1);
}

async function findRestaurantByName(name) {
  const rows = await fsRunQuery("restaurants", [{ field: "name", op: "EQUAL", value: name }], null, 5);
  return rows.length === 1 ? rows[0] : null;
}

async function nextDriverSerial(restaurantId) {
  const rows = await fsRunQuery(
    "staff",
    [
      { field: "restaurant_id", op: "EQUAL", value: restaurantId },
      { field: "role", op: "EQUAL", value: "driver" },
    ],
    { field: "serial", dir: "DESCENDING" },
    1,
  );
  let nextNum = 1;
  if (rows.length > 0) {
    const num = parseInt(String(rows[0].serial ?? "DR000").replace("DR", ""), 10);
    if (!isNaN(num)) nextNum = num + 1;
  }
  return `DR${String(nextNum).padStart(3, "0")}`;
}

async function linkedDriverReply(chatId) {
  const staff = await findStaffByChat(chatId);
  const s = staff[0];
  if (!s) return false;
  let restName = "";
  if (s.restaurant_id) {
    const r = await fsGet(`restaurants/${s.restaurant_id}`);
    restName = r?.name ?? "";
  }
  await sendReply(chatId, `أنت مسجل بالفعل كمندوب توصيل${restName ? ` لمطعم «${restName}»` : ""}. ستصلك طلبات التوصيل الجديدة هنا مباشرة.`);
  return true;
}

async function finalize(chatId, session, surnameText, tgUsername) {
  const rid = session.restaurant_id;
  if (!rid) return;
  const fullName = `${session.first_name ?? ""} ${surnameText}`.trim();
  const restName = session.restaurant_name ?? "";
  let staff = (await findStaffByChat(chatId))[0];
  if (!staff && session.target_staff_id) {
    staff = await fsGet(`staff/${session.target_staff_id}`);
  }
  if (staff && staff.restaurant_id === rid) {
    await fetch(`${FSREST}/staff/${encodeURI(staff.id)}?updateMask.fieldPaths=name&updateMask.fieldPaths=telegram_username&updateMask.fieldPaths=telegram_linked&updateMask.fieldPaths=telegram_chat_id`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fields: toFields({
          name: fullName,
          telegram_username: tgUsername,
          telegram_linked: true,
          telegram_chat_id: chatId,
        }),
      }),
    });
  } else {
    const serial = await nextDriverSerial(rid);
    await fsAdd("staff", {
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
  await fsDelete(`${SESSIONS}/${encodeURI(chatId)}`);
  await sendReply(chatId, `تم التسجيل بنجاح.\nمرحباً ${fullName} في فريق التوصيل${restName ? ` لمطعم «${restName}»` : ""}.\nستصلك إشعارات الطلبات الجديدة هنا مباشرة.`);
}

// ─── Poll loop ──────────────────────────────────────────────────
let offset = 0;
let readyToWork = true;

async function refreshOffset() {
  const st = await fsGet(`${STATE}/state`);
  if (st && typeof st.offset === "number") offset = st.offset;
}

async function handleUpdate(update) {
  const msg = update.message;
  if (!msg || !msg.chat?.id) return;
  const chatId = String(msg.chat.id);
  const text = String(msg.text ?? "").trim();
  const tgUsername = msg.from?.username ?? null;
  if (!chatId || !text) return;

  if (text.toLowerCase() === "/cancel") {
    await fsDelete(`${SESSIONS}/${encodeURI(chatId)}`).catch(() => {});
    await sendReply(chatId, "تم إلغاء التسجيل. أرسل /start للبدء من جديد.");
    return;
  }

  if (text.startsWith("/start")) {
    const payload = text.split(/\s+/)?.[1] ?? "";
    if (await linkedDriverReply(chatId)) return;

    const session = { chat_id: chatId, step: "restaurant", updated_at: new Date().toISOString() };
    if (payload.startsWith("drv_")) {
      const staffId = payload.split("_")[1];
      if (staffId) {
        const row = await fsGet(`staff/${staffId}`);
        if (row) {
          session.restaurant_id = row.restaurant_id;
          session.target_staff_id = row.id;
          session.step = "firstname";
        }
      }
    }
    await fsSet(SESSIONS, chatId, session);
    await sendReply(
      chatId,
      session.step === "firstname"
        ? "مرحباً بك في بوت التوصيل.\nاكتب اسمك الأول."
        : "مرحباً بك في بوت التوصيل.\nللتسجيل كمندوب توصيل اكتب اسم المطعم كما يظهر في التطبيق بالضبط (مثال: مطعم السهل).",
    );
    return;
  }

  const session = await fsGet(`${SESSIONS}/${encodeURI(chatId)}`);
  if (!session) {
    await sendReply(chatId, "لم أتعرف على الرسالة. ابدأ التسجيل بإرسال /start.");
    return;
  }

  if (session.step === "restaurant") {
    const rest = await findRestaurantByName(text);
    if (!rest) {
      await sendReply(chatId, `لم أجد مطعماً باسم «${text}». تأكد من كتابة الاسم مطابقاً تماماً كما يظهر في تطبيق المطعم، ثم أعد المحاولة.`);
      return;
    }
    await fsSet(SESSIONS, chatId, { ...session, restaurant_id: rest.id, restaurant_name: rest.name, step: "firstname", updated_at: new Date().toISOString() });
    await sendReply(chatId, `تم التعرف على مطعم «${rest.name}». اكتب الآن اسمك الأول.`);
    return;
  }

  if (session.step === "firstname") {
    if (!session.restaurant_id) {
      await fsDelete(`${SESSIONS}/${encodeURI(chatId)}`).catch(() => {});
      await sendReply(chatId, "انتهت صلاحية التسجيل. أرسل /start للبدء من جديد.");
      return;
    }
    await fsSet(SESSIONS, chatId, { ...session, first_name: text, step: "surname", updated_at: new Date().toISOString() });
    await sendReply(chatId, "اكتب الآن لقبك (اسم العائلة).");
    return;
  }

  if (session.step === "surname") {
    if (!session.restaurant_id || !session.first_name) {
      await fsDelete(`${SESSIONS}/${encodeURI(chatId)}`).catch(() => {});
      await sendReply(chatId, "انتهت صلاحية التسجيل. أرسل /start للبدء من جديد.");
      return;
    }
    await finalize(chatId, session, text, tgUsername);
  }
}

async function tick() {
  const res = await tg("getUpdates", { offset, timeout: 0, limit: 20 });
  if (!res?.ok) {
    if (readyToWork) {
      console.warn(`[delivery-bot] Telegram error: ${res?.description ?? "unknown"}`);
      readyToWork = false;
    }
    return;
  }
  readyToWork = true;
  const updates = res.result ?? [];
  if (updates.length > 0) {
    console.log(`[delivery-bot] ${updates.length} update(s) received`);
    for (const u of updates) {
      const newOffset = (u.update_id ?? 0) + 1;
      offset = Math.max(offset, newOffset);
      try {
        await handleUpdate(u);
      } catch (e) {
        console.error("[delivery-bot] update failed:", e);
      }
    }
    await fsSet(STATE, "state", { offset });
  }
}

await refreshOffset();
console.log(`[delivery-bot] polling @${process.env.BOT_USERNAME || "sahldzDelivery_bot"} every ${POLL_MS / 1000}s (offset ${offset})`);

let running = false;
async function loop() {
  if (running) return;
  running = true;
  try {
    await tick();
  } catch (e) {
    console.error("[delivery-bot] tick failed:", e);
  } finally {
    running = false;
    setTimeout(loop, POLL_MS);
  }
}
loop();