import { createFileRoute } from "@tanstack/react-router";
import DownloadPage from "@/pages/download-page";
import { DownloadBanner } from "@/components/download-banner";

export const Route = createFileRoute("/download")({
  component: DownloadPageRoute,
});

function DownloadPageRoute() {
  return (
    <div className="min-h-screen bg-[var(--background)]" dir="rtl">
      <DownloadBanner />
      <div className="pb-16">
        <DownloadPage />
      </div>
    </div>
  );
}
