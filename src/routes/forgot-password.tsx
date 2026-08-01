import { createFileRoute } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/forgot-password")({
  component: ForgotPassword,
});

function ForgotPassword() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4" dir="rtl">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-amber-700">استعادة كلمة المرور</CardTitle>
          <CardDescription>
            صفحة استعادة كلمة المرور غير مرفوعة في هذه النسخة من المشروع (وضع المعاينة).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild variant="outline" className="w-full">
            <Link to="/login">العودة إلى تسجيل الدخول</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
