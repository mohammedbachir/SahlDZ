import { createFileRoute } from "@tanstack/react-router";
import { requireOpsAccess } from "@/lib/permissions";
import { OpsOverview } from "@/components/ops-overview";

export const Route = createFileRoute("/ops/")({
  beforeLoad: requireOpsAccess("overview"),
  component: OpsOverview,
});
