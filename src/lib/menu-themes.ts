export type MenuThemeId = "gold" | "emerald" | "royal" | "rose" | "ocean" | "charcoal";

export type MenuLayoutId = "grid" | "list" | "split" | "card";

export type MenuAppearance = {
  theme: MenuThemeId;
  color: string;
  layout: MenuLayoutId;
  headerColor: string;
  categoryColor: string;
  buttonColor: string;
};

export const MENU_THEMES: Record<
  MenuThemeId,
  { id: MenuThemeId; primary: string; label: string; preview: [string, string, string] }
> = {
  gold: { id: "gold", primary: "#D4A853", label: "ذهبي", preview: ["#7c5c10", "#D4A853", "#f0d9a0"] },
  emerald: { id: "emerald", primary: "#3D7A4A", label: "زمردي", preview: ["#1d4a2a", "#3D7A4A", "#9fd4ac"] },
  royal: { id: "royal", primary: "#5A7FB5", label: "ملكي", preview: ["#2b3f66", "#5A7FB5", "#b6cbe8"] },
  rose: { id: "rose", primary: "#B85A7A", label: "وردي", preview: ["#6e2a44", "#B85A7A", "#e8b6c8"] },
  ocean: { id: "ocean", primary: "#2E8B8B", label: "أوقيانوسي", preview: ["#164d4d", "#2E8B8B", "#9fd4d4"] },
  charcoal: { id: "charcoal", primary: "#4B4B4B", label: "فحمي", preview: ["#1c1c1c", "#4B4B4B", "#9a9a9a"] },
};

export const MENU_LAYOUTS: Record<
  MenuLayoutId,
  { id: MenuLayoutId; label: string; description: string; previewClass: string }
> = {
  grid: { id: "grid", label: "شبكة", description: "أصناف في شبكة متوازنة", previewClass: "grid-cols-2 grid-rows-2" },
  list: { id: "list", label: "قائمة", description: "عرض عمودي مريح", previewClass: "grid-cols-1 grid-rows-2" },
  split: { id: "split", label: "مقسوم", description: "أعمدة متجاورة", previewClass: "grid-cols-2 grid-rows-1" },
  card: { id: "card", label: "بطاقات", description: "بطاقات بارزة كبيرة", previewClass: "grid-cols-1 grid-rows-1" },
};

export const DEFAULT_MENU_COLOR = "#D4A853";
export const DEFAULT_MENU_THEME: MenuThemeId = "gold";
export const DEFAULT_MENU_LAYOUT: MenuLayoutId = "grid";

export function serializeMenuAppearance(appearance: MenuAppearance): string {
  return JSON.stringify(appearance);
}

export function parseMenuAppearance(
  raw: string,
): { theme: MenuThemeId; color: string; layout: MenuLayoutId; headerColor?: string; categoryColor?: string; buttonColor?: string } {
  try {
    const parsed = JSON.parse(raw) as Partial<MenuAppearance>;
    const theme = parsed.theme && parsed.theme in MENU_THEMES ? parsed.theme : DEFAULT_MENU_THEME;
    const layout = parsed.layout && parsed.layout in MENU_LAYOUTS ? parsed.layout : DEFAULT_MENU_LAYOUT;
    return {
      theme,
      color: parsed.color ?? DEFAULT_MENU_COLOR,
      layout,
      headerColor: parsed.headerColor,
      categoryColor: parsed.categoryColor,
      buttonColor: parsed.buttonColor,
    };
  } catch {
    return {
      theme: DEFAULT_MENU_THEME,
      color: DEFAULT_MENU_COLOR,
      layout: DEFAULT_MENU_LAYOUT,
    };
  }
}
