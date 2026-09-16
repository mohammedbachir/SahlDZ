import { createFileRoute } from "@tanstack/react-router";
import { TakeawaySettingsPageView } from "@/pages/settings-views/TakeawaySettingsPageView";
export const Route = createFileRoute("/account/settings/takeaway")({
  component: TakeawaySettingsPageView
});