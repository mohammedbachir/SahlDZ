import { createFileRoute } from "@tanstack/react-router";
import MobileReports from "@/pages/mobile-reports";

export const Route = createFileRoute("/mobile/reports")({
  component: MobileReports,
});
