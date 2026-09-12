import { createFileRoute } from "@tanstack/react-router";
import { requireOpsAccess } from "@/lib/permissions";
import AccountingPage from "@/pages/accounting";

export const Route = createFileRoute("/ops/accounting")({
  beforeLoad: requireOpsAccess("accounting"),
  component: OpsAccounting,
});

function OpsAccounting() {
  return (
    <div className="p-2" dir="rtl">
      <AccountingPage />
    </div>
  );
}