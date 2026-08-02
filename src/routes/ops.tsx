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
  BarChart3,
  Wallet,
  TrendingUp,
  MessageSquareWarning,
  ClipboardCheck,
  Settings,
} from "lucide-react";
import { useEffect, useState } from "react";
import { requireAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { AdminChatBot } from "@/components/AdminChatBot";
import { OpsTour } from "@/components/OpsTour";
import { tx } from "@/lib/ops-tx";
import { useTranslation } from "react-i18next";


export const Route = createFileRoute("/ops")({
  component: OpsLayout,
});

type NavItem = {
  to:
    | "/ops"
    | "/ops/inventory"
    | "/ops/recipes"
    | "/ops/suppliers"
    | "/ops/employees"
    | "/ops/waste"
    | "/ops/expenses"
    | "/ops/reports"
    | "/ops/staff-performance"
    | "/ops/complaints"
    | "/ops/inventory-count"
    ;
  label: string;
  icon: typeof LayoutDashboard;
  exact?: boolean;
  roles?: string[]; // which roles can see this item (undefined = all)
};

const ALL_NAV: NavItem[] = [
  { to: "/ops", label: tx("نظرة عامة"), icon: LayoutDashboard, exact: true, roles: ["admin", "operations_manager", "hr_manager", "purchasing_manager"] },
  { to: "/ops/inventory", label: tx("المخزون"), icon: Package, roles: ["admin", "operations_manager", "production_manager", "purchasing_manager"] },
  { to: "/ops/inventory-count", label: tx("جرد المخزون"), icon: ClipboardCheck, roles: ["admin", "operations_manager", "production_manager", "purchasing_manager"] },
  { to: "/ops/recipes", label: tx("الوصفات"), icon: ChefHat, roles: ["admin", "operations_manager", "production_manager"] },
  { to: "/ops/suppliers", label: tx("الموردين"), icon: Truck, roles: ["admin", "operations_manager", "purchasing_manager"] },
  { to: "/ops/employees", label: tx("الموظفين"), icon: Users, roles: ["admin", "hr_manager", "operations_manager"] },
  { to: "/ops/staff-performance", label: tx("أداء الموظفين"), icon: TrendingUp, roles: ["admin", "hr_manager", "operations_manager", "production_manager"] },
  { to: "/ops/expenses", label: tx("المصاريف"), icon: Wallet, roles: ["admin", "operations_manager", "purchasing_manager"] },
  { to: "/ops/waste", label: tx("سجل الهدر"), icon: Trash2, roles: ["admin", "operations_manager", "production_manager"] },
  { to: "/ops/complaints", label: tx("الشكاوى"), icon: MessageSquareWarning, roles: ["admin", "operations_manager"] },
  { to: "/ops/reports", label: tx("التقارير"), icon: BarChart3, roles: ["admin", "operations_manager", "hr_manager"] },
];

const ROLE_LABELS: Record<string, string> = {
  admin: "مالك",
  staff: "موظف",
  production_manager: "مسؤول الإنتاج",
  operations_manager: "مسؤول التشغيل",
  hr_manager: "مسؤول الموارد البشرية",
  purchasing_manager: "مسؤول المشتريات",
};

// Roles that should land on their first allowed page instead of the overview
const REDIRECT_FROM_OVERVIEW: Record<string, string> = {
  production_manager: "/ops/inventory",
  purchasing_manager: "/ops/inventory",
  hr_manager: "/ops/employees",
};

function OpsLayout() {
  useTranslation();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const searchStr = useRouterState({ select: (s) => s.location.searchStr });
  const tourMode = new URLSearchParams(searchStr).get("tour") === "1";
  const navigate = useNavigate();
  // null = still loading, avoids showing wrong nav items before role is fetched
  const [userRole, setUserRole] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        // Mock role for preview
        setUserRole("admin");
        return;
      }
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .maybeSingle();
      const role = data?.role ?? "admin";
      setUserRole(role);
      // If this role can't access the overview page and the user landed there, redirect
      if ((pathname === "/ops" || pathname === "/ops/") && REDIRECT_FROM_OVERVIEW[role]) {
        navigate({ to: REDIRECT_FROM_OVERVIEW[role] as "/ops/inventory" | "/ops/employees", replace: true });
      }
    })();
  }, []);

  // Don't render nav until role is known — prevents flicker showing wrong items
  const NAV = userRole === null
    ? []
    : ALL_NAV.filter((item) => !item.roles || item.roles.includes(userRole));

  const isActive = (to: string, exact?: boolean) =>
    exact ? pathname === to : pathname === to || pathname.startsWith(to + "/");

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/login" });
  };

  const current = NAV.find((n) => isActive(n.to, n.exact));

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
