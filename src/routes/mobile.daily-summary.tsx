import { createFileRoute } from "@tanstack/react-router";
import MobileDailySummary from "@/pages/mobile-daily-summary";

export const Route = createFileRoute("/mobile/daily-summary")({
  component: MobileDailySummary,
});
