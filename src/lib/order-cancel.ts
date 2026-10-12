// ─── Order cancellation (إلغاء الطلبية) ─────────────────────────
//
// A staff member can void an order from any stage, but never from a paid one.
// The reason is mandatory, and the audit trail is split by how much the
// restaurant actually lost:
//
//   new / preparing  → the dish was never finished, the loss is staff time.
//                      Recorded in `order_cancellations` and surfaced on the
//                      staff-performance screen.
//   ready / served   → the dish was cooked and (maybe) already delivered.
//                      Recorded as ingredient-level rows in `waste_logs`, so the
//                      owner sees the real food cost, not just a voided ticket.
//
// A cancellation always writes an `order_cancellations` row (the audit trail),
// carrying `generated_waste` so the two branches stay distinguishable later.

import { supabase } from "@/integrations/supabase/client";

/** Statuses a staff member is allowed to void. `paid` is deliberately absent. */
export const CANCELLABLE_STATUSES = [
  "new",
  "preparing",
  "ready",
  "served",
] as const;

/**
 * A cancellation at or past `ready` means the kitchen had already produced the
 * food, so it is a genuine waste loss rather than a staff-time loss.
 */
export const WASTE_CANCELLATION_STATUSES = ["ready", "served"] as const;

export type CancellableStatus = (typeof CANCELLABLE_STATUSES)[number];

export const CANCEL_REASONS: ReadonlyArray<{ value: string; label: string }> = [
  { value: "customer_changed_mind", label: "العميل غيّر رأيه" },
  { value: "customer_left", label: "العميل غادر المطعم" },
  { value: "wrong_order", label: "خطأ في إدخال الطلب" },
  { value: "out_of_stock", label: "صنف غير متوفر" },
  { value: "quality_issue", label: "عيب في الجودة أو التحضير" },
  { value: "long_wait", label: "انتظار طويل" },
  { value: "duplicate", label: "طلب مكرر" },
  { value: "manager_decision", label: "قرار الإدارة" },
  { value: "other", label: "أخرى" },
];

const REASON_VALUES = new Set(CANCEL_REASONS.map((r) => r.value));

/** Human label for a stored reason value; falls back to the raw value. */
export function cancelReasonLabel(value: unknown): string {
  const v = String(value ?? "");
  return CANCEL_REASONS.find((r) => r.value === v)?.label ?? v;
}

/** True when a status may be voided. */
export function isCancellableStatus(status: unknown): boolean {
  return CANCELLABLE_STATUSES.includes(String(status) as CancellableStatus);
}

/** True when cancelling at this status should be logged as food waste. */
export function cancellationGeneratesWaste(status: unknown): boolean {
  return WASTE_CANCELLATION_STATUSES.includes(String(status) as never);
}

/**
 * Maps a cancellation reason onto the waste vocabulary that `/ops/waste`
 * already understands, so a voided order lands in the existing filter chips
 * instead of inventing a new set. Reasons with no waste equivalent fall back
 * to `other`, keeping the Arabic label in `reason_other`.
 */
const WASTE_REASON_BY_CANCEL_REASON: Record<string, string> = {
  quality_issue: "prep_error",
  wrong_order: "prep_error",
  duplicate: "prep_error",
  customer_changed_mind: "dropped",
  customer_left: "dropped",
  out_of_stock: "expired",
  long_wait: "dropped",
  manager_decision: "dropped",
};

export function wasteReasonForCancelReason(reason: string): string {
  return WASTE_REASON_BY_CANCEL_REASON[reason] ?? "other";
}

export type CancelActor = {
  /** `staff.id` when the caller is a staff terminal or a linked manager. */
  id: string | null;
  name: string;
  role: string | null;
};

export type CancelOrderInput = {
  restaurantId: string;
  orderId: string;
  reason: string;
  /** Mandatory when `reason === "other"`. */
  reasonOther?: string | null;
  actor: CancelActor;
  /**
   * When set, the order must contain at least one line routed to this kitchen.
   * Kitchen terminals pass their own `kitchen_id` so a grill chef can never
   * void a whole order that includes the pizzeria's dishes.
   */
  kitchenId?: string | null;
};

export type CancelOrderResult = {
  ok: true;
  orderId: string;
  cancelledFrom: string;
  /** Where the audit row landed, for the caller's confirmation toast. */
  loggedTo: "waste" | "performance";
  /** Ingredient-level waste rows written (0 when logged to performance). */
  wasteRows: number;
  /** Total food cost of the voided order, in DZD. */
  estimatedCost: number;
};

export class CancelOrderError extends Error {}

function fail(message: string): never {
  throw new CancelOrderError(message);
}

/**
 * Validates the reason and returns the resolved label. The reason is mandatory
 * and "أخرى" additionally requires free text, so a void can never be
 * unattributable.
 */
export function normalizeCancelReason(
  rawReason: unknown,
  rawOther?: string | null,
): { reason: string; reasonOther: string | null } {
  const reason = String(rawReason ?? "").trim();
  if (!reason) fail("السبب إجباري");
  if (!REASON_VALUES.has(reason)) fail("سبب الإلغاء غير معروف");
  const other = String(rawOther ?? "").trim();
  if (reason === "other" && !other) fail("اكتب وصف السبب");
  return { reason, reasonOther: reason === "other" ? other : other || null };
}

/**
 * Expands an order into the ingredients it consumed, using the same
 * `menu_item_recipes` mapping that `decrementStockForOrder` deducts at
 * `preparing`. This is what makes the waste log real: the owner sees "0.5 kg
 * flour, 0.2 kg cheese" rather than "one voided pizza".
 *
 * Cost is `quantity × ingredients.cost_per_unit`, denormalized on each row the
 * way `ops.inventory.tsx` does it.
 */
export type OrderIngredientUsage = {
  ingredient_id: string;
  name: string;
  unit: string;
  quantity: number;
  cost: number;
};

export async function resolveOrderIngredientUsage(
  restaurantId: string,
  orderId: string,
): Promise<OrderIngredientUsage[]> {
  const { data: itemRows } = await supabase
    .from("order_items")
    .select("menu_item_id,quantity")
    .eq("order_id", orderId);
  const orderItems = (itemRows ?? []) as {
    menu_item_id: string | null;
    quantity: number;
  }[];
  const menuItemIds = new Set(
    orderItems
      .map((i) => i.menu_item_id)
      .filter((id): id is string => Boolean(id)),
  );
  // No recipes configured for this menu: there is nothing to write, and the
  // caller falls back to the order total.
  if (menuItemIds.size === 0) return [];

  const { data: recipeRows } = await supabase
    .from("menu_item_recipes")
    .select("menu_item_id,ingredient_id,quantity")
    .eq("restaurant_id", restaurantId);
  const recipes = (recipeRows ?? []) as {
    menu_item_id: string;
    ingredient_id: string;
    quantity: number;
  }[];
  if (recipes.length === 0) return [];

  const usage = new Map<string, number>();
  for (const it of orderItems) {
    if (!it.menu_item_id || !menuItemIds.has(it.menu_item_id)) continue;
    const qty = Number(it.quantity) || 0;
    if (qty <= 0) continue;
    for (const r of recipes) {
      if (r.menu_item_id !== it.menu_item_id) continue;
      const per = Number(r.quantity) || 0;
      if (per <= 0) continue;
      usage.set(r.ingredient_id, (usage.get(r.ingredient_id) ?? 0) + per * qty);
    }
  }
  if (usage.size === 0) return [];

  const ingredientIds = [...usage.keys()];
  const { data: ingRows } = await supabase
    .from("ingredients")
    .select("id,name,unit,cost_per_unit")
    .in("id", ingredientIds);
  const ingredients = new Map(
    (
      (ingRows ?? []) as {
        id: string;
        name: string;
        unit: string;
        cost_per_unit: number;
      }[]
    ).map((i) => [i.id, i]),
  );

  const result: OrderIngredientUsage[] = [];
  for (const [ingredientId, rawQty] of usage) {
    // Skip rows whose ingredient no longer exists: `/ops/waste` joins
    // `ingredients` to render a name, and a dangling FK would show blank.
    const ing = ingredients.get(ingredientId);
    if (!ing) continue;
    const quantity = Math.round(rawQty * 1000) / 1000;
    if (quantity <= 0) continue;
    result.push({
      ingredient_id: ingredientId,
      name: ing.name ?? "",
      unit: ing.unit ?? "",
      quantity,
      cost: Math.round(quantity * (Number(ing.cost_per_unit) || 0)),
    });
  }
  return result;
}
