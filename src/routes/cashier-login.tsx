import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Calculator, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import {
  verifyCashierPin,
  getPublicCashierLoginInfo,
} from "@/lib/cashier.functions";
import { PREVIEW_RESTAURANT, previewExpiry } from "@/lib/preview-mode";
import { verifyActivationCode } from "@/lib/activation";
import { getFirebaseDb } from "@/integrations/firebase/config";
import { requireDesktop, useDesktopOnly } from "@/lib/auth";
import { RestaurantCodeStep } from "@/components/restaurant-code-step";
import {
  LoginLogo,
  RestaurantPill,
  BackHomeLink,
  StaffPinInput,
} from "@/components/staff-login-ui";
import { tx } from "@/lib/ops-tx";

const HAS_BACKEND = typeof window !== "undefined" && !!getFirebaseDb();

export const Route = createFileRoute("/cashier-login")({
  beforeLoad: requireDesktop,
  validateSearch: (s) => ({ r: typeof s.r === "string" ? s.r : "" }),
  component: Page,
});

function Page() {
  const { r: searchRid } = Route.useSearch();
  const navigate = useNavigate();
  useDesktopOnly();
  const verify = useServerFn(verifyCashierPin);
  const fetchInfo = useServerFn(getPublicCashierLoginInfo);

  const [restaurantId, setRestaurantId] = useState<string | null>(
    searchRid || null,
  );
  const [restaurantName, setRestaurantName] = useState<string>("");
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [pinKey, setPinKey] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const previewMode = !restaurantId && !HAS_BACKEND;

  useEffect(() => {
    setRestaurantId(searchRid || null);
    if (!searchRid) setLoading(false);
  }, [searchRid]);

  async function handleCode(code: string): Promise<boolean> {
    if (submitting) return false;
    setSubmitting(true);
    try {
      const v = await verifyActivationCode(code);
      if (!v.valid || !v.restaurantId) {
        toast.error("كود المطعم غير صحيح");
        return false;
      }
      setRestaurantId(v.restaurantId);
      setRestaurantName(v.restaurantName || "");
      return true;
    } catch {
      toast.error("تعذر التحقق من الكود");
      return false;
    } finally {
      setSubmitting(false);
    }
  }

  useEffect(() => {
    if (!restaurantId) return;
    setLoading(true);
    fetchInfo({ data: { restaurantId } })
      .then((info) => {
        if (!info.found) {
          toast.error(tx("common.restaurantNotFound"));
          setEnabled(false);
          return;
        }
        setRestaurantName(info.name);
        setEnabled(info.enabled);
      })
      .catch(() => {
        toast.error(tx("common.restaurantNotFound"));
        setEnabled(false);
      })
      .finally(() => setLoading(false));
  }, [restaurantId, fetchInfo]);

  if (loading && !previewMode) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[var(--background)]">
        <Loader2 className="w-8 h-8 animate-spin text-[var(--primary)]" />
      </div>
    );
  }

  async function submit(pin: string) {
    if (submitting) return;
    if (!/^\d{6}$/.test(pin)) {
      toast.error(tx("cashierScreen.invalidPinLength"));
      return;
    }
    if (previewMode) {
      sessionStorage.setItem("cashier_token", "mock_cashier");
      sessionStorage.setItem("cashier_expires", previewExpiry());
      sessionStorage.setItem(
        "cashier_restaurant",
        JSON.stringify(PREVIEW_RESTAURANT),
      );
      toast.success(tx("common.welcome"));
      navigate({ to: "/cashier" });
      return;
    }
    setSubmitting(true);
    try {
      const res = await verify({ data: { restaurantId: restaurantId!, pin } });
      sessionStorage.setItem("cashier_token", res.token);
      sessionStorage.setItem("cashier_expires", res.expiresAt);
      sessionStorage.setItem(
        "cashier_restaurant",
        JSON.stringify(res.restaurant),
      );
      toast.success(tx("common.welcome"));
      navigate({ to: "/cashier" });
    } catch (e) {
      toast.error((e as Error).message || tx("common.wrongPin"));
      setPinKey((k) => k + 1);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[var(--background)] px-4">
      <div className="w-full max-w-sm bg-[var(--card)] border border-[var(--border)] rounded-2xl shadow-xl shadow-black/[0.04] p-7 space-y-6">
        <div className="flex flex-col items-center text-center space-y-3">
          <LoginLogo icon={Calculator} />
          <h1 className="text-lg font-bold text-[var(--foreground)]">
            {tx("cashier.title")}
          </h1>
          {restaurantName && <RestaurantPill name={restaurantName} />}
          {previewMode && (
            <span className="text-[10px] font-bold text-[var(--primary)] bg-[var(--primary)]/10 rounded-md px-2 py-0.5">
              {tx("cashierScreen.previewModeBadge")}
            </span>
          )}
        </div>

        {HAS_BACKEND && !restaurantId ? (
          <RestaurantCodeStep onResolve={handleCode} />
        ) : (
          <>
            <p className="text-xs text-[var(--muted-foreground)] text-center">
              {tx("common.enterPin")}
            </p>

            <StaffPinInput
              key={pinKey}
              onSubmit={submit}
              submitting={submitting}
              length={6}
            />

            {enabled === false && (
              <div className="rounded-lg bg-[var(--destructive)]/10 text-[var(--destructive)] text-sm p-3 text-center leading-6">
                {!restaurantId ? (
                  <>{tx("cashierScreen.invalidLink")}</>
                ) : (
                  <>
                    {tx("cashier.disabled")}
                    <br />
                    {tx("cashier.enableHint")}
                  </>
                )}
              </div>
            )}
          </>
        )}

        <div className="text-center">
          <BackHomeLink label={tx("common.backHome")} />
        </div>
      </div>
    </div>
  );
}
