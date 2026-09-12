import "../lib/i18n";
import "../styles.css";
import { useEffect } from "react";
import {
  Outlet,
  createRootRoute,
  HeadContent,
  Scripts,
  useNavigate,
} from "@tanstack/react-router";
import { Toaster } from "sonner";
import { tx } from "@/lib/ops-tx";
import { getAutoScreenPath } from "@/lib/kiosk-session";

export const Route = createRootRoute({
  component: RootComponent,
  notFoundComponent: NotFound,
});

function NotFound() {
  return (
    <div
      className="min-h-screen flex items-center justify-center bg-background"
      dir="rtl"
    >
      <div className="text-center space-y-4">
        <div className="text-6xl font-bold text-[var(--primary)]">404</div>
        <h1 className="text-xl font-bold text-foreground">
          {tx("common.pageNotFound")}
        </h1>
        <p className="text-sm text-muted-foreground">
          {tx("common.pageNotFoundDesc")}
        </p>
        <a
          href="/"
          className="inline-block px-6 py-2 rounded-xl bg-[var(--primary)] text-[#1a1612] font-semibold text-sm hover:bg-[var(--primary)]/90 transition-colors"
        >
          {tx("common.backToHome")}
        </a>
      </div>
    </div>
  );
}

const KIOSK_GENERIC_PATHS = [
  "/",
  "/waiter-login",
  "/kitchen-login",
  "/cashier-login",
];

function KioskAutoRoute() {
  const navigate = useNavigate();
  useEffect(() => {
    const here = window.location.pathname;
    if (!KIOSK_GENERIC_PATHS.includes(here)) return;
    const target = getAutoScreenPath();
    if (target && target !== here) {
      navigate({ to: target, replace: true });
    }
  }, [navigate]);
  return null;
}

function RootComponent() {
  return (
    <html lang="ar" dir="rtl">
      <head>
        <meta charSet="utf-8" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, viewport-fit=cover"
        />
        <meta name="theme-color" content="#F59E0B" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta
          name="apple-mobile-web-app-status-bar-style"
          content="black-translucent"
        />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <HeadContent />
      </head>
      <body className="min-h-screen bg-background font-sans antialiased">
        <KioskAutoRoute />
        <Outlet />
        <Toaster position="top-left" richColors dir="rtl" />
        <Scripts />
      </body>
    </html>
  );
}
