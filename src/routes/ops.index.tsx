import { createFileRoute } from "@tanstack/react-router";
import { OpsOverview } from "@/components/ops-overview";

export const Route = createFileRoute("/ops/")({
  component: OpsOverview,
});
