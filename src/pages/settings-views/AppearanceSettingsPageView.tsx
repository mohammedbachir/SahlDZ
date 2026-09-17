import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2, Palette, Check } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useServerFn } from "@tanstack/react-start";
import { updateMenuTheme } from "@/lib/settings.functions";
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



async function getServerAuthHeaders() {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error("الجلسة منتهية، سجّل دخولك من جديد");
  return { Authorization: `Bearer ${token}` };
}

export function AppearanceSettingsPageView() {
  const updateThemeFn = useServerFn(updateMenuTheme);
  
  const [menuTheme, setMenuTheme] = useState<MenuThemeId>(DEFAULT_MENU_THEME);
  const [menuColor, setMenuColor] = useState(DEFAULT_MENU_COLOR);
  const [menuLayout, setMenuLayout] = useState<MenuLayoutId>(DEFAULT_MENU_LAYOUT);
  const [headerColor, setHeaderColor] = useState(DEFAULT_MENU_COLOR);
  const [categoryColor, setCategoryColor] = useState(DEFAULT_MENU_COLOR);
  const [buttonColor, setButtonColor] = useState(DEFAULT_MENU_COLOR);
  
  const [loading, setLoading] = useState(true);
  const [savingAppearance, setSavingAppearance] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const { data: u } = await supabase.auth.getUser();
        if (!u.user) {
          setLoading(false);
          return;
        }
        const { data: rest, error } = await supabase
          .from("restaurants")
          .select("menu_theme")
          .eq("owner_id", u.user.id)
          .limit(1)
          .single();
          
        if (rest?.menu_theme && !error) {
          const appearance = parseMenuAppearance(rest.menu_theme);
          setMenuTheme(appearance.theme);
          setMenuColor(appearance.color);
          setMenuLayout(appearance.layout);
          setHeaderColor(appearance.headerColor ?? appearance.color);
          setCategoryColor(appearance.categoryColor ?? appearance.color);
          setButtonColor(appearance.buttonColor ?? appearance.color);
        }
      } catch (e) {
        // ignore
      } finally {
        setLoading(false);
      }
    })();
  }, []);

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
    const sync = next.syncAll || next.color !== undefined || next.theme !== undefined;
    const nextHeader = (next.headerColor ?? (sync ? nextColor : headerColor)).toUpperCase();
    const nextCategory = (next.categoryColor ?? (sync ? nextColor : categoryColor)).toUpperCase();
    const nextButton = (next.buttonColor ?? (sync ? nextColor : buttonColor)).toUpperCase();
    
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

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 mb-6">
        <Palette className="w-6 h-6 text-primary" />
        <h2 className="text-xl font-bold">شكل منيو العميل</h2>
        {savingAppearance && <Loader2 className="w-4 h-4 animate-spin text-primary" />}
      </div>

      <div className="bg-card border border-border rounded-xl p-6 space-y-6">
        <p className="text-sm text-muted-foreground">
          اختر لون رئيسي يطبّق على كل العناصر، أو خصّص لون كل قسم على حدة (الهيدر، الفئات، أزرار +).
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
                onClick={() => saveMenuAppearance({ theme: t.id, color: t.primary })}
                className={`h-10 min-w-10 rounded-full border-2 transition ${
                  menuTheme === t.id && menuColor === t.primary
                    ? "border-primary scale-105"
                    : "border-border hover:scale-105"
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
          <Label className="text-sm font-bold">تخصيص متقدّم — لون لكل قسم</Label>
          <p className="text-xs text-muted-foreground">ضع لون مختلف لكل عنصر تشاهده في صفحة العميل.</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
            {[
              { key: "header", label: "لون الهيدر العلوي", value: headerColor, setter: (v: string) => saveMenuAppearance({ headerColor: v }) },
              { key: "category", label: "لون الفئات", value: categoryColor, setter: (v: string) => saveMenuAppearance({ categoryColor: v }) },
              { key: "button", label: "لون أزرار + والسلة", value: buttonColor, setter: (v: string) => saveMenuAppearance({ buttonColor: v }) },
            ].map((slot) => (
              <div key={slot.key} className="space-y-2">
                <Label className="text-xs">{slot.label}</Label>
                <div className="flex items-center gap-2">
                  <Input type="color" value={slot.value} disabled={savingAppearance} onChange={(e) => slot.setter(e.target.value)} className="h-10 w-14 p-1 cursor-pointer" aria-label={slot.label} />
                  <div className="flex-1 h-10 rounded-lg border" style={{ background: `linear-gradient(135deg, ${slot.value}, ${slot.value}cc)` }} />
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
                    active ? "border-primary shadow-md" : "border-border hover:border-primary/40"
                  } ${savingAppearance ? "opacity-70" : ""}`}
                >
                  <div className={`grid ${layout.previewClass} gap-2 h-20 mb-3`}>
                    <span className="rounded-xl" style={{ background: menuColor }} />
                    <span className="rounded-xl bg-muted" />
                    <span className="rounded-xl bg-muted/70" />
                  </div>
                  <div className="space-y-1">
                    <span className="block font-bold text-sm">{layout.label}</span>
                    <span className="block text-xs text-muted-foreground">{layout.description}</span>
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
    </div>
  );
}
