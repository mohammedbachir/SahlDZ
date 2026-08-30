import { useEffect, useState } from "react";
import {
  createFileRoute,
  Outlet,
  useLocation,
  useMatchRoute,
  useNavigate,
} from "@tanstack/react-router";
import {
  Home,
  Bell,
  BarChart3,
  Settings,
  LogOut,
  FileText,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getFirebaseDb } from "@/integrations/firebase/config";
import NotificationManager from "@/components/notification-manager";

export const Route = createFileRoute("/mobile")({
  component: MobileLayout,
});

function MobileLayout() {
  const matchRoute = useMatchRoute();
  const navigate = useNavigate();
  const location = useLocation();
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);

  const isLoginRoute = location.pathname === "/mobile/login";

  useEffect(() => {
    async function checkAuth() {
      try {
        if (!getFirebaseDb()) {
          const uid = localStorage.getItem("sahl_dz_preview_uid");
          setAuthenticated(!!uid);
          return;
        }
        const { data } = await supabase.auth.getSession();
        setAuthenticated(!!data.session?.user?.id);
      } catch {
        setAuthenticated(false);
      }
    }
    checkAuth();
  }, []);

  useEffect(() => {
    if (authenticated === false && !isLoginRoute) {
      navigate({ to: "/mobile/login" });
    }
  }, [authenticated, navigate, isLoginRoute]);

  if (authenticated === null) {
    return (
      <div className="min-h-screen bg-[var(--background)] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!authenticated) {
    if (isLoginRoute) return <Outlet />;
    return null;
  }

  async function handleLogout() {
    try {
      if (getFirebaseDb()) {
        await supabase.auth.signOut();
      }
      localStorage.removeItem("sahl_dz_preview_uid");
      localStorage.removeItem("sahl_dz_preview_role");
      window.location.href = "/mobile/login";
    } catch {
      window.location.href = "/mobile/login";
    }
  }

  const tabs = [
    { to: "/mobile" as const, icon: Home, label: "الرئيسية" },
    { to: "/mobile/notifications" as const, icon: Bell, label: "الإشعارات" },
    { to: "/mobile/daily-summary" as const, icon: FileText, label: "التقرير" },
    { to: "/mobile/reports" as const, icon: BarChart3, label: "الإحصائيات" },
    { to: "/mobile/settings" as const, icon: Settings, label: "الإعدادات" },
  ];

  return (
    <div className="min-h-screen bg-[var(--background)]">
      <NotificationManager />
      <Outlet />
      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-card/95 backdrop-blur-lg border-t border-border/40 z-50">
        <div className="flex items-center justify-around px-2 py-2">
          {tabs.map((tab) => {
            const isActive =
              tab.to === "/mobile"
                ? matchRoute({ to: "/mobile", fuzzy: false })
                : matchRoute({ to: tab.to });
            return (
              <a
                key={tab.to}
                href={tab.to}
                className={`flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-colors ${
                  isActive
                    ? "text-primary bg-primary/10"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <tab.icon className="w-5 h-5" />
                <span className="text-xs font-medium">{tab.label}</span>
              </a>
            );
          })}
          <button
            onClick={handleLogout}
            className="flex flex-col items-center gap-1 px-3 py-2 rounded-xl text-muted-foreground hover:text-red-500 transition-colors"
          >
            <LogOut className="w-5 h-5" />
            <span className="text-xs font-medium">خروج</span>
          </button>
        </div>
      </nav>
    </div>
  );
}
