
import { createFileRoute, Outlet, Link, useLocation } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { AccountShell } from "@/components/account-shell";

export const Route = createFileRoute("/account/settings")({
  component: AccountSettingsLayout,
});

function AccountSettingsLayout() {
  const location = useLocation();
  const isRoot = location.pathname === "/account/settings" || location.pathname === "/account/settings/";

  return (
    <AccountShell>
      {() => (
        <div className="max-w-4xl mx-auto space-y-6 pb-20" dir="rtl">
          {!isRoot && (
            <div className="mb-6">
              <Link
                to="/account/settings"
                className="inline-flex items-center gap-2 text-xs font-semibold text-primary transition-colors bg-primary/10 hover:bg-primary/20 px-4 py-2 rounded-lg border border-primary/20"
              >
                <ArrowRight className="w-4 h-4" />
                رجوع لصفحة الإعدادات الرئيسية
              </Link>
            </div>
          )}
          <Outlet />
        </div>
      )}
    </AccountShell>
  );
}
