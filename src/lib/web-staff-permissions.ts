import { supabase } from "@/integrations/supabase/client";
import { effectiveStaffPermissions } from "@/lib/staff-core";
import {
  grantedOpsAreas,
  type StaffPermission,
} from "@/lib/staff-permissions";

/**
 * Web (Firebase Auth) staff permission resolution.
 *
 * Employees created from the manager UI are stored in the `staff` collection
 * with the granted permission list. When such an employee signs in from the
 * website instead of the desktop kiosk, the permissions must be read back from
 * that document and applied to the operations navigation — the kiosk HMAC
 * session is not present on the web.
 */
export type WebStaffAccess = {
  staffId: string;
  restaurantId: string;
  permissions: StaffPermission[];
  /** True when at least one operations area (not just an interface screen) is granted. */
  hasOpsArea: boolean;
  frozen: boolean;
};

/** Result of a web staff lookup — distinguishes "no doc" from a transient failure. */
export type WebStaffAccessResult =
  | { ok: true; access: WebStaffAccess | null }
  | { ok: false };

/** Load the staff document for a signed-in web user (by `user_id`, then `email`). */
export async function fetchWebStaffAccess(
  uid: string,
  email: string | null | undefined,
): Promise<WebStaffAccessResult> {
  if (!uid) return { ok: true, access: null };

  let row: Record<string, any> | null = null;
  try {
    const byUser = await supabase
      .from("staff")
      .select("*")
      .eq("user_id", uid)
      .maybeSingle();
    row = (byUser as any)?.data ?? null;
    if (!row && email) {
      const byEmail = await supabase
        .from("staff")
        .select("*")
        .eq("email", email.toLowerCase())
        .maybeSingle();
      row = (byEmail as any)?.data ?? null;
    }
  } catch {
    return { ok: false };
  }

  if (!row) return { ok: true, access: null };

  const permissions = effectiveStaffPermissions(row) as StaffPermission[];
  return {
    ok: true,
    access: {
      staffId: String(row.id ?? ""),
      restaurantId: String(row.restaurant_id ?? ""),
      permissions,
      hasOpsArea: grantedOpsAreas(permissions).length > 0,
      frozen: !!row.frozen,
    },
  };
}
