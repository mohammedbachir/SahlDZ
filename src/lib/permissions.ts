import { useState, useEffect } from "react";
import { redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { getFirebaseDb } from "@/integrations/firebase/config";

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
  recipes: "الوصفات والمنيو",
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
    ["overview", "inventory", "inventoryCount", "recipes", "suppliers", "waste", "staffPerformance", "reports"],
    ["inventory", "inventoryCount", "recipes", "waste"],
  ],
  operations_manager: [
    ALL,
    ["inventory", "inventoryCount", "recipes", "suppliers", "expenses", "waste", "complaints"],
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
  return ROLE_CAPABILITIES[role]?.[area]?.view === true;
}

export function canWriteArea(role: OpsRole, area: OpsArea): boolean {
  return ROLE_CAPABILITIES[role]?.[area]?.write === true;
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
  if (canViewArea(role, "inventory")) return AREA_PATHS.inventory;
  if (canViewArea(role, "employees")) return AREA_PATHS.employees;
  if (canViewArea(role, "overview")) return AREA_PATHS.overview;
  return "/ops";
}

export async function resolveOpsRole(): Promise<OpsRole> {
  if (!getFirebaseDb()) {
    const saved = localStorage.getItem("sahl_dz_preview_role");
    return saved === "owner" ? "admin" : "admin";
  }
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return "admin";
  const { data } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .maybeSingle();
  return normalizeRole(data?.role);
}

// beforeLoad guard: redirect to the role's first allowed page if it can't view any of the required areas.
export function requireOpsAccess(area: OpsArea | OpsArea[]): () => Promise<void> {
  const areas = Array.isArray(area) ? area : [area];
  return async () => {
    if (typeof window === "undefined") return;
    const role = await resolveOpsRole();
    const ok = areas.some((a) => canViewArea(role, a));
    if (!ok) throw redirect({ to: firstAllowedPath(role) as "/ops" });
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