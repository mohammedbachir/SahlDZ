import { createFileRoute } from "@tanstack/react-router";
import AccountingPage from "@/pages/accounting";

export const Route = createFileRoute("/ops/accounting")({
  component: OpsAccounting,
});

function OpsAccounting() {
  return (
    <div className="p-2" dir="rtl">
      <AccountingPage />
    </div>
  );
}