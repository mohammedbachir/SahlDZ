import { createServerFn } from "@tanstack/react-start";
import { getRequestHeader } from "@tanstack/react-start/server";
import { supabase } from "@/integrations/supabase/client";
import { getFirebaseDb } from "@/integrations/firebase/config";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  updateDoc,
  where,
} from "firebase/firestore";
import { resolveStaffFromToken } from "@/lib/staff-core";
import { normalizeRoleLabel, ROLE_KITCHEN } from "@/lib/staff-permissions";
import { requireRestaurantId } from "@/lib/server-staff-auth";
import { resolveKitchenId } from "@/lib/kitchens";
import {
  CancelOrderError,
  isCancellableStatus,
  cancellationGeneratesWaste,
  normalizeCancelReason,
  wasteReasonForCancelReason,
  resolveOrderIngredientUsage,
  type CancelActor,
  type CancelOrderResult,
} from "@/lib/order-cancel";

type OrderRow = {
  restaurant_id?: string;
  status?: string;
  total?: number;
  daily_number?: number | null;
  order_type?: string | null;
  customer_name?: string | null;
  created_at?: string;
  table_id?: string | null;
};

async function assertKitchenOwnsOrder(
  orderId: string,
  kitchenId: string,
): Promise<void> {
  const db = getFirebaseDb();
  if (!db) return;
  const itemsSnap = await getDocs(
    query(collection(db, "order_items"), where("order_id", "==", orderId)),
  );
  const owns = itemsSnap.docs.some(
    (d) =>
      resolveKitchenId((d.data() as { kitchen_id?: unknown }).kitchen_id) ===
      kitchenId,
  );
  if (!owns)
    throw new CancelOrderError("هذه الطلبية لا تحتوي أصنافاً خاصة بمطبخك");
}

/**
 * DB logic: void an order and write the audit trail.
 *
 * The reason is mandatory. Which log it lands in depends on the stage the
 * order was in when it was voided:
 *
 *   ready / served → `waste_logs`, one row per consumed ingredient, so the
 *                    owner sees the real food cost.
 *   new / preparing → `order_cancellations`, reported on the staff-performance
 *                      screen as a staff-time loss.
 *
 * `order_cancellations` is written in both cases; `generated_waste` keeps the
 * two branches distinguishable afterwards.
 *
 * Stock is deliberately NOT restored: the order already reached `preparing`,
 * so `decrementStockForOrder` has run and the chef may have already cut the
 * ingredients. Rewinding stock on a void would let anyone inflate inventory.
 */
export async function cancelOrderCore(input: {
  restaurantId: string;
  orderId: string;
  reason: string;
  reasonOther?: string | null;
  actor: CancelActor;
  kitchenId?: string | null;
}): Promise<CancelOrderResult> {
  const db = getFirebaseDb();
  if (!db) throw new CancelOrderError("Firebase غير متصل");

  const { restaurantId, orderId, actor } = input;
  const { reason, reasonOther } = normalizeCancelReason(
    input.reason,
    input.reasonOther,
  );

  const orderRef = doc(db, "orders", orderId);
  const snap = await getDoc(orderRef);
  if (!snap.exists()) throw new CancelOrderError("الطلبية غير موجودة");
  const order = snap.data() as OrderRow;
  if (order.restaurant_id !== restaurantId)
    throw new CancelOrderError("طلبية مملوكة لمطعم آخر");

  const cancelledFrom = String(order.status ?? "");
  if (cancelledFrom === "cancelled")
    throw new CancelOrderError("الطلبية ملغاة مسبقاً");
  if (!isCancellableStatus(cancelledFrom))
    throw new CancelOrderError(
      `لا يمكن إلغاء طلبية في حالة "${cancelledFrom}"`,
    );

  // A kitchen terminal may only void orders carrying one of its own lines.
  if (input.kitchenId)
    await assertKitchenOwnsOrder(orderId, resolveKitchenId(input.kitchenId));

  const now = new Date().toISOString();
  const generatesWaste = cancellationGeneratesWaste(cancelledFrom);
  const usage = await resolveOrderIngredientUsage(restaurantId, orderId);
  const estimatedCost = usage.reduce((s, u) => s + u.cost, 0);

  // 1. Flip the order itself. Done first so the order leaves every active
  //    list immediately, even if a downstream write below fails.
  await updateDoc(orderRef, {
    status: "cancelled",
    cancelled_at: now,
    cancelled_from_status: cancelledFrom,
    cancel_reason: reason,
    cancel_reason_other: reasonOther,
    cancelled_by: actor.id,
    cancelled_by_name: actor.name,
    cancelled_by_role: actor.role,
  });

  // 2. Waste rows for a finished dish. `reason` is the waste vocabulary the
  //    waste screen filters on; the original reason is kept verbatim in
  //    `reason_other` so nothing is lost in translation.
  let wasteRows = 0;
  if (generatesWaste && usage.length > 0) {
    const wasteReason = wasteReasonForCancelReason(reason);
    const rows = usage.map((u) => ({
      restaurant_id: restaurantId,
      ingredient_id: u.ingredient_id,
      quantity: u.quantity,
      reason: wasteReason,
      reason_other:
        reason === "other"
          ? reasonOther
          : `طلبية ملغاة: ${reasonOther ?? reason}`,
      logged_by: actor.name,
      cost: u.cost,
      created_at: now,
      order_id: orderId,
      source: "order_cancelled",
    }));
    const { error } = await supabase.from("waste_logs").insert(rows);
    if (error) throw new CancelOrderError(`فشل تسجيل الهدر: ${error.message}`);
    wasteRows = rows.length;
  }

  // 3. The audit row, always written.
  const { error: auditErr } = await supabase
    .from("order_cancellations")
    .insert({
      restaurant_id: restaurantId,
      order_id: orderId,
      daily_number: order.daily_number ?? null,
      order_type: order.order_type ?? null,
      total: Number(order.total ?? 0),
      cancelled_from_status: cancelledFrom,
      reason,
      reason_other: reasonOther,
      staff_id: actor.id,
      staff_name: actor.name,
      staff_role: actor.role,
      generated_waste: generatesWaste,
      estimated_cost: estimatedCost,
      waste_rows: wasteRows,
      created_at: now,
    });
  if (auditErr)
    throw new CancelOrderError(`فشل تسجيل الإلغاء: ${auditErr.message}`);

  return {
    ok: true,
    orderId,
    cancelledFrom,
    loggedTo: generatesWaste ? "waste" : "performance",
    wasteRows,
    estimatedCost,
  };
}

/** Staff terminals (cashier, kitchen): authenticated by a signed staff token. */
export const cancelOrderByStaff = createServerFn({ method: "POST" })
  .validator(
    (d: {
      token: string;
      orderId: string;
      reason: string;
      reasonOther?: string | null;
    }) => d,
  )
  .handler(async ({ data }) => {
    const { token, orderId, reason, reasonOther } = data as {
      token: string;
      orderId: string;
      reason: string;
      reasonOther?: string | null;
    };
    const { staffRow, restaurantId } = await resolveStaffFromToken(token);
    // Scope is decided server-side from the account's role, never from the
    // client: only a kitchen terminal is restricted to its own station, so a
    // cashier (who may also hold a `kitchen_id`) can still void any order.
    const isKitchenTerminal =
      normalizeRoleLabel((staffRow as { role?: unknown }).role) ===
      ROLE_KITCHEN;
    return cancelOrderCore({
      restaurantId,
      orderId,
      reason,
      reasonOther,
      actor: {
        id: staffRow.id as string,
        name: (staffRow.name as string) ?? "",
        role: (staffRow.role as string) ?? null,
      },
      kitchenId: isKitchenTerminal
        ? resolveKitchenId((staffRow as { kitchen_id?: unknown }).kitchen_id)
        : null,
    });
  });

/** Manager surfaces (dashboard): authenticated by a Firebase ID token. */
export const cancelOrderByManager = createServerFn({ method: "POST" })
  .validator(
    (d: { orderId: string; reason: string; reasonOther?: string | null }) => d,
  )
  .handler(async ({ data }) => {
    const restaurantId = await requireRestaurantId(
      getRequestHeader("authorization"),
    );
    const { orderId, reason, reasonOther } = data as {
      orderId: string;
      reason: string;
      reasonOther?: string | null;
    };
    // The manager is not a `staff` row, so attribution comes from the signed-in
    // account rather than a staff id.
    return cancelOrderCore({
      restaurantId,
      orderId,
      reason,
      reasonOther,
      actor: { id: null, name: "المدير", role: "manager" },
    });
  });
