import { createFileRoute, Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Package,
  Truck,
  Users,
  Trash2,
  LogOut,
  ArrowRight,
  ChefHat,
  UtensilsCrossed,
  BarChart3,
  Wallet,
  TrendingUp,
  MessageSquareWarning,
  ClipboardCheck,
  Settings,
  Calculator,
  Archive,
} from "lucide-react";
import { useEffect, useState } from "react";
import { requireOpsLayoutAccess } from "@/lib/permissions";
import { supabase } from "@/integrations/supabase/client";
import { AdminChatBot } from "@/components/AdminChatBot";
import { OpsTour } from "@/components/OpsTour";
import { StaffTabs } from "@/components/staff-tabs";
import { tx } from "@/lib/ops-tx";
import { useTranslation } from "react-i18next";
import {
  ROLE_LABELS,
  AREA_LABELS,
  AREA_PATHS,
  canViewArea,
  canWriteArea,
  hasStaffOpsSession,
  resolveOpsRole,
  type OpsArea,
  type OpsRole,
} from "@/lib/permissions";


export const Route = createFileRoute("/ops")({
  beforeLoad: requireOpsLayoutAccess(),
  component: OpsLayout,
});

type OpsPath =
  | "/ops"
  | "/ops/inventory"
  | "/ops/recipes"
  | "/ops/menu"
  | "/ops/suppliers"
  | "/ops/employees"
  | "/ops/waste"
  | "/ops/expenses"
  | "/ops/reports"
  | "/ops/staff-performance"
  | "/ops/complaints"
  | "/ops/inventory-count"
  | "/ops/accounting"
  | "/ops/report-archive";

const AREA_ICONS: Record<OpsArea, typeof LayoutDashboard> = {
  overview: LayoutDashboard,
  inventory: Package,
  inventoryCount: ClipboardCheck,
  recipes: ChefHat,
  menu: UtensilsCrossed,
  suppliers: Truck,
  employees: Users,
  staffPerformance: TrendingUp,
  expenses: Wallet,
  waste: Trash2,
  complaints: MessageSquareWarning,
  reports: BarChart3,
  accounting: Calculator,
  reportArchive: Archive,
};

const NAV_ORDER: OpsArea[] = [
  "overview",
  "inventory",
  "inventoryCount",
  "recipes",
  "menu",
  "suppliers",
  "employees",
  "staffPerformance",
  "expenses",
  "waste",
  "complaints",
  "reports",
  "accounting",
  "reportArchive",
];

function OpsLayout() {
  useTranslation();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const searchStr = useRouterState({ select: (s) => s.location.searchStr });
  const tourMode = new URLSearchParams(searchStr).get("tour") === "1";
  const navigate = useNavigate();
  // null = still loading, avoids showing wrong nav items before role is fetched
  const [userRole, setUserRole] = useState<OpsRole | null>(null);
  // Desktop kiosk: a unified staff session replaces the owner sidebar with tabs.
  const [staffMode, setStaffMode] = useState(false);

  useEffect(() => {
    setStaffMode(hasStaffOpsSession());
  }, [pathname]);

  useEffect(() => {
    (async () => {
      const role = await resolveOpsRole();
      setUserRole(role);
    })();
  }, []);

  // Don't render nav until role is known — prevents flicker showing wrong items
  const NAV =
    userRole === null
      ? []
      : NAV_ORDER.filter((a) => canViewArea(userRole, a)).map((a) => ({
          to: AREA_PATHS[a] as OpsPath,
          label: AREA_LABELS[a],
          icon: AREA_ICONS[a],
          exact: a === "overview",
          write: canWriteArea(userRole, a),
        }));

  const isActive = (to: string, exact?: boolean) =>
    exact ? pathname === to : pathname === to || pathname.startsWith(to + "/");

  const handleLogout = async () => {
    localStorage.removeItem("sahl_dz_preview_role");
    localStorage.removeItem("sahl_dz_auth_cache");
    await supabase.auth.signOut();
    navigate({ to: "/login" });
  };

  const current = NAV.find((n) => isActive(n.to, n.exact));

  if (staffMode) {
    return (
      <div className="min-h-screen flex flex-col bg-[var(--background)]" dir="rtl">
        <StaffTabs />
        <main className="flex-1 px-4 pb-20 md:pb-8 pt-3">
          <Outlet />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex md:gap-4 md:p-4 bg-[var(--background)]" dir="rtl">
      {/* Sidebar */}
      <aside className="hidden md:flex flex-col bg-[var(--card)] border border-[var(--border)] rounded-xl md:w-[72px] lg:w-[220px] shrink-0 sticky top-4 h-[calc(100vh-2rem)] overflow-hidden">
        <div className="flex items-center gap-2.5 px-3 lg:px-4 h-14 border-b border-[var(--border)]">
          <div className="w-9 h-9 rounded-lg bg-[var(--primary)] flex items-center justify-center text-[var(--primary-foreground)] font-bold text-sm shrink-0">
            Op
          </div>
          <div className="leading-tight hidden lg:block min-w-0">
            <div className="font-bold text-sm truncate text-[var(--foreground)]">{tx("إدارة العمليات")}</div>
            <div className="text-[11px] text-[var(--muted-foreground)]">
              {(userRole && ROLE_LABELS[userRole]) || "Ops"}
            </div>
          </div>
        </div>

        <nav className="flex-1 p-2 space-y-0.5 overflow-y-auto" data-annotate="ops-nav">
          {NAV.map((item) => {
            const active = isActive(item.to, item.exact);
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                to={item.to}
                search={tourMode ? { tour: 1 } : undefined}
                className={`group flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition-colors lg:justify-start justify-center ${
                  active
                    ? "bg-[var(--primary)]/10 text-[var(--primary)] font-semibold"
                    : "text-[var(--muted-foreground)] hover:bg-[var(--muted)] hover:text-[var(--foreground)]"
                }`}
              >
                <Icon className="w-[18px] h-[18px] shrink-0" />
                <span className="hidden lg:inline">{item.label}</span>
              </Link>
            );
          })}

          {userRole === "admin" && (
            <div className="pt-2 mt-2 border-t border-[var(--border)]">
              <Link
                to="/account/settings"
                className={`group flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition-colors lg:justify-start justify-center ${
                  pathname === "/account/settings"
                    ? "bg-[var(--primary)]/10 text-[var(--primary)] font-semibold"
                    : "text-[var(--muted-foreground)] hover:bg-[var(--muted)] hover:text-[var(--foreground)]"
                }`}
              >
                <Settings className="w-[18px] h-[18px] shrink-0" />
                <span className="hidden lg:inline">{tx("إعدادات المطعم")}</span>
              </Link>
            </div>
          )}
        </nav>

        <div className="p-2 border-t border-[var(--border)] space-y-0.5">
          {userRole === "admin" && (
            <Link
              to="/account"
              className="w-full flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm text-[var(--muted-foreground)] hover:bg-[var(--muted)] hover:text-[var(--foreground)] transition-colors lg:justify-start justify-center"
            >
              <ArrowRight className="w-[18px] h-[18px] shrink-0" />
              <span className="hidden lg:inline">{tx("حساب المالك")}</span>
            </Link>
          )}
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm text-[var(--muted-foreground)] hover:bg-[var(--muted)] hover:text-[var(--foreground)] transition-colors lg:justify-start justify-center"
          >
            <LogOut className="w-[18px] h-[18px] shrink-0" />
            <span className="hidden lg:inline">{tx("خروج")}</span>
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-14 bg-[var(--card)] border border-[var(--border)] md:rounded-xl flex items-center justify-between px-4 md:px-5 sticky top-0 md:top-4 z-30">
          <div className="min-w-0">
            <h2 className="font-bold text-base text-[var(--foreground)] truncate">
              {current?.label ?? tx("إدارة العمليات")}
            </h2>
            <p className="text-[11px] text-[var(--muted-foreground)] truncate">
              {(userRole && ROLE_LABELS[userRole]) || tx("إدارة العمليات اليومية")}
            </p>
          </div>
          {userRole === "admin" && (
            <Link
              to="/account"
              className="md:hidden text-xs text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
            >
              {tx("حساب المالك")}
            </Link>
          )}
        </header>

        <main className="flex-1 px-4 md:px-0 pb-20 md:pb-0 pt-3">
          <Outlet />
        </main>
      </div>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 bg-[var(--card)] border-t border-[var(--border)] z-30 flex justify-around gap-1 py-2 px-2">
        {NAV.map((item) => {
          const active = isActive(item.to, item.exact);
          const Icon = item.icon;
          return (
            <Link
              key={item.to}
              to={item.to}
              className={`flex flex-col items-center justify-center gap-0.5 shrink-0 min-w-[56px] px-2 py-1 rounded-md text-[10px] whitespace-nowrap transition-colors ${
                active ? "text-[var(--primary)] font-semibold" : "text-[var(--muted-foreground)]"
              }`}
            >
              <Icon className="w-5 h-5" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
      {tourMode && <OpsTour />}
      <AdminChatBot />
    </div>
  );
}
