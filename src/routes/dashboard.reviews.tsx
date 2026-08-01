import { createFileRoute } from "@tanstack/react-router";
import ReviewsPage from "@/pages/reviews";

export const Route = createFileRoute("/dashboard/reviews")({
  component: ReviewsPage,
});
