
import { createFileRoute } from "@tanstack/react-router";
import { SettingsHubView } from "@/pages/settings-views/HubView";
export const Route = createFileRoute("/account/settings/")({
  component: () => <SettingsHubView basePath="/account/settings" />
});
