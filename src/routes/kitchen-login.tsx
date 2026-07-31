import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { ChefHat, ArrowRight, Loader2, ArrowLeft, User } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useServerFn } from "@tanstack/react-start";
import { getPublicChefList, verifyIndividualChefPin } from "@/lib/individual-chef.functions";
import { PREVIEW_RESTAURANT, previewExpiry } from "@/lib/preview-mode";
import { useTranslation } from "react-i18next";

export const Route = createFileRoute("/kitchen-login")({
  validateSearch: (s) => ({
    // `r` is the legacy shared-login param — accept it as an alias so old
    // printed/saved kitchen links keep working.
    rid: typeof s.rid === "string" && s.rid ? s.rid : typeof s.r === "string" ? s.r : "",
  }),
  component: Page,
});

function PinInput({
  onSubmit,
  submitting,
  disabled,
  length = 4,
}: {
  onSubmit: (pin: string) => void;
  submitting: boolean;
  disabled?: boolean;
  length?: number;
}) {
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
        chars.forEach((ch, offset) => { next[i + offset] = ch; });
        return next;
      });
      inputs.current[Math.min(i + chars.length, length - 1)]?.focus();
      return;
    }
    setDigits((prev) => { const next = [...prev]; next[i] = clean; return next; });
    if (clean && i < length - 1) inputs.current[i + 1]?.focus();
  }

  function onKeyDown(i: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace" && !digits[i] && i > 0) inputs.current[i - 1]?.focus();
    if (e.key === "Enter") {
      const pin = inputs.current.map((el) => el?.value ?? "").join("");
      if (pin.length >= 4) onSubmit(pin);
    }
  }

  function handleSubmit() {
    const pin = inputs.current.map((el) => el?.value ?? "").join("");
    onSubmit(pin);
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-center gap-2" dir="ltr">
        {Array.from({ length }).map((_, i) => (
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
        دخول
      </Button>
    </div>
  );
}

function Page() {
  const { t } = useTranslation();
  const { rid: restaurantId } = Route.useSearch();

  const navigate = useNavigate();
  const fetchChefList = useServerFn(getPublicChefList);
  const verifyIndividual = useServerFn(verifyIndividualChefPin);

  const [restaurantName, setRestaurantName] = useState("");
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [submitting, setSubmitting] = useState(false);

  type ChefItem = { id: string; name: string };
  const [chefs, setChefs] = useState<ChefItem[]>([]);
  const [selectedChef, setSelectedChef] = useState<ChefItem | null>(null);
  const [loadingList, setLoadingList] = useState(false);
  const previewMode = !restaurantId;

  useEffect(() => {
    if (previewMode) {
      setRestaurantName(PREVIEW_RESTAURANT.name);
      setLogoUrl(null);
      setChefs([{ id: "mock-c1", name: "الشيف يوسف" }]);
      setEnabled(true);
      setLoadingList(false);
      return;
    }
    setLoadingList(true);
    fetchChefList({ data: { restaurantId } })
      .then((res) => {
        if (!res.found) { toast.error(t("common.restaurantNotFound")); setEnabled(false); return; }
        setRestaurantName(res.name);
        setLogoUrl(res.logo_url);
        setChefs(res.chefs);
        setEnabled(res.chefs.length > 0);
      })
      .catch(() => { toast.error(t("common.restaurantNotFound")); setEnabled(false); })
      .finally(() => setLoadingList(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restaurantId]);

  async function submitIndividual(pin: string) {
    if (!selectedChef) return;
    if (submitting) return;
    setSubmitting(true);
    if (previewMode) {
      sessionStorage.setItem("individual_chef_token", "mock_chef");
      sessionStorage.setItem("individual_chef_expires", previewExpiry());
      sessionStorage.setItem("individual_chef_name", selectedChef.name);
      sessionStorage.setItem("individual_chef_id", selectedChef.id);
      sessionStorage.setItem("individual_chef_restaurant", JSON.stringify(PREVIEW_RESTAURANT));
      toast.success(`أهلاً ${selectedChef.name} (معاينة)`);
      setSubmitting(false);
      navigate({ to: "/kitchen-screen" });
      return;
    }
    try {
      const res = await verifyIndividual({ data: { chefId: selectedChef.id, pin } });
      sessionStorage.setItem("individual_chef_token", res.token);
      sessionStorage.setItem("individual_chef_expires", res.expiresAt);
      sessionStorage.setItem("individual_chef_name", res.chefName);
      sessionStorage.setItem("individual_chef_id", res.chefId);
      sessionStorage.setItem("individual_chef_restaurant", JSON.stringify(res.restaurant));
      toast.success(`أهلاً ${res.chefName}`);
      navigate({ to: "/kitchen-screen" });
    } catch (e) {
      toast.error((e as Error).message || t("common.wrongPin"));
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
              <ChefHat className="w-8 h-8 text-[var(--primary-foreground)]" />
            </div>
          )}
          <h1 className="text-lg font-bold text-[var(--foreground)]">دخول المطبخ</h1>
          {restaurantName && <p className="text-xs text-[var(--muted-foreground)] mt-1">{restaurantName}</p>}
          {previewMode && (
            <span className="text-[10px] font-bold text-[var(--primary)] bg-[var(--primary)]/10 rounded-md px-2 py-0.5 mt-2">
              وضع معاينة — بدون اتصال
            </span>
          )}
        </div>

        {loadingList && (
          <div className="flex justify-center py-4">
            <Loader2 className="w-5 h-5 animate-spin text-[var(--muted-foreground)]" />
          </div>
        )}

        {!loadingList && enabled === false && (
          <div className="rounded-lg bg-[var(--destructive)]/10 text-[var(--destructive)] text-sm p-3 text-center leading-6">
            {!restaurantId ? (
              <>الرابط غير صحيح. استخدم رابط شاشة المطبخ من صفحة الإعدادات.</>
            ) : (
              <>لا توجد حسابات طهاة — أضفها من لوحة التحكم (الإعدادات ← المطبخ).</>
            )}
          </div>
        )}

        {!loadingList && enabled && (
          <>
            {!selectedChef ? (
              <div className="space-y-2">
                <p className="text-xs text-[var(--muted-foreground)] text-center">اختر حسابك</p>
                <div className="space-y-2">
                  {chefs.map((chef) => (
                    <button
                      key={chef.id}
                      onClick={() => setSelectedChef(chef)}
                      className="w-full flex items-center gap-3 rounded-lg border border-[var(--border)] hover:border-[var(--primary)]/50 px-3 py-2.5 transition-colors text-right"
                    >
                      <div className="w-9 h-9 rounded-lg bg-[var(--muted)] flex items-center justify-center shrink-0">
                        <User className="w-4 h-4 text-[var(--muted-foreground)]" />
                      </div>
                      <span className="font-medium text-sm text-[var(--foreground)]">{chef.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <button onClick={() => setSelectedChef(null)} className="text-[var(--muted-foreground)] hover:text-[var(--foreground)]">
                    <ArrowLeft className="w-4 h-4" />
                  </button>
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-md bg-[var(--muted)] flex items-center justify-center">
                      <User className="w-3.5 h-3.5 text-[var(--muted-foreground)]" />
                    </div>
                    <span className="font-medium text-sm">{selectedChef.name}</span>
                  </div>
                </div>
                <p className="text-xs text-[var(--muted-foreground)] text-center">أدخل رمز PIN</p>
                <PinInput onSubmit={submitIndividual} submitting={submitting} length={6} />
              </div>
            )}
          </>
        )}

        <div className="text-center">
          <Link to="/" className="text-xs text-[var(--muted-foreground)] hover:text-[var(--primary)]">
            {t("common.backHome")}
          </Link>
        </div>
      </div>
    </div>
  );
}
