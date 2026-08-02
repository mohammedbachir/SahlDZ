import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/ops/employees")({
  component: OpsEmployeesLayout,
});

function OpsEmployeesLayout() {
  return <Outlet />;
}
