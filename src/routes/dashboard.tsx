import { useEffect, useRef, useState, lazy, Suspense } from "react";
import {
  createFileRoute,
  useNavigate,
} from "@tanstack/react-router";
import {
  ShoppingBag,
  UtensilsCrossed,
  LayoutGrid,
  BarChart3,
  Star,
  Settings,
  LogOut,
  User,
  Boxes,
  ChevronLeft,
  Home,
  Loader2,
} from "lucide-react";
import { requireAuth } from "@/lib/auth";
import { AdminChatBot } from "@/components/AdminChatBot";
import {
  DashboardOnboarding,
  hasCompletedOnboarding,
} from "@/components/DashboardOnboarding";
import {
  DashboardTour,
  tourSteps,
} from "@/components/DashboardTour";
import { supabase } from "@/integrations/supabase/client";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { ThemeToggle } from "@/components/ThemeToggle";
import { NotificationsBell } from "@/components/NotificationsBell";
import { useTranslation } from "react-i18next";

export const Route = createFileRoute("/dashboard")({
  component: DashboardLayout,
});

// Lazy load page components
const OrdersPage = lazy(() => import("@/pages/orders"));
const MenuPage = lazy(() => import("@/pages/menu"));
const TablesPage = lazy(() => import("@/pages/tables"));
const AnalyticsPage = lazy(() => import("@/pages/analytics"));
const ReviewsPage = lazy(() => import("@/pages/reviews"));
const SettingsPage = lazy(() => import("@/pages/settings"));

type TabId = "orders" | "menu" | "tables" | "analytics" | "ops" | "reviews" | "settings";

type TabItem = {
  id: TabId;
  key: string;
  icon: React.ComponentType<{ className?: string }>;
  gradient: string;
  component?: React.ComponentType;
};

const TABS: TabItem[] = [
  { id: "orders", key: "orders", icon: ShoppingBag, gradient: "from-amber-500 to-orange-500", component: OrdersPage },
  { id: "menu", key: "menu", icon: UtensilsCrossed, gradient: "from-emerald-500 to-teal-500", component: MenuPage },
  { id: "tables", key: "tables", icon: LayoutGrid, gradient: "from-blue-500 to-indigo-500", component: TablesPage },
  { id: "analytics", key: "analytics", icon: BarChart3, gradient: "from-purple-500 to-pink-500", component: AnalyticsPage },
  { id: "ops", key: "ops", icon: Boxes, gradient: "from-rose-500 to-red-500" },
  { id: "reviews", key: "reviews", icon: Star, gradient: "from-yellow-500 to-amber-500", component: ReviewsPage },
  { id: "settings", key: "settings", icon: Settings, gradient: "from-slate-500 to-gray-500", component: SettingsPage },
];

type Restaurant = { name: string; logo_url: string | null };

const TAB_STEP: Record<TabId, number> = {
  orders: 0,
  menu: 1,
  tables: 2,
  analytics: 3,
  ops: 4,
  reviews: 5,
  settings: 6,
};

function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center py-20">
      <Loader2 className="w-8 h-8 animate-spin text-[var(--primary)]" />
    </div>
  );
}

function DashboardLayout() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [restaurantId, setRestaurantId] = useState<string | null>(null);
  const [isStaffOnly, setIsStaffOnly] = useState(false);
  const [sidebarExpanded, setSidebarExpanded] = useState(true);
  const [activeTab, setActiveTab] = useState<TabId>("orders");
  const [showOnboarding, setShowOnboarding] = useState(() => {
    // Initialize from localStorage — no flash on refresh
    if (typeof window === "undefined") return false;
    return !hasCompletedOnboarding();
  });
  const [tourActive, setTourActive] = useState(false);
  const [tourStep, setTourStep] = useState(0);
  const [tourShowTip, setTourShowTip] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);

  // Tour flow control via query params:
  //   ?tour=1         force/continue the tour (optionally resume at ?tab=<id>)
  //   ?tour=0         explicitly exit the tour (used after skipping inside /ops)
  useEffect(() => {
    const unquote = (v: string | null) => (v ? v.replace(/^"|"$/g, "") : v);
    const params = new URLSearchParams(window.location.search);
    const tourParam = unquote(params.get("tour"));
    const tabParam = (unquote(params.get("tab")) ?? "orders") as TabId;
    const validTab = TABS.some((t) => t.id === tabParam) && tabParam !== "ops";

    if (tourParam === "0") {
      setTourActive(false);
      setActiveTab(validTab ? tabParam : "orders");
    } else if (!hasCompletedOnboarding()) {
      setShowOnboarding(true);
    } else {
      // Onboarding done — no tour, just set the tab
      setTourActive(false);
      setActiveTab(validTab ? tabParam : "orders");
    }

    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) {
        // Preview mode — try localStorage first, then mock
        const saved = localStorage.getItem("sahl_dz_restaurant");
        if (saved) {
          try {
            const parsed = JSON.parse(saved);
            setRestaurant({ name: parsed.name, logo_url: parsed.logo_url });
            setRestaurantId(parsed.id);
            return;
          } catch { /* ignore */ }
        }
        setRestaurant({ name: "مطعم السهل", logo_url: null });
        setRestaurantId("mock-restaurant-id");
        return;
      }
      // Auto-accept any pending invitations matching this user's email
      try {
        const email = u.user.email;
        if (email) {
          const { data: pending } = await supabase
            .from("staff_invitations")
            .select("id, restaurant_id, role")
            .eq("email", email.toLowerCase())
            .eq("accepted", false);
          if (pending && pending.length) {
            for (const inv of pending) {
              await supabase.from("user_roles").insert({
                user_id: u.user.id,
                restaurant_id: inv.restaurant_id,
                role: inv.role,
              });
              await supabase
                .from("staff_invitations")
                .update({ accepted: true })
                .eq("id", inv.id);
            }
          }
        }
      } catch {
        // ignore
      }
      const { data } = await supabase
        .from("restaurants")
        .select("id, name, logo_url")
        .eq("owner_id", u.user.id)
        .maybeSingle();
      if (data) {
        // Owners use operations management, not the operational dashboard
        navigate({ to: "/ops", replace: true });
        return;
      }
      // If user has no owned restaurant, check if they're staff somewhere
      const { data: roles } = await supabase
        .from("user_roles")
        .select("restaurant_id, restaurants:restaurant_id(name, logo_url)")
        .eq("user_id", u.user.id);
      if (roles && roles.length) {
        setIsStaffOnly(true);
        const first = roles[0] as unknown as {
          restaurants: { name: string; logo_url: string | null } | null;
        };
        if (first.restaurants) setRestaurant(first.restaurants);
        return;
      }
      // No restaurant and no staff role — check localStorage, then mock
      const saved = localStorage.getItem("sahl_dz_restaurant");
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          setRestaurant({ name: parsed.name, logo_url: parsed.logo_url });
          setRestaurantId(parsed.id);
          return;
        } catch { /* ignore */ }
      }
      setRestaurant({ name: "مطعم السهل", logo_url: null });
      setRestaurantId("mock-restaurant-id");
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Re-read restaurant from localStorage when settings updates it
  useEffect(() => {
    const onStorage = () => {
      const saved = localStorage.getItem("sahl_dz_restaurant");
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          setRestaurant({ name: parsed.name, logo_url: parsed.logo_url });
          setRestaurantId(parsed.id);
        } catch { /* ignore */ }
      }
    };
    window.addEventListener("restaurant-updated", onStorage);
    return () => window.removeEventListener("restaurant-updated", onStorage);
  }, []);

  // Called when onboarding finishes
  const handleOnboardingComplete = () => {
    setShowOnboarding(false);
    setTourActive(false);
    setActiveTab("orders");
    setTourStep(0);
    // Re-read restaurant from localStorage
    const saved = localStorage.getItem("sahl_dz_restaurant");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setRestaurant({ name: parsed.name, logo_url: parsed.logo_url });
        setRestaurantId(parsed.id);
      } catch { /* ignore */ }
    }
  };

  // Called when user clicks "Start Over" in onboarding
  const handleOnboardingReset = () => {
    // Clear all stored data
    localStorage.removeItem("sahl_dz_dashboard_onboarding");
    localStorage.removeItem("sahl_dz_restaurant");
    setRestaurant(null);
    setRestaurantId(null);
    setShowOnboarding(true);
    setTourActive(false);
    setActiveTab("orders");
    setTourStep(0);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/login" });
  };

  const handleTabChange = (tabId: TabId) => {
    if (tourActive) {
      const tabIndex = TABS.findIndex((t) => t.id === tabId);
      if (tabIndex > tourStep) return;
      // During the tour, ops opens the real operations section in tour mode
      if (tabId === "ops") {
        navigate({ to: "/ops", search: { tour: 1 } });
        return;
      }
    }
    if (tabId === "ops") {
      navigate({ to: "/ops" });
      return;
    }
    setActiveTab(tabId);
    window.history.replaceState(null, "", `/dashboard?tab=${tabId}`);
  };

  const handleShowTip = () => {
    setTourShowTip(true);
  };

  // Reset showTip when tourStep changes
  useEffect(() => {
    setTourShowTip(false);
  }, [tourStep]);

  const handleTourNext = () => {
    const nextStep = tourStep + 1;
    if (nextStep >= tourSteps.length) {
      setTourActive(false);
      setActiveTab((cur) => (cur === "ops" ? "orders" : cur));
      return;
    }
    const nextTabId = tourSteps[nextStep].id as TabId;
    // The ops step runs on the real operations section, not inline
    if (nextTabId === "ops") {
      navigate({ to: "/ops", search: { tour: 1 } });
      return;
    }
    setTourStep(nextStep);
    setTourShowTip(false);
    // Switch to the next section's tab
    setActiveTab(nextTabId);
    window.history.replaceState(null, "", `/dashboard?tab=${nextTabId}`);
  };

  const handleTourComplete = () => {
    setTourActive(false);
    setActiveTab((cur) => (cur === "ops" ? "orders" : cur));
  };

  // Never leave the dashboard stuck on ops without content
  useEffect(() => {
    if (!tourActive && activeTab === "ops") {
      navigate({ to: "/ops" });
    }
  }, [tourActive, activeTab, navigate]);

  // Filter visible tabs
  let visibleTabs = isStaffOnly
    ? TABS.filter((t) => t.id === "orders" || t.id === "menu")
    : TABS;

  if (tourActive) {
    visibleTabs = visibleTabs.slice(0, tourStep + 1);
    // Auto-sync active tab with tour step
    const tourTabId = tourSteps[tourStep].id as TabId;
    if (activeTab !== tourTabId) {
      setActiveTab(tourTabId);
    }
  }

  const currentTab = visibleTabs.find((t) => t.id === activeTab) ?? visibleTabs[0];

  // Render active tab content
  const renderContent = () => {
    const tab = TABS.find((t) => t.id === activeTab);
    if (!tab?.component) {
      return (
        <div className="flex items-center justify-center py-20 text-sm text-[var(--muted-foreground)]">
          <span>هذا القسم غير متوفر حالياً</span>
        </div>
      );
    }
    const Component = tab.component;
    return (
      <Suspense fallback={<LoadingSpinner />}>
        <Component />
      </Suspense>
    );
  };

  // Show onboarding if needed
  if (showOnboarding) {
    return (
      <DashboardOnboarding
        onComplete={handleOnboardingComplete}
        onReset={handleOnboardingReset}
      />
    );
  }

  return (
    <div className="min-h-screen flex bg-[var(--background)]" dir="rtl">
      {/* ============================================
          SIDEBAR - Desktop
          ============================================ */}
      <aside
        ref={sidebarRef}
        className={`hidden md:flex flex-col bg-[var(--sidebar)] border-l border-[var(--border)] transition-all duration-200 sticky top-0 h-screen z-40 ${
          sidebarExpanded ? "w-[260px]" : "w-[72px]"
        }`}
      >
        {/* Brand */}
        <div className="flex items-center gap-3 px-4 h-[64px] border-b border-[var(--border)]">
          {restaurant?.logo_url ? (
            <img
              src={restaurant.logo_url}
              alt={restaurant.name}
              className="w-9 h-9 rounded-lg object-cover shrink-0"
            />
          ) : (
            <div className="w-9 h-9 rounded-lg bg-[var(--primary)] flex items-center justify-center text-[var(--primary-foreground)] font-bold text-sm shrink-0">
              {restaurant?.name?.[0] ?? "م"}
            </div>
          )}
          {sidebarExpanded && (
            <div className="leading-tight min-w-0 flex-1">
              <div className="font-bold text-sm truncate text-[var(--foreground)]">
                {restaurant?.name ?? t("nav.myRestaurant")}
              </div>
              <div className="text-[11px] text-[var(--muted-foreground)]">
                {t("nav.dashboard")}
              </div>
            </div>
          )}
          <button
            onClick={() => setSidebarExpanded(!sidebarExpanded)}
            className="p-1.5 rounded-md hover:bg-[var(--muted)] transition-colors"
          >
            <ChevronLeft
              className={`w-4 h-4 text-[var(--muted-foreground)] transition-transform ${
                sidebarExpanded ? "" : "rotate-180"
              }`}
            />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-2 space-y-0.5 overflow-y-auto">
          {visibleTabs.map((tab, i) => {
            const active = activeTab === tab.id;
            const Icon = tab.icon;
            const isTourCurrent = tourActive && i === tourStep;
            return (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                className={`w-full flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all duration-300 ${
                  active
                    ? "bg-[var(--primary)] text-[var(--primary-foreground)] font-semibold"
                    : "text-[var(--muted-foreground)] font-medium hover:bg-[var(--muted)] hover:text-[var(--foreground)]"
                } ${sidebarExpanded ? "" : "justify-center"} ${
                  isTourCurrent ? "ring-2 ring-[var(--primary)] ring-offset-1 ring-offset-[var(--sidebar)]" : ""
                }`}
              >
                <div className="relative">
                  <Icon className={`w-[18px] h-[18px] shrink-0 ${active ? "text-[var(--primary-foreground)]" : ""}`} />
                  {tourActive && (
                    <span className={`absolute -top-2 -right-2 w-4 h-4 rounded-full bg-[var(--primary)] text-[10px] font-bold flex items-center justify-center text-[#1a1612] ${
                      active ? "ring-2 ring-[var(--primary-foreground)]" : ""
                    }`}>
                      {i + 1}
                    </span>
                  )}
                </div>
                {sidebarExpanded && <span>{t(`nav.${tab.key}`)}</span>}
              </button>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="p-2 border-t border-[var(--border)]">
          <button
            onClick={handleLogout}
            className={`w-full flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-[var(--muted-foreground)] font-medium hover:bg-[var(--muted)] hover:text-[var(--foreground)] transition-colors ${
              sidebarExpanded ? "" : "justify-center"
            }`}
          >
            <LogOut className="w-[18px] h-[18px] shrink-0" />
            {sidebarExpanded && <span>{t("nav.logout")}</span>}
          </button>
        </div>
      </aside>

      {/* ============================================
          MAIN COLUMN
          ============================================ */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Bar */}
        <header className="h-[60px] bg-[var(--card)] border-b border-[var(--border)] sticky top-0 z-30 flex items-center justify-between px-4 md:px-6">
          <div className="flex items-center gap-3 min-w-0">
            {/* Mobile menu button */}
            <button
              onClick={() => setSidebarExpanded(!sidebarExpanded)}
              className="md:hidden p-1.5 rounded-md hover:bg-[var(--muted)] transition-colors"
            >
              <Home className="w-5 h-5 text-[var(--muted-foreground)]" />
            </button>

            {/* Page title */}
            <div className="min-w-0">
              <h1 className="font-bold text-base md:text-lg text-[var(--foreground)] truncate">
                {t(`nav.${currentTab.key}`)}
              </h1>
              <p className="text-[11px] text-[var(--muted-foreground)] truncate hidden sm:block">
                {t(`nav.sub.${currentTab.key}`)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <LanguageSwitcher />
            <ThemeToggle />
            <NotificationsBell restaurantId={restaurantId} />

            {/* User menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="w-8 h-8 rounded-full bg-[var(--muted)] hover:bg-[var(--border)] flex items-center justify-center transition-colors">
                  <User className="w-4 h-4 text-[var(--muted-foreground)]" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuLabel>{t("nav.account")}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="cursor-pointer">
                  <LogOut className="w-4 h-4 ml-2" />
                  {t("nav.logout")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Main content - Tab content */}
        <main className="flex-1 p-4 md:p-6 pb-20 md:pb-6">
          {renderContent()}
        </main>
      </div>

      {/* ============================================
          BOTTOM NAV - Mobile
          ============================================ */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 bg-[var(--card)] border-t border-[var(--border)] z-40">
        <div className="flex justify-around items-center py-2 px-2">
          {visibleTabs.map((tab, i) => {
            const active = activeTab === tab.id;
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                className={`flex flex-col items-center justify-center gap-0.5 min-w-[56px] py-1.5 rounded-md transition-colors ${
                  active
                    ? "text-[var(--primary)]"
                    : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                }`}
              >
                <div className="relative">
                  <Icon className={`w-5 h-5 ${active ? "text-[var(--primary)]" : ""}`} />
                  {tourActive && (
                    <span className="absolute -top-2 -right-2 w-3.5 h-3.5 rounded-full bg-[var(--primary)] text-[8px] font-bold flex items-center justify-center text-[#1a1612]">
                      {i + 1}
                    </span>
                  )}
                </div>
                <span className="text-[10px] font-medium">{t(`nav.${tab.key}`)}</span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* Tour */}
      {tourActive && (
        <DashboardTour
          onComplete={handleTourComplete}
          tourStep={tourStep}
          showTip={tourShowTip}
          onShowTip={handleShowTip}
          onNext={handleTourNext}
        />
      )}

      {/* Chatbot */}
      <AdminChatBot />
    </div>
  );
}
