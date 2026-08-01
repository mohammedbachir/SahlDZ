import { createFileRoute } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";

export const Route = createFileRoute("/ops/complaints")({
  component: OpsComplaints,
});

function OpsComplaints() {
  return (
    <Card className="p-8 text-center">
      <h2 className="text-lg font-bold text-amber-700">الشكاوى</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        هذه الصفحة غير مرفوعة في هذه النسخة من المشروع (وضع المعاينة).
      </p>
    </Card>
  );
}
