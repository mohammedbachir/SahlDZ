import "../lib/i18n";
import "../styles.css";
import { Outlet, createRootRoute, HeadContent, Scripts } from "@tanstack/react-router";
import { Toaster } from "sonner";

export const Route = createRootRoute({
  component: RootComponent,
  notFoundComponent: NotFound,
});

function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background" dir="rtl">
      <div className="text-center space-y-4">
        <div className="text-6xl font-bold text-[var(--primary)]">404</div>
        <h1 className="text-xl font-bold text-foreground">الصفحة غير موجودة</h1>
        <p className="text-sm text-muted-foreground">الصفحة التي تبحث عنها غير موجودة أو تم نقلها.</p>
        <a href="/" className="inline-block px-6 py-2 rounded-xl bg-[var(--primary)] text-[#1a1612] font-semibold text-sm hover:bg-[var(--primary)]/90 transition-colors">
          العودة للرئيسية
        </a>
      </div>
    </div>
  );
}

function RootComponent() {
  return (
    <html lang="ar" dir="rtl">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <HeadContent />
      </head>
      <body className="min-h-screen bg-background font-sans antialiased">
        <Outlet />
        <Toaster position="top-left" richColors dir="rtl" />
        <Scripts />
      </body>
    </html>
  );
}
