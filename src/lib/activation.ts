import { supabase } from "@/integrations/supabase/client";
import { getFirebaseDb } from "@/integrations/firebase/config";

/**
 * Generate a unique activation code for a restaurant.
 * Format: REST-XXXX-XXXX (8 chars alphanumeric)
 */
export function generateActivationCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // No I/O/0/1 to avoid confusion
  let code = "REST-";
  for (let i = 0; i < 4; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  code += "-";
  for (let i = 0; i < 4; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

/**
 * Verify an activation code and return restaurant info.
 */
export async function verifyActivationCode(
  code: string
): Promise<{ valid: boolean; restaurantId?: string; restaurantName?: string }> {
  if (!getFirebaseDb()) {
    return { valid: false };
  }

  try {
    const { data } = await supabase
      .from("restaurants")
      .select("id, name")
      .eq("activation_code", code.toUpperCase())
      .maybeSingle();

    if (data?.id) {
      return {
        valid: true,
        restaurantId: data.id,
        restaurantName: data.name as string,
      };
    }
    return { valid: false };
  } catch {
    return { valid: false };
  }
}

/**
 * Activate a restaurant with owner credentials.
 */
export async function activateRestaurant(
  code: string,
  email: string,
  password: string
): Promise<{ success: boolean; error?: string; config?: any }> {
  if (!getFirebaseDb()) {
    return { success: false, error: "Firebase غير مُعد" };
  }

  try {
    // 1. Verify activation code
    const verification = await verifyActivationCode(code);
    if (!verification.valid) {
      return { success: false, error: "كود التفعيل غير صحيح" };
    }

    // 2. Sign in with Firebase Auth
    const { signInWithEmailAndPassword } = await import("firebase/auth");
    const { getFirebaseAuth } = await import("@/integrations/firebase/config");
    const auth = getFirebaseAuth();
    if (!auth) {
      return { success: false, error: "خطأ في الاتصال" };
    }

    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // 3. Verify user owns this restaurant
    const { data: restaurant } = await supabase
      .from("restaurants")
      .select("id, name, owner_id")
      .eq("id", verification.restaurantId)
      .maybeSingle();

    if (!restaurant || restaurant.owner_id !== user.uid) {
      return { success: false, error: "هذا الكود لا ينتمي لحسابك" };
    }

    // 4. Return config
    return {
      success: true,
      config: {
        restaurant_id: verification.restaurantId,
        restaurant_name: verification.restaurantName,
        activation_code: code.toUpperCase(),
        owner_uid: user.uid,
        role: "owner",
        activated_at: new Date().toISOString(),
      },
    };
  } catch (e: any) {
    return { success: false, error: e.message || "خطأ غير متوقع" };
  }
}

/**
 * Activate a staff member with their credentials.
 */
export async function activateStaff(
  code: string,
  staffId: string,
  pin: string
): Promise<{ success: boolean; error?: string; config?: any }> {
  if (!getFirebaseDb()) {
    return { success: false, error: "Firebase غير مُعد" };
  }

  try {
    // 1. Verify activation code
    const verification = await verifyActivationCode(code);
    if (!verification.valid) {
      return { success: false, error: "كود التفعيل غير صحيح" };
    }

    // 2. Find staff member
    const { data: staff } = await supabase
      .from("staff")
      .select("id, name, role, pin, restaurant_id, frozen")
      .eq("id", staffId)
      .eq("restaurant_id", verification.restaurantId)
      .maybeSingle();

    if (!staff) {
      return { success: false, error: "رقم الموظف غير صحيح" };
    }

    if (staff.frozen) {
      return { success: false, error: "تم تجميد حسابك" };
    }

    if (staff.pin !== pin) {
      return { success: false, error: "رقم PIN غير صحيح" };
    }

    // 3. Return config
    return {
      success: true,
      config: {
        restaurant_id: verification.restaurantId,
        restaurant_name: verification.restaurantName,
        activation_code: code.toUpperCase(),
        staff_id: staffId,
        staff_name: staff.name,
        role: staff.role,
        activated_at: new Date().toISOString(),
      },
    };
  } catch (e: any) {
    return { success: false, error: e.message || "خطأ غير متوقع" };
  }
}

/**
 * Save activation config to localStorage (for desktop app).
 */
export function saveActivationConfig(config: any): void {
  localStorage.setItem("sahldz_config", JSON.stringify(config));
}

/**
 * Load activation config from localStorage.
 */
export function loadActivationConfig(): any | null {
  try {
    const raw = localStorage.getItem("sahldz_config");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/**
 * Clear activation config (logout).
 */
export function clearActivationConfig(): void {
  localStorage.removeItem("sahldz_config");
}
