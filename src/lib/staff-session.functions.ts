import { createServerFn } from "@tanstack/react-start";
import { getFirebaseDb } from "@/integrations/firebase/config";
import { resolveStaffFromToken } from "@/lib/staff-core";

/**
 * Live staff-session snapshot used to keep a 365-day kiosk session's cached
 * permissions in sync with the server (issue: newly granted permissions never
 * showed up until re-login).
 *
 * - ok:true  → the account still exists; `frozen` flags a disabled account.
 * - ok:false → the session cannot be trusted. `revoked:true` means the account
 *   was deleted or the token is invalid/expired (force re-login). `revoked:false`
 *   means a transient/configuration problem (keep the cached session).
 */
export type StaffSessionInfo =
  | {
      ok: true;
      staffId: string;
      restaurantId: string;
      name: string;
      role: string;
      frozen: boolean;
      permissions: string[];
    }
  | { ok: false; revoked: boolean; reason: string };

export async function getStaffSessionInfoCore(
  token: string,
): Promise<StaffSessionInfo> {
  if (!getFirebaseDb())
    return { ok: false, revoked: false, reason: "no-backend" };
  try {
    const { staffRow, restaurantId, staffId, permissions } =
      await resolveStaffFromToken(token);
    return {
      ok: true,
      staffId,
      restaurantId,
      name: (staffRow.name as string) ?? "",
      role: (staffRow.role as string) ?? "",
      frozen: staffRow.frozen === true,
      permissions,
    };
  } catch (e) {
    const msg = (e as Error).message ?? "";
    const revoked = /منتهية|غير موجود/.test(msg);
    return { ok: false, revoked, reason: msg };
  }
}

export const getStaffSessionInfo = createServerFn({ method: "GET" })
  .validator((d: { token: string }) => d)
  .handler(async ({ data }) =>
    getStaffSessionInfoCore((data as { token: string }).token),
  );
