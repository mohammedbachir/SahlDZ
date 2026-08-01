import { createServerFn } from "@tanstack/react-start";

export const updateRestaurantSettings = createServerFn({ method: "POST" })
  .validator(
    (d: {
      name?: string;
      logo_url?: string | null;
      logo_upload?: string | { name: string; type: string; base64: string } | null;
      google_maps_review_url?: string | null;
    }) => d,
  )
  .handler(async () => ({ logo_url: null as string | null }));

export const updateMenuTheme = createServerFn({ method: "POST" })
  .validator((d: { menu_theme: string }) => d)
  .handler(async () => ({ ok: true }));

export const getSplashSettings = createServerFn({ method: "GET" }).handler(async () => ({
  splash_enabled: false,
  splash_always_show: false,
  cover_type: "image" as string,
  cover_image_url: null as string | null,
  cover_video_url: null as string | null,
  tagline: "",
  splash_description: "",
  features: [] as Array<{ icon: string; text: string }>,
  instagram_url: "",
  facebook_url: "",
  whatsapp_number: "",
  brand_color: "#7c5cff",
}));

export const updateSplashSettings = createServerFn({ method: "POST" })
  .validator((d: {
    splash_enabled?: boolean;
    splash_always_show?: boolean;
    cover_type?: string;
    cover_image_url?: string | null;
    cover_video_url?: string | null;
    cover_upload?: string | { name: string; type: string; base64: string } | null;
    tagline?: string | null;
    splash_description?: string | null;
    features?: string | Array<{ icon: string; text: string }>;
    instagram_url?: string | null;
    facebook_url?: string | null;
    whatsapp_number?: string | null;
    brand_color?: string | null;
  }) => d)
  .handler(async () => ({
    cover_image_url: null as string | null,
    cover_video_url: null as string | null,
  }));

export const createStaffAccount = createServerFn({ method: "POST" })
  .validator((d: { email: string; password: string; role: string }) => d)
  .handler(async () => ({ staff: { id: "mock-staff", email: "" } }));

export const deleteStaffAccount = createServerFn({ method: "POST" })
  .validator((d: { staffUserId: string }) => d)
  .handler(async () => ({ ok: true }));

export const updateStaffPassword = createServerFn({ method: "POST" })
  .validator((d: { staffUserId: string; newPassword: string }) => d)
  .handler(async () => ({ ok: true }));

export const listStaffAccounts = createServerFn({ method: "GET" }).handler(async () => ({
  staff: [],
}));
