import { useEffect, useRef } from "react";
import { useServerFn } from "@tanstack/react-start";
import { getStaffSessionInfo } from "@/lib/staff-session.functions";
import {
  clearAllStaffSessions,
  loadUnifiedStaffSession,
  updateUnifiedStaffPermissions,
} from "@/lib/staff-session";
import { isPreviewToken } from "@/lib/preview-mode";

function samePermissions(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  const set = new Set(a);
  return b.every((p) => set.has(p));
}

/**
 * Reconciles the cached staff session with the server on app start:
 * - refreshes permissions in place when they changed (auto-show new screens),
 * - drops the session (and returns to the staff login) when the account was
 *   deleted, frozen, or the token became invalid.
 *
 * No-op for owners (Firebase Auth) and preview tokens.
 */
export function StaffSessionSync() {
  const refresh = useServerFn(getStaffSessionInfo);
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;
    (async () => {
      const session = loadUnifiedStaffSession();
      if (!session || isPreviewToken(session.token)) return;
      try {
        const info = await refresh({ data: { token: session.token } });
        if (!info.ok) {
          if (info.revoked) {
            clearAllStaffSessions();
            if (typeof window !== "undefined")
              window.location.assign("/staff-login");
          }
          return;
        }
        if (info.frozen) {
          clearAllStaffSessions();
          if (typeof window !== "undefined")
            window.location.assign("/staff-login");
          return;
        }
        if (!samePermissions(session.permissions, info.permissions)) {
          await updateUnifiedStaffPermissions(info.permissions);
          if (typeof window !== "undefined") window.location.reload();
        }
      } catch {
        /* offline / transient — keep the cached session */
      }
    })();
  }, [refresh]);

  return null;
}
