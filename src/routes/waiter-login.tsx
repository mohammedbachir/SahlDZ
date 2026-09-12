import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { UtensilsCrossed, Loader2, User } from "lucide-react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { getPublicWaiterList, verifyWaiterPin } from "@/lib/waiter.functions";
import { PREVIEW_RESTAURANT, previewExpiry } from "@/lib/preview-mode";
import { verifyActivationCode } from "@/lib/activation";
import { getFirebaseDb } from "@/integrations/firebase/config";
import { requireDesktop, useDesktopOnly } from "@/lib/auth";
import { RestaurantCodeStep } from "@/components/restaurant-code-step";
import {
  LoginLogo,
  RestaurantPill,
  StaffAccountButton,
  StaffAvatar,
  PinBackButton,
  BackHomeLink,
  StaffPinInput,
} from "@/components/staff-login-ui";
import { tx } from "@/lib/ops-tx";
import { rememberKioskRole } from "@/lib/kiosk-session";

const HAS_BACKEND = typeof window !== "undefined" && !!getFirebaseDb();

export const Route = createFileRoute("/waiter-login")({
  beforeLoad: requireDesktop,
  validateSearch: (s) => ({
    rid: typeof s.rid === "string" ? s.rid : "",
  }),
  component: Page,
});

function Page() {
  const { rid: searchRid } = Route.useSearch();
  const navigate = useNavigate();
  useDesktopOnly();
  const fetchList = useServerFn(getPublicWaiterList);
  const verify = useServerFn(verifyWaiterPin);

  const [restaurantId, setRestaurantId] = useState<string | null>(
    searchRid || null,
  );
  const [restaurantName, setRestaurantName] = useState("");
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  type WaiterItem = { id: string; name: string };
  const [waiters, setWaiters] = useState<WaiterItem[]>([]);
  const [selected, setSelected] = useState<WaiterItem | null>(null);
  const previewMode = !restaurantId && !HAS_BACKEND;

  useEffect(() => {
    setRestaurantId(searchRid || null);
    if (!searchRid) setLoading(false);
  }, [searchRid]);

  // Preview mode: seed mock waiter accounts so the flow is fully exporable
  useEffect(() => {
    if (!previewMode) return;
    setWaiters([
      { id: "mock-w1", name: "أمين" },
      { id: "mock-w2", name: "سارة" },
    ]);
    setRestaurantName(PREVIEW_RESTAURANT.name);
    setLoading(false);
  }, [previewMode]);

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
    fetchList({ data: { restaurantId } })
      .then((res) => {
        if (!res.found) {
          toast.error(tx("waiter.restaurantNotFound"));
          return;
        }
        setRestaurantName(res.name);
        setLogoUrl(res.logo_url);
        setWaiters(res.waiters);
      })
      .catch(() => toast.error(tx("waiter.loadFailed")))
      .finally(() => setLoading(false));
  }, [restaurantId, fetchList]);

  if (loading && !previewMode) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[var(--background)]">
        <Loader2 className="w-8 h-8 animate-spin text-[var(--primary)]" />
      </div>
    );
  }

  async function handleSubmit(pin: string) {
    if (!selected) return;
    if (submitting) return;
    if (pin.length < 4) {
      toast.error(tx("waiter.invalidPinLength"));
      return;
    }
    setSubmitting(true);
    if (previewMode) {
      localStorage.setItem("waiter_token", "mock_waiter");
      localStorage.setItem("waiter_expires", previewExpiry());
      localStorage.setItem("waiter_name", selected.name);
      localStorage.setItem("waiter_id", selected.id);
      localStorage.setItem(
        "waiter_restaurant",
        JSON.stringify(PREVIEW_RESTAURANT),
      );
      toast.success(
        tx("waiter.previewWelcome").replace("{{name}}", selected.name),
      );
      setSubmitting(false);
      rememberKioskRole("waiter");
      navigate({ to: "/waiter-screen" });
      return;
    }
    try {
      const res = await verify({ data: { waiterId: selected.id, pin } });
      localStorage.setItem("waiter_token", res.token);
      localStorage.setItem("waiter_expires", res.expiresAt);
      localStorage.setItem("waiter_name", res.waiterName);
      localStorage.setItem("waiter_id", res.waiterId);
      localStorage.setItem("waiter_restaurant", JSON.stringify(res.restaurant));
      toast.success(tx("waiter.welcome").replace("{{name}}", res.waiterName));
      rememberKioskRole("waiter");
      navigate({ to: "/waiter-screen" });
    } catch (e) {
      toast.error((e as Error).message || tx("waiter.wrongPin"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[var(--background)] px-4">
      <div className="w-full max-w-sm bg-[var(--card)] border border-[var(--border)] rounded-2xl shadow-xl shadow-black/[0.04] p-7 space-y-6">
        <div className="flex flex-col items-center text-center space-y-3">
          {logoUrl ? (
            <img
              src={logoUrl}
              alt=""
              className="w-16 h-16 rounded-2xl object-cover ring-2 ring-[var(--primary)]/25 shadow-lg shadow-[var(--primary)]/15"
            />
          ) : (
            <LoginLogo icon={UtensilsCrossed} />
          )}
          <h1 className="text-lg font-bold text-[var(--foreground)]">
            {tx("waiter.loginTitle")}
          </h1>
          {restaurantName && <RestaurantPill name={restaurantName} />}
          {previewMode && (
            <span className="text-[10px] font-bold text-[var(--primary)] bg-[var(--primary)]/10 rounded-md px-2 py-0.5">
              {tx("waiter.previewModeBadge")}
            </span>
          )}
        </div>

        {!loading && HAS_BACKEND && !restaurantId && (
          <RestaurantCodeStep onResolve={handleCode} />
        )}

        {!loading && !selected && (restaurantId || previewMode) && (
          <div className="space-y-3">
            <p className="text-xs text-[var(--muted-foreground)] text-center">
              {tx("waiter.chooseAccount")}
            </p>
            {waiters.length === 0 ? (
              <p className="text-sm text-center text-[var(--muted-foreground)] py-4">
                {tx("waiter.noAccounts")}
              </p>
            ) : (
              <div className="space-y-2">
                {waiters.map((w) => (
                  <StaffAccountButton
                    key={w.id}
                    icon={User}
                    label={w.name}
                    onClick={() => setSelected(w)}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {!loading && selected && (
          <div className="space-y-5">
            <div className="flex items-center gap-3">
              <PinBackButton onClick={() => setSelected(null)} />
              <div className="flex items-center gap-2.5">
                <StaffAvatar icon={User} sm />
                <span className="font-semibold text-sm text-[var(--foreground)]">
                  {selected.name}
                </span>
              </div>
            </div>
            <p className="text-xs text-[var(--muted-foreground)] text-center">
              {tx("waiter.enterPin")}
            </p>
            <StaffPinInput
              onSubmit={handleSubmit}
              submitting={submitting}
              length={6}
            />
          </div>
        )}

        <div className="text-center">
          <BackHomeLink label={tx("waiter.backHome")} />
        </div>
      </div>
    </div>
  );
}
