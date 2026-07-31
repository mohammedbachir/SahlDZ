import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Calculator, ArrowRight, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useServerFn } from "@tanstack/react-start";
import { verifyCashierPin, getPublicCashierLoginInfo } from "@/lib/cashier.functions";
import { PREVIEW_RESTAURANT, previewExpiry } from "@/lib/preview-mode";
import { useTranslation } from "react-i18next";

export const Route = createFileRoute("/cashier-login")({
  validateSearch: (s) => ({ r: typeof s.r === "string" ? s.r : "" }),
  component: Page,
});

function Page() {
  const { t } = useTranslation();
  const { r: restaurantId } = Route.useSearch();
  const navigate = useNavigate();
  const verify = useServerFn(verifyCashierPin);
  const fetchInfo = useServerFn(getPublicCashierLoginInfo);
  const [restaurantName, setRestaurantName] = useState<string>("");
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [digits, setDigits] = useState<string[]>(["", "", "", ""]);
  const [submitting, setSubmitting] = useState(false);
  const inputs = useRef<Array<HTMLInputElement | null>>([]);
  const previewMode = !restaurantId;

  useEffect(() => {
    if (previewMode) {
      setRestaurantName(PREVIEW_RESTAURANT.name);
      setEnabled(true);
      return;
    }
    fetchInfo({ data: { restaurantId } })
      .then((info) => {
        if (!info.found) {
          toast.error(t("common.restaurantNotFound"));
          setEnabled(false);
          return;
        }
        setRestaurantName(info.name);
        setEnabled(info.enabled);
      })
      .catch(() => {
        toast.error(t("common.restaurantNotFound"));
        setEnabled(false);
      });
    inputs.current[0]?.focus();
  }, [restaurantId]);

  function readPin() {
    const statePin = digits.join("");
    const domPin = inputs.current.map((input) => input?.value ?? "").join("");
    return /^\d{4}$/.test(statePin) ? statePin : domPin;
  }

  async function submit(pin = readPin()) {
    if (submitting) return;
    if (!/^\d{4}$/.test(pin)) {
      toast.error("أدخل رمز PIN من 4 أرقام");
      return;
    }
    if (previewMode) {
      sessionStorage.setItem("cashier_token", "mock_cashier");
      sessionStorage.setItem("cashier_expires", previewExpiry());
      sessionStorage.setItem("cashier_restaurant", JSON.stringify(PREVIEW_RESTAURANT));
      toast.success(t("common.welcome"));
      navigate({ to: "/cashier" });
      return;
    }
    setSubmitting(true);
    try {
      const res = await verify({ data: { restaurantId, pin } });
      sessionStorage.setItem("cashier_token", res.token);
      sessionStorage.setItem("cashier_expires", res.expiresAt);
      sessionStorage.setItem("cashier_restaurant", JSON.stringify(res.restaurant));
      toast.success(t("common.welcome"));
      navigate({ to: "/cashier" });
    } catch (e) {
      toast.error((e as Error).message || t("common.wrongPin"));
      setDigits(["", "", "", ""]);
      inputs.current[0]?.focus();
    } finally {
      setSubmitting(false);
    }
  }

  function setDigit(i: number, v: string) {
    const clean = v.replace(/\D/g, "");
    if (clean.length > 1) {
      const chars = clean.slice(0, 4 - i).split("");
      setDigits((prev) => {
        const next = [...prev];
        chars.forEach((ch, offset) => {
          next[i + offset] = ch;
        });
        return next;
      });
      inputs.current[Math.min(i + chars.length, 3)]?.focus();
      return;
    }
    setDigits((prev) => {
      const next = [...prev];
      next[i] = clean;
      return next;
    });
    if (clean && i < 3) inputs.current[i + 1]?.focus();
  }

  function onKeyDown(i: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace" && !digits[i] && i > 0) {
      inputs.current[i - 1]?.focus();
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[var(--background)] px-4">
      <div className="w-full max-w-sm bg-[var(--card)] border border-[var(--border)] rounded-xl p-6 space-y-5">
        <div className="flex flex-col items-center text-center">
          <div className="w-16 h-16 rounded-lg bg-[var(--primary)] flex items-center justify-center mb-3">
            <Calculator className="w-8 h-8 text-[var(--primary-foreground)]" />
          </div>
          <h1 className="text-lg font-bold text-[var(--foreground)]">{t("cashier.title")}</h1>
          {restaurantName && (
            <p className="text-xs text-[var(--muted-foreground)] mt-1">{restaurantName}</p>
          )}
          {previewMode && (
            <span className="text-[10px] font-bold text-[var(--primary)] bg-[var(--primary)]/10 rounded-md px-2 py-0.5 mt-2">
              وضع معاينة — بدون اتصال
            </span>
          )}
          <p className="text-xs text-[var(--muted-foreground)] mt-2">{t("common.enterPin")}</p>
        </div>

        <div className="flex justify-center gap-2" dir="ltr">
          {[0, 1, 2, 3].map((i) => (
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
              disabled={submitting || enabled === false}
              className="w-12 h-14 text-center text-2xl font-bold rounded-lg border border-[var(--border)] focus:border-[var(--primary)] outline-none transition-colors bg-[var(--background)]"
            />
          ))}
        </div>

        {enabled === false && (
          <div className="rounded-lg bg-[var(--destructive)]/10 text-[var(--destructive)] text-sm p-3 text-center leading-6">
            {!restaurantId ? (
              <>الرابط غير صحيح. الرجاء استخدام رابط الكاشير من صفحة الإعدادات.</>
            ) : (
              <>
                {t("cashier.disabled")}
                <br />
                {t("cashier.enableHint")}
              </>
            )}
          </div>
        )}

        <Button
          type="button"
          onClick={() => submit()}
          disabled={submitting || enabled === false}
          className="w-full h-10 text-sm font-bold"
        >
          {submitting && <Loader2 className="w-4 h-4 animate-spin ms-2" />}
          {t("common.login")}
        </Button>

        <div className="text-center">
          <Link to="/" className="text-xs text-[var(--muted-foreground)] hover:text-[var(--primary)]">
            {t("common.backHome")}
          </Link>
        </div>
      </div>
    </div>
  );
}