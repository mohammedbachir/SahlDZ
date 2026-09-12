import { createServerFn } from "@tanstack/react-start";
import { getRequestHeader } from "@tanstack/react-start/server";
import { supabase } from "@/integrations/supabase/client";
import { requireRestaurantId } from "@/lib/server-staff-auth";

// ─── Structured options for menu items ─────────────────────────
// menu_item_options: one "option group" per row (e.g. "الحجم", "التفضيلات")
//   id, restaurant_id, menu_item_id, name, required, multi (boolean), display_order
// menu_item_option_choices: one choice per row
//   id, option_id, name, price_delta, display_order

export type OptionChoice = {
  id: string;
  name: string;
  price_delta: number;
};
export type MenuOption = {
  id: string;
  name: string;
  required: boolean;
  multi: boolean;
  display_order: number;
  choices: OptionChoice[];
};

/** DB logic: fetch options (with choices) for a set of menu item ids. */
export async function getMenuOptionsForItemsCore(menuItemIds: string[]) {
  if (!menuItemIds.length)
    return { optionsByItem: {} as Record<string, MenuOption[]> };

  const [optRes, choiceRes] = await Promise.all([
    supabase
      .from("menu_item_options")
      .select("*")
      .in("menu_item_id", menuItemIds)
      .order("display_order", { ascending: true }),
    supabase.from("menu_item_option_choices").select("*"),
  ]);
  if (optRes.error) throw new Error(optRes.error.message);
  if (choiceRes.error) throw new Error(choiceRes.error.message);

  const choiceByOption = new Map<string, OptionChoice[]>();
  for (const c of choiceRes.data ?? []) {
    const arr = choiceByOption.get((c as any).option_id) ?? [];
    arr.push({
      id: (c as any).id,
      name: (c as any).name,
      price_delta: (c as any).price_delta ?? 0,
    });
    choiceByOption.set((c as any).option_id, arr);
  }

  const result: Record<string, MenuOption[]> = {};
  for (const o of optRes.data ?? []) {
    const itemId = (o as any).menu_item_id;
    (result[itemId] ??= []).push({
      id: (o as any).id,
      name: (o as any).name,
      required: (o as any).required ?? false,
      multi: (o as any).multi ?? false,
      display_order: (o as any).display_order ?? 0,
      choices: choiceByOption.get((o as any).id) ?? [],
    });
  }
  return { optionsByItem: result };
}

/** Owner-facing: save the full set of options for a menu item (replace-all). */
async function saveOptionsCore(
  rid: string,
  menuItemId: string,
  options: Array<{
    name: string;
    required: boolean;
    multi: boolean;
    choices: Array<{ name: string; price_delta: number }>;
  }>,
) {
  const { error: delOpt } = await supabase
    .from("menu_item_options")
    .delete()
    .eq("menu_item_id", menuItemId)
    .eq("restaurant_id", rid);
  if (delOpt) throw new Error(delOpt.message);

  let order = 0;
  for (const opt of options ?? []) {
    if (!opt.name?.trim() || !opt.choices?.length) continue;
    const { data: optRow, error: optErr } = await supabase
      .from("menu_item_options")
      .insert({
        restaurant_id: rid,
        menu_item_id: menuItemId,
        name: opt.name.trim(),
        required: !!opt.required,
        multi: !!opt.multi,
        display_order: order,
      })
      .select("id")
      .single();
    if (optErr) throw new Error(optErr.message);

    let cOrder = 0;
    for (const ch of opt.choices) {
      if (!ch.name?.trim()) continue;
      const { error: chErr } = await supabase
        .from("menu_item_option_choices")
        .insert({
          option_id: (optRow as any).id,
          name: ch.name.trim(),
          price_delta: Number(ch.price_delta) || 0,
          display_order: cOrder,
        });
      if (chErr) throw new Error(chErr.message);
      cOrder++;
    }
    order++;
  }
  return { ok: true };
}

export const saveMenuOptions = createServerFn({ method: "POST" })
  .validator(
    (d: {
      menuItemId: string;
      options: Array<{
        name: string;
        required: boolean;
        multi: boolean;
        choices: Array<{ name: string; price_delta: number }>;
      }>;
    }) => d,
  )
  .handler(async ({ data }) => {
    const rid = await requireRestaurantId(getRequestHeader("authorization"));
    return saveOptionsCore(rid, data.menuItemId, data.options);
  });

/** Owner-facing: fetch options for one item (used by the dashboard). */
export const getMenuOptionsForItem = createServerFn({ method: "GET" })
  .validator((d: { menuItemId: string }) => d)
  .handler(async ({ data }) => {
    const rid = await requireRestaurantId(getRequestHeader("authorization"));
    const { menuItemId } = data as { menuItemId: string };
    const { optionsByItem } = await getMenuOptionsForItemsCore([menuItemId]);
    return { options: optionsByItem[menuItemId] ?? [] };
  });
