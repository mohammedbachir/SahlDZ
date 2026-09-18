import { createServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { geminiVisionJson } from "@/lib/ai-vision";

type ParsedMenuDish = {
  name: string;
  price: number;
  description?: string | null;
  bbox?: [number, number, number, number];
};

type ParsedMenuCategory = {
  name: string;
  items: ParsedMenuDish[];
};

export const parseMenuImage = createServerFn({ method: "POST" })
  .validator((d: { imageBase64: string; mimeType?: string }) => d)
  .handler(async ({ data }) => {
    let base64 = data.imageBase64;
    let mimeType = data.mimeType || "image/jpeg";
    const comma = base64.indexOf(",");
    if (base64.startsWith("data:") && comma >= 0) {
      const meta = base64.slice(5, comma);
      const m = meta.match(/image\/([\w.+-]+)/i);
      if (m) mimeType = m[0];
      base64 = base64.slice(comma + 1);
    }

    const prompt = `أنت متخصص في استخراج قوائم الطعام من صور المنيو.
اقرأ الصورة واستخرج كل الفئات والأطباق بنصها العربي كما في المنيو.
- السعر بالأرقام (وحدة: دينار جزائري دج) اقرأه حرفياً من الصورة.
- إن بدا المنيو بلا فئات واضحة ضع كل الأطباق في فئة "أخرى".
- أعط description قصيرة إن كانت موجودة في المنيو.
- حدد bbox لكل طبق يظهر له صورة الطبق في المنيو بصيغة [ymin, xmin, ymax, xmax] بنسبة 0..1000 (مساحة الصورة الفعلية للطبق فقط، وليس النص) وإلا اجعلها null.
أعد JSON فقط بهذا الشكل:
{
  "categories": [
    { "name": "اسم الفئة", "items": [
      { "name": "اسم الطبق", "price": 1200, "description": "وصف أو null", "bbox": [0,0,0,0] }
    ] }
  ]
}`;

    const parsed = await geminiVisionJson<{
      categories?: ParsedMenuCategory[];
    }>({ imageBase64: base64, mimeType, prompt, maxOutputTokens: 8192 });

    const categories = (parsed.categories ?? [])
      .map((c) => ({
        name: String(c.name || "").trim(),
        items: (c.items ?? [])
          .map((it) => ({
            name: String(it.name || "").trim(),
            price: Number(it.price) || 0,
            description:
              typeof it.description === "string" && it.description.trim()
                ? it.description.trim()
                : null,
            bbox:
              Array.isArray(it.bbox) &&
              it.bbox.length === 4 &&
              it.bbox.every((n) => isFinite(n))
                ? (it.bbox.map((n) => Number(n)) as [
                    number,
                    number,
                    number,
                    number,
                  ])
                : undefined,
          }))
          .filter((it) => it.name && it.price > 0),
      }))
      .filter((c) => c.name && c.items.length > 0);

    return { categories };
  });

export type CsvMenuRow = {
  category: string;
  name: string;
  price: number;
  description?: string | null;
};

export const importMenuItems = createServerFn({ method: "POST" })
  .validator((d: { restaurantId: string; rows: CsvMenuRow[] }) => d)
  .handler(async ({ data }) => {
    const { restaurantId, rows } = data;
    if (!rows.length) return { imported: 0, categories: 0 };

    // ── 1. Group rows by category name ────────────────────────
    const catMap = new Map<string, CsvMenuRow[]>();
    for (const row of rows) {
      const catName = row.category?.trim() || "أخرى";
      if (!catMap.has(catName)) catMap.set(catName, []);
      catMap.get(catName)!.push(row);
    }

    // ── 2. Load existing categories to dedupe by name ─────────
    const { data: existingCats } = await supabase
      .from("categories")
      .select("id, name, display_order")
      .eq("restaurant_id", restaurantId);

    const byName = new Map<string, string>();
    let maxOrder = 0;
    for (const c of existingCats ?? []) {
      byName.set(c.name.trim().toLowerCase(), c.id);
      if (c.display_order > maxOrder) maxOrder = c.display_order;
    }

    // ── 3. Insert missing categories ──────────────────────────
    let createdCats = 0;
    for (const catName of catMap.keys()) {
      const key = catName.trim().toLowerCase();
      if (byName.has(key)) continue;
      maxOrder += 1;
      const { data: ins, error } = await supabase
        .from("categories")
        .insert({
          restaurant_id: restaurantId,
          name: catName.trim(),
          display_order: maxOrder,
          image_url: null,
        })
        .select("id")
        .single();
      if (error || !ins) throw new Error(error?.message || "فشل إنشاء الفئة");
      byName.set(key, ins.id);
      createdCats += 1;
    }

    // ── 4. Insert menu items per category ─────────────────────
    let createdItems = 0;
    for (const [catName, items] of catMap) {
      const catId = byName.get(catName.trim().toLowerCase());
      if (!catId) continue;

      const validItems = items.filter(
        (i) => i.name?.trim() && isFinite(i.price) && i.price > 0,
      );
      if (!validItems.length) continue;

      const payload = validItems.map((it) => ({
        restaurant_id: restaurantId,
        name: it.name.trim(),
        description: it.description?.trim() || null,
        price: it.price,
        category_id: catId,
        image_url: null as string | null,
        is_available: true,
      }));

      const { error: insErr } = await supabase
        .from("menu_items")
        .insert(payload);
      if (insErr) throw new Error(insErr.message);
      createdItems += payload.length;
    }

    return { imported: createdItems, categories: createdCats };
  });
