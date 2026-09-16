import { createFileRoute } from "@tanstack/react-router";
import { EmployeesSettingsPageView } from "@/pages/settings-views/EmployeesSettingsPageView";
export const Route = createFileRoute("/dashboard/settings/employees")({
  component: EmployeesSettingsPageView
});