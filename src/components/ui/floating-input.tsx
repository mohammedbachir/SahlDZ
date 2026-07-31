import { forwardRef, useState, type InputHTMLAttributes } from "react";

interface FloatingInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  hint?: string;
}

export const FloatingInput = forwardRef<HTMLInputElement, FloatingInputProps>(
  ({ label, error, hint, className = "", ...props }, ref) => {
    const [isFocused, setIsFocused] = useState(false);
    const [hasValue, setHasValue] = useState(false);

    return (
      <div className="relative">
        <input
          ref={ref}
          type={props.type || "text"}
          className={`
            peer w-full px-4 pt-6 pb-2 rounded-xl
            border-2 bg-transparent outline-none transition-all duration-200
            ${error ? "border-red-500 focus:border-red-500" : "border-[var(--border)] focus:border-[#D4A853]"}
            ${isFocused ? "shadow-[0_0_0_3px_rgba(212,168,83,0.15)]" : ""}
            ${className}
          `}
          placeholder=" "
          onFocus={() => setIsFocused(true)}
          onBlur={(e) => {
            setIsFocused(false);
            setHasValue(!!e.target.value);
            props.onBlur?.(e);
          }}
          onChange={(e) => {
            setHasValue(!!e.target.value);
            props.onChange?.(e);
          }}
          {...props}
        />
        <label
          className={`
            absolute right-4 transition-all duration-200 pointer-events-none
            ${isFocused || hasValue || props.value
              ? "top-2 text-xs"
              : "top-1/2 -translate-y-1/2 text-sm"
            }
            ${error ? "text-red-500" : isFocused ? "text-[#D4A853]" : "text-[var(--muted-foreground)]"}
          `}
        >
          {label}
        </label>
        {error && (
          <p className="mt-1 text-xs text-red-500">{error}</p>
        )}
        {hint && !error && (
          <p className="mt-1 text-xs text-[var(--muted-foreground)]">{hint}</p>
        )}
      </div>
    );
  }
);

FloatingInput.displayName = "FloatingInput";
