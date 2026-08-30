import { createFileRoute } from "@tanstack/react-router";
import MobileNotifications from "@/pages/mobile-notifications";

export const Route = createFileRoute("/mobile/notifications")({
  component: MobileNotifications,
});
