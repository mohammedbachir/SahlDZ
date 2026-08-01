import i18n from "@/lib/i18n";

export function tx(key: string): string {
  const value = i18n.t(key);
  return typeof value === "string" ? value : key;
}
