import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { ChevronLeft, ArrowRight, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function StaffAvatar({ icon: Icon, sm }: { icon: LucideIcon; sm?: boolean }) {
  return (
    <div
      className={cn(
        "flex items-center justify-center shrink-0 rounded-xl bg-gradient-to-br from-[var(--primary)]/30 to-[var(--accent)]/10 text-[var(--primary)] ring-1 ring-[var(--primary)]/25",
        sm ? "w-8 h-8 rounded-lg" : "w-11 h-11"
      )}
    >
      <Icon className={sm ? "w-4 h-4" : "w-5 h-5"} />
    </div>
  );
}

export function LoginLogo({ icon: Icon }: { icon: LucideIcon }) {
  return (
    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[var(--primary)] to-[var(--accent)] flex items-center justify-center shadow-lg shadow-[var(--primary)]/25 ring-1 ring-white/10">
      <Icon className="w-8 h-8 text-[var(--primary-foreground)]" />
    </div>
  );
}

export function RestaurantPill({ name }: { name: string }) {
  return (
    <span className="inline-flex items-center rounded-full bg-[var(--muted)]/80 border border-[var(--border)] px-3 py-1 text-xs font-medium text-[var(--muted-foreground)]">
      {name}
    </span>
  );
}

export function StaffAccountButton({
  icon,
  label,
  onClick,
}: {
  icon: LucideIcon;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group w-full flex items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--card)] px-4 py-3 text-right transition-all duration-200 hover:border-[var(--primary)]/60 hover:bg-[var(--muted)]/50 hover:shadow-md active:scale-[0.985]"
    >
      <StaffAvatar icon={icon} />
      <span className="flex-1 font-semibold text-sm text-[var(--foreground)]">{label}</span>
      <span className="text-[var(--muted-foreground)] transition-all group-hover:-translate-x-0.5 group-hover:text-[var(--primary)]">
        <ChevronLeft className="w-4 h-4" />
      </span>
    </button>
  );
}

export function PinBackButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="رجوع"
      className="flex items-center justify-center w-10 h-10 rounded-full border border-[var(--border)] text-[var(--muted-foreground)] transition-all hover:border-[var(--primary)]/60 hover:text-[var(--foreground)] hover:bg-[var(--muted)]"
    >
      <ArrowRight className="w-4 h-4" />
    </button>
  );
}

export function BackHomeLink({ label }: { label: string }) {
  return (
    <Link
      to="/"
      className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] px-4 py-2 text-xs font-medium text-[var(--muted-foreground)] transition-colors hover:border-[var(--primary)]/50 hover:text-[var(--primary)]"
    >
      {label}
    </Link>
  );
}

export function StaffPinInput({
  onSubmit,
  submitting,
  length,
}: {
  onSubmit: (pin: string) => void;
  submitting: boolean;
  length: number;
}) {
  const [digits, setDigits] = useState<string[]>(Array(length).fill(""));
  const [refs] = useState<(HTMLInputElement | null)[]>(() => Array.from({ length }, () => null));

  function handleChange(index: number, value: string) {
    if (value.length > 1) value = value.slice(-1);
    if (!/^\d*$/.test(value)) return;
    const newDigits = [...digits];
    newDigits[index] = value;
    setDigits(newDigits);
    if (value && index < length - 1) refs[index + 1]?.focus();
    if (newDigits.every((d) => d !== "")) onSubmit(newDigits.join(""));
  }

  function handleKeyDown(index: number, e: React.KeyboardEvent) {
    if (e.key === "Backspace" && !digits[index] && index > 0) refs[index - 1]?.focus();
  }

  return (
    <div className="flex gap-2.5 justify-center" dir="ltr">
      {digits.map((d, i) => (
        <input
          key={i}
          ref={(el) => {
            refs[i] = el;
          }}
          type="tel"
          inputMode="numeric"
          maxLength={1}
          value={d}
          onChange={(e) => handleChange(i, e.target.value)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          disabled={submitting}
          className={cn(
            "w-11 h-14 text-center text-xl font-bold rounded-xl transition-all duration-150 bg-[var(--card)] text-[var(--foreground)] outline-none disabled:opacity-50",
            d
              ? "border-2 border-[var(--primary)]/70 shadow-sm shadow-[var(--primary)]/20"
              : "border-2 border-[var(--border)] focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/25"
          )}
        />
      ))}
    </div>
  );
}