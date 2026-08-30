import { createFileRoute } from "@tanstack/react-router";
import DownloadPage from "@/pages/download-page";

export const Route = createFileRoute("/dashboard/download")({
  component: DownloadPage,
});
