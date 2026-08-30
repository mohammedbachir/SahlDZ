import { Outlet, useMatchRoute } from "@tanstack/react-router";
import { Home, Bell, BarChart3, Settings } from "lucide-react";

export default function MobileLayout() {
  const matchRoute = useMatchRoute();

  const tabs = [
    { to: "/mobile", icon: Home, label: "الرئيسية" },
    { to: "/mobile/notifications", icon: Bell, label: "الإشعارات" },
    { to: "/mobile/reports", icon: BarChart3, label: "التقارير" },
    { to: "/dashboard/settings", icon: Settings, label: "الإعدادات" },
  ];

  return (
    <div className="min-h-screen bg-[var(--background)]">
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
        </div>
      </nav>
    </div>
  );
}
