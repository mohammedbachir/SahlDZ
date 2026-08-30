import { createFileRoute } from "@tanstack/react-router";
import ActivationPage from "@/pages/activation-page";

export const Route = createFileRoute("/activate")({
  component: ActivationPage,
});
