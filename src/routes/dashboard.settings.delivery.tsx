import { createFileRoute } from "@tanstack/react-router";
import { DeliverySettingsPageView } from "@/pages/settings-views/DeliverySettingsPageView";
export const Route = createFileRoute("/dashboard/settings/delivery")({
  component: DeliverySettingsPageView
});