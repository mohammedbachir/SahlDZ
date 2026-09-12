import { createFileRoute } from "@tanstack/react-router";
import MobileInventory from "@/pages/mobile-inventory";

export const Route = createFileRoute("/mobile/inventory")({
  component: MobileInventory,
});