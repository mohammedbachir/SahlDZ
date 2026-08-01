import { createFileRoute } from "@tanstack/react-router";
import AnalyticsPage from "@/pages/analytics";

export const Route = createFileRoute("/dashboard/analytics")({
  component: AnalyticsPage,
});
