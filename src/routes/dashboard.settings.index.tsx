
import { createFileRoute } from "@tanstack/react-router";
import { SettingsHubView } from "@/pages/settings-views/HubView";
export const Route = createFileRoute("/dashboard/settings/")({
  component: () => <SettingsHubView basePath="/dashboard/settings" />
});
