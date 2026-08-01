import { createFileRoute } from "@tanstack/react-router";
import TablesPage from "@/pages/tables";

export const Route = createFileRoute("/dashboard/tables")({
  component: TablesPage,
});
