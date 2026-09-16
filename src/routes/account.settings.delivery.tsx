import { createFileRoute } from "@tanstack/react-router";
import { DeliverySettingsPageView } from "@/pages/settings-views/DeliverySettingsPageView";
export const Route = createFileRoute("/account/settings/delivery")({
  component: DeliverySettingsPageView
});