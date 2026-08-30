import { createFileRoute } from "@tanstack/react-router";
import MobileDashboard from "@/pages/mobile-dashboard";

export const Route = createFileRoute("/mobile/")({
  component: MobileDashboard,
});
