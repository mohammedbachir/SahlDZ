import { useEffect, useRef, useState, type FormEvent } from "react";
import { Loader2, KeyRound } from "lucide-react";

const LAST_CODE_KEY = "sahl_dz_last_code";

export function RestaurantCodeStep({
  onResolve,
}: {
  onResolve: (code: string) => Promise<boolean>;
}) {
  const [code, setCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const last = localStorage.getItem(LAST_CODE_KEY);
    if (last) setCode(last);
    inputRef.current?.focus();
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (submitting) return;
    const normalized = code.trim().toUpperCase();
    if (normalized.length < 8) return;
    setSubmitting(true);
    const ok = await onResolve(normalized);
    setSubmitting(false);
    if (ok) localStorage.setItem(LAST_CODE_KEY, normalized);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex flex-col items-center gap-2.5 text-center">
        <div className="w-12 h-12 rounded-2xl bg-[var(--muted)] border border-[var(--border)] flex items-center justify-center">
          <KeyRound className="w-5 h-5 text-[var(--primary)]" />
        </div>
        <div className="space-y-1">
          <p className="text-sm font-semibold text-[var(--foreground)]">أدخل كود المطعم</p>
          <p className="text-xs text-[var(--muted-foreground)] leading-5">
            الكود يعطيك إياه صاحب المطعم أو المدير
          </p>
        </div>
      </div>
      <div className="relative">
        <input
          ref={inputRef}
          dir="ltr"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder="REST-XXXX-XXXX"
          autoComplete="off"
          spellCheck={false}
          disabled={submitting}
          className="w-full text-center font-mono text-sm tracking-wider rounded-xl border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)] px-3 py-3.5 focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/25 outline-none transition-all disabled:opacity-50"
        />
      </div>
      <button
        type="submit"
        disabled={submitting || code.trim().length < 8}
        className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-gradient-to-r from-[var(--primary)] to-[var(--accent)] text-[var(--primary-foreground)] font-semibold shadow-lg shadow-[var(--primary)]/25 transition-all hover:opacity-90 active:scale-[0.99] disabled:opacity-50 disabled:shadow-none"
      >
        {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
        متابعة
      </button>
    </form>
  );
}