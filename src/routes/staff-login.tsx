import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Loader2, Search, UserRound } from "lucide-react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import {
  getPublicStaffList,
  verifyStaffPin,
} from "@/lib/staff-login.functions";
import { allowedStaffPaths } from "@/lib/staff-permissions";
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

export const Route = createFileRoute("/staff-login")({
  beforeLoad: requireDesktop,
  validateSearch: (s) => ({
    rid:
      typeof s.rid === "string" && s.rid
        ? s.rid
        : typeof s.r === "string"
          ? s.r
          : "",
  }),
  component: Page,
});

type StaffItem = { id: string; name: string };

function Page() {
  const { rid: searchRid } = Route.useSearch();
  const navigate = useNavigate();
  useDesktopOnly();
  const fetchStaffList = useServerFn(getPublicStaffList);
  const verifyPin = useServerFn(verifyStaffPin);

  const [restaurantId, setRestaurantId] = useState<string | null>(
    searchRid || null,
  );
  const [restaurantName, setRestaurantName] = useState("");
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [staff, setStaff] = useState<StaffItem[]>([]);
  const [query, setQuery] = useState("");
  const [selectedStaff, setSelectedStaff] = useState<StaffItem | null>(null);
  const [loadingList, setLoadingList] = useState(true);
  const previewMode = !restaurantId && !HAS_BACKEND;

  useEffect(() => {
    setRestaurantId(searchRid || null);
    if (!searchRid) setLoadingList(false);
  }, [searchRid]);

  useEffect(() => {
    if (!previewMode) return;
    setStaff([{ id: "mock-staff1", name: "أحمد بلحاج" }]);
    setEnabled(true);
    setRestaurantName("مطعم السهل");
    setLoadingList(false);
  }, [previewMode]);

  const filtered = useMemo(() => {
    const q = query.trim();
    if (!q) return staff;
    return staff.filter((s) => s.name.includes(q));
  }, [staff, query]);

  async function handleCode(code: string): Promise<boolean> {
    if (submitting) return false;
    setSubmitting(true);
    try {
      const { verifyActivationCode } = await import("@/lib/activation");
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
    fetchStaffList({ data: { restaurantId } })
      .then((res) => {
        if (!res.found) {
          toast.error(tx("common.restaurantNotFound"));
          setEnabled(false);
          return;
        }
        setRestaurantName(res.name);
        setLogoUrl(res.logo_url);
        setStaff(res.staff ?? []);
        setEnabled((res.staff ?? []).length > 0);
      })
      .catch(() => {
        toast.error(tx("common.restaurantNotFound"));
        setEnabled(false);
      })
      .finally(() => setLoadingList(false));
  }, [restaurantId, fetchStaffList]);

  if (loadingList && !previewMode) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[var(--background)]">
        <Loader2 className="w-8 h-8 animate-spin text-[var(--primary)]" />
      </div>
    );
  }

  function goToAllowedScreen(permissions: string[]) {
    const allowed = allowedStaffPaths(permissions);
    const target = allowed[0] ?? "/staff-login";
    navigate({ to: target });
  }

  async function submitPin(pin: string) {
    if (!selectedStaff) return;
    if (submitting) return;
    setSubmitting(true);
    if (previewMode) {
      const { savePreviewUnifiedSession } = await import("@/lib/staff-session");
      await savePreviewUnifiedSession({
        token: "mock_staff",
        staffId: selectedStaff.id,
        staffName: selectedStaff.name,
        permissions: ["kitchen", "cashier"],
      });
      toast.success(`مرحباً ${selectedStaff.name}`);
      setSubmitting(false);
      goToAllowedScreen(["kitchen", "cashier"]);
      return;
    }
    try {
      const res = await verifyPin({
        data: { staffId: selectedStaff.id, pin },
      });
      const { saveUnifiedStaffSession, rememberOpenTab } =
        await import("@/lib/staff-session");
      await saveUnifiedStaffSession({
        token: res.token,
        expiresAt: res.expiresAt,
        staffId: res.staffId,
        staffName: res.staffName,
        restaurant: res.restaurant,
        permissions: res.permissions as string[],
      });
      rememberOpenTab("/");
      toast.success(`مرحباً ${res.staffName}`);
      setSubmitting(false);
      goToAllowedScreen(res.permissions);
    } catch (e) {
      toast.error((e as Error).message || tx("common.wrongPin"));
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
            <LoginLogo icon={UserRound} />
          )}
          <h1 className="text-lg font-bold text-[var(--foreground)]">
            دخول الموظفين
          </h1>
          {restaurantName && <RestaurantPill name={restaurantName} />}
          {previewMode && (
            <span className="text-[10px] font-bold text-[var(--primary)] bg-[var(--primary)]/10 rounded-md px-2 py-0.5">
              وضع المعاينة
            </span>
          )}
        </div>

        {!loadingList && HAS_BACKEND && !restaurantId && (
          <RestaurantCodeStep onResolve={handleCode} />
        )}

        {!loadingList && enabled === false && (
          <div className="rounded-lg bg-[var(--destructive)]/10 text-[var(--destructive)] text-sm p-3 text-center leading-6">
            {!restaurantId ? "رابط غير صحيح" : "لا يوجد موظفون مفعّلون"}
          </div>
        )}

        {!loadingList && enabled && (
          <>
            {!selectedStaff ? (
              <div className="space-y-3">
                <p className="text-xs text-[var(--muted-foreground)] text-center">
                  ابحث عن اسمك ثم اختره
                </p>
                <div className="relative">
                  <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--muted-foreground)]" />
                  <input
                    dir="rtl"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="اكتب الاسم للبحث…"
                    autoFocus
                    className="w-full rounded-xl border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)] px-3 py-2.5 pr-9 text-sm focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/25 outline-none transition-all"
                  />
                </div>
                <div className="max-h-64 overflow-y-auto space-y-2">
                  {filtered.length === 0 && (
                    <p className="text-xs text-[var(--muted-foreground)] text-center py-4">
                      لا توجد نتائج مطابقة
                    </p>
                  )}
                  {filtered.map((s) => (
                    <StaffAccountButton
                      key={s.id}
                      icon={UserRound}
                      label={s.name}
                      onClick={() => setSelectedStaff(s)}
                    />
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-5">
                <div className="flex items-center gap-3">
                  <PinBackButton onClick={() => setSelectedStaff(null)} />
                  <div className="flex items-center gap-2.5">
                    <StaffAvatar icon={UserRound} sm />
                    <span className="font-semibold text-sm text-[var(--foreground)]">
                      {selectedStaff.name}
                    </span>
                  </div>
                </div>
                <p className="text-xs text-[var(--muted-foreground)] text-center">
                  أدخل الرقم السري
                </p>
                <StaffPinInput
                  onSubmit={submitPin}
                  submitting={submitting}
                  length={6}
                />
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
