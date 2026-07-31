import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { UtensilsCrossed, ArrowRight, ArrowLeft, Loader2, User } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useServerFn } from "@tanstack/react-start";
import { getPublicWaiterList, verifyWaiterPin } from "@/lib/waiter.functions";
import { PREVIEW_RESTAURANT, previewExpiry } from "@/lib/preview-mode";

export const Route = createFileRoute("/waiter-login")({
  validateSearch: (s) => ({
    rid: typeof s.rid === "string" ? s.rid : "",
  }),
  component: Page,
});

function PinInput({
  onSubmit,
  submitting,
}: {
  onSubmit: (pin: string) => void;
  submitting: boolean;
}) {
  const [digits, setDigits] = useState<string[]>(Array(6).fill(""));
  const inputs = useRef<Array<HTMLInputElement | null>>([]);

  useEffect(() => { inputs.current[0]?.focus(); }, []);

  function setDigit(i: number, v: string) {
    const clean = v.replace(/\D/g, "");
    if (clean.length > 1) {
      const chars = clean.slice(0, 6 - i).split("");
      setDigits((prev) => {
        const next = [...prev];
        chars.forEach((ch, offset) => { next[i + offset] = ch; });
        return next;
      });
      inputs.current[Math.min(i + chars.length, 5)]?.focus();
      return;
    }
    setDigits((prev) => { const next = [...prev]; next[i] = clean; return next; });
    if (clean && i < 5) inputs.current[i + 1]?.focus();
  }

  function onKeyDown(i: number, e: React.KeyboardEvent) {
    if (e.key === "Backspace" && !digits[i] && i > 0) inputs.current[i - 1]?.focus();
    if (e.key === "Enter") {
      const pin = inputs.current.map((el) => el?.value ?? "").join("").replace(/\s/g, "");
      if (pin.length >= 4) onSubmit(pin);
    }
  }

  function handleSubmit() {
    const pin = inputs.current.map((el) => el?.value ?? "").join("").replace(/\s/g, "");
    onSubmit(pin);
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-center gap-2" dir="ltr">
        {Array.from({ length: 6 }).map((_, i) => (
          <input
            key={i}
            ref={(el) => { inputs.current[i] = el; }}
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={1}
            value={digits[i]}
            onChange={(e) => setDigit(i, e.target.value)}
            onPaste={(e) => { e.preventDefault(); setDigit(i, e.clipboardData.getData("text")); }}
            onKeyDown={(e) => onKeyDown(i, e)}
            disabled={submitting}
            className="w-10 h-12 text-center text-xl font-bold rounded-lg border border-[var(--border)] focus:border-[var(--primary)] outline-none transition-colors bg-[var(--background)]"
          />
        ))}
      </div>
      <Button
        type="button"
        onClick={handleSubmit}
        disabled={submitting}
        className="w-full h-10 text-sm font-bold"
      >
        {submitting && <Loader2 className="w-4 h-4 animate-spin ms-2" />}
        دخول
      </Button>
    </div>
  );
}

function Page() {
  const { rid } = Route.useSearch();
  const navigate = useNavigate();
  const fetchList = useServerFn(getPublicWaiterList);
  const verify = useServerFn(verifyWaiterPin);

  const [restaurantName, setRestaurantName] = useState("");
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  type WaiterItem = { id: string; name: string };
  const [waiters, setWaiters] = useState<WaiterItem[]>([]);
  const [selected, setSelected] = useState<WaiterItem | null>(null);
  const previewMode = !rid;

  useEffect(() => {
    if (previewMode) {
      setRestaurantName(PREVIEW_RESTAURANT.name);
      setWaiters([
        { id: "mock-w1", name: "أمين" },
        { id: "mock-w2", name: "سارة" },
      ]);
      setLoading(false);
      return;
    }
    fetchList({ data: { restaurantId: rid } })
      .then((res) => {
        if (!res.found) { toast.error("المطعم غير موجود"); return; }
        setRestaurantName(res.name);
        setLogoUrl(res.logo_url);
        setWaiters(res.waiters);
      })
      .catch(() => toast.error("فشل التحميل"))
      .finally(() => setLoading(false));
  }, [rid]);

  async function handleSubmit(pin: string) {
    if (!selected) return;
    if (submitting) return;
    if (pin.length < 4) { toast.error("PIN من 4 إلى 6 أرقام"); return; }
    setSubmitting(true);
    if (previewMode) {
      sessionStorage.setItem("waiter_token", "mock_waiter");
      sessionStorage.setItem("waiter_expires", previewExpiry());
      sessionStorage.setItem("waiter_name", selected.name);
      sessionStorage.setItem("waiter_id", selected.id);
      sessionStorage.setItem("waiter_restaurant", JSON.stringify(PREVIEW_RESTAURANT));
      toast.success(`أهلاً ${selected.name} (معاينة)`);
      setSubmitting(false);
      navigate({ to: "/waiter-screen" });
      return;
    }
    try {
      const res = await verify({ data: { waiterId: selected.id, pin } });
      sessionStorage.setItem("waiter_token", res.token);
      sessionStorage.setItem("waiter_expires", res.expiresAt);
      sessionStorage.setItem("waiter_name", res.waiterName);
      sessionStorage.setItem("waiter_id", res.waiterId);
      sessionStorage.setItem("waiter_restaurant", JSON.stringify(res.restaurant));
      toast.success(`أهلاً ${res.waiterName}`);
      navigate({ to: "/waiter-screen" });
    } catch (e) {
      toast.error((e as Error).message || "رمز خاطئ");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[var(--background)] px-4">
      <div className="w-full max-w-sm bg-[var(--card)] border border-[var(--border)] rounded-xl p-6 space-y-5">
        <div className="flex flex-col items-center text-center">
          {logoUrl ? (
            <img src={logoUrl} alt="" className="w-16 h-16 rounded-lg object-cover mb-3" />
          ) : (
            <div className="w-16 h-16 rounded-lg bg-[var(--primary)] flex items-center justify-center mb-3">
              <UtensilsCrossed className="w-8 h-8 text-[var(--primary-foreground)]" />
            </div>
          )}
          <h1 className="text-lg font-bold text-[var(--foreground)]">دخول الويتر</h1>
          {restaurantName && <p className="text-xs text-[var(--muted-foreground)] mt-1">{restaurantName}</p>}
          {previewMode && (
            <span className="text-[10px] font-bold text-[var(--primary)] bg-[var(--primary)]/10 rounded-md px-2 py-0.5 mt-2">
              وضع معاينة — بدون اتصال
            </span>
          )}
        </div>

        {loading && (
          <div className="flex justify-center py-4">
            <Loader2 className="w-5 h-5 animate-spin text-[var(--muted-foreground)]" />
          </div>
        )}

        {!loading && !selected && (rid || previewMode) && (
          <div className="space-y-2">
            <p className="text-xs text-[var(--muted-foreground)] text-center">اختر حسابك</p>
            {waiters.length === 0 ? (
              <p className="text-sm text-center text-[var(--muted-foreground)] py-4">
                لا توجد حسابات — أضفها من لوحة التحكم
              </p>
            ) : (
              waiters.map((w) => (
                <button
                  key={w.id}
                  onClick={() => setSelected(w)}
                  className="w-full flex items-center gap-3 rounded-lg border border-[var(--border)] hover:border-[var(--primary)]/50 px-3 py-2.5 transition-colors text-right"
                >
                  <div className="w-9 h-9 rounded-lg bg-[var(--muted)] flex items-center justify-center shrink-0">
                    <User className="w-4 h-4 text-[var(--muted-foreground)]" />
                  </div>
                  <span className="font-medium text-sm text-[var(--foreground)]">{w.name}</span>
                </button>
              ))
            )}
          </div>
        )}

        {!loading && selected && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <button onClick={() => setSelected(null)} className="text-[var(--muted-foreground)] hover:text-[var(--foreground)]">
                <ArrowLeft className="w-4 h-4" />
              </button>
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-md bg-[var(--muted)] flex items-center justify-center">
                  <User className="w-3.5 h-3.5 text-[var(--muted-foreground)]" />
                </div>
                <span className="font-medium text-sm text-[var(--foreground)]">{selected.name}</span>
              </div>
            </div>
            <p className="text-xs text-[var(--muted-foreground)] text-center">أدخل رمز PIN</p>
            <PinInput onSubmit={handleSubmit} submitting={submitting} />
          </div>
        )}

        <div className="text-center">
          <Link to="/" className="text-xs text-[var(--muted-foreground)] hover:text-[var(--primary)]">
            العودة للرئيسية
          </Link>
        </div>
      </div>
    </div>
  );
}
