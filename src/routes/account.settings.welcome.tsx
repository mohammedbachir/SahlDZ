import { createFileRoute } from "@tanstack/react-router";
import { WelcomeSettingsPageView } from "@/pages/settings-views/WelcomeSettingsPageView";
export const Route = createFileRoute("/account/settings/welcome")({
  component: WelcomeSettingsPageView
});