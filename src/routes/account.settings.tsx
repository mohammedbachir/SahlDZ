
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
                className="inline-flex items-center gap-2 font-bold text-[var(--primary)] transition-colors bg-[var(--primary)]/10 hover:bg-[var(--primary)]/20 px-5 py-3 rounded-xl border border-[var(--primary)]/20 shadow-sm"
              >
                <ArrowRight className="w-5 h-5" />
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
