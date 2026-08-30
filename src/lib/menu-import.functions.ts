import { createServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";

export const parseMenuImage = createServerFn({ method: "POST" })
  .validator((d: { imageBase64: string }) => d)
  .handler(async () => ({
    categories: [] as Array<{
      name: string;
      items: Array<{
        name: string;
        price: number;
        description?: string | null;
      }>;
    }>,
  }));

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
