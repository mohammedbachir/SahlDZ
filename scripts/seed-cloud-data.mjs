#!/usr/bin/env node
/**
 * Seed the REAL cloud Firestore (project sahldz-app) with demo restaurant data.
 * Uses the firebase CLI's cached OAuth access token for owner-level writes
 * (bypasses security rules). Docs are written via the Firestore REST API.
 *
 * Run: node scripts/seed-cloud-data.mjs
 */
import { readFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";

const PROJECT = "sahldz-app";
const RID = "rest_v42C2A2R2qoGZ4c5lmqe";
const OWNER_UID = "o8PGlaRe6tZ83ukKyyMK1SjD7Bs2";
const OWNER_EMAIL = "admin@sahldz.com";
const TAKEAWAY_TOKEN = "tw_v42C2A2R_3a1kjrpz";
const ACTIVATION_CODE = "REST-2348-KD7W";
const NOW = new Date().toISOString();

const BASE =
  `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents`;

const tokenPath = path.join(
  os.homedir(),
  ".config",
  "configstore",
  "firebase-tools.json",
);

function fieldValue(v) {
  if (v === null || v === undefined) return { nullValue: null };
  if (typeof v === "string") return { stringValue: v };
  if (typeof v === "boolean") return { booleanValue: v };
  if (typeof v === "number")
    return Number.isInteger(v)
      ? { integerValue: String(v) }
      : { doubleValue: v };
  if (Array.isArray(v)) return { arrayValue: { values: v.map(fieldValue) } };
  if (typeof v === "object") {
    const fields = {};
    for (const [k, val] of Object.entries(v)) fields[k] = fieldValue(val);
    return { mapValue: { fields } };
  }
  throw new Error("unsupported value: " + v);
}

async function putDoc(collection, id, obj, token) {
  const fields = {};
  for (const [k, v] of Object.entries(obj)) fields[k] = fieldValue(v);
  const res = await fetch(`${BASE}/${collection}/${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ fields }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`PATCH ${collection}/${id} -> ${res.status}: ${body}`);
  }
  return true;
}

async function main() {
  const raw = JSON.parse(readFileSync(tokenPath, "utf8"));
  const token = raw.tokens && raw.tokens.access_token;
  if (!token) throw new Error("No firebase CLI access token found");

  await putDoc(
    "restaurants",
    RID,
    {
      name: "مطعم السهل",
      logo_url: "",
      owner_id: OWNER_UID,
      owner_email: OWNER_EMAIL,
      takeaway_enabled: true,
      takeaway_link_token: TAKEAWAY_TOKEN,
      activation_code: ACTIVATION_CODE,
      currency: "dzd",
      phone: "",
      address: "الجزائر العاصمة",
      created_at: NOW,
    },
    token,
  );
  console.log("✓ restaurants/" + RID);

  const cats = [
    ["c_sahldz_main", "أطباق رئيسية", 0],
    ["c_sahldz_salad", "سلطات ومقبلات", 1],
    ["c_sahldz_drink", "مشروبات", 2],
    ["c_sahldz_dessert", "حلويات", 3],
  ];
  for (const [id, name, order] of cats) {
    await putDoc(
      "categories",
      id,
      { restaurant_id: RID, name, display_order: order },
      token,
    );
    console.log("✓ categories/" + id);
  }

  const items = [
    ["i_sahldz_1", "c_sahldz_main", "كسكس باللحم", "كسكس باللحم والمرق والخضار", 950],
    ["i_sahldz_2", "c_sahldz_main", "شخشوخة", "شخشوخة بالدجاج والمرق", 800],
    ["i_sahldz_3", "c_sahldz_main", "مشوي مختلط", "تشكيلة مشاوي على الفحم", 1400],
    ["i_sahldz_4", "c_sahldz_main", "طاجين زيتون", "طاجين دجاج بالزيتون", 750],
    ["i_sahldz_5", "c_sahldz_salad", "سلطة مشكلة", "سلطة الخضار المشكلة", 350],
    ["i_sahldz_6", "c_sahldz_salad", "شوربا", "شوربة العدس", 300],
    ["i_sahldz_7", "c_sahldz_salad", "سلاية جرجير", "سلاية الجرجير بالزيت والليمون", 400],
    ["i_sahldz_8", "c_sahldz_drink", "مشروبات غازية", "علبة 33cl", 150],
    ["i_sahldz_9", "c_sahldz_drink", "عصير برتقال", "عصير طبيعي طازج", 200],
    ["i_sahldz_10", "c_sahldz_drink", "ماء معدني", "قنينة 50cl", 100],
    ["i_sahldz_11", "c_sahldz_dessert", "بقلاوة", "قطعة بقلاوة جزائرية", 450],
    ["i_sahldz_12", "c_sahldz_dessert", "كعكة الشوكولاتة", "شريحة كعكة", 500],
  ];
  for (const [id, catId, name, desc, price] of items) {
    await putDoc(
      "menu_items",
      id,
      {
        restaurant_id: RID,
        category_id: catId,
        name,
        description: desc,
        price,
        image_url: "",
        is_available: true,
        created_at: NOW,
      },
      token,
    );
    console.log("✓ menu_items/" + id);
  }

  // Options for the mixed grill (طاجين-house special behaviour demo).
  await putDoc(
    "menu_item_options",
    "opt_sahldz_size",
    {
      restaurant_id: RID,
      menu_item_id: "i_sahldz_3",
      name: "الحجم",
      required: true,
      multi: false,
      display_order: 0,
    },
    token,
  );
  console.log("✓ menu_item_options/opt_sahldz_size");
  await putDoc(
    "menu_item_options",
    "opt_sahldz_extras",
    {
      restaurant_id: RID,
      menu_item_id: "i_sahldz_3",
      name: "الإضافات",
      required: false,
      multi: true,
      display_order: 1,
    },
    token,
  );
  console.log("✓ menu_item_options/opt_sahldz_extras");

  const choices = [
    ["cho_sahldz_s1", "opt_sahldz_size", "عادي", 0],
    ["cho_sahldz_s2", "opt_sahldz_size", "كبير", 200],
    ["cho_sahldz_e1", "opt_sahldz_extras", "خبز", 50],
    ["cho_sahldz_e2", "opt_sahldz_extras", "صلصة حارة", 30],
    ["cho_sahldz_e3", "opt_sahldz_extras", "بطاطس مقلية", 150],
  ];
  for (let i = 0; i < choices.length; i++) {
    const [id, optId, name, delta] = choices[i];
    await putDoc(
      "menu_item_option_choices",
      id,
      { option_id: optId, name, price_delta: delta, display_order: i },
      token,
    );
    console.log("✓ menu_item_option_choices/" + id);
  }

  for (let n = 1; n <= 10; n++) {
    await putDoc(
      "tables",
      `tbl_sahldz_${n}`,
      {
        restaurant_id: RID,
        table_number: n,
        qr_token: `t_v42C2A2R_3a1kjrpz_${n}`,
        created_at: NOW,
      },
      token,
    );
    console.log("✓ tables/tbl_sahldz_" + n);
  }

  const staff = [
    ["st_sahldz_w1", "أمين", "نادل", "1234", "W001"],
    ["st_sahldz_w2", "خالد", "نادل", "2345", "W002"],
    ["st_sahldz_k1", "الشيف يوسف", "مطبخ", "1111", "K001"],
    ["st_sahldz_k2", "محمد", "مطبخ", "2222", "K002"],
    ["st_sahldz_c1", "سارة", "كاشير", "4321", "C001"],
  ];
  for (const [id, name, role, pin, serial] of staff) {
    await putDoc(
      "staff",
      id,
      {
        restaurant_id: RID,
        name,
        role,
        pin,
        serial,
        frozen: false,
        created_at: NOW,
      },
      token,
    );
    console.log("✓ staff/" + id);
  }

  console.log("\nDone. Restaurant:", RID);
  console.log("Takeaway:", `http://localhost:8080/t/${TAKEAWAY_TOKEN}`);
  console.log("Activation code:", ACTIVATION_CODE);
}

main().catch((e) => {
  console.error("SEED FAILED:", e.message);
  process.exit(1);
});