import { createFileRoute } from "@tanstack/react-router";
import { PublicMenuPage } from "@/pages/public-menu-page";

export const Route = createFileRoute("/t/$token")({
  component: TakeawayRoute,
});

function TakeawayRoute() {
  const { token } = Route.useParams();
  return <PublicMenuPage token={token} mode="takeaway" />;
}
