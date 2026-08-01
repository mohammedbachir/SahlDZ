export function appOrigin(): string {
  if (typeof window !== "undefined") {
    return window.location.origin;
  }
  const fallback = process.env.VITE_APP_URL;
  return fallback || "";
}
