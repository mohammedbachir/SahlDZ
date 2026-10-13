import type { jsPDF } from "jspdf";

/**
 * Arabic PDF font support.
 *
 * jsPDF ships with Helvetica, which has no Arabic glyphs — Arabic text is then
 * emitted as raw code points and renders as mojibake ("þ..."). jsPDF can shape
 * and reorder Arabic (it runs `processArabic` + a BiDi engine on every `text()`
 * call), but only if the active font actually contains the Arabic presentation
 * forms (U+FB50–FDFF / U+FE70–FEFF). Amiri covers all of them, so we embed it.
 *
 * The TTF lives at `public/fonts/Amiri-Regular.ttf` and is fetched once at
 * runtime, cached, and registered on each jsPDF document before drawing.
 */

export const ARABIC_FONT = "Amiri";

const FONT_FILE = "Amiri-Regular.ttf";
const FONT_URL = "/fonts/Amiri-Regular.ttf";

let cachedBase64: string | null = null;
let pending: Promise<string> | null = null;

function toBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

/**
 * Fetch (once) and cache the Arabic font as base64. Safe to call repeatedly;
 * resolves immediately after the first successful load.
 */
export async function ensureArabicFont(): Promise<string | null> {
  if (cachedBase64) return cachedBase64;
  if (typeof fetch === "undefined") return null;
  if (!pending) {
    pending = (async () => {
      const res = await fetch(FONT_URL, { cache: "force-cache" });
      if (!res.ok) throw new Error(`Arabic font load failed: ${res.status}`);
      cachedBase64 = toBase64(await res.arrayBuffer());
      return cachedBase64;
    })();
  }
  try {
    return await pending;
  } catch (error) {
    console.warn("[pdf] Arabic font unavailable, falling back to default", error);
    pending = null;
    return null;
  }
}

/**
 * Register the cached Arabic font on a document and make it active. Must be
 * preceded by `await ensureArabicFont()`. No-op (keeps Helvetica) if the font
 * has not been loaded yet.
 */
export function applyArabicFont(doc: jsPDF): void {
  if (!cachedBase64) {
    void ensureArabicFont();
    return;
  }
  doc.addFileToVFS(FONT_FILE, cachedBase64);
  doc.addFont(FONT_FILE, ARABIC_FONT, "normal");
  doc.addFont(FONT_FILE, ARABIC_FONT, "bold");
  doc.addFont(FONT_FILE, ARABIC_FONT, "italic");
  doc.addFont(FONT_FILE, ARABIC_FONT, "bolditalic");
  doc.setFont(ARABIC_FONT, "normal");
}

/** Shared style options for jspdf-autotable so tables use the Arabic font. */
export const ARABIC_STYLE = {
  font: ARABIC_FONT,
  halign: "right" as const,
};
