import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ChefHat, Loader2, User } from "lucide-react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { getPublicChefList, verifyIndividualChefPin } from "@/lib/individual-chef.functions";
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

const HAS_BACKEND = typeof window !== "undefined" && !!getFirebaseDb();

export const Route = createFileRoute("/kitchen-login")({
  beforeLoad: requireDesktop,
  validateSearch: (s) => ({
    rid: typeof s.rid === "string" && s.rid ? s.rid : typeof s.r === "string" ? s.r : "",
  }),
  component: Page,
});

function Page() {
  const { rid: searchRid } = Route.useSearch();
  const navigate = useNavigate();
  useDesktopOnly();
  const fetchChefList = useServerFn(getPublicChefList);
  const verifyIndividual = useServerFn(verifyIndividualChefPin);

  const [restaurantId, setRestaurantId] = useState<string | null>(searchRid || null);
  const [restaurantName, setRestaurantName] = useState("");
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [submitting, setSubmitting] = useState(false);

  type ChefItem = { id: string; name: string };
  const [chefs, setChefs] = useState<ChefItem[]>([]);
  const [selectedChef, setSelectedChef] = useState<ChefItem | null>(null);
  const [loadingList, setLoadingList] = useState(true);
  const previewMode = !restaurantId && !HAS_BACKEND;

  useEffect(() => {
    setRestaurantId(searchRid || null);
    if (!searchRid) setLoadingList(false);
  }, [searchRid]);

  // Preview mode: seed a mock chef account so the flow is fully exporable
  useEffect(() => {
    if (!previewMode) return;
    setChefs([{ id: "mock-chef1", name: "الشيف يوسف" }]);
    setEnabled(true);
    setRestaurantName(PREVIEW_RESTAURANT.name);
    setLoadingList(false);
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
    setLoadingList(true);
    fetchChefList({ data: { restaurantId } })
      .then((res) => {
        if (!res.found) { toast.error(tx("common.restaurantNotFound")); setEnabled(false); return; }
        setRestaurantName(res.name);
        setLogoUrl(res.logo_url);
        setChefs(res.chefs);
        setEnabled(res.chefs.length > 0);
      })
      .catch(() => { toast.error(tx("common.restaurantNotFound")); setEnabled(false); })
      .finally(() => setLoadingList(false));
  }, [restaurantId, fetchChefList]);

  if (loadingList && !previewMode) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[var(--background)]">
        <Loader2 className="w-8 h-8 animate-spin text-[var(--primary)]" />
      </div>
    );
  }

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
      toast.success(tx("kitchen.previewWelcome").replace("{{name}}", selectedChef.name));
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
      toast.success(tx("kitchen.welcome").replace("{{name}}", res.chefName));
      navigate({ to: "/kitchen-screen" });
    } catch (e) {
      toast.error((e as Error).message || tx("common.wrongPin"));
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
            <LoginLogo icon={ChefHat} />
          )}
          <h1 className="text-lg font-bold text-[var(--foreground)]">{tx("kitchen.loginTitle")}</h1>
          {restaurantName && <RestaurantPill name={restaurantName} />}
          {previewMode && (
            <span className="text-[10px] font-bold text-[var(--primary)] bg-[var(--primary)]/10 rounded-md px-2 py-0.5">
              {tx("kitchen.previewModeBadge")}
            </span>
          )}
        </div>

        {!loadingList && HAS_BACKEND && !restaurantId && (
          <RestaurantCodeStep onResolve={handleCode} />
        )}

        {!loadingList && enabled === false && (
          <div className="rounded-lg bg-[var(--destructive)]/10 text-[var(--destructive)] text-sm p-3 text-center leading-6">
            {!restaurantId ? (
              <>{tx("kitchen.invalidLink")}</>
            ) : (
              <>{tx("kitchen.noChefAccounts")}</>
            )}
          </div>
        )}

        {!loadingList && enabled && (
          <>
            {!selectedChef ? (
              <div className="space-y-3">
                <p className="text-xs text-[var(--muted-foreground)] text-center">
                  {tx("kitchen.chooseAccount")}
                </p>
                <div className="space-y-2">
                  {chefs.map((chef) => (
                    <StaffAccountButton
                      key={chef.id}
                      icon={ChefHat}
                      label={chef.name}
                      onClick={() => setSelectedChef(chef)}
                    />
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-5">
                <div className="flex items-center gap-3">
                  <PinBackButton onClick={() => setSelectedChef(null)} />
                  <div className="flex items-center gap-2.5">
                    <StaffAvatar icon={ChefHat} sm />
                    <span className="font-semibold text-sm text-[var(--foreground)]">
                      {selectedChef.name}
                    </span>
                  </div>
                </div>
                <p className="text-xs text-[var(--muted-foreground)] text-center">
                  {tx("kitchen.enterPin")}
                </p>
                <StaffPinInput onSubmit={submitIndividual} submitting={submitting} length={6} />
              </div>
            )}
          </>
        )}

        <div className="text-center">
          <BackHomeLink label={tx("common.backToHome")} />
        </div>
      </div>
    </div>
  );
}