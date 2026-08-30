export type PreviewRestaurant = {
  id: string;
  name: string;
  logo_url: string | null;
};

export const PREVIEW_RESTAURANT: PreviewRestaurant = {
  id: "mock-restaurant-id",
  name: "مطعم السهل",
  logo_url: null,
};

export const isPreviewToken = (token: string | null | undefined): boolean =>
  !!token && token.startsWith("mock_");

export const previewExpiry = (): string =>
  new Date(Date.now() + 24 * 3600 * 1000).toISOString();
