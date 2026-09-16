import { isPreviewToken, previewExpiry } from "@/lib/preview-mode";
import { isStaffTokenActive } from "@/lib/kiosk-session";
import { hmacSign, STAFF_SESSION_TTL_MS } from "@/lib/staff-core";
import {
  grantedInterfaces,
  allowedStaffPaths,
  type StaffPermission,
} from "@/lib/staff-permissions";

/**
 * Unified staff session for the desktop entry flow.
 *
 * Instead of three separate role sessions (waiter / chef / cashier) the
 * employee signs in once with activation code → name → PIN, and a single
 * session (<code>staff_token</code>) carries the full permission set.
 *
 * For backward compatibility with the existing per-role screens, the legacy
 * KIOSK_ROLES keys (:code:`*_token` / :code:`*_expires` / …) are mirrored so
 * <code>/kitchen-screen</code>, <code>/waiter-screen</code> and
 * <code>/cashier</code> keep working untouched.
 */

export type UnifiedStaffSession = {
  token: string;
  expiresAt: string;
  staffId: string;
  staffName: string;
  restaurant: { id: string; name: string; logo_url: string | null };
  permissions: string[];
};

const SESSION_KEY = "staff_token";
const EXPIRES_KEY = "staff_expires";
const NAME_KEY = "staff_name";
const ID_KEY = "staff_id";
const RESTAURANT_KEY = "staff_restaurant";
const PERMISSIONS_KEY = "staff_permissions";
const LAST_OPEN_TAB_KEY = "staff_last_open_tab";

// Per-role legacy keys mirrored on save so existing screens still work.
// First permission wins when multiple interfaces are granted (staff member
// is welcome on any of their screens).
type LegacyKeys = {
  token: string;
  expires: string;
  name: string;
  id: string;
  restaurant: string;
  screenPath: string;
};

const LEGACY_KEYS: Record<"kitchen" | "waiter" | "cashier", LegacyKeys> = {
  kitchen: {
    token: "individual_chef_token",
    expires: "individual_chef_expires",
    name: "individual_chef_name",
    id: "individual_chef_id",
    restaurant: "individual_chef_restaurant",
    screenPath: "/kitchen-screen",
  },
  waiter: {
    token: "waiter_token",
    expires: "waiter_expires",
    name: "waiter_name",
    id: "waiter_id",
    restaurant: "waiter_restaurant",
    screenPath: "/waiter-screen",
  },
  cashier: {
    token: "cashier_token",
    expires: "cashier_expires",
    name: "cashier_name",
    id: "cashier_id",
    restaurant: "cashier_restaurant",
    screenPath: "/cashier",
  },
};

function read(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function write(key: string, value: string): void {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    /* ignore */
  }
}

function remove(key: string): void {
  try {
    window.localStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}

/** Mint a legacy cashier token (`csh.*`) from the restaurant id. */
async function mintCashierToken(
  restaurantId: string,
): Promise<{ token: string; expiresIso: string }> {
  const expiresAt = Date.now() + STAFF_SESSION_TTL_MS;
  const payload = `csh.${restaurantId}.${expiresAt}`;
  const sig = await hmacSign(payload);
  return {
    token: `${payload}.${sig}`,
    expiresIso: new Date(expiresAt).toISOString(),
  };
}

/** Persist a unified session and mirror the legacy per-role keys. */
export async function saveUnifiedStaffSession(
  s: UnifiedStaffSession,
): Promise<void> {
  write(SESSION_KEY, s.token);
  write(EXPIRES_KEY, s.expiresAt);
  write(NAME_KEY, s.staffName);
  write(ID_KEY, s.staffId);
  write(RESTAURANT_KEY, JSON.stringify(s.restaurant));
  write(PERMISSIONS_KEY, JSON.stringify(s.permissions));

  const interfaces = grantedInterfaces(s.permissions);
  let cashierToken: { token: string; expiresIso: string } | null = null;
  if (interfaces.includes("cashier") && s.restaurant?.id) {
    cashierToken = await mintCashierToken(s.restaurant.id);
  }
  for (const id of interfaces) {
    const k = LEGACY_KEYS[id];
    if (!k) continue;
    write(
      k.token,
      id === "cashier" && cashierToken ? cashierToken.token : s.token,
    );
    write(
      k.expires,
      id === "cashier" && cashierToken ? cashierToken.expiresIso : s.expiresAt,
    );
    write(k.name, s.staffName);
    write(k.id, s.staffId);
    write(k.restaurant, JSON.stringify(s.restaurant));
  }
}

/** Preview-safe session writer (used on the login page without a backend). */
export async function savePreviewUnifiedSession(input: {
  token: string;
  staffId: string;
  staffName: string;
  permissions: StaffPermission[];
}): Promise<void> {
  const restaurant = {
    id: "mock-restaurant-id",
    name: "مطعم السهل",
    logo_url: null,
  };
  await saveUnifiedStaffSession({
    token: input.token,
    expiresAt: previewExpiry(),
    staffId: input.staffId,
    staffName: input.staffName,
    restaurant,
    permissions: input.permissions,
  });
}

/** The active unified session, or null when absent/expired. */
export function loadUnifiedStaffSession(): UnifiedStaffSession | null {
  const token = read(SESSION_KEY);
  const expiresAt = read(EXPIRES_KEY);
  if (!token || !expiresAt) return null;
  if (!isStaffTokenActive(token, expiresAt)) return null;
  try {
    const parsedRestaurant = JSON.parse(read(RESTAURANT_KEY) ?? "null") as {
      id?: string;
      name?: string;
      logo_url?: string | null;
    } | null;
    const restaurant = {
      id: parsedRestaurant?.id ?? "",
      name: parsedRestaurant?.name ?? "",
      logo_url: parsedRestaurant?.logo_url ?? null,
    };
    const permissions = JSON.parse(read(PERMISSIONS_KEY) ?? "[]") as string[];
    return {
      token,
      expiresAt,
      staffId: read(ID_KEY) ?? "",
      staffName: read(NAME_KEY) ?? "",
      restaurant,
      permissions: permissions.filter((p): p is StaffPermission => !!p),
    };
  } catch {
    return null;
  }
}

/** True when any valid unified session exists on this machine. */
export function hasUnifiedStaffSession(): boolean {
  return loadUnifiedStaffSession() !== null;
}

/** True once a unified session has been started here, even if it expired,
 * so screen bounces land back on the unified login page. */
export function hasUnifiedStaffSessionEver(): boolean {
  return read(SESSION_KEY) !== null || read(EXPIRES_KEY) !== null;
}

/** Where a screen should send the staff member after a failed session check:
 * the unified login when a unified session was ever started here, otherwise
 * the legacy per-role login. */
export function staffLoginFailPath(
  rid: string,
  legacy: string,
): { to: string; search: { rid: string } } {
  return {
    to: hasUnifiedStaffSessionEver() ? "/staff-login" : legacy,
    search: { rid },
  };
}

/** Screens the employee may open, derived from the unified session. */
export function unifiedAllowedPaths(): string[] {
  const s = loadUnifiedStaffSession();
  if (!s) return [];
  return allowedStaffPaths(s.permissions);
}

/** Preview compatibility: a mock token is active too. */
export function hasActivePreviewStaffSession(): boolean {
  const token = read(individualChefTokenKey());
  if (!isPreviewToken(token)) return false;
  return true;
}

function individualChefTokenKey(): string {
  return LEGACY_KEYS.kitchen.token;
}

/** Remember the last tab opened so a kiosk boots there next time. */
export function rememberOpenTab(path: string): void {
  write(LAST_OPEN_TAB_KEY, path);
}

export function lastOpenTab(): string | null {
  const path = read(LAST_OPEN_TAB_KEY);
  return path && path.startsWith("/") ? path : null;
}

/** Drop every staff session key (unified + legacy). */
export function clearAllStaffSessions(): void {
  remove(SESSION_KEY);
  remove(EXPIRES_KEY);
  remove(NAME_KEY);
  remove(ID_KEY);
  remove(RESTAURANT_KEY);
  remove(PERMISSIONS_KEY);
  remove(LAST_OPEN_TAB_KEY);
  for (const k of Object.values(LEGACY_KEYS)) {
    remove(k.token);
    remove(k.expires);
    remove(k.name);
    remove(k.id);
    remove(k.restaurant);
  }
}
