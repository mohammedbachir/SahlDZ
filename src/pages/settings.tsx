import { useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import {
  Loader2,
  Trash2,
  Upload,
  UserPlus,
  X,
  Users,
  Copy,
  Shuffle,
  Power,
  Palette,
  Check,
  Bike,
  RefreshCw,
  ShoppingBag,
  QrCode,
  Sparkles,
  Plus as PlusIcon,
  Image as ImageIcon,
  Video as VideoIcon,
  KeyRound,
  Eye,
  EyeOff,
  Settings,
  Pencil,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { getFirebaseDb } from "@/integrations/firebase/config";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { PermissionsSelect } from "@/components/permissions-select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useServerFn } from "@tanstack/react-start";
import {
  listStaff,
  addStaff,
  updateStaff,
  toggleStaff,
  deleteStaff,
  type StaffRecord,
} from "@/lib/staff.functions";
import { generateUniquePin } from "@/lib/staff-core";
import { permissionLabel } from "@/lib/staff-permissions";
import {
  updateMenuTheme,
  getSplashSettings,
  updateSplashSettings,
} from "@/lib/settings.functions";
import {
  getDeliveryStatus,
  enableDelivery,
  disableDelivery,
  regenerateDeliveryToken,
} from "@/lib/delivery.functions";
import {
  getTakeawayStatus,
  enableTakeaway,
  disableTakeaway,
  regenerateTakeawayToken,
} from "@/lib/takeaway.functions";
import {
  MENU_LAYOUTS,
  MENU_THEMES,
  DEFAULT_MENU_COLOR,
  DEFAULT_MENU_LAYOUT,
  DEFAULT_MENU_THEME,
  serializeMenuAppearance,
  parseMenuAppearance,
  type MenuLayoutId,
  type MenuThemeId,
} from "@/lib/menu-themes";

type Restaurant = {
  id: string;
  name: string;
  logo_url: string | null;
  google_maps_review_url: string | null;
  activation_code?: string | null;
};

type EmployeeForm = {
  name: string;
  pin: string;
  permissions: string[];
  email: string;
  password: string;
  showWeb: boolean;
};

const EMPTY_FORM: EmployeeForm = {
  name: "",
  pin: "",
  permissions: [],
  email: "",
  password: "",
  showWeb: false,
};

function SettingsPage() {
  const navigate = useNavigate();
  const [r, setR] = useState<Restaurant | null>(null);
  const [name, setName] = useState("");
  const [gUrl, setGUrl] = useState("");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Employees (unified)
  const listStaffFn = useServerFn(listStaff);
  const addStaffFn = useServerFn(addStaff);
  const updateStaffFn = useServerFn(updateStaff);
  const toggleStaffFn = useServerFn(toggleStaff);
  const deleteStaffFn = useServerFn(deleteStaff);
  const [employees, setEmployees] = useState<StaffRecord[]>([]);
  const [addOpen, setAddOpen] = useState(false);
  const [addForm, setAddForm] = useState<EmployeeForm>(EMPTY_FORM);
  const [editOpen, setEditOpen] = useState(false);
  const [editMember, setEditMember] = useState<StaffRecord | null>(null);
  const [editForm, setEditForm] = useState<EmployeeForm>(EMPTY_FORM);
  const [savingEmp, setSavingEmp] = useState(false);
  const [addedCreds, setAddedCreds] = useState<{
    serial: string;
    pin: string;
  } | null>(null);
  const [showAddPw, setShowAddPw] = useState(false);
  const [showEditPw, setShowEditPw] = useState(false);
  const [deleteMember, setDeleteMember] = useState<StaffRecord | null>(null);

  // Menu theme
  const updateThemeFn = useServerFn(updateMenuTheme);
  const [menuTheme, setMenuTheme] = useState<MenuThemeId>(DEFAULT_MENU_THEME);
  const [menuColor, setMenuColor] = useState(DEFAULT_MENU_COLOR);
  const [menuLayout, setMenuLayout] =
    useState<MenuLayoutId>(DEFAULT_MENU_LAYOUT);
  const [headerColor, setHeaderColor] = useState(DEFAULT_MENU_COLOR);
  const [categoryColor, setCategoryColor] = useState(DEFAULT_MENU_COLOR);
  const [buttonColor, setButtonColor] = useState(DEFAULT_MENU_COLOR);
  const [savingAppearance, setSavingAppearance] = useState(false);
  // Delivery
  const getDeliveryStatusFn = useServerFn(getDeliveryStatus);
  const enableDeliveryFn = useServerFn(enableDelivery);
  const disableDeliveryFn = useServerFn(disableDelivery);
  const regenDeliveryFn = useServerFn(regenerateDeliveryToken);
  const [deliveryEnabled, setDeliveryEnabled] = useState(false);
  const [deliveryToken, setDeliveryToken] = useState<string | null>(null);
  const [deliveryBusy, setDeliveryBusy] = useState(false);
  const [confirmDisableDelivery, setConfirmDisableDelivery] = useState(false);
  // Takeaway
  const getTakeawayStatusFn = useServerFn(getTakeawayStatus);
  const enableTakeawayFn = useServerFn(enableTakeaway);
  const disableTakeawayFn = useServerFn(disableTakeaway);
  const regenTakeawayFn = useServerFn(regenerateTakeawayToken);
  const [takeawayEnabled, setTakeawayEnabled] = useState(false);
  const [takeawayToken, setTakeawayToken] = useState<string | null>(null);
  const [takeawayBusy, setTakeawayBusy] = useState(false);
  const [confirmDisableTakeaway, setConfirmDisableTakeaway] = useState(false);

  // Splash settings
  const getSplashFn = useServerFn(getSplashSettings);
  const updateSplashFn = useServerFn(updateSplashSettings);
  type SplashFeature = { icon: string; text: string };
  const [splashLoaded, setSplashLoaded] = useState(false);
  const [splashSaving, setSplashSaving] = useState(false);
  const [splashEnabled, setSplashEnabled] = useState(true);
  const [splashAlwaysShow, setSplashAlwaysShow] = useState(false);
  const [coverType, setCoverType] = useState<"image" | "video">("image");
  const [coverImageUrl, setCoverImageUrl] = useState<string | null>(null);
  const [coverVideoUrl, setCoverVideoUrl] = useState<string | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [tagline, setTagline] = useState("");
  const [splashDescription, setSplashDescription] = useState("");
  const [splashFeatures, setSplashFeatures] = useState<SplashFeature[]>([]);
  const [newFeatureIcon, setNewFeatureIcon] = useState("Sparkles");
  const [newFeatureText, setNewFeatureText] = useState("");
  const [instagramUrl, setInstagramUrl] = useState("");
  const [facebookUrl, setFacebookUrl] = useState("");
  const [whatsappNumber, setWhatsappNumber] = useState("");
  const [brandColor, setBrandColor] = useState("#7c5cff");
  const coverFileRef = useRef<HTMLInputElement>(null);

  async function getServerAuthHeaders() {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) throw new Error("الجلسة منتهية، سجّل دخولك من جديد");
    return { Authorization: `Bearer ${token}` };
  }

  function onPickCover(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    const isVideo = f.type.startsWith("video/");
    const isImage = f.type.startsWith("image/");
    if (!isVideo && !isImage) {
      toast.error("صورة أو فيديو فقط");
      return;
    }
    if (f.size > 25 * 1024 * 1024) {
      toast.error("الحجم الأقصى 25MB");
      return;
    }
    setCoverFile(f);
    setCoverType(isVideo ? "video" : "image");
    setCoverPreview(URL.createObjectURL(f));
  }

  function addFeature() {
    const text = newFeatureText.trim();
    if (!text) return;
    if (splashFeatures.length >= 8) {
      toast.error("الحد الأقصى 8 مميزات");
      return;
    }
    setSplashFeatures([
      ...splashFeatures,
      { icon: newFeatureIcon || "Sparkles", text },
    ]);
    setNewFeatureText("");
  }

  function removeFeature(idx: number) {
    setSplashFeatures(splashFeatures.filter((_, i) => i !== idx));
  }

  async function onSaveSplash() {
    setSplashSaving(true);
    try {
      let upload: { name: string; type: string; base64: string } | null = null;
      if (coverFile) {
        const base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => {
            const result = reader.result as string;
            resolve(result.split(",")[1] ?? "");
          };
          reader.onerror = () => reject(reader.error);
          reader.readAsDataURL(coverFile);
        });
        upload = {
          name: coverFile.name,
          type:
            coverFile.type ||
            (coverType === "video" ? "video/mp4" : "image/jpeg"),
          base64,
        };
      }
      const headers = await getServerAuthHeaders();
      const res = await updateSplashFn({
        data: {
          splash_enabled: splashEnabled,
          splash_always_show: splashAlwaysShow,
          cover_type: coverType,
          cover_image_url: coverImageUrl,
          cover_video_url: coverVideoUrl,
          cover_upload: upload,
          tagline: tagline.trim() || null,
          splash_description: splashDescription.trim() || null,
          features: splashFeatures,
          instagram_url: instagramUrl.trim() || null,
          facebook_url: facebookUrl.trim() || null,
          whatsapp_number: whatsappNumber.trim() || null,
          brand_color: brandColor || null,
        },
        headers,
      });
      if (res?.cover_image_url !== undefined)
        setCoverImageUrl(res.cover_image_url);
      if (res?.cover_video_url !== undefined)
        setCoverVideoUrl(res.cover_video_url);
      setCoverFile(null);
      toast.success("تم حفظ صفحة الترحيب");
    } catch (e) {
      toast.error((e as Error).message || "فشل الحفظ");
    } finally {
      setSplashSaving(false);
    }
  }

  useEffect(() => {
    (async () => {
      try {
        const { data: u } = await supabase.auth.getUser();
        if (!u.user) {
          // Preview mode — try localStorage first, then mock
          const saved = localStorage.getItem("sahl_dz_restaurant");
          if (saved) {
            try {
              const parsed = JSON.parse(saved);
              setR(parsed);
              setName(parsed.name ?? "");
              setGUrl(parsed.google_maps_review_url ?? "");
              setLogoPreview(parsed.logo_url);
            } catch {
              /* ignore */
            }
          } else {
            setR({
              id: "mock-id",
              name: "مطعم السهل",
              logo_url: null,
              google_maps_review_url: "https://g.page/example",
            });
            setName("مطعم السهل");
            setGUrl("https://g.page/example");
            localStorage.setItem(
              "sahl_dz_restaurant",
              JSON.stringify({
                id: "mock-id",
                name: "مطعم السهل",
                logo_url: null,
                google_maps_review_url: "https://g.page/example",
              }),
            );
          }
          void refreshEmployees();
          setLoading(false);
          return;
        }
        const { data: rows, error } = await supabase
          .from("restaurants")
          .select("id, name, logo_url, google_maps_review_url, activation_code")
          .eq("owner_id", u.user.id)
          .limit(1);
        const data = rows?.[0];
        if (error) {
          // In preview mode, treat as no restaurant (not an error)
          setLoading(false);
          return;
        }
        if (!data) {
          // No restaurant in Firestore — try localStorage fallback
          const saved = localStorage.getItem("sahl_dz_restaurant");
          if (saved) {
            try {
              const parsed = JSON.parse(saved);
              setR(parsed);
              setName(parsed.name ?? "");
              setGUrl(parsed.google_maps_review_url ?? "");
              setLogoPreview(parsed.logo_url);
              setLoading(false);
              return;
            } catch {
              /* ignore */
            }
          }
          setLoading(false);
          return;
        }
        setR(data);
        setName(data.name);
        setGUrl(data.google_maps_review_url ?? "");
        setLogoPreview(data.logo_url);
        void refreshEmployees();
        // Load splash settings
        try {
          const headers = await getServerAuthHeaders();
          const sp = await getSplashFn({ headers });
          setSplashEnabled(sp.splash_enabled ?? true);
          setSplashAlwaysShow(sp.splash_always_show ?? false);
          setCoverType((sp.cover_type as "image" | "video") || "image");
          setCoverImageUrl(sp.cover_image_url);
          setCoverVideoUrl(sp.cover_video_url);
          setCoverPreview(
            sp.cover_type === "video" ? sp.cover_video_url : sp.cover_image_url,
          );
          setTagline(sp.tagline ?? "");
          setSplashDescription(sp.splash_description ?? "");
          setSplashFeatures(sp.features ?? []);
          setInstagramUrl(sp.instagram_url ?? "");
          setFacebookUrl(sp.facebook_url ?? "");
          setWhatsappNumber(sp.whatsapp_number ?? "");
          setBrandColor(sp.brand_color || "#7c5cff");
          setSplashLoaded(true);
        } catch {
          setSplashLoaded(true);
        }
        try {
          const { data: rest } = await supabase
            .from("restaurants")
            .select("menu_theme")
            .eq("id", data.id)
            .maybeSingle();
          if (rest?.menu_theme) {
            const appearance = parseMenuAppearance(rest.menu_theme);
            setMenuTheme(appearance.theme);
            setMenuColor(appearance.color);
            setMenuLayout(appearance.layout);
            setHeaderColor(appearance.headerColor ?? appearance.color);
            setCategoryColor(appearance.categoryColor ?? appearance.color);
            setButtonColor(appearance.buttonColor ?? appearance.color);
          }
        } catch {
          // ignore
        }
        try {
          const headers = await getServerAuthHeaders();
          const ds = await getDeliveryStatusFn({ headers });
          setDeliveryEnabled(!!ds.enabled);
          setDeliveryToken(ds.token ?? null);
        } catch {
          // ignore
        }
        try {
          const headers = await getServerAuthHeaders();
          const ts = await getTakeawayStatusFn({ headers });
          setTakeawayEnabled(!!ts.enabled);
          setTakeawayToken(ts.token ?? null);
        } catch {
          // ignore
        }
        setLoading(false);
      } catch (e) {
        toast.error((e as Error).message || "فشل تحميل الإعدادات");
        setLoading(false);
      }
    })();
  }, [navigate]);

  async function refreshEmployees() {
    try {
      let headers: Record<string, string> = {};
      if (getFirebaseDb()) headers = await getServerAuthHeaders();
      const res = await listStaffFn({ headers });
      setEmployees((res.staff ?? []) as StaffRecord[]);
    } catch {
      /* ignore */
    }
  }

  const openAdd = () => {
    setAddForm(EMPTY_FORM);
    setAddedCreds(null);
    setAddOpen(true);
  };

  async function submitAdd() {
    const frm = addForm;
    if (!frm.name.trim()) {
      toast.error("أدخل اسم الموظف");
      return;
    }
    if (frm.pin && !/^\d{4,6}$/.test(frm.pin)) {
      toast.error("PIN من 4 إلى 6 أرقام");
      return;
    }
    if (frm.showWeb) {
      if (!frm.email.includes("@")) {
        toast.error("بريد غير صالح");
        return;
      }
      if (frm.password.length < 6) {
        toast.error("كلمة السر 6 أحرف على الأقل");
        return;
      }
    }
    setSavingEmp(true);
    try {
      const headers = await getServerAuthHeaders();
      const res = await addStaffFn({
        headers,
        data: {
          name: frm.name.trim(),
          pin: frm.pin.trim(),
          permissions: frm.permissions,
          email: frm.showWeb ? frm.email.trim().toLowerCase() : null,
          password: frm.showWeb ? frm.password : null,
        },
      });
      setAddOpen(false);
      setAddedCreds({ serial: res.serial, pin: res.pin ?? frm.pin });
      toast.success("تمت إضافة الموظف");
      await refreshEmployees();
    } catch (e) {
      toast.error((e as Error).message || "فشل الإضافة");
    } finally {
      setSavingEmp(false);
    }
  }

  const openEdit = (m: StaffRecord) => {
    setEditMember(m);
    setEditForm({
      name: m.name,
      pin: "",
      permissions: m.permissions ?? [],
      email: m.email ?? "",
      password: "",
      showWeb: !!m.email,
    });
    setEditOpen(true);
  };

  async function submitEdit() {
    if (!editMember) return;
    if (!editForm.name.trim()) {
      toast.error("أدخل اسم الموظف");
      return;
    }
    if (editForm.pin && !/^\d{4,6}$/.test(editForm.pin)) {
      toast.error("PIN من 4 إلى 6 أرقام");
      return;
    }
    if (editForm.showWeb && !editMember.email) {
      if (!editForm.email.includes("@")) {
        toast.error("بريد غير صالح");
        return;
      }
      if (editForm.password.length < 6) {
        toast.error("كلمة السر 6 أحرف على الأقل");
        return;
      }
    }
    setSavingEmp(true);
    try {
      const headers = await getServerAuthHeaders();
      const input: Record<string, unknown> = {
        name: editForm.name.trim(),
        permissions: editForm.permissions,
      };
      if (editForm.pin) input.pin = editForm.pin;
      if (editForm.showWeb && !editMember.email) {
        input.email = editForm.email.trim().toLowerCase();
        input.password = editForm.password;
      }
      await updateStaffFn({ headers, data: { staffId: editMember.id, input } });
      setEditOpen(false);
      toast.success("تم تعديل الموظف");
      await refreshEmployees();
    } catch (e) {
      toast.error((e as Error).message || "فشل التعديل");
    } finally {
      setSavingEmp(false);
    }
  }

  async function toggleEmp(m: StaffRecord, active: boolean) {
    try {
      const headers = await getServerAuthHeaders();
      await toggleStaffFn({ headers, data: { staffId: m.id, active } });
      setEmployees((prev) =>
        prev.map((x) => (x.id === m.id ? { ...x, frozen: !active } : x)),
      );
      toast.success(active ? "تم تفعيل الحساب" : "تم تعطيل الحساب");
    } catch (e) {
      toast.error((e as Error).message || "فشل");
    }
  }

  async function submitDelete() {
    if (!deleteMember) return;
    try {
      const headers = await getServerAuthHeaders();
      await deleteStaffFn({ headers, data: { staffId: deleteMember.id } });
      setEmployees((prev) => prev.filter((x) => x.id !== deleteMember.id));
      toast.success("تم حذف الموظف");
      setDeleteMember(null);
    } catch (e) {
      toast.error((e as Error).message || "فشل الحذف");
    }
  }

  async function onEnableDelivery() {
    setDeliveryBusy(true);
    try {
      const headers = await getServerAuthHeaders();
      const res = await enableDeliveryFn({ headers });
      setDeliveryEnabled(true);
      setDeliveryToken(res.token);
      toast.success("تم تفعيل نظام التوصيل");
    } catch (e) {
      toast.error((e as Error).message || "فشل التفعيل");
    } finally {
      setDeliveryBusy(false);
    }
  }

  async function onDisableDelivery() {
    setDeliveryBusy(true);
    try {
      const headers = await getServerAuthHeaders();
      await disableDeliveryFn({ headers });
      setDeliveryEnabled(false);
      setConfirmDisableDelivery(false);
      toast.success("تم تعطيل نظام التوصيل");
    } catch (e) {
      toast.error((e as Error).message || "فشل التعطيل");
    } finally {
      setDeliveryBusy(false);
    }
  }

  async function onRegenDelivery() {
    setDeliveryBusy(true);
    try {
      const headers = await getServerAuthHeaders();
      const res = await regenDeliveryFn({ headers });
      setDeliveryToken(res.token);
      setDeliveryEnabled(true);
      toast.success("تم توليد رابط جديد");
    } catch (e) {
      toast.error((e as Error).message || "فشل التوليد");
    } finally {
      setDeliveryBusy(false);
    }
  }

  const deliveryUrl =
    typeof window !== "undefined" && deliveryToken
      ? `${window.location.origin}/d/${deliveryToken}`
      : "";

  async function onEnableTakeaway() {
    setTakeawayBusy(true);
    try {
      const headers = await getServerAuthHeaders();
      const res = await enableTakeawayFn({ headers });
      setTakeawayEnabled(true);
      setTakeawayToken(res.token);
      toast.success("تم تفعيل الطلب السريع");
    } catch (e) {
      toast.error((e as Error).message || "فشل التفعيل");
    } finally {
      setTakeawayBusy(false);
    }
  }
  async function onDisableTakeaway() {
    setTakeawayBusy(true);
    try {
      const headers = await getServerAuthHeaders();
      await disableTakeawayFn({ headers });
      setTakeawayEnabled(false);
      setConfirmDisableTakeaway(false);
      toast.success("تم تعطيل الطلب السريع");
    } catch (e) {
      toast.error((e as Error).message || "فشل التعطيل");
    } finally {
      setTakeawayBusy(false);
    }
  }
  async function onRegenTakeaway() {
    setTakeawayBusy(true);
    try {
      const headers = await getServerAuthHeaders();
      const res = await regenTakeawayFn({ headers });
      setTakeawayToken(res.token);
      setTakeawayEnabled(true);
      toast.success("تم توليد رابط جديد");
    } catch (e) {
      toast.error((e as Error).message || "فشل التوليد");
    } finally {
      setTakeawayBusy(false);
    }
  }
  const takeawayUrl =
    typeof window !== "undefined" && takeawayToken
      ? `${window.location.origin}/t/${takeawayToken}`
      : "";
  const takeawayQrUrl = takeawayUrl
    ? `https://api.qrserver.com/v1/create-qr-code/?size=320x320&margin=10&data=${encodeURIComponent(takeawayUrl)}`
    : "";

  async function saveMenuAppearance(
    next: Partial<{
      theme: MenuThemeId;
      color: string;
      layout: MenuLayoutId;
      headerColor: string;
      categoryColor: string;
      buttonColor: string;
      syncAll: boolean;
    }>,
  ) {
    const nextTheme = next.theme ?? menuTheme;
    const nextColor = (next.color ?? menuColor).toUpperCase();
    const nextLayout = next.layout ?? menuLayout;
    const sync =
      next.syncAll || next.color !== undefined || next.theme !== undefined;
    const nextHeader = (
      next.headerColor ?? (sync ? nextColor : headerColor)
    ).toUpperCase();
    const nextCategory = (
      next.categoryColor ?? (sync ? nextColor : categoryColor)
    ).toUpperCase();
    const nextButton = (
      next.buttonColor ?? (sync ? nextColor : buttonColor)
    ).toUpperCase();
    setSavingAppearance(true);
    try {
      const headers = await getServerAuthHeaders();
      await updateThemeFn({
        data: {
          menu_theme: serializeMenuAppearance({
            theme: nextTheme,
            color: nextColor,
            layout: nextLayout,
            headerColor: nextHeader,
            categoryColor: nextCategory,
            buttonColor: nextButton,
          }),
        },
        headers,
      });
      setMenuTheme(nextTheme);
      setMenuColor(nextColor);
      setMenuLayout(nextLayout);
      setHeaderColor(nextHeader);
      setCategoryColor(nextCategory);
      setButtonColor(nextButton);
      toast.success("تم حفظ شكل المنيو");
    } catch (e) {
      toast.error((e as Error).message || "فشل الحفظ");
    } finally {
      setSavingAppearance(false);
    }
  }

  const onPickLogo = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setLogoFile(f);
    const reader = new FileReader();
    reader.onload = () => setLogoPreview(String(reader.result));
    reader.readAsDataURL(f);
  };

  const onSave = async () => {
    if (!r) return;
    if (!name.trim()) {
      toast.error("اسم المطعم مطلوب");
      return;
    }
    setSaving(true);
    try {
      let logoUrl = r.logo_url;
      let logoWarning = false;
      if (logoFile) {
        const base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => {
            const result = reader.result as string;
            resolve(result.split(",")[1] ?? "");
          };
          reader.onerror = () => reject(reader.error);
          reader.readAsDataURL(logoFile);
        });
        const ext = (logoFile.name.split(".").pop() || "png").toLowerCase();
        const path = `${r.id}/logo-${Date.now()}.${ext}`;
        const dataUrl = `data:${logoFile.type || "image/png"};base64,${base64}`;
        const up = await supabase.storage
          .from("restaurant-logos")
          .upload(path, dataUrl);
        if (up.error) {
          logoWarning = true;
        } else {
          logoUrl = up.data?.url ?? logoUrl;
        }
      }
      const { data: updated, error } = await supabase
        .from("restaurants")
        .update({
          name: name.trim(),
          logo_url: logoUrl,
          google_maps_review_url: gUrl.trim() || null,
        })
        .eq("id", r.id)
        .select("id, name, logo_url, google_maps_review_url, activation_code")
        .single();
      if (error) throw new Error(error.message || "فشل الحفظ");
      const updatedR = updated ?? {
        ...r,
        name: name.trim(),
        logo_url: logoUrl,
        google_maps_review_url: gUrl.trim() || null,
      };
      setR(updatedR);
      localStorage.setItem("sahl_dz_restaurant", JSON.stringify(updatedR));
      window.dispatchEvent(new Event("restaurant-updated"));
      setLogoFile(null);
      toast.success(
        logoWarning
          ? "تم حفظ التغييرات، لكن فشل رفع الشعار"
          : "تم حفظ التغييرات بنجاح",
      );
    } catch (e) {
      toast.error((e as Error).message || "فشل الحفظ");
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async () => {
    if (!r || confirmText.trim() !== r.name.trim()) return;
    setDeleting(true);
    try {
      // Delete dependent rows first (no FK cascade in schema)
      const { data: orderRows } = await supabase
        .from("orders")
        .select("id")
        .eq("restaurant_id", r.id);
      const orderIds = (orderRows ?? []).map((o: any) => o.id);
      if (orderIds.length) {
        await supabase.from("order_items").delete().in("order_id", orderIds);
      }
      await supabase.from("reviews").delete().eq("restaurant_id", r.id);
      await supabase.from("orders").delete().eq("restaurant_id", r.id);
      await supabase.from("menu_items").delete().eq("restaurant_id", r.id);
      await supabase.from("categories").delete().eq("restaurant_id", r.id);
      await supabase.from("tables").delete().eq("restaurant_id", r.id);
      const { error } = await supabase
        .from("restaurants")
        .delete()
        .eq("id", r.id);
      if (error) throw new Error(error.message);
      await supabase.auth.signOut();
      toast.success("تم حذف الحساب");
      navigate({ to: "/" });
    } catch (e) {
      toast.error((e as Error).message || "فشل الحذف");
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-[var(--primary)]" />
      </div>
    );
  }

  if (!r) {
    return (
      <div className="max-w-lg mx-auto space-y-6 py-12" dir="rtl">
        <div className="glass shadow-glass rounded-2xl p-8 text-center space-y-4">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-[var(--primary)]/10 flex items-center justify-center">
            <Settings className="w-8 h-8 text-[var(--primary)]" />
          </div>
          <h1 className="text-xl font-bold">إنشاء مطعمك</h1>
          <p className="text-sm text-muted-foreground">
            أضف بيانات مطعمك للبدء
          </p>
        </div>
        <div className="glass shadow-glass rounded-2xl border border-border/60 p-6 space-y-4">
          <div className="space-y-2">
            <Label>اسم المطعم</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="مثال: مطعم السهل"
              className="rounded-xl"
            />
          </div>
          <div className="space-y-2">
            <Label>رابط Google Maps (اختياري)</Label>
            <Input
              value={gUrl}
              onChange={(e) => setGUrl(e.target.value)}
              placeholder="https://g.page/..."
              className="rounded-xl"
            />
          </div>
          <Button
            onClick={async () => {
              if (!name.trim()) {
                toast.error("أدخل اسم المطعم");
                return;
              }
              setSaving(true);
              try {
                const { data: u } = await supabase.auth.getUser();
                const ownerId = u.user?.id ?? "mock-owner";
                const { data, error } = await supabase
                  .from("restaurants")
                  .insert({
                    name: name.trim(),
                    owner_id: ownerId,
                    google_maps_review_url: gUrl || null,
                    activation_code: (() => {
                      const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
                      let c = "REST-";
                      for (let i = 0; i < 8; i++) {
                        c += chars.charAt(
                          Math.floor(Math.random() * chars.length),
                        );
                        if (i === 3) c += "-";
                      }
                      return c;
                    })(),
                    created_at: new Date().toISOString(),
                  })
                  .select(
                    "id, name, logo_url, google_maps_review_url, activation_code",
                  )
                  .single();
                if (error) throw error;
                setR(data);
                localStorage.setItem(
                  "sahl_dz_restaurant",
                  JSON.stringify(data),
                );
                window.dispatchEvent(new Event("restaurant-updated"));
                toast.success("تم إنشاء المطعم بنجاح");
              } catch {
                // Fallback for preview mode — use local state + localStorage
                const mockR = {
                  id: "mock-" + Date.now(),
                  name: name.trim(),
                  logo_url: null,
                  google_maps_review_url: gUrl || null,
                };
                setR(mockR);
                localStorage.setItem(
                  "sahl_dz_restaurant",
                  JSON.stringify(mockR),
                );
                window.dispatchEvent(new Event("restaurant-updated"));
                toast.success("تم إنشاء المطعم (وضع المعاينة)");
              } finally {
                setSaving(false);
              }
            }}
            disabled={saving || !name.trim()}
            className="w-full rounded-xl bg-[var(--primary)] text-[#1a1612] hover:bg-[var(--primary)]/90"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin ml-2" /> : null}
            إنشاء المطعم
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl space-y-6" dir="rtl">
      {/* Premium header */}
      <div className="glass shadow-glass rounded-2xl p-5 md:p-6 flex flex-wrap items-center gap-4">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-slate-500 to-gray-500 flex items-center justify-center text-white shadow-md shrink-0">
          <Settings className="w-6 h-6" />
        </div>
        <div className="min-w-0">
          <h1 className="text-xl md:text-2xl font-bold text-foreground tracking-tight">
            إعدادات المطعم
          </h1>
          <p className="text-xs md:text-sm text-muted-foreground mt-0.5">
            عدّل معلومات مطعمك في أي وقت
          </p>
        </div>
      </div>

      {/* أرقام تسجيل المطعم */}
      {r?.activation_code ? (
        <div className="glass shadow-glass rounded-2xl border-2 border-primary/30 p-6 space-y-4 bg-gradient-to-br from-primary/5 to-transparent">
          <div className="flex items-center gap-2">
            <KeyRound className="w-5 h-5 text-primary" />
            <h3 className="text-lg font-bold">
              رقم تسجيل (تسجيل الدخول على الأجهزة)
            </h3>
          </div>
          <p className="text-sm text-muted-foreground">
            هذا الرمز مطلوب عند فتح تطبيق سطح المكتب / تسجيل دخول الموظفين من
            أجهزة جديدة. شاركه مع موظفيك أو احتفظ به.
          </p>
          <div className="flex items-center gap-2 rounded-xl bg-muted/40 border p-3">
            <div
              dir="ltr"
              className="font-mono text-lg md:text-2xl font-bold tracking-widest text-primary"
            >
              {r.activation_code}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (r.activation_code) {
                  navigator.clipboard.writeText(r.activation_code);
                  toast.success("تم نسخ رمز التسجيل");
                }
              }}
            >
              <Copy className="w-4 h-4 ml-1" />
              نسخ الرمز
            </Button>
          </div>
          <div className="rounded-xl bg-blue-50 border border-blue-200 p-3 text-xs text-blue-900">
            💡 استخدم هذا الرمز مع رقم الموظف (السيريال) ورمز PIN عند تسجيل
            الدخول من تطبيق سطح المكتب.
          </div>
        </div>
      ) : null}

      <div
        data-annotate="settings-info"
        className="glass shadow-glass rounded-2xl border border-border/60 p-6 space-y-5"
      >
        {/* Logo */}
        <div className="space-y-2">
          <Label>شعار المطعم</Label>
          <div className="flex items-center gap-4">
            {logoPreview ? (
              <img
                src={logoPreview}
                alt="logo"
                className="w-20 h-20 rounded-2xl object-cover border"
              />
            ) : (
              <div className="w-20 h-20 rounded-2xl bg-muted flex items-center justify-center text-muted-foreground text-xl font-bold">
                {name?.[0] ?? "م"}
              </div>
            )}
            <div>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={onPickLogo}
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => fileRef.current?.click()}
              >
                <Upload className="w-4 h-4 ml-2" />
                تغيير الشعار
              </Button>
            </div>
          </div>
        </div>

        {/* Name */}
        <div className="space-y-2">
          <Label htmlFor="name">اسم المطعم</Label>
          <Input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="اسم المطعم"
          />
        </div>

        {/* Google URL */}
        <div className="space-y-2">
          <Label htmlFor="gurl">رابط تقييم Google Maps</Label>
          <Input
            id="gurl"
            value={gUrl}
            onChange={(e) => setGUrl(e.target.value)}
            placeholder="https://g.page/r/..."
            dir="ltr"
          />
        </div>

        <div className="pt-2">
          <Button
            onClick={onSave}
            disabled={saving}
            className="w-full sm:w-auto"
          >
            {saving && <Loader2 className="w-4 h-4 ml-2 animate-spin" />}
            حفظ التغييرات
          </Button>
        </div>
      </div>

      {/* ─── الموظفون (unified) ─────────────────────────────── */}
      <div
        data-annotate="settings-staff"
        className="glass shadow-glass rounded-2xl border border-border/60 p-6 space-y-4"
      >
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            <h3 className="text-lg font-bold">الموظفون</h3>
          </div>
          <Button onClick={openAdd} className="gap-1.5">
            <UserPlus className="w-4 h-4" />
            إضافة موظف
          </Button>
        </div>
        <p className="text-sm text-muted-foreground">
          مكان واحد لكل الموظفين: الاسم + PIN + الصلاحيات (مطبخ، نادل، كاشير،
          وأقسام الإدارة). الموظف الذي له أكثر من صلاحية يجدها تبويبات في تطبيق
          سطح المكتب.
        </p>

        {employees.length === 0 ? (
          <div className="rounded-xl bg-muted/40 p-6 text-center text-sm text-muted-foreground">
            لا يوجد موظفون بعد — أضف أول موظف
          </div>
        ) : (
          <div className="space-y-2">
            {employees.map((emp) => (
              <div
                key={emp.id}
                className="flex items-center justify-between gap-2 rounded-xl bg-muted/40 px-3 py-2.5"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <div className="flex flex-col min-w-0">
                    <span className="font-medium truncate">{emp.name}</span>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(emp.serial ?? "");
                        toast.success("تم نسخ رقم الموظف");
                      }}
                      className="text-[11px] font-mono text-muted-foreground hover:text-primary underline decoration-dotted text-left"
                      dir="ltr"
                      title="نسخ رقم الموظف"
                    >
                      {emp.serial ?? ""} ⧉
                    </button>
                    {!emp.frozen && (
                      <span className="text-xs text-muted-foreground">نشط</span>
                    )}
                    {emp.frozen && (
                      <span className="text-xs text-red-500">موقوف</span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0 flex-wrap max-w-[45%] justify-end">
                  {(emp.permissions ?? []).slice(0, 3).map((p) => (
                    <span
                      key={p}
                      className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--primary)]/10 text-[var(--primary)] border border-[var(--primary)]/20"
                    >
                      {permissionLabel(p)}
                    </span>
                  ))}
                  {(emp.permissions ?? []).length > 3 && (
                    <span className="text-[10px] text-muted-foreground">
                      +{(emp.permissions ?? []).length - 3}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => openEdit(emp)}
                    title="تعديل"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => void toggleEmp(emp, emp.frozen)}
                    title={emp.frozen ? "تفعيل" : "تعطيل"}
                  >
                    <Power
                      className={`w-3.5 h-3.5 ${emp.frozen ? "text-muted-foreground" : "text-green-600"}`}
                    />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setDeleteMember(emp)}
                    className="text-red-500 hover:text-red-700"
                    title="حذف"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {r && (
          <p className="text-xs text-muted-foreground">
            تسجيل الدخول على سطح المكتب: رقم الموظف (السيريال) + PIN. الموظفون
            ذوو صلاحيات واجهات (مطبخ/نادل/كاشير) وأقسام إدارة يفتحونها من
            تبويبات التطبيق.
          </p>
        )}

        <div className="rounded-xl bg-blue-50 border border-blue-200 p-3 text-xs text-blue-900">
          إدارة تفصيلية للموظفين (تجميد بسبب، سجل الأداء) موجودة في قسم الموظفين
          من لوحة التشغيل.
        </div>
      </div>

      {/* Splash page settings */}
      <div className="glass shadow-glass rounded-2xl border border-border/60 p-6 space-y-5">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-bold">صفحة الترحيب (Splash)</h3>
          {!splashLoaded && (
            <Loader2 className="w-4 h-4 animate-spin text-primary" />
          )}
        </div>
        <p className="text-sm text-muted-foreground">
          أول ما يراه العميل عند مسح QR. يظهر مرة واحدة كل 24 ساعة.
        </p>

        {/* Enable/disable + always show toggles */}
        <div className="space-y-3 rounded-xl border bg-muted/30 p-4">
          <label className="flex items-start justify-between gap-4 cursor-pointer">
            <div className="space-y-0.5">
              <div className="font-semibold">تفعيل صفحة الترحيب</div>
              <p className="text-xs text-muted-foreground">
                إذا أوقفتها، سيدخل العميل مباشرة إلى المنيو دون رؤية صفحة
                الترحيب.
              </p>
            </div>
            <input
              type="checkbox"
              className="mt-1 h-5 w-5 accent-primary"
              checked={splashEnabled}
              onChange={(e) => setSplashEnabled(e.target.checked)}
            />
          </label>
          <label
            className={`flex items-start justify-between gap-4 cursor-pointer ${!splashEnabled ? "opacity-50" : ""}`}
          >
            <div className="space-y-0.5">
              <div className="font-semibold">
                إظهار الصفحة في كل زيارة (24 ساعة)
              </div>
              <p className="text-xs text-muted-foreground">
                عند التفعيل، تظهر صفحة الترحيب للعميل في كل مرة يفتح فيها المنيو
                حتى خلال نفس اليوم. عند الإيقاف، تظهر مرة واحدة فقط كل 24 ساعة.
              </p>
            </div>
            <input
              type="checkbox"
              className="mt-1 h-5 w-5 accent-primary"
              checked={splashAlwaysShow}
              disabled={!splashEnabled}
              onChange={(e) => setSplashAlwaysShow(e.target.checked)}
            />
          </label>
        </div>

        {/* Cover type */}
        <div className="space-y-2">
          <Label>نوع الغلاف</Label>
          <div className="flex gap-2">
            <Button
              type="button"
              variant={coverType === "image" ? "default" : "outline"}
              onClick={() => setCoverType("image")}
              size="sm"
            >
              <ImageIcon className="w-4 h-4 ml-2" />
              صورة
            </Button>
            <Button
              type="button"
              variant={coverType === "video" ? "default" : "outline"}
              onClick={() => setCoverType("video")}
              size="sm"
            >
              <VideoIcon className="w-4 h-4 ml-2" />
              فيديو
            </Button>
          </div>
        </div>

        {/* Cover preview */}
        <div className="space-y-2">
          <Label>
            {coverType === "video" ? "فيديو الغلاف" : "صورة الغلاف"}
          </Label>
          <div className="flex items-center gap-4">
            <div className="w-32 h-24 rounded-xl overflow-hidden bg-muted border flex items-center justify-center">
              {coverPreview ? (
                coverType === "video" ? (
                  <video
                    src={coverPreview}
                    muted
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <img
                    src={coverPreview}
                    alt="cover"
                    className="w-full h-full object-cover"
                  />
                )
              ) : (
                <span className="text-xs text-muted-foreground">لا يوجد</span>
              )}
            </div>
            <div className="space-y-2">
              <input
                ref={coverFileRef}
                type="file"
                accept={coverType === "video" ? "video/*" : "image/*"}
                className="hidden"
                onChange={onPickCover}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => coverFileRef.current?.click()}
              >
                <Upload className="w-4 h-4 ml-2" />
                اختر ملف
              </Button>
              <p className="text-xs text-muted-foreground">حد أقصى 25MB</p>
            </div>
          </div>
        </div>

        {/* Brand color */}
        <div className="space-y-2">
          <Label>لون العلامة (يحرّك الخلفية)</Label>
          <div className="flex items-center gap-3">
            <Input
              type="color"
              value={brandColor}
              onChange={(e) => setBrandColor(e.target.value)}
              className="h-10 w-14 p-1 cursor-pointer"
            />
            <Input
              value={brandColor}
              onChange={(e) => setBrandColor(e.target.value)}
              dir="ltr"
              className="font-mono"
              placeholder="#7c5cff"
            />
          </div>
        </div>

        {/* Tagline */}
        <div className="space-y-2">
          <Label>الشعار القصير</Label>
          <Input
            value={tagline}
            onChange={(e) => setTagline(e.target.value)}
            placeholder="نكهة لا تُنسى"
            maxLength={140}
          />
        </div>

        {/* Description */}
        <div className="space-y-2">
          <Label>وصف قصير</Label>
          <textarea
            value={splashDescription}
            onChange={(e) => setSplashDescription(e.target.value)}
            placeholder="عن المطعم..."
            maxLength={500}
            rows={3}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          />
        </div>

        {/* Features */}
        <div className="space-y-2">
          <Label>المميزات (حد أقصى 8)</Label>
          <div className="flex flex-wrap gap-2">
            {splashFeatures.map((f, idx) => (
              <div
                key={idx}
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted text-sm"
              >
                <span className="text-xs text-muted-foreground">{f.icon}</span>
                <span>{f.text}</span>
                <button
                  onClick={() => removeFeature(idx)}
                  className="text-muted-foreground hover:text-destructive"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-[140px_1fr_auto] gap-2 pt-2">
            <Input
              value={newFeatureIcon}
              onChange={(e) => setNewFeatureIcon(e.target.value)}
              placeholder="Sparkles"
              dir="ltr"
            />
            <Input
              value={newFeatureText}
              onChange={(e) => setNewFeatureText(e.target.value)}
              placeholder="مثل: حلال 100%"
              maxLength={80}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addFeature();
                }
              }}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addFeature}
            >
              <PlusIcon className="w-4 h-4 ml-1" />
              إضافة
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            اسم الأيقونة من{" "}
            <a
              href="https://lucide.dev/icons"
              target="_blank"
              rel="noopener noreferrer"
              className="underline"
            >
              lucide
            </a>{" "}
            (مثل: Sparkles, Leaf, Award).
          </p>
        </div>

        {/* Social */}
        <div className="space-y-3">
          <Label>روابط التواصل</Label>
          <div className="space-y-2">
            <Input
              value={instagramUrl}
              onChange={(e) => setInstagramUrl(e.target.value)}
              placeholder="https://instagram.com/..."
              dir="ltr"
            />
            <Input
              value={facebookUrl}
              onChange={(e) => setFacebookUrl(e.target.value)}
              placeholder="https://facebook.com/..."
              dir="ltr"
            />
            <Input
              value={whatsappNumber}
              onChange={(e) => setWhatsappNumber(e.target.value)}
              placeholder="213555..."
              dir="ltr"
            />
          </div>
        </div>

        <div className="pt-2">
          <Button
            onClick={onSaveSplash}
            disabled={splashSaving || !splashLoaded}
            className="w-full sm:w-auto"
          >
            {splashSaving && <Loader2 className="w-4 h-4 ml-2 animate-spin" />}
            حفظ صفحة الترحيب
          </Button>
        </div>
      </div>

      <div className="glass shadow-glass rounded-2xl border border-border/60 p-6 space-y-6">
        <div className="flex items-center gap-2">
          <Palette className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-bold">شكل منيو العميل</h3>
          {savingAppearance && (
            <Loader2 className="w-4 h-4 animate-spin text-primary" />
          )}
        </div>
        <p className="text-sm text-muted-foreground">
          اختر لون رئيسي يطبّق على كل العناصر، أو خصّص لون كل قسم على حدة
          (الهيدر، الفئات، أزرار +).
        </p>

        <div className="space-y-3">
          <Label>اللون الرئيسي (يطبّق على الكل)</Label>
          <div className="flex flex-wrap items-center gap-3">
            <Input
              type="color"
              value={menuColor}
              disabled={savingAppearance}
              onChange={(e) => saveMenuAppearance({ color: e.target.value })}
              className="h-12 w-16 p-1 cursor-pointer"
              aria-label="لون المنيو"
            />
            {Object.values(MENU_THEMES).map((t) => (
              <button
                key={t.id}
                type="button"
                disabled={savingAppearance}
                onClick={() =>
                  saveMenuAppearance({ theme: t.id, color: t.primary })
                }
                className={`h-10 min-w-10 rounded-full border-2 transition ${
                  menuTheme === t.id && menuColor === t.primary
                    ? "border-primary scale-105"
                    : "border-border"
                }`}
                style={{
                  background: `linear-gradient(135deg, ${t.preview[0]}, ${t.preview[1]}, ${t.preview[2]})`,
                }}
                aria-label={t.label}
                title={t.label}
              />
            ))}
          </div>
        </div>

        <div className="space-y-3 rounded-2xl border border-dashed p-4">
          <Label className="text-sm font-bold">
            تخصيص متقدّم — لون لكل قسم
          </Label>
          <p className="text-xs text-muted-foreground">
            ضع لون مختلف لكل عنصر تشاهده في صفحة العميل.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
            {[
              {
                key: "header",
                label: "لون الهيدر العلوي",
                value: headerColor,
                setter: (v: string) => saveMenuAppearance({ headerColor: v }),
              },
              {
                key: "category",
                label: "لون الفئات",
                value: categoryColor,
                setter: (v: string) => saveMenuAppearance({ categoryColor: v }),
              },
              {
                key: "button",
                label: "لون أزرار + والسلة",
                value: buttonColor,
                setter: (v: string) => saveMenuAppearance({ buttonColor: v }),
              },
            ].map((slot) => (
              <div key={slot.key} className="space-y-2">
                <Label className="text-xs">{slot.label}</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="color"
                    value={slot.value}
                    disabled={savingAppearance}
                    onChange={(e) => slot.setter(e.target.value)}
                    className="h-10 w-14 p-1 cursor-pointer"
                    aria-label={slot.label}
                  />
                  <div
                    className="flex-1 h-10 rounded-lg border"
                    style={{
                      background: `linear-gradient(135deg, ${slot.value}, ${slot.value}cc)`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          <Label>واجهة شاشة العميل</Label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {Object.values(MENU_LAYOUTS).map((layout) => {
              const active = menuLayout === layout.id;
              return (
                <button
                  key={layout.id}
                  type="button"
                  onClick={() => saveMenuAppearance({ layout: layout.id })}
                  disabled={savingAppearance}
                  className={`relative text-right rounded-2xl border-2 p-3 transition-all ${
                    active
                      ? "border-primary shadow-md"
                      : "border-border hover:border-primary/40"
                  } ${savingAppearance ? "opacity-70" : ""}`}
                >
                  <div
                    className={`grid ${layout.previewClass} gap-2 h-20 mb-3`}
                  >
                    <span
                      className="rounded-xl"
                      style={{ background: menuColor }}
                    />
                    <span className="rounded-xl bg-muted" />
                    <span className="rounded-xl bg-muted/70" />
                  </div>
                  <div className="space-y-1">
                    <span className="block font-bold text-sm">
                      {layout.label}
                    </span>
                    <span className="block text-xs text-muted-foreground">
                      {layout.description}
                    </span>
                  </div>
                  {active && (
                    <div className="absolute top-2 left-2 bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center shadow">
                      <Check className="w-3.5 h-3.5" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="glass shadow-glass rounded-2xl border border-border/60 p-6 space-y-4">
        <div className="flex items-center gap-2">
          <ShoppingBag className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-bold">الطلب السريع عبر QR (Takeaway)</h3>
        </div>
        <p className="text-sm text-muted-foreground">
          ضع رمز QR على طاولة الكاشير. العميل يمسح الرمز، يطلب الأكل، يدخل اسمه
          ورقمه، ويأخذ رمز طلبه (مثلاً{" "}
          <span className="font-mono font-bold">007</span>) لمتابعته. الرمز
          يُعاد ترقيمه تلقائياً كل يوم الساعة 6 صباحاً.
        </p>

        {takeawayEnabled ? (
          <>
            <div className="rounded-xl bg-green-50 border border-green-200 p-3 flex items-center gap-2 text-sm text-green-800">
              <Power className="w-4 h-4" />
              الطلب السريع مفعّل
            </div>

            {takeawayQrUrl && (
              <div className="flex flex-col items-center gap-2 rounded-xl border bg-white p-4">
                <img
                  src={takeawayQrUrl}
                  alt="QR للطلب السريع"
                  className="w-56 h-56 object-contain"
                />
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const w = window.open("", "_blank");
                      if (w) {
                        w.document.write(
                          `<html dir="rtl"><head><title>QR الطلب السريع</title></head><body style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100vh;font-family:sans-serif;margin:0;"><h2>${name || "اطلب من هنا"}</h2><img src="${takeawayQrUrl.replace("320x320", "600x600")}" style="width:480px;height:480px;"/><p style="font-size:14px;color:#555;">امسح الرمز للطلب</p><script>window.onload=()=>setTimeout(()=>window.print(),300)</script></body></html>`,
                        );
                        w.document.close();
                      }
                    }}
                  >
                    <QrCode className="w-4 h-4 ms-2" />
                    طباعة الرمز
                  </Button>
                  <a
                    href={takeawayQrUrl.replace("320x320", "800x800")}
                    download="takeaway-qr.png"
                  >
                    <Button variant="outline" size="sm">
                      <Upload className="w-4 h-4 ms-2 rotate-180" />
                      تنزيل
                    </Button>
                  </a>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label>الرابط</Label>
              <div className="flex gap-2">
                <Input
                  value={takeawayUrl}
                  readOnly
                  dir="ltr"
                  className="font-mono text-xs"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => {
                    if (takeawayUrl) {
                      navigator.clipboard.writeText(takeawayUrl);
                      toast.success("تم نسخ الرابط");
                    }
                  }}
                  aria-label="copy"
                >
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                onClick={onRegenTakeaway}
                disabled={takeawayBusy}
              >
                {takeawayBusy ? (
                  <Loader2 className="w-4 h-4 animate-spin ms-2" />
                ) : (
                  <RefreshCw className="w-4 h-4 ms-2" />
                )}
                توليد رابط جديد
              </Button>
              <Button
                variant="outline"
                onClick={() => setConfirmDisableTakeaway(true)}
                className="border-red-300 text-red-700 hover:bg-red-50"
              >
                <Power className="w-4 h-4 ms-2" />
                تعطيل النظام
              </Button>
            </div>
          </>
        ) : (
          <Button onClick={onEnableTakeaway} disabled={takeawayBusy}>
            {takeawayBusy && <Loader2 className="w-4 h-4 animate-spin ms-2" />}
            <ShoppingBag className="w-4 h-4 ms-2" />
            تفعيل الطلب السريع
          </Button>
        )}
      </div>

      <Dialog
        open={confirmDisableTakeaway}
        onOpenChange={setConfirmDisableTakeaway}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>تعطيل الطلب السريع؟</DialogTitle>
            <DialogDescription>
              لن يتمكن العملاء من المسح والطلب حتى تعيد التفعيل.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setConfirmDisableTakeaway(false)}
            >
              إلغاء
            </Button>
            <Button
              className="bg-red-600 hover:bg-red-700 text-white"
              onClick={onDisableTakeaway}
            >
              تعطيل
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="glass shadow-glass rounded-2xl border border-border/60 p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Bike className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-bold">نظام التوصيل (Delivery)</h3>
        </div>
        <p className="text-sm text-muted-foreground">
          فعّل رابطًا مخصصًا للطلب من البيت — انسخه وضعه في Bio على Instagram أو
          شاركه عبر WhatsApp. سيظهر الطلب لدى الطباخ مع اسم العميل ورقم الهاتف
          وعنوان التوصيل.
        </p>

        {deliveryEnabled ? (
          <>
            <div className="rounded-xl bg-green-50 border border-green-200 p-3 flex items-center gap-2 text-sm text-green-800">
              <Power className="w-4 h-4" />
              نظام التوصيل مفعّل
            </div>

            <div className="space-y-2">
              <Label>رابط التوصيل المخصص</Label>
              <div className="flex gap-2">
                <Input
                  value={deliveryUrl}
                  readOnly
                  dir="ltr"
                  className="font-mono text-xs"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => {
                    if (deliveryUrl) {
                      navigator.clipboard.writeText(deliveryUrl);
                      toast.success("تم نسخ الرابط");
                    }
                  }}
                  aria-label="copy"
                >
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                ضع هذا الرابط في الـ Bio على Instagram أو شاركه مع زبائنك.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                onClick={onRegenDelivery}
                disabled={deliveryBusy}
              >
                {deliveryBusy ? (
                  <Loader2 className="w-4 h-4 animate-spin ms-2" />
                ) : (
                  <RefreshCw className="w-4 h-4 ms-2" />
                )}
                توليد رابط جديد
              </Button>
              <Button
                variant="outline"
                onClick={() => setConfirmDisableDelivery(true)}
                className="border-red-300 text-red-700 hover:bg-red-50"
              >
                <Power className="w-4 h-4 ms-2" />
                تعطيل النظام
              </Button>
            </div>
          </>
        ) : (
          <Button onClick={onEnableDelivery} disabled={deliveryBusy}>
            {deliveryBusy && <Loader2 className="w-4 h-4 animate-spin ms-2" />}
            <Bike className="w-4 h-4 ms-2" />
            تفعيل نظام التوصيل
          </Button>
        )}
      </div>

      <Dialog
        open={confirmDisableDelivery}
        onOpenChange={setConfirmDisableDelivery}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>تعطيل نظام التوصيل؟</DialogTitle>
            <DialogDescription>
              لن يتمكن العملاء من إرسال طلبات توصيل جديدة عبر الرابط حتى تعيد
              التفعيل.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setConfirmDisableDelivery(false)}
            >
              إلغاء
            </Button>
            <Button
              className="bg-red-600 hover:bg-red-700 text-white"
              onClick={onDisableDelivery}
            >
              تعطيل
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="glass shadow-glass rounded-2xl border-2 border-red-200 p-6 space-y-3">
        <h3 className="text-lg font-bold text-red-700">المنطقة الحساسة</h3>
        <p className="text-sm text-muted-foreground">
          حذف الحساب سيؤدي إلى إزالة المطعم وكل البيانات نهائياً.
        </p>
        <Button
          variant="outline"
          className="border-red-300 text-red-700 hover:bg-red-50 hover:text-red-800"
          onClick={() => {
            setConfirmText("");
            setConfirmOpen(true);
          }}
        >
          <Trash2 className="w-4 h-4 ml-2" />
          حذف الحساب
        </Button>
      </div>

      {/* ─── Add employee dialog ─────────────────────────────── */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>إضافة موظف جديد</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>الاسم</Label>
              <Input
                value={addForm.name}
                onChange={(e) =>
                  setAddForm({ ...addForm, name: e.target.value })
                }
                placeholder="مثال: أحمد بلحاج"
                autoFocus
              />
            </div>

            <div>
              <Label>رمز PIN للدخول</Label>
              <div className="flex items-center gap-2">
                <Input
                  dir="ltr"
                  inputMode="numeric"
                  value={addForm.pin}
                  onChange={(e) =>
                    setAddForm({
                      ...addForm,
                      pin: e.target.value.replace(/\D/g, "").slice(0, 6),
                    })
                  }
                  placeholder="4–6 أرقام (اتركه فارغاً للتوليد)"
                  className="font-mono tracking-widest text-center"
                />
                <Button
                  variant="outline"
                  size="icon"
                  title="توليد PIN"
                  onClick={() =>
                    void generateUniquePin().then((p) =>
                      setAddForm((f) => ({ ...f, pin: p })),
                    )
                  }
                >
                  <Shuffle className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <div>
              <Label>الصلاحيات</Label>
              <PermissionsSelect
                value={addForm.permissions}
                onChange={(perms) =>
                  setAddForm({ ...addForm, permissions: perms })
                }
              />
            </div>

            <div className="rounded-xl border border-border/60 bg-muted/30 p-3 space-y-2">
              <label className="flex items-center justify-between gap-3 cursor-pointer">
                <span className="text-sm font-semibold">
                  الدخول من الويب (بريد + كلمة سر) — اختياري
                </span>
                <input
                  type="checkbox"
                  className="accent-primary"
                  checked={addForm.showWeb}
                  onChange={(e) =>
                    setAddForm({ ...addForm, showWeb: e.target.checked })
                  }
                />
              </label>
              {addForm.showWeb && (
                <div className="space-y-2 pt-1">
                  <Input
                    type="email"
                    dir="ltr"
                    placeholder="employee@restaurant.com"
                    value={addForm.email}
                    onChange={(e) =>
                      setAddForm({ ...addForm, email: e.target.value })
                    }
                  />
                  <div className="relative">
                    <Input
                      type={showAddPw ? "text" : "password"}
                      dir="ltr"
                      placeholder="كلمة السر (6 أحرف على الأقل)"
                      value={addForm.password}
                      onChange={(e) =>
                        setAddForm({ ...addForm, password: e.target.value })
                      }
                      className="pl-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowAddPw((v) => !v)}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showAddPw ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>
              إلغاء
            </Button>
            <Button onClick={() => void submitAdd()} disabled={savingEmp}>
              {savingEmp && <Loader2 className="w-4 h-4 animate-spin ms-2" />}
              حفظ
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Added credentials dialog ────────────────────────── */}
      <Dialog
        open={!!addedCreds}
        onOpenChange={(o) => {
          if (!o) setAddedCreds(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>احفظ بيانات الموظف</DialogTitle>
            <DialogDescription>
              سلّمها للموظف — لن تظهر له بيانات الدخول داخل شاشات التطبيق.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>رقم الموظف (السيريال)</Label>
              <div className="flex gap-2">
                <Input
                  value={addedCreds?.serial ?? ""}
                  readOnly
                  dir="ltr"
                  className="font-mono text-center"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => {
                    navigator.clipboard.writeText(addedCreds?.serial ?? "");
                    toast.success("تم النسخ");
                  }}
                >
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
            </div>
            <div>
              <Label>رمز PIN</Label>
              <div className="flex gap-2">
                <Input
                  value={addedCreds?.pin ?? ""}
                  readOnly
                  dir="ltr"
                  className="font-mono text-center"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => {
                    navigator.clipboard.writeText(addedCreds?.pin ?? "");
                    toast.success("تم النسخ");
                  }}
                >
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => setAddedCreds(null)}>تم</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Edit employee dialog ────────────────────────────── */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>تعديل الموظف — {editMember?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>الاسم</Label>
              <Input
                value={editForm.name}
                onChange={(e) =>
                  setEditForm({ ...editForm, name: e.target.value })
                }
              />
            </div>

            <div>
              <Label>الصلاحيات</Label>
              <PermissionsSelect
                value={editForm.permissions}
                onChange={(perms) =>
                  setEditForm({ ...editForm, permissions: perms })
                }
              />
            </div>

            <div>
              <Label>تغيير PIN (اختياري)</Label>
              <Input
                dir="ltr"
                inputMode="numeric"
                value={editForm.pin}
                onChange={(e) =>
                  setEditForm({
                    ...editForm,
                    pin: e.target.value.replace(/\D/g, "").slice(0, 6),
                  })
                }
                placeholder={
                  editMember?.pin_changed
                    ? "اتركه فارغاً لعدم التغيير"
                    : "اتركه فارغاً لعدم التغيير"
                }
                className="font-mono tracking-widest text-center"
              />
            </div>

            {!editMember?.user_id && (
              <div className="rounded-xl border border-border/60 bg-muted/30 p-3 space-y-2">
                <label className="flex items-center justify-between gap-3 cursor-pointer">
                  <span className="text-sm font-semibold">
                    تفعيل الدخول من الويب (بريد + كلمة سر)
                  </span>
                  <input
                    type="checkbox"
                    className="accent-primary"
                    checked={editForm.showWeb}
                    onChange={(e) =>
                      setEditForm({ ...editForm, showWeb: e.target.checked })
                    }
                  />
                </label>
                {editForm.showWeb && (
                  <div className="space-y-2 pt-1">
                    <Input
                      type="email"
                      dir="ltr"
                      placeholder="employee@restaurant.com"
                      value={editForm.email}
                      onChange={(e) =>
                        setEditForm({ ...editForm, email: e.target.value })
                      }
                    />
                    <div className="relative">
                      <Input
                        type={showEditPw ? "text" : "password"}
                        dir="ltr"
                        placeholder="كلمة السر (6 أحرف على الأقل)"
                        value={editForm.password}
                        onChange={(e) =>
                          setEditForm({ ...editForm, password: e.target.value })
                        }
                        className="pl-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowEditPw((v) => !v)}
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {showEditPw ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
            {editMember?.email && (
              <p className="text-xs text-muted-foreground">
                الدخول من الويب مفعّل:{" "}
                <span dir="ltr" className="font-mono">
                  {editMember.email}
                </span>
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>
              إلغاء
            </Button>
            <Button onClick={() => void submitEdit()} disabled={savingEmp}>
              {savingEmp && <Loader2 className="w-4 h-4 animate-spin ms-2" />}
              حفظ
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={deleteMember !== null}
        onOpenChange={(o) => {
          if (!o) setDeleteMember(null);
        }}
        title={`حذف الموظف "${deleteMember?.name}"؟`}
        description="الحذف نهائي ولا يمكن التراجع عنه. سيُحرم الموظف من الدخول نهائياً."
        confirmLabel="نعم، احذف"
        destructive
        onConfirm={() => void submitDelete()}
      />

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>هل أنت متأكد؟</DialogTitle>
            <DialogDescription>سيتم حذف:</DialogDescription>
          </DialogHeader>
          <ul className="text-sm list-disc pr-5 text-muted-foreground space-y-1">
            <li>المطعم</li>
            <li>كل المنيو</li>
            <li>كل الطاولات</li>
            <li>كل الطلبات</li>
            <li>كل التقييمات</li>
          </ul>
          <div className="space-y-2 mt-2">
            <Label htmlFor="confirm">اكتب اسم المطعم للتأكيد</Label>
            <Input
              id="confirm"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder={r.name}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>
              إلغاء
            </Button>
            <Button
              className="bg-red-600 hover:bg-red-700 text-white"
              disabled={confirmText.trim() !== r.name.trim() || deleting}
              onClick={onDelete}
            >
              {deleting && <Loader2 className="w-4 h-4 ml-2 animate-spin" />}
              حذف نهائياً
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default SettingsPage;
