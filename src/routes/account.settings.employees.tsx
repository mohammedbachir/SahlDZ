import { createFileRoute } from "@tanstack/react-router";
import { EmployeesSettingsPageView } from "@/pages/settings-views/EmployeesSettingsPageView";
export const Route = createFileRoute("/account/settings/employees")({
  component: EmployeesSettingsPageView
});