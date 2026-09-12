import { createFileRoute, Outlet } from "@tanstack/react-router";
import { requireOpsAccess } from "@/lib/permissions";

export const Route = createFileRoute("/ops/employees")({
  beforeLoad: requireOpsAccess("employees"),
  component: OpsEmployeesLayout,
});

function OpsEmployeesLayout() {
  return <Outlet />;
}
