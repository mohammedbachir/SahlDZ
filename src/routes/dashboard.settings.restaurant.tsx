import { createFileRoute } from "@tanstack/react-router";
import { RestaurantSettingsPageView } from "@/pages/settings-views/RestaurantSettingsPageView";
export const Route = createFileRoute("/dashboard/settings/restaurant")({
  component: RestaurantSettingsPageView
});