import { createFileRoute, Outlet, Link, useLocation } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";

export const Route = createFileRoute("/dashboard/settings")({
  component: SettingsLayout,
});

function SettingsLayout() {
  const location = useLocation();
  // We check if the current path is exactly the settings root to hide the back button on the hub
  const isRoot = location.pathname === "/dashboard/settings" || location.pathname === "/dashboard/settings/";

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20" dir="rtl">
      {!isRoot && (
        <div className="mb-6">
          <Link
            to="/dashboard/settings"
            className="inline-flex items-center gap-2 font-bold text-[var(--primary)] transition-colors bg-[var(--primary)]/10 hover:bg-[var(--primary)]/20 px-5 py-3 rounded-xl border border-[var(--primary)]/20 shadow-sm"
          >
            <ArrowRight className="w-5 h-5" />
            رجوع لصفحة الإعدادات الرئيسية
          </Link>
        </div>
      )}
      
      <Outlet />
    </div>
  );
}
