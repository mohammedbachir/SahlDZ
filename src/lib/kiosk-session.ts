import { isPreviewToken } from "@/lib/preview-mode";
import { allowedStaffPaths } from "@/lib/staff-permissions";

/**
 * Kiosk mode: restaurant computers boot straight into the last staff session
 * (waiter / kitchen / cashier) without logging in again.
 *
 * Sessions are stored in `localStorage` so they survive browser & system
 * restarts. Tokens are signed server-side (`stf.*` / `csh.*`) with a long TTL;
 * login pages write them here via the `*_token` / `*_expires` keys.
 */

export const KIOSK_ROLES = [
  {
    role: "waiter",
    tokenKey: "waiter_token",
    expiresKey: "waiter_expires",
    screenPath: "/waiter-screen",
    loginPath: "/waiter-login",
  },
  {
    role: "chef",
    tokenKey: "individual_chef_token",
    expiresKey: "individual_chef_expires",
    screenPath: "/kitchen-screen",
    loginPath: "/kitchen-login",
  },
  {
    role: "cashier",
    tokenKey: "cashier_token",
    expiresKey: "cashier_expires",
    screenPath: "/cashier",
    loginPath: "/cashier-login",
  },
] as const;

export type KioskRole = (typeof KIOSK_ROLES)[number]["role"];

const LAST_ROLE_KEY = "kiosk_last_role";

function read(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

/** True when the stored token is present and has not expired. */
export function isStaffTokenActive(
  token: string | null,
  expiresIso: string | null,
): boolean {
  if (!token) return false;
  if (isPreviewToken(token)) {
    return !!expiresIso && new Date(expiresIso).getTime() > Date.now();
  }
  if (!token.startsWith("stf.") && !token.startsWith("csh.")) return false;
  const exp = Number(token.split(".")[2]);
  return Number.isFinite(exp) && exp > Date.now();
}

/** Roles that currently have a valid session on this computer. */
export function listActiveStaffSessions(): KioskRole[] {
  const active: KioskRole[] = [];
  for (const r of KIOSK_ROLES) {
    if (isStaffTokenActive(read(r.tokenKey), read(r.expiresKey))) {
      active.push(r.role);
    }
  }
  return active;
}

/** The role screen to open automatically, or null when nothing is logged in. */
export function getAutoScreenPath(): string | null {
  const active = listActiveStaffSessions();
  if (active.length === 0) return null;
  if (active.length === 1) {
    const r = KIOSK_ROLES.find((x) => x.role === active[0]);
    return r ? r.screenPath : null;
  }
  const last = read(LAST_ROLE_KEY);
  const lastRole = KIOSK_ROLES.find(
    (x) => x.role === (last as KioskRole) && active.includes(x.role),
  );
  if (lastRole) return lastRole.screenPath;
  const first = KIOSK_ROLES.find((x) => x.role === active[0]);
  return first ? first.screenPath : null;
}

/**
 * Auto-open for the unified staff session: the first allowed screen
 * (interface or operations area), or the tab remembered via the unified
 * session, else null.
 */
export function getUnifiedAutoScreenPath(): string | null {
  const token = read("staff_token");
  const expires = read("staff_expires");
  if (!isStaffTokenActive(token, expires)) return null;
  try {
    const perms = JSON.parse(read("staff_permissions") ?? "[]") as string[];
    const paths = allowedStaffPaths(perms);
    if (paths.length === 0) return null;
    const last = read("staff_last_open_tab");
    if (last && paths.includes(last)) return last;
    return paths[0];
  } catch {
    return null;
  }
}

/** Remember the most recently used role for multi-session computers. */
export function rememberKioskRole(role: KioskRole): void {
  try {
    window.localStorage.setItem(LAST_ROLE_KEY, role);
  } catch {
    /* ignore */
  }
}

/** Drop the remembered role when its session is cleared. */
export function clearKioskRole(role: KioskRole): void {
  try {
    if (window.localStorage.getItem(LAST_ROLE_KEY) === role) {
      window.localStorage.removeItem(LAST_ROLE_KEY);
    }
  } catch {
    /* ignore */
  }
}
