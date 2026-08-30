import { createFileRoute } from "@tanstack/react-router";
import MobileSettings from "@/pages/mobile-settings";

export const Route = createFileRoute("/mobile/settings")({
  component: MobileSettings,
});
