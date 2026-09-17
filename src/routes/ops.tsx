import { createFileRoute, Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Package,
  Truck,
  Users,
  Trash2,
  LogOut,
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
  User,
  Menu,
  X,
  Calendar,
  Search,
  Bell,
  ChevronDown,
} from "lucide-react";
import { useEffect, useState, useRef } from "react";
import { requireOpsLayoutAccess } from "@/lib/permissions";
import { supabase } from "@/integrations/supabase/client";
import { OpsTour } from "@/components/OpsTour";
import { StaffTabs } from "@/components/staff-tabs";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { tx } from "@/lib/ops-tx";
import { useTranslation } from "react-i18next";
import {
  ROLE_LABELS,
  AREA_LABELS,
  AREA_PATHS,
  canViewArea,
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

type NavGroup = {
  id: string;
  title: string;
  areas: OpsArea[];
};

const NAV_ITEM_LABELS: Partial<Record<OpsArea, string>> = {
  overview: "نظرة عامة يومية",
  inventory: "المخزون والمواد",
  inventoryCount: "جرد المخزون",
  recipes: "الوصفات والتكاليف",
  menu: "قائمة الطعام والأسعار",
  expenses: "سجل المصاريف",
  accounting: "القيود المحاسبية",
  employees: "الموظفون والرواتب",
  staffPerformance: "أداء الفريق",
  suppliers: "الموردون وسجل المشتريات",
  reports: "التقارير وكشف الدخل",
  reportArchive: "أرشيف السجلات",
  waste: "سجل الهدر والتالف",
  complaints: "شكاوى العملاء",
};

const NAV_GROUPS: NavGroup[] = [
  {
    id: "overview",
    title: tx("المتابعة اليومية"),
    areas: ["overview"],
  },
  {
    id: "operations",
    title: tx("العمليات والمخزون"),
    areas: ["inventory", "inventoryCount", "recipes", "menu"],
  },
  {
    id: "finance",
    title: tx("المالية والمحاسبة"),
    areas: ["expenses", "accounting"],
  },
  {
    id: "resources",
    title: tx("الموارد وفريق العمل"),
    areas: ["employees", "staffPerformance", "suppliers"],
  },
  {
    id: "reports",
    title: tx("التقارير والرقابة"),
    areas: ["reports", "reportArchive", "waste", "complaints"],
  },
];

type SearchTarget = {
  title: string;
  category: string;
  path: string;
  icon: typeof LayoutDashboard;
  keywords: string;
};

const SEARCH_TARGETS: SearchTarget[] = [
  {
    title: "المتابعة اليومية",
    category: "نظرة عامة",
    path: "/ops",
    icon: LayoutDashboard,
    keywords: "نظرة عامة ملخص اليوم مكتب تحكم kpi لوحة",
  },
  {
    title: "المخزون والمواد",
    category: "العمليات والمخزون",
    path: "/ops/inventory",
    icon: Package,
    keywords: "مخزون مواد مكونات شراء رصيد كمية جرد",
  },
  {
    title: "جرد المخزون",
    category: "العمليات والمخزون",
    path: "/ops/inventory-count",
    icon: ClipboardCheck,
    keywords: "جرد مطابقة تدقيق نقص فائض مراجعة",
  },
  {
    title: "الوصفات والتكاليف",
    category: "العمليات والمخزون",
    path: "/ops/recipes",
    icon: ChefHat,
    keywords: "وصفات مكونات تكلفة صحن وجبة تحضير مطبخ",
  },
  {
    title: "قائمة الطعام والأسعار",
    category: "العمليات والمخزون",
    path: "/ops/menu",
    icon: UtensilsCrossed,
    keywords: "منيو طعام وجبات أسعار أصناف فئات أطباق",
  },
  {
    title: "سجل المصاريف والمدفوعات",
    category: "المالية والمحاسبة",
    path: "/ops/expenses",
    icon: Wallet,
    keywords: "مصاريف مدفوعات فواتير شراء مشتريات نفقات دفعات",
  },
  {
    title: "القيود المحاسبية",
    category: "المالية والمحاسبة",
    path: "/ops/accounting",
    icon: Calculator,
    keywords: "محاسبة قيود دفتر أستاذ كشف ميزان حسابات",
  },
  {
    title: "الموظفون والرواتب",
    category: "الموارد وفريق العمل",
    path: "/ops/employees",
    icon: Users,
    keywords: "موظفون رواتب أجور كادر عمال سداد مستحقات مستخدمين",
  },
  {
    title: "أداء الفريق والموظفين",
    category: "الموارد وفريق العمل",
    path: "/ops/staff-performance",
    icon: TrendingUp,
    keywords: "أداء موظفين تقييم إنتاجية ساعات حضور",
  },
  {
    title: "الموردون وسجل التوريد",
    category: "الموارد وفريق العمل",
    path: "/ops/suppliers",
    icon: Truck,
    keywords: "موردون مشتريات فواتير بضاعة شركات توريد",
  },
  {
    title: "التقارير المالية وكشف الدخل",
    category: "التقارير والرقابة",
    path: "/ops/reports",
    icon: BarChart3,
    keywords: "تقارير أرباح مبيعات دخل إيرادات صافي كشف",
  },
  {
    title: "أرشيف السجلات الدورية",
    category: "التقارير والرقابة",
    path: "/ops/report-archive",
    icon: Archive,
    keywords: "أرشيف شهري سنوي سجلات سابقة تاريخ تقرير",
  },
  {
    title: "سجل الهدر والتالف",
    category: "التقارير والرقابة",
    path: "/ops/waste",
    icon: Trash2,
    keywords: "هدر تالف خسائر مطبخ انتهاء صلاحية تالف",
  },
  {
    title: "شكاوى وملاحظات العملاء",
    category: "التقارير والرقابة",
    path: "/ops/complaints",
    icon: MessageSquareWarning,
    keywords: "شكاوى عملاء زبائن مشاكل جودة خدمة تعليقات",
  },
  {
    title: "إعدادات المطعم والخدمات",
    category: "النظام والإعدادات",
    path: "/account/settings",
    icon: Settings,
    keywords: "إعدادات مطعم توصيل طاولات طابعات نظام عام",
  },
  {
    title: "حساب المالك والاشتراك",
    category: "النظام والإعدادات",
    path: "/account",
    icon: User,
    keywords: "حساب مالك ملف شخصي اشتراك باقة خطة",
  },
];

function OpsLayout() {
  useTranslation();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const searchStr = useRouterState({ select: (s) => s.location.searchStr });
  const tourMode = new URLSearchParams(searchStr).get("tour") === "1";
  const navigate = useNavigate();
  const [userRole, setUserRole] = useState<OpsRole | null>("admin");
  const [staffMode, setStaffMode] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [searchModalOpen, setSearchModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Global Ctrl+K / Cmd+K listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchModalOpen((prev) => !prev);
      }
      if (e.key === "Escape") {
        setSearchModalOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const filteredTargets = SEARCH_TARGETS.filter((target) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.trim().toLowerCase();
    return (
      target.title.toLowerCase().includes(q) ||
      target.category.toLowerCase().includes(q) ||
      target.keywords.toLowerCase().includes(q)
    );
  }).slice(0, 8);

  const handleSelectTarget = (path: string) => {
    setSearchModalOpen(false);
    setSearchQuery("");
    navigate({ to: path as any });
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % Math.max(1, filteredTargets.length));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex(
        (prev) => (prev - 1 + filteredTargets.length) % Math.max(1, filteredTargets.length),
      );
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (filteredTargets[selectedIndex]) {
        handleSelectTarget(filteredTargets[selectedIndex].path);
      }
    }
  };

  useEffect(() => {
    setStaffMode(hasStaffOpsSession());
  }, [pathname]);

  useEffect(() => {
    (async () => {
      const role = await resolveOpsRole();
      setUserRole(role);
    })();
  }, []);

  // Close menus on route change
  useEffect(() => {
    setMobileMenuOpen(false);
    setOpenDropdown(null);
  }, [pathname]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpenDropdown(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const isActive = (to: string, exact?: boolean) =>
    exact ? pathname === to : pathname === to || pathname.startsWith(to + "/");

  const isGroupActive = (group: NavGroup) =>
    group.areas.some((area) => isActive(AREA_PATHS[area], area === "overview"));

  const isSystemActive = pathname.startsWith("/account/settings") || pathname === "/account";

  const handleLogout = async () => {
    localStorage.removeItem("sahl_dz_preview_role");
    localStorage.removeItem("sahl_dz_auth_cache");
    await supabase.auth.signOut();
    navigate({ to: "/login" });
  };

  if (staffMode) {
    return (
      <div className="min-h-screen flex flex-col bg-background" dir="rtl">
        <StaffTabs />
        <main className="flex-1 px-4 pb-20 md:pb-8 pt-3">
          <Outlet />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground" dir="rtl">
      {/* ========================================================= */}
      {/* RESTAURANT CONTROL DESK — TWO-ROW COMMAND & MODULE HEADER */}
      {/* ========================================================= */}
      <header className="sticky top-0 z-40 bg-card border-b border-border" ref={dropdownRef}>
        {/* ROW 1: System Command Bar */}
        <div className="h-13 px-4 sm:px-6 lg:px-8 border-b border-border/70 flex items-center justify-between gap-4">
          {/* Right: Brand, Branch & Title */}
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-1.5 rounded-sm text-muted-foreground hover:bg-secondary hover:text-foreground cursor-pointer"
              aria-label="القائمة"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>

            {/* Brand Affordance */}
            <Link to="/ops" className="flex items-center gap-2.5 shrink-0">
              <div className="w-7 h-7 rounded-sm bg-primary text-primary-foreground flex items-center justify-center font-bold text-xs shrink-0 tracking-tight">
                سهل
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-sm tracking-tight text-foreground">سهل ديزاد</span>
                <span className="text-[10px] text-muted-foreground hidden lg:inline">
                  مكتب تحكم العمليات والمتابعة اليومية
                </span>
              </div>
            </Link>
          </div>

          {/* Center: Universal Search Affordance */}
          <div className="hidden md:flex flex-1 max-w-md mx-2">
            <button
              type="button"
              onClick={() => setSearchModalOpen(true)}
              className="relative w-full flex items-center h-8 pl-8 pr-8 text-xs bg-background border border-border/80 rounded-sm focus:outline-none hover:border-primary text-foreground transition-colors cursor-pointer text-right"
            >
              <Search className="w-3.5 h-3.5 absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
              <span className="text-muted-foreground/75 truncate">
                {tx("بحث سريع في الأقسام والعمليات (Ctrl+K)...")}
              </span>
              <kbd className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground/70 font-mono bg-secondary px-1.5 py-0.5 rounded-xs border border-border/50">
                ⌘K
              </kbd>
            </button>
          </div>

          {/* Left: Financial Period, Status, Role & Account */}
          <div className="flex items-center gap-2.5 text-xs">
            {/* Financial Period */}
            <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-sm border border-border/60 bg-secondary/20 text-foreground">
              <Calendar className="w-3.5 h-3.5 text-primary shrink-0" />
            </div>

            {/* Notification / System Readiness Indicator */}
            <button
              onClick={() => navigate({ to: "/ops/reports" })}
              title="سجلات وتنبيهات النظام"
              className="relative p-1.5 rounded-sm text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors cursor-pointer"
            >
              <Bell className="w-4 h-4" />
              <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-primary" />
            </button>

            {/* Role Badge */}
            <div className="hidden sm:flex items-center px-2 py-0.5 rounded-sm bg-muted/60 text-muted-foreground text-[11px] font-medium border border-border/50">
              {(userRole && ROLE_LABELS[userRole]) || "المدير العام"}
            </div>

            {/* Direct Account/Settings Affordance */}
            {userRole === "admin" && (
              <Link
                to="/account/settings"
                title={tx("إعدادات المطعم")}
                className="p-1.5 rounded-sm text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
              >
                <Settings className="w-4 h-4" />
              </Link>
            )}

            {/* User Account */}
            <Link
              to="/account"
              title={tx("حساب المالك")}
              className="p-1.5 rounded-sm text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
            >
              <User className="w-4 h-4" />
            </Link>

            {/* Logout */}
            <button
              onClick={handleLogout}
              title={tx("خروج")}
              className="p-1.5 rounded-sm text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* ROW 2: Horizontal Module Navigation Bar */}
        <div
          className="hidden md:flex h-11 px-4 sm:px-6 lg:px-8 items-center justify-between overflow-visible relative"
          data-annotate="ops-nav"
        >
          <nav className="flex items-center gap-1">
            {/* 1. Daily Overview (Direct 1-click Link) */}
            <Link
              to="/ops"
              search={tourMode ? { tour: 1 } : undefined}
              className={`flex items-center gap-2 px-3.5 h-11 text-xs transition-colors border-b-2 ${
                pathname === "/ops" || pathname === "/ops/"
                  ? "border-primary text-primary font-semibold bg-primary/5"
                  : "border-transparent text-foreground/80 hover:text-foreground hover:bg-secondary/40 font-normal"
              }`}
            >
              <LayoutDashboard className="w-3.5 h-3.5 shrink-0" />
              <span>{tx("المتابعة اليومية")}</span>
            </Link>

            {/* 2 - 5: Module Groups with Structured Dropdowns */}
            {NAV_GROUPS.slice(1).map((group) => {
              const visibleAreas =
                userRole === null ? [] : group.areas.filter((area) => canViewArea(userRole, area));
              if (visibleAreas.length === 0) return null;

              const active = isGroupActive(group);
              const isOpen = openDropdown === group.id;

              return (
                <div
                  key={group.id}
                  className="relative"
                  onMouseEnter={() => setOpenDropdown(group.id)}
                  onMouseLeave={() => setOpenDropdown(null)}
                >
                  <button
                    onClick={() => setOpenDropdown(isOpen ? null : group.id)}
                    className={`flex items-center gap-1.5 px-3.5 h-11 text-xs transition-colors border-b-2 cursor-pointer ${
                      active
                        ? "border-primary text-primary font-semibold bg-primary/5"
                        : "border-transparent text-foreground/80 hover:text-foreground hover:bg-secondary/40 font-normal"
                    }`}
                  >
                    <span>{group.title}</span>
                    <ChevronDown
                      className={`w-3 h-3 transition-transform ${isOpen ? "rotate-180 text-primary" : "text-muted-foreground"}`}
                    />
                  </button>

                  {/* Dropdown Menu */}
                  {isOpen && (
                    <div className="absolute top-full right-0 mt-0.5 w-60 bg-card border border-border rounded-md shadow-xl py-1.5 z-50">
                      <div className="px-3 py-1 text-[10px] font-semibold text-muted-foreground/70 uppercase tracking-wider border-b border-border/40 mb-1">
                        {group.title}
                      </div>
                      {visibleAreas.map((area) => {
                        const to = AREA_PATHS[area] as OpsPath;
                        const itemActive = isActive(to);
                        const Icon = AREA_ICONS[area];
                        const label = NAV_ITEM_LABELS[area] ?? AREA_LABELS[area];

                        return (
                          <Link
                            key={area}
                            to={to}
                            search={tourMode ? { tour: 1 } : undefined}
                            onClick={() => setOpenDropdown(null)}
                            className={`flex items-center gap-2.5 px-3 py-2 text-xs transition-colors ${
                              itemActive
                                ? "bg-primary/10 text-primary font-medium border-r-2 border-primary"
                                : "text-foreground hover:bg-secondary/60"
                            }`}
                          >
                            <Icon className="w-3.5 h-3.5 shrink-0 text-muted-foreground" />
                            <span className="truncate">{label}</span>
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}

            {/* 6. System & Settings Group */}
            {userRole === "admin" && (
              <div
                className="relative"
                onMouseEnter={() => setOpenDropdown("system")}
                onMouseLeave={() => setOpenDropdown(null)}
              >
                <button
                  onClick={() => setOpenDropdown(openDropdown === "system" ? null : "system")}
                  className={`flex items-center gap-1.5 px-3.5 h-11 text-xs transition-colors border-b-2 cursor-pointer ${
                    isSystemActive
                      ? "border-primary text-primary font-semibold bg-primary/5"
                      : "border-transparent text-foreground/80 hover:text-foreground hover:bg-secondary/40 font-normal"
                  }`}
                >
                  <Settings className="w-3.5 h-3.5 shrink-0" />
                  <span>{tx("النظام والإعدادات")}</span>
                  <ChevronDown
                    className={`w-3 h-3 transition-transform ${openDropdown === "system" ? "rotate-180 text-primary" : "text-muted-foreground"}`}
                  />
                </button>

                {openDropdown === "system" && (
                  <div className="absolute top-full right-0 mt-0.5 w-60 bg-card border border-border rounded-md shadow-xl py-1.5 z-50">
                    <div className="px-3 py-1 text-[10px] font-semibold text-muted-foreground/70 uppercase tracking-wider border-b border-border/40 mb-1">
                      {tx("إدارة النظام")}
                    </div>
                    <Link
                      to="/account/settings"
                      onClick={() => setOpenDropdown(null)}
                      className={`flex items-center gap-2.5 px-3 py-2 text-xs transition-colors ${
                        pathname.startsWith("/account/settings")
                          ? "bg-primary/10 text-primary font-medium border-r-2 border-primary"
                          : "text-foreground hover:bg-secondary/60"
                      }`}
                    >
                      <Settings className="w-3.5 h-3.5 shrink-0 text-muted-foreground" />
                      <span>{tx("إعدادات المطعم والخدمات")}</span>
                    </Link>
                    <Link
                      to="/account"
                      onClick={() => setOpenDropdown(null)}
                      className={`flex items-center gap-2.5 px-3 py-2 text-xs transition-colors ${
                        pathname === "/account"
                          ? "bg-primary/10 text-primary font-medium border-r-2 border-primary"
                          : "text-foreground hover:bg-secondary/60"
                      }`}
                    >
                      <User className="w-3.5 h-3.5 shrink-0 text-muted-foreground" />
                      <span>{tx("حساب المالك والاشتراك")}</span>
                    </Link>
                  </div>
                )}
              </div>
            )}
          </nav>

          {/* Quick breadcrumb display on row 2 left side */}
          <div className="text-[11px] text-muted-foreground font-medium flex items-center gap-1.5">
            <span className="text-muted-foreground/60">الموضع:</span>
            <span className="text-foreground font-semibold">
              {pathname === "/ops" || pathname === "/ops/"
                ? tx("مكتب المتابعة اليومية")
                : NAV_GROUPS.flatMap((g) => g.areas).find((a) =>
                      isActive(AREA_PATHS[a], a === "overview"),
                    )
                  ? AREA_LABELS[
                      NAV_GROUPS.flatMap((g) => g.areas).find((a) =>
                        isActive(AREA_PATHS[a], a === "overview"),
                      )!
                    ]
                  : pathname.startsWith("/account/settings")
                    ? tx("إعدادات المطعم")
                    : tx("إدارة العمليات")}
            </span>
          </div>
        </div>

        {/* ROW 3: Contextual Sub-Bar for Active Module */}
        {(() => {
          const activeGroup =
            NAV_GROUPS.slice(1).find((g) => isGroupActive(g)) ??
            (isSystemActive ? { id: "system", title: tx("النظام والإعدادات"), areas: [] } : null);

          if (!activeGroup) return null;

          const visibleAreas =
            activeGroup.id === "system"
              ? []
              : activeGroup.areas.filter(
                  (area) => userRole !== null && canViewArea(userRole, area),
                );

          return (
            <div className="hidden md:flex h-9 px-4 sm:px-6 lg:px-8 items-center gap-3 border-t border-border/60 bg-secondary/20 text-xs">
              <span className="text-muted-foreground text-[11px] font-semibold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                {activeGroup.title}:
              </span>
              <div className="flex items-center gap-1 overflow-x-auto">
                {activeGroup.id === "system" ? (
                  <>
                    <Link
                      to="/account/settings"
                      className={`px-2.5 py-1 rounded-sm text-xs transition-colors ${
                        pathname.startsWith("/account/settings")
                          ? "bg-card text-primary font-semibold shadow-xs border border-border"
                          : "text-muted-foreground hover:text-foreground hover:bg-secondary/60"
                      }`}
                    >
                      {tx("إعدادات المطعم والخدمات")}
                    </Link>
                    <Link
                      to="/account"
                      className={`px-2.5 py-1 rounded-sm text-xs transition-colors ${
                        pathname === "/account"
                          ? "bg-card text-primary font-semibold shadow-xs border border-border"
                          : "text-muted-foreground hover:text-foreground hover:bg-secondary/60"
                      }`}
                    >
                      {tx("حساب المالك والاشتراك")}
                    </Link>
                  </>
                ) : (
                  visibleAreas.map((area) => {
                    const to = AREA_PATHS[area] as OpsPath;
                    const itemActive = isActive(to);
                    const Icon = AREA_ICONS[area];
                    const label = NAV_ITEM_LABELS[area] ?? AREA_LABELS[area];

                    return (
                      <Link
                        key={area}
                        to={to}
                        search={tourMode ? { tour: 1 } : undefined}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-sm text-xs transition-colors ${
                          itemActive
                            ? "bg-card text-primary font-semibold shadow-xs border border-border"
                            : "text-muted-foreground hover:text-foreground hover:bg-secondary/60"
                        }`}
                      >
                        <Icon className="w-3.5 h-3.5 shrink-0" />
                        <span>{label}</span>
                      </Link>
                    );
                  })
                )}
              </div>
            </div>
          );
        })()}

        {/* Mobile Full Navigation Overlay */}
        {mobileMenuOpen && (
          <div className="md:hidden fixed inset-0 top-13 bg-background/98 z-40 overflow-y-auto p-4 space-y-6">
            <div className="space-y-4">
              <Link
                to="/ops"
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-2 p-3 rounded-md text-xs font-semibold border ${
                  pathname === "/ops" || pathname === "/ops/"
                    ? "bg-primary/10 text-primary border-primary/30"
                    : "bg-card border-border text-foreground"
                }`}
              >
                <LayoutDashboard className="w-4 h-4" />
                <span>{tx("المتابعة اليومية")}</span>
              </Link>

              {NAV_GROUPS.slice(1).map((group) => {
                const visibleAreas =
                  userRole === null
                    ? []
                    : group.areas.filter((area) => canViewArea(userRole, area));
                if (visibleAreas.length === 0) return null;

                return (
                  <div key={group.id} className="space-y-2">
                    <div className="text-xs font-semibold text-muted-foreground px-1">
                      {group.title}
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {visibleAreas.map((area) => {
                        const to = AREA_PATHS[area] as OpsPath;
                        const active = isActive(to);
                        const Icon = AREA_ICONS[area];
                        const label = NAV_ITEM_LABELS[area] ?? AREA_LABELS[area];

                        return (
                          <Link
                            key={area}
                            to={to}
                            onClick={() => setMobileMenuOpen(false)}
                            className={`flex items-center gap-2 p-2.5 rounded-sm text-xs transition-colors border ${
                              active
                                ? "bg-primary/10 text-primary border-primary/20 font-medium"
                                : "bg-card text-foreground border-border hover:bg-secondary"
                            }`}
                          >
                            <Icon className="w-4 h-4 shrink-0" />
                            <span className="truncate">{label}</span>
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                );
              })}

              {userRole === "admin" && (
                <div className="space-y-2 pt-2 border-t border-border">
                  <div className="text-xs font-semibold text-muted-foreground px-1">
                    {tx("النظام والإعدادات")}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <Link
                      to="/account/settings"
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex items-center gap-2 p-2.5 rounded-sm text-xs bg-card border border-border text-foreground"
                    >
                      <Settings className="w-4 h-4" />
                      <span>{tx("إعدادات المطعم")}</span>
                    </Link>
                    <Link
                      to="/account"
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex items-center gap-2 p-2.5 rounded-sm text-xs bg-card border border-border text-foreground"
                    >
                      <User className="w-4 h-4" />
                      <span>{tx("حساب المالك")}</span>
                    </Link>
                  </div>
                </div>
              )}

              <button
                onClick={handleLogout}
                className="w-full flex items-center justify-center gap-2 p-3 rounded-md text-xs font-medium text-destructive bg-destructive/10 cursor-pointer mt-4"
              >
                <LogOut className="w-4 h-4" />
                <span>{tx("تسجيل الخروج من النظام")}</span>
              </button>
            </div>
          </div>
        )}
      </header>

      {/* ========================================================= */}
      {/* MAIN FULL-WIDTH WORKSPACE (NO SIDEBAR)                    */}
      {/* ========================================================= */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 overflow-y-auto pb-20 md:pb-8">
        <Outlet />
      </main>

      {/* Mobile Bottom Quick Navigation Bar */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 bg-card border-t border-border z-30 grid grid-cols-5 py-1.5 px-2">
        <Link
          to="/ops"
          className={`flex flex-col items-center justify-center gap-1 py-1 rounded-md text-[10px] ${
            pathname === "/ops" || pathname === "/ops/"
              ? "text-primary font-semibold"
              : "text-muted-foreground"
          }`}
        >
          <LayoutDashboard className="w-4 h-4" />
          <span>المتابعة</span>
        </Link>
        <Link
          to="/ops/inventory"
          className={`flex flex-col items-center justify-center gap-1 py-1 rounded-md text-[10px] ${
            pathname.startsWith("/ops/inventory")
              ? "text-primary font-semibold"
              : "text-muted-foreground"
          }`}
        >
          <Package className="w-4 h-4" />
          <span>المخزون</span>
        </Link>
        <Link
          to="/ops/expenses"
          className={`flex flex-col items-center justify-center gap-1 py-1 rounded-md text-[10px] ${
            pathname.startsWith("/ops/expenses")
              ? "text-primary font-semibold"
              : "text-muted-foreground"
          }`}
        >
          <Wallet className="w-4 h-4" />
          <span>المصاريف</span>
        </Link>
        <Link
          to="/ops/reports"
          className={`flex flex-col items-center justify-center gap-1 py-1 rounded-md text-[10px] ${
            pathname.startsWith("/ops/reports")
              ? "text-primary font-semibold"
              : "text-muted-foreground"
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          <span>التقارير</span>
        </Link>
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="flex flex-col items-center justify-center gap-1 py-1 rounded-md text-[10px] text-muted-foreground cursor-pointer"
        >
          <Menu className="w-4 h-4" />
          <span>القائمة</span>
        </button>
      </nav>

      {tourMode && <OpsTour />}

      {/* Universal Search Command Palette Modal */}
      <Dialog open={searchModalOpen} onOpenChange={setSearchModalOpen}>
        <DialogContent
          className="max-w-xl p-0 gap-0 overflow-hidden border border-border bg-card rounded-md shadow-2xl"
          dir="rtl"
        >
          <div className="p-3 border-b border-border flex items-center gap-2.5 bg-secondary/15">
            <Search className="w-4 h-4 text-muted-foreground shrink-0" />
            <input
              autoFocus
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setSelectedIndex(0);
              }}
              onKeyDown={handleSearchKeyDown}
              placeholder={tx("ابحث في أقسام النظام، المخزون، المصاريف، التقارير...")}
              className="flex-1 bg-transparent border-0 text-xs focus:outline-none text-foreground placeholder:text-muted-foreground"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="text-[11px] text-muted-foreground hover:text-foreground p-1 cursor-pointer"
              >
                مسح
              </button>
            )}
            <kbd className="text-[10px] text-muted-foreground font-mono bg-background px-1.5 py-0.5 rounded-xs border border-border">
              ESC
            </kbd>
          </div>

          <div className="max-h-80 overflow-y-auto p-2 space-y-0.5">
            <div className="px-2 py-1 text-[10px] font-semibold text-muted-foreground/70 uppercase">
              {searchQuery ? "نتائج البحث" : "الأقسام السريعة"}
            </div>
            {filteredTargets.length > 0 ? (
              filteredTargets.map((target, idx) => {
                const Icon = target.icon;
                const isSelected = idx === selectedIndex;
                return (
                  <button
                    key={target.path}
                    type="button"
                    onClick={() => handleSelectTarget(target.path)}
                    onMouseEnter={() => setSelectedIndex(idx)}
                    className={`w-full flex items-center justify-between p-2 rounded-sm text-xs transition-colors cursor-pointer text-right ${
                      isSelected
                        ? "bg-primary/10 text-primary font-medium"
                        : "text-foreground hover:bg-secondary/60"
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Icon className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                      <span className="truncate">{target.title}</span>
                    </div>
                    <span className="text-[10px] text-muted-foreground px-1.5 py-0.5 rounded-xs bg-secondary/60">
                      {target.category}
                    </span>
                  </button>
                );
              })
            ) : (
              <div className="py-8 text-center text-xs text-muted-foreground">
                لم يتم العثور على نتائج تطابق «{searchQuery}»
              </div>
            )}
          </div>

          <div className="px-3 py-2 border-t border-border bg-secondary/10 flex items-center justify-between text-[11px] text-muted-foreground">
            <div className="flex items-center gap-3">
              <span>
                للتحرك: <kbd className="font-mono">↑</kbd> <kbd className="font-mono">↓</kbd>
              </span>
              <span>
                للانتقال: <kbd className="font-mono">↵ Enter</kbd>
              </span>
            </div>
            <span>
              إغلاق: <kbd className="font-mono">Esc</kbd>
            </span>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
