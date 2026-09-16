import { createFileRoute } from "@tanstack/react-router";
import { WelcomeSettingsPageView } from "@/pages/settings-views/WelcomeSettingsPageView";
export const Route = createFileRoute("/dashboard/settings/welcome")({
  component: WelcomeSettingsPageView
});