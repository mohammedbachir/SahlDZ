import type { ReactNode } from "react";

interface GradientTextProps {
  children: ReactNode;
  className?: string;
  variant?: "primary" | "gold" | "hero";
}

export function GradientText({
  children,
  className = "",
  variant = "primary",
}: GradientTextProps) {
  const variants = {
    primary: "text-gradient-primary",
    gold: "text-gradient-gold",
    hero: "bg-gradient-to-r from-amber-400 via-yellow-500 to-amber-400 bg-clip-text text-transparent",
  };

  return (
    <span className={`${variants[variant]} ${className}`}>
      {children}
    </span>
  );
}
