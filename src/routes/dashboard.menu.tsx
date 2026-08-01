import { createFileRoute } from "@tanstack/react-router";
import MenuPage from "@/pages/menu";

export const Route = createFileRoute("/dashboard/menu")({
  component: MenuPage,
});
