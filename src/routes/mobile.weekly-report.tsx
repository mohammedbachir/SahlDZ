import { createFileRoute } from "@tanstack/react-router";
import MobileWeeklyReport from "@/pages/mobile-weekly-report";

export const Route = createFileRoute("/mobile/weekly-report")({
  component: MobileWeeklyReport,
});
