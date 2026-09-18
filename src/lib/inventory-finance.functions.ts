import { supabase } from "@/integrations/supabase/client";

export const DEFAULT_SUPPLIER_MARKER = "مشتريات يدوية";

/**
 * Finds (or creates) the default manual-purchase supplier for a restaurant.
 * Used so manual stock additions always produce a finance record.
 */
export async function ensureDefaultSupplier(
  restaurantId: string,
): Promise<string | null> {
  const { data: existing, error: findErr } = await supabase
    .from("suppliers")
    .select("id")
    .eq("restaurant_id", restaurantId)
    .eq("name", DEFAULT_SUPPLIER_MARKER)
    .maybeSingle();

  if (findErr) return null;
  if (existing) return existing.id;

  const { data: created, error: createErr } = await supabase
    .from("suppliers")
    .insert({ restaurant_id: restaurantId, name: DEFAULT_SUPPLIER_MARKER })
    .select("id")
    .single();

  if (createErr || !created) return null;
  return created.id;
}

export type InventoryPurchasePayload = {
  restaurantId: string;
  supplierId?: string | null;
  ingredientName: string;
  unit: string;
  quantity: number;
  costPerUnit: number;
  note?: string;
};

/**
 * Records a stock addition as a finance purchase:
 *  - creates a purchase_orders row
 *  - when a supplier is known, writes a supplier_transactions "purchase" entry
 * Returns the recorded total (0 when there is nothing to record).
 */
export async function recordInventoryPurchase(
  payload: InventoryPurchasePayload,
): Promise<{ ok: boolean; total: number; error?: string }> {
  const total = Math.round(payload.quantity * payload.costPerUnit * 100) / 100;
  if (total <= 0) return { ok: true, total: 0 };

  const supplierId =
    payload.supplierId ?? (await ensureDefaultSupplier(payload.restaurantId));
  const notes = [
    `${payload.ingredientName} ×${payload.quantity} ${payload.unit}`,
    payload.note?.trim(),
  ]
    .filter(Boolean)
    .join(" — ");

  const { data: po, error: poErr } = await supabase
    .from("purchase_orders")
    .insert({
      restaurant_id: payload.restaurantId,
      supplier_id: supplierId,
      total,
      notes,
    })
    .select("id")
    .single();

  if (poErr || !po) {
    return {
      ok: false,
      total: 0,
      error: poErr?.message ?? "فشل إنشاء فاتورة المورد",
    };
  }

  if (supplierId) {
    const { error: txErr } = await supabase
      .from("supplier_transactions")
      .insert({
        restaurant_id: payload.restaurantId,
        supplier_id: supplierId,
        type: "purchase",
        amount: total,
        date: new Date().toISOString().slice(0, 10),
        notes: `${notes} — #${po.id.slice(0, 8)}`,
      });
    if (txErr) {
      return { ok: false, total, error: txErr.message };
    }
  }

  return { ok: true, total };
}
