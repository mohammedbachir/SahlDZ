import type { ReactNode } from "react";

interface SectionHeaderProps {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  subtitle?: string;
  action?: ReactNode;
  centered?: boolean;
}

export function SectionHeader({
  icon: Icon,
  title,
  subtitle,
  action,
  centered = false,
}: SectionHeaderProps) {
  return (
    <div
      className={`flex items-center gap-4 mb-6 ${
        centered ? "justify-center" : "justify-between"
      } flex-wrap`}
    >
      <div
        className={`flex items-center gap-4 ${
          centered ? "text-center flex-col" : ""
        }`}
      >
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#D4A853] to-[#B8943F] flex items-center justify-center shadow-lg shadow-[#D4A853]/20">
          <Icon className="w-6 h-6 text-white" />
        </div>
        <div>
          <h2 className="text-xl md:text-2xl font-bold text-[var(--foreground)] tracking-tight">
            {title}
          </h2>
          {subtitle && (
            <p className="text-sm text-[var(--muted-foreground)] mt-0.5">
              {subtitle}
            </p>
          )}
        </div>
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}
