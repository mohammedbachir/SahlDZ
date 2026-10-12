import { useState, useEffect } from "react";
import { redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { getFirebaseDb } from "@/integrations/firebase/config";
import { requireAuth } from "@/lib/auth";
import {
  canAccessOpsArea,
  canWriteOpsArea,
  allowedOpsAreaPaths,
  allowedStaffPaths,
  type StaffOpsArea,
} from "@/lib/staff-permissions";
import { loadUnifiedStaffSession } from "@/lib/staff-session";
import { fetchWebStaffAccess } from "@/lib/web-staff-permissions";

export type OpsRole =
  | "admin"
  | "staff"
  | "production_manager"
  | "operations_manager"
  | "hr_manager"
  | "purchasing_manager";

export const ROLE_LABELS: Record<OpsRole, string> = {
  admin: "مالك",
  staff: "موظف (وصول محدود)",
  production_manager: "مسؤول الإنتاج",
  operations_manager: "مسؤول التشغيل",
  hr_manager: "مسؤول الموارد البشرية",
  purchasing_manager: "مسؤول المشتريات",
};

export const ROLE_DESCRIPTIONS: Record<OpsRole, string> = {
  admin: "صلاحيات كاملة لكل الأقسام وإعدادات المطعم وحساب المالك",
  staff: "اطّلاع محدود (نظرة عامة، المخزون، التقارير) بدون أي تعديلات",
  production_manager: "يدير المخزون والوصفات وجرد المخزون وسجل الهدر، ويطّلع على الموردين والتقارير",
  operations_manager: "يشرف على سير العمل اليومي بالكامل: المخزون والوصفات والموردين والمصاريف والهدر والشكاوى",
  hr_manager: "يدير الموظفين وأداء الفريق، ويطّلع على نظرة عامة والتقارير",
  purchasing_manager: "يدير الموردين والمشتريات والمخزون والمصاريف المرتبطة بالشراء",
};

export type OpsArea =
  | "overview"
  | "inventory"
  | "inventoryCount"
  | "recipes"
  | "menu"
  | "suppliers"
  | "employees"
  | "staffPerformance"
  | "expenses"
  | "waste"
  | "complaints"
  | "reports"
  | "accounting"
  | "reportArchive";

export const AREA_LABELS: Record<OpsArea, string> = {
  overview: "نظرة عامة",
  inventory: "المخزون",
  inventoryCount: "جرد المخزون",
  recipes: "الوصفات",
  menu: "المنيو والأصناف",
  suppliers: "الموردين",
  employees: "الموظفين",
  staffPerformance: "أداء الموظفين",
  expenses: "المصاريف",
  waste: "سجل الهدر",
  complaints: "الشكاوى",
  reports: "التقارير",
  accounting: "المحاسبة",
  reportArchive: "أرشيف التقارير",
};

export const AREA_PATHS: Record<OpsArea, string> = {
  overview: "/ops",
  inventory: "/ops/inventory",
  inventoryCount: "/ops/inventory-count",
  recipes: "/ops/recipes",
  menu: "/ops/menu",
  suppliers: "/ops/suppliers",
  employees: "/ops/employees",
  staffPerformance: "/ops/staff-performance",
  expenses: "/ops/expenses",
  waste: "/ops/waste",
  complaints: "/ops/complaints",
  reports: "/ops/reports",
  accounting: "/ops/accounting",
  reportArchive: "/ops/report-archive",
};

type AreaAccess = { view: boolean; write?: boolean };

const viewOnly = (): AreaAccess => ({ view: true });
const full = (): AreaAccess => ({ view: true, write: true });

function build(matrix: Record<OpsRole, [OpsArea[], OpsArea[]]>): Record<OpsRole, Record<OpsArea, AreaAccess>> {
  const roles: OpsRole[] = [
    "admin",
    "staff",
    "production_manager",
    "operations_manager",
    "hr_manager",
    "purchasing_manager",
  ];
  const out = {} as Record<OpsRole, Record<OpsArea, AreaAccess>>;
  for (const role of roles) {
    const [canRead, canWrite] = matrix[role];
    const rec = {} as Record<OpsArea, AreaAccess>;
    const allAreas = Object.keys(AREA_LABELS) as OpsArea[];
    for (const area of allAreas) {
      if (canWrite.includes(area)) {
        rec[area] = full();
      } else if (canRead.includes(area)) {
        rec[area] = viewOnly();
      } else {
        rec[area] = { view: false };
      }
    }
    out[role] = rec;
  }
  return out;
}

const ALL: OpsArea[] = Object.keys(AREA_LABELS) as OpsArea[];

// Each entry: [read-only areas, read-write areas] — write areas imply read
export const ROLE_CAPABILITIES: Record<OpsRole, Record<OpsArea, AreaAccess>> = build({
  admin: [ALL, ALL],
  staff: [["overview", "inventory", "reports"], []],
  production_manager: [
    ["overview", "inventory", "inventoryCount", "recipes", "menu", "suppliers", "waste", "staffPerformance", "reports"],
    ["inventory", "inventoryCount", "recipes", "menu", "waste"],
  ],
  operations_manager: [
    ALL,
    ["inventory", "inventoryCount", "recipes", "menu", "suppliers", "expenses", "waste", "complaints"],
  ],
  hr_manager: [
    ["overview", "employees", "staffPerformance", "reports"],
    ["employees", "staffPerformance"],
  ],
  purchasing_manager: [
    ["overview", "inventory", "inventoryCount", "suppliers", "expenses", "reports"],
    ["inventory", "inventoryCount", "suppliers", "expenses"],
  ],
});

export function canViewArea(role: OpsRole, area: OpsArea): boolean {
  const staff = loadUnifiedStaffSession();
  if (staff) return canAccessOpsArea(staff.permissions, area as StaffOpsArea);
  const web = currentWebStaffPermissions();
  if (web) return canAccessOpsArea(web, area as StaffOpsArea);
  return ROLE_CAPABILITIES[role]?.[area]?.view === true;
}

export function canWriteArea(role: OpsRole, area: OpsArea): boolean {
  const staff = loadUnifiedStaffSession();
  if (staff) return canWriteOpsArea(staff.permissions, area as StaffOpsArea);
  const web = currentWebStaffPermissions();
  if (web) return canWriteOpsArea(web, area as StaffOpsArea);
  return ROLE_CAPABILITIES[role]?.[area]?.write === true;
}

// ─── Web (Firebase Auth) staff permission cache ─────────────────
// The kiosk path hydrates `loadUnifiedStaffSession` at login; the web path
// resolves the same `staff.permissions` asynchronously. The resolved set is
// cached (memory + localStorage, keyed by user id) so the synchronous
// `canViewArea` / `canWriteArea` helpers can honour it.
const WEB_PERMS_KEY = "web_staff_permissions";

type WebStaffPermissions = { uid: string; permissions: string[] };

let webPermsCache: WebStaffPermissions | null = null;
let webPermsLoaded = false;

function readWebStaffPermissions(): string[] | null {
  if (!webPermsLoaded) {
    webPermsLoaded = true;
    if (typeof window !== "undefined") {
      try {
        const raw = localStorage.getItem(WEB_PERMS_KEY);
        webPermsCache = raw
          ? (JSON.parse(raw) as WebStaffPermissions)
          : null;
      } catch {
        webPermsCache = null;
      }
    }
  }
  return webPermsCache?.permissions ?? null;
}

/** Synchronous view of the cached web staff permissions, or null. */
export function currentWebStaffPermissions(): string[] | null {
  return readWebStaffPermissions();
}

function setWebStaffPermissions(uid: string, permissions: string[]): void {
  webPermsCache = { uid, permissions };
  webPermsLoaded = true;
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(WEB_PERMS_KEY, JSON.stringify(webPermsCache));
    } catch {
      /* ignore */
    }
  }
}

/** Drop the cached web staff permissions (logout / no staff doc). */
export function clearWebStaffPermissions(): void {
  webPermsCache = null;
  webPermsLoaded = true;
  if (typeof window !== "undefined") {
    try {
      localStorage.removeItem(WEB_PERMS_KEY);
    } catch {
      /* ignore */
    }
  }
}

/** True when a unified staff session is the active identity (desktop kiosk). */
export function hasStaffOpsSession(): boolean {
  return typeof window !== "undefined" && loadUnifiedStaffSession() !== null;
}

export function normalizeRole(role: string | null | undefined): OpsRole {
  if (role && role in ROLE_LABELS) return role as OpsRole;
  return "admin";
}

export function areasForRole(role: OpsRole): Array<{ area: OpsArea; label: string; write: boolean }> {
  return (Object.keys(AREA_LABELS) as OpsArea[])
    .filter((a) => canViewArea(role, a))
    .map((a) => ({ area: a, label: AREA_LABELS[a], write: canWriteArea(role, a) }));
}

export function writeAreasForRole(role: OpsRole): OpsArea[] {
  return (Object.keys(AREA_LABELS) as OpsArea[]).filter((a) => canWriteArea(role, a));
}

export function firstAllowedPath(role: OpsRole): string {
  const staff = loadUnifiedStaffSession();
  if (staff) {
    if (canAccessOpsArea(staff.permissions, "inventory")) return AREA_PATHS.inventory;
    if (canAccessOpsArea(staff.permissions, "employees")) return AREA_PATHS.employees;
    if (canAccessOpsArea(staff.permissions, "overview")) return AREA_PATHS.overview;
    const allowed = allowedStaffPaths(staff.permissions);
    if (allowed[0]) return allowed[0];
    return "/ops";
  }
  const web = currentWebStaffPermissions();
  if (web) {
    // Web staff live in the operations dashboard — never route them to a
    // desktop kiosk screen (waiter/kitchen/cashier).
    const allowed = allowedOpsAreaPaths(web);
    if (allowed[0]) return allowed[0];
    return "/ops";
  }
  if (canViewArea(role, "inventory")) return AREA_PATHS.inventory;
  if (canViewArea(role, "employees")) return AREA_PATHS.employees;
  if (canViewArea(role, "overview")) return AREA_PATHS.overview;
  return "/ops";
}

export async function resolveOpsRole(): Promise<OpsRole> {
  // A unified staff session (desktop kiosk) takes precedence: the granted
  // operations areas drive access instead of the owner/admin role.
  if (typeof window !== "undefined" && loadUnifiedStaffSession()) {
    return "staff";
  }
  if (!getFirebaseDb()) {
    const saved = localStorage.getItem("sahl_dz_preview_role");
    return saved === "owner" ? "admin" : "admin";
  }
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return "admin";

  // Web (Firebase Auth) staff: hydrate the granted permissions from the
  // matching `staff` document so the ops navigation reflects them.
  const res = await fetchWebStaffAccess(user.id, user.email);
  if (res.ok && res.access && res.access.permissions.length > 0) {
    setWebStaffPermissions(user.id, res.access.permissions);
    return "staff";
  }
  // Only drop the cache when the lookup definitively found no staff document —
  // a transient read failure must not strip a staff member's navigation.
  if (res.ok) clearWebStaffPermissions();

  const { data } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .maybeSingle();
  return normalizeRole(data?.role);
}

// beforeLoad guard for the /ops layout: a unified staff session (desktop
// kiosk) is accepted; otherwise the web staff permissions are preloaded so the
// navigation renders correctly on the first paint (no admin-permission flash).
export function requireOpsLayoutAccess(): () => Promise<void> {
  return async () => {
    if (typeof window !== "undefined" && loadUnifiedStaffSession()) return;
    await resolveOpsRole();
    await requireAuth();
  };
}

// beforeLoad guard: redirect to the role's first allowed page if it can't view any of the required areas.
export function requireOpsAccess(area: OpsArea | OpsArea[]): () => Promise<void> {
  const areas = Array.isArray(area) ? area : [area];
  return async () => {
    if (typeof window === "undefined") return;
    const role = await resolveOpsRole();
    const ok = areas.some((a) => canViewArea(role, a));
    if (!ok) {
      const target = firstAllowedPath(role);
      // Avoid a redirect loop when no area is allowed (target === current page).
      if (target !== window.location.pathname) {
        throw redirect({ to: target as "/ops" });
      }
    }
  };
}

export function useOpsRole(): OpsRole {
  const [role, setRole] = useState<OpsRole | null>(null);
  useEffect(() => {
    (async () => {
      setRole(await resolveOpsRole());
    })();
  }, []);
  return role ?? "admin";
}

// Convenience hook for pages: exposes view/write flags for a given area.
export function useAreaPermission(area: OpsArea): { canView: boolean; canWrite: boolean; canEdit: boolean } {
  const role = useOpsRole();
  return {
    canView: canViewArea(role, area),
    canWrite: canWriteArea(role, area),
    canEdit: canWriteArea(role, area),
  };
}