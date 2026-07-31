import { forwardRef, type ButtonHTMLAttributes } from "react";

interface GlowButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "outline" | "ghost";
  size?: "sm" | "md" | "lg";
  glow?: boolean;
}

export const GlowButton = forwardRef<HTMLButtonElement, GlowButtonProps>(
  (
    {
      children,
      variant = "primary",
      size = "md",
      glow = true,
      className = "",
      ...props
    },
    ref
  ) => {
    const baseStyles =
      "inline-flex items-center justify-center font-semibold rounded-full transition-all duration-300";

    const variants = {
      primary:
        "bg-gradient-to-r from-[#D4A853] to-[#B8943F] text-white hover:from-[#E0B45F] hover:to-[#C9A44F]",
      outline:
        "border-2 border-[#D4A853] text-[#D4A853] hover:bg-[#D4A853] hover:text-white",
      ghost: "text-[#D4A853] hover:bg-[#D4A853]/10",
    };

    const sizes = {
      sm: "px-4 py-2 text-sm",
      md: "px-6 py-3 text-base",
      lg: "px-8 py-4 text-lg",
    };

    const glowStyle = glow
      ? "shadow-[0_4px_20px_-4px_rgba(212,168,83,0.4)] hover:shadow-[0_8px_30px_-6px_rgba(212,168,83,0.5)]"
      : "";

    return (
      <button
        ref={ref}
        className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${glowStyle} hover:-translate-y-0.5 active:translate-y-0 ${className}`}
        {...props}
      >
        {children}
      </button>
    );
  }
);

GlowButton.displayName = "GlowButton";
