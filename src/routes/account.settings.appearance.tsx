import { createFileRoute } from "@tanstack/react-router";
import { AppearanceSettingsPageView } from "@/pages/settings-views/AppearanceSettingsPageView";
export const Route = createFileRoute("/account/settings/appearance")({
  component: AppearanceSettingsPageView
});