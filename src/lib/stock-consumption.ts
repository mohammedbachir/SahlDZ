import { supabase } from "@/integrations/supabase/client";
import { getFirebaseDb } from "@/integrations/firebase/config";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { sendLowStockAlert } from "@/lib/ops-alerts.functions";

type OrderRow = {
  id: string;
  restaurant_id: string;
  stock_decremented?: boolean;
};
type OrderItem = { menu_item_id: string | null; quantity: number };
type RecipeRow = {
  menu_item_id: string;
  ingredient_id: string;
  quantity: number;
};
type IngredientRow = {
  id: string;
  current_stock: number;
  alert_threshold: number;
};

async function markDecremented(orderId: string) {
  const db = getFirebaseDb();
  if (!db) return;
  await updateDoc(doc(db, "orders", orderId), { stock_decremented: true });
}

/**
 * ينقص من المخزون كمية المكونات المستهلكة حسب الوصفات (menu_item_recipes)
 * عند دخول الطلب حالة "قيد التحضير" (preparing).
 * العملية idempotent: تتفقد علماً stock_decremented على الطلب لمنع الخصم المزدوج.
 */
export async function decrementStockForOrder(orderId: string) {
  const db = getFirebaseDb();
  if (!db) return { skipped: true, reason: "no-db" };

  const orderSnap = await getDoc(doc(db, "orders", orderId));
  if (!orderSnap.exists()) return { skipped: true, reason: "no-order" };
  const ord = orderSnap.data() as OrderRow;
  if (!ord.restaurant_id) return { skipped: true, reason: "no-order" };
  if (ord.stock_decremented) return { skipped: true, reason: "already-decremented" };

  const restaurantId = ord.restaurant_id;

  const { data: items } = await supabase
    .from("order_items")
    .select("menu_item_id, quantity")
    .eq("order_id", orderId);
  const orderItems = (items as OrderItem[]) ?? [];
  const menuItemIds = new Set(
    orderItems
      .map((i) => i.menu_item_id)
      .filter((id): id is string => Boolean(id)),
  );
  if (menuItemIds.size === 0) {
    await markDecremented(orderId);
    return { skipped: true, reason: "no-items" };
  }

  const { data: recipes } = await supabase
    .from("menu_item_recipes")
    .select("menu_item_id, ingredient_id, quantity")
    .eq("restaurant_id", restaurantId);
  const recipeRows = (recipes as RecipeRow[]) ?? [];
  if (recipeRows.length === 0) {
    await markDecremented(orderId);
    return { skipped: true, reason: "no-recipes" };
  }

  const consumption = new Map<string, number>();
  for (const it of orderItems) {
    if (!it.menu_item_id || !menuItemIds.has(it.menu_item_id)) continue;
    const qty = Number(it.quantity) || 0;
    for (const r of recipeRows) {
      if (r.menu_item_id === it.menu_item_id) {
        consumption.set(
          r.ingredient_id,
          (consumption.get(r.ingredient_id) ?? 0) +
            (Number(r.quantity) || 0) * qty,
        );
      }
    }
  }

  let ingredientsDecremented = 0;
  const lowStockIds: string[] = [];
  for (const [ingredientId, used] of consumption) {
    const ingSnap = await getDoc(doc(db, "ingredients", ingredientId));
    if (!ingSnap.exists()) continue;
    const row = ingSnap.data() as IngredientRow;
    const newStock = Math.max(0, Number(row.current_stock) - used);
    await updateDoc(doc(db, "ingredients", ingredientId), { current_stock: newStock });
    ingredientsDecremented++;
    if (newStock < Number(row.alert_threshold)) {
      lowStockIds.push(ingredientId);
    }
  }

  await markDecremented(orderId);

  for (const id of lowStockIds) {
    void sendLowStockAlert(restaurantId, id);
  }

  return {
    ok: true,
    ingredients: ingredientsDecremented,
    lowStock: lowStockIds.length,
  };
}
