import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  ChefHat,
  UtensilsCrossed,
  ReceiptText,
  LogOut,
  LayoutDashboard,
  Package,
  ClipboardCheck,
  Truck,
  Users,
  Trash2,
  BarChart3,
  Wallet,
  TrendingUp,
  MessageSquareWarning,
  Calculator,
  Archive,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";
import {
  clearAllStaffSessions,
  hasUnifiedStaffSession,
  rememberOpenTab,
} from "@/lib/staff-session";
import {
  grantedOpsAreas,
  opsAreaLabel,
  opsAreaPath,
  type StaffOpsArea,
} from "@/lib/staff-permissions";

type TabDef = {
  id: string;
  permission: string;
  label: string;
  path: string;
  icon: LucideIcon;
};

const INTERFACE_TAB_DEFS: TabDef[] = [
  {
    id: "kitchen",
    permission: "kitchen",
    label: "المطبخ",
    path: "/kitchen-screen",
    icon: ChefHat,
  },
  {
    id: "waiter",
    permission: "waiter",
    label: "النادل",
    path: "/waiter-screen",
    icon: UtensilsCrossed,
  },
  {
    id: "cashier",
    permission: "cashier",
    label: "الكاشير",
    path: "/cashier",
    icon: ReceiptText,
  },
];

const OPS_AREA_ICONS: Record<StaffOpsArea, LucideIcon> = {
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

/** Chrome-like tab bar that switches between the employee's allowed screens. */
export function StaffTabs() {
  const router = useRouterState();
  const navigate = useNavigate();
  const [permissions, setPermissions] = useState<string[]>([]);

  useEffect(() => {
    if (!hasUnifiedStaffSession()) return;
    let alive = true;
    import("@/lib/staff-session").then((m) => {
      if (!alive) return;
      const s = m.loadUnifiedStaffSession();
      if (s) setPermissions(s.permissions);
    });
    return () => {
      alive = false;
    };
  }, [router.location.pathname]);

  if (!hasUnifiedStaffSession()) return null;

  const opsTabs: TabDef[] = grantedOpsAreas(permissions).map(({ area }) => ({
    id: area,
    permission: area,
    label: opsAreaLabel(area),
    path: opsAreaPath(area),
    icon: OPS_AREA_ICONS[area],
  }));

  const allowed = [
    ...INTERFACE_TAB_DEFS.filter((t) => permissions.includes(t.permission)),
    ...opsTabs,
  ];
  if (allowed.length === 0) return null;

  const current = router.location.pathname;

  function handleLogout() {
    clearAllStaffSessions();
    toast.success("تم تسجيل الخروج");
    navigate({ to: "/staff-login", search: { rid: "" } });
  }

  return (
    <div
      className="flex items-end gap-1 bg-[var(--muted)]/60 backdrop-blur px-2 pt-2 border-b border-[var(--border)]"
      dir="rtl"
    >
      <div className="flex items-end gap-1 flex-1 overflow-x-auto no-scrollbar">
        {allowed.map((tab) => {
          const Icon = tab.icon;
          const active = current === tab.path;
          return (
            <Link
              key={tab.id}
              to={tab.path}
              onClick={() => rememberOpenTab(tab.path)}
              className={`group flex items-center gap-2 rounded-t-lg px-4 py-2 text-sm font-semibold border border-b-0 transition-all min-w-[120px] ${
                active
                  ? "bg-[var(--card)] text-[var(--primary)] border-[var(--border)] shadow-sm"
                  : "bg-transparent text-[var(--muted-foreground)] border-transparent hover:bg-[var(--muted)] hover:text-[var(--foreground)]"
              }`}
            >
              <Icon className="w-4 h-4" />
              <span className="flex-1 text-center">{tab.label}</span>
            </Link>
          );
        })}
      </div>
      <button
        type="button"
        onClick={handleLogout}
        className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 mb-1.5 text-xs font-semibold text-[var(--muted-foreground)] hover:text-[var(--destructive)] hover:bg-[var(--destructive)]/10 transition-colors"
      >
        <LogOut className="w-3.5 h-3.5" />
        خروج
      </button>
    </div>
  );
}
