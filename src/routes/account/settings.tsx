import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { requireOwner } from "@/lib/auth";
import SettingsPage from "@/pages/settings";
import { AccountShell } from "@/components/account-shell";

export const Route = createFileRoute("/account/settings")({
  beforeLoad: requireOwner,
  component: OwnerSettingsPage,
});

function OwnerSettingsPage() {
  return (
    <AccountShell>
      {() => (
        <div className="max-w-3xl mx-auto space-y-4">
          <Link
            to="/account"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-[var(--muted-foreground)] hover:bg-[var(--muted)] hover:text-[var(--foreground)] transition-colors"
          >
            <ArrowRight className="w-4 h-4" />
            النظرة العامة
          </Link>
          <SettingsPage />
        </div>
      )}
    </AccountShell>
  );
}
