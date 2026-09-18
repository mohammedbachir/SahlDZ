import { supabase } from "@/integrations/supabase/client";

export type UploadImageResult = {
  url: string;
  stored: "storage" | "inline" | "none";
  warning?: string;
};

export function buildUploadPath(
  restaurantId: string,
  folder: string,
  file: File,
): string {
  const rawExt = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const ext = rawExt.replace(/[^a-z0-9]/g, "") || "jpg";
  const id =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}`;
  return `${restaurantId}/${folder}/${id}.${ext}`;
}

function readAsDataURL(file: Blob): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result || ""));
    r.onerror = () => reject(r.error);
    r.readAsDataURL(file);
  });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("تعذّر قراءة الصورة"));
    img.src = src;
  });
}

/**
 * Downscales/re-encodes an image in the browser so uploads stay small.
 * Falls back to the original file when canvas is unavailable.
 */
export async function compressImage(
  file: File,
  maxDim = 900,
  quality = 0.75,
): Promise<{ blob: Blob; dataUrl: string }> {
  const original = await readAsDataURL(file);
  if (!file.type.startsWith("image/")) return { blob: file, dataUrl: original };
  try {
    if (typeof document === "undefined")
      return { blob: file, dataUrl: original };
    const img = await loadImage(original);
    const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
    const w = Math.max(1, Math.round(img.width * scale));
    const h = Math.max(1, Math.round(img.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return { blob: file, dataUrl: original };
    ctx.drawImage(img, 0, 0, w, h);
    const out = canvas.toDataURL("image/jpeg", quality);
    const blob = await (await fetch(out)).blob();
    if (blob.size > 0 && blob.size <= original.length) {
      return { blob, dataUrl: out };
    }
    return { blob: file, dataUrl: original };
  } catch {
    return { blob: file, dataUrl: original };
  }
}

/**
 * Uploads an image to Supabase/Firebase Storage, and if storage is not
 * reachable it transparently falls back to storing a compressed data URL
 * directly in the database. This guarantees the image is never lost.
 */
function base64Part(dataUrl: string): string {
  const i = dataUrl.indexOf(",");
  return i >= 0 ? dataUrl.slice(i + 1) : dataUrl;
}

/**
 * Uploads an image to Supabase/Firebase Storage, and if storage is not
 * reachable it transparently falls back to storing a compressed data URL
 * directly in the database. This guarantees the image is never lost.
 *
 * When `github` is provided it is tried first (free GitHub image storage),
 * then Firebase Storage, then the inline data-URL fallback.
 */
export async function uploadImageWithFallback(
  bucket: string,
  path: string,
  file: File,
  github?: (base64: string, path: string) => Promise<string | null>,
): Promise<UploadImageResult> {
  let compressed: { blob: Blob; dataUrl: string };
  try {
    compressed = await compressImage(file);
  } catch {
    throw new Error("تعذّر معالجة الصورة");
  }
  const contentType = compressed.blob.type || file.type || "image/jpeg";

  if (github) {
    try {
      const url = await github(base64Part(compressed.dataUrl), path);
      if (url) return { url, stored: "storage" };
    } catch {
      // GitHub not configured or failed — continue with Firebase/inline.
    }
  }

  try {
    const up = await supabase.storage
      .from(bucket)
      .upload(path, compressed.blob, { contentType });
    if (!up.error) {
      const direct = (up.data as { url?: string } | null)?.url;
      if (direct) return { url: direct, stored: "storage" };
      const pub = supabase.storage.from(bucket).getPublicUrl(path)
        .data.publicUrl;
      if (pub) return { url: pub, stored: "storage" };
    }
  } catch {
    // fall through to inline fallback
  }

  if (!compressed.dataUrl) {
    throw new Error("فشل رفع الصورة");
  }
  return {
    url: compressed.dataUrl,
    stored: "inline",
    warning:
      "خدمة تخزين الصور غير مُفعّلة على Firebase — تم حفظ الصورة داخل قاعدة البيانات مباشرة.",
  };
}
