import { createFileRoute } from "@tanstack/react-router";
import { TakeawaySettingsPageView } from "@/pages/settings-views/TakeawaySettingsPageView";
export const Route = createFileRoute("/dashboard/settings/takeaway")({
  component: TakeawaySettingsPageView
});