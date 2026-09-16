import { createFileRoute } from "@tanstack/react-router";
import { AppearanceSettingsPageView } from "@/pages/settings-views/AppearanceSettingsPageView";
export const Route = createFileRoute("/dashboard/settings/appearance")({
  component: AppearanceSettingsPageView
});