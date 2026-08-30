import { createFileRoute } from "@tanstack/react-router";
import MobileLoginPage from "@/pages/mobile-login";

export const Route = createFileRoute("/mobile/login")({
  component: MobileLoginPage,
});
