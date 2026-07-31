import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";

function Logo({ size = 40 }: { size?: number }) {
  return (
    <div
      className="flex items-center justify-center rounded-lg bg-[var(--primary)]"
      style={{ width: size, height: size }}
    >
      <span className="text-white font-bold" style={{ fontSize: size * 0.4 }}>
        S
      </span>
    </div>
  );
}

export function AuthShell({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer: ReactNode;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--background)] px-4 py-10">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <Link
          to="/"
          className="flex items-center justify-center gap-2 mb-6 hover:opacity-80 transition-opacity"
        >
          <Logo size={36} />
          <span className="font-bold text-lg text-[var(--foreground)]">Sahl DZ</span>
        </Link>

        {/* Card */}
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-6">
          {/* Header */}
          <div className="text-center mb-6">
            <h1 className="text-lg font-bold text-[var(--foreground)] mb-1">
              {title}
            </h1>
            <p className="text-xs text-[var(--muted-foreground)]">{subtitle}</p>
          </div>

          {/* Form */}
          {children}

          {/* Footer */}
          <div className="mt-6 text-center text-xs text-[var(--muted-foreground)]">
            {footer}
          </div>
        </div>

        {/* Bottom text */}
        <p className="text-center text-[11px] text-[var(--muted-foreground)] mt-4">
          بالدخول، أنت توافق على{" "}
          <a href="#" className="text-[var(--primary)] hover:underline">
            شروط الاستخدام
          </a>{" "}
          و{" "}
          <a href="#" className="text-[var(--primary)] hover:underline">
            سياسة الخصوصية
          </a>
        </p>
      </div>
    </div>
  );
}
