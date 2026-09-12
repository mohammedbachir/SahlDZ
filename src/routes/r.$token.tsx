import { createFileRoute } from "@tanstack/react-router";
import { PublicMenuPage } from "@/pages/public-menu-page";

export const Route = createFileRoute("/r/$token")({
  component: TableRoute,
});

function TableRoute() {
  const { token } = Route.useParams();
  return <PublicMenuPage token={token} mode="dine_in" />;
}
