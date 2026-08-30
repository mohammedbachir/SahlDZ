import { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PinInputProps {
  onSubmit: (pin: string) => void;
  submitting: boolean;
  disabled?: boolean;
  length?: number;
  buttonLabel?: string;
}

export function PinInput({
  onSubmit,
  submitting,
  disabled = false,
  length = 4,
  buttonLabel = "دخول",
}: PinInputProps) {
  const [digits, setDigits] = useState<string[]>(Array(length).fill(""));
  const inputs = useRef<Array<HTMLInputElement | null>>([]);

  useEffect(() => {
    inputs.current[0]?.focus();
  }, []);

  function setDigit(i: number, v: string) {
    const clean = v.replace(/\D/g, "");
    if (clean.length > 1) {
      const chars = clean.slice(0, length - i).split("");
      setDigits((prev) => {
        const next = [...prev];
        chars.forEach((ch, offset) => {
          next[i + offset] = ch;
        });
        return next;
      });
      inputs.current[Math.min(i + chars.length, length - 1)]?.focus();
      return;
    }
    setDigits((prev) => {
      const next = [...prev];
      next[i] = clean;
      return next;
    });
    if (clean && i < length - 1) inputs.current[i + 1]?.focus();
  }

  function onKeyDown(i: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace" && !digits[i] && i > 0)
      inputs.current[i - 1]?.focus();
    if (e.key === "Enter") {
      const pin = inputs.current
        .map((el) => el?.value ?? "")
        .join("")
        .replace(/\s/g, "");
      if (pin.length >= 4) onSubmit(pin);
    }
  }

  function handleSubmit() {
    const pin = inputs.current
      .map((el) => el?.value ?? "")
      .join("")
      .replace(/\s/g, "");
    onSubmit(pin);
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-center gap-2" dir="ltr">
        {Array.from({ length }).map((_, i) => (
          <input
            key={i}
            ref={(el) => {
              inputs.current[i] = el;
            }}
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={1}
            value={digits[i]}
            onChange={(e) => setDigit(i, e.target.value)}
            onPaste={(e) => {
              e.preventDefault();
              setDigit(i, e.clipboardData.getData("text"));
            }}
            onKeyDown={(e) => onKeyDown(i, e)}
            disabled={submitting || disabled}
            className="w-11 h-13 text-center text-2xl font-bold rounded-lg border border-[var(--border)] focus:border-[var(--primary)] outline-none transition-colors bg-[var(--background)]"
          />
        ))}
      </div>
      <Button
        type="button"
        onClick={handleSubmit}
        disabled={submitting || disabled}
        className="w-full h-10 text-sm font-bold"
      >
        {submitting && <Loader2 className="w-4 h-4 animate-spin ms-2" />}
        {buttonLabel}
      </Button>
    </div>
  );
}
