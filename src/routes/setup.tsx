import { createFileRoute } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/setup")({
  component: Setup,
});

function Setup() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4" dir="rtl">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-amber-700">إنشاء مطعمك</CardTitle>
          <CardDescription>
            صفحة الإعداد غير مرفوعة في هذه النسخة من المشروع (وضع المعاينة).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild className="w-full bg-amber-600 hover:bg-amber-700">
            <Link to="/dashboard">الانتقال إلى لوحة التحكم</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
