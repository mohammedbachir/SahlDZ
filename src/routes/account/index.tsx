import { createFileRoute } from "@tanstack/react-router";
import { requireOwner } from "@/lib/auth";
import { AccountShell } from "@/components/account-shell";
import { OpsOverview } from "@/components/ops-overview";

export const Route = createFileRoute("/account/")({
  beforeLoad: requireOwner,
  component: OwnerOverviewPage,
});

function OwnerOverviewPage() {
  return (
    <AccountShell>
      {() => (
        <div className="max-w-5xl mx-auto">
          <OpsOverview />
        </div>
      )}
    </AccountShell>
  );
}
