import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Sparkles, Loader2, ImagePlus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Search } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { parseMenuImage } from "@/lib/menu-import.functions";
import { compressImage, uploadImageWithFallback } from "@/lib/image-upload";
import { uploadImageToGithub } from "@/lib/github-storage.functions";

type DraftItem = {
  name: string;
  description: string;
  price: string;
  included: boolean;
  bbox?: [number, number, number, number];
  imageUrl?: string;
};

type DraftCat = {
  name: string;
  included: boolean;
  items: DraftItem[];
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  restaurantId: string | null;
  existingCategories: Array<{
    id: string;
    name: string;
    display_order: number;
  }>;
  onImported: () => void;
};

export function MenuImportDialog({
  open,
  onOpenChange,
  restaurantId,
  existingCategories,
  onImported,
}: Props) {
  const parseFn = useServerFn(parseMenuImage);
  const ghUpload = useServerFn(uploadImageToGithub);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [parsing, setParsing] = useState(false);
  const [drafts, setDrafts] = useState<DraftCat[] | null>(null);
  const [importing, setImporting] = useState(false);
  const imgRef = useRef<HTMLImageElement | null>(null);

  useEffect(() => {
    if (!file) {
      setPreviewUrl(null);
      setDrafts(null);
      return;
    }
    const u = URL.createObjectURL(file);
    setPreviewUrl(u);
    setDrafts(null);
    return () => URL.revokeObjectURL(u);
  }, [file]);

  function reset() {
    setFile(null);
    setPreviewUrl(null);
    setDrafts(null);
    setParsing(false);
    setImporting(false);
  }

  async function onAnalyze() {
    if (!file) return;
    setParsing(true);
    try {
      const { blob } = await compressImage(file, 1600, 0.85);
      const b64 = await new Promise<string>((resolve, reject) => {
        const r = new FileReader();
        r.onload = () => {
          const s = String(r.result || "");
          const i = s.indexOf(",");
          resolve(i >= 0 ? s.slice(i + 1) : s);
        };
        r.onerror = () => reject(r.error);
        r.readAsDataURL(blob);
      });
      const res: any = await parseFn({
        data: { imageBase64: b64, mimeType: blob.type || "image/jpeg" },
      });
      if (res instanceof Response) throw new Error(await res.text());
      if (!res.categories?.length) {
        toast.warning("لم نستطع قراءة الأطباق — جرّب صورة أوضح");
        return;
      }
      setDrafts(
        res.categories.map((c: any) => ({
          name: String(c.name || ""),
          included: true,
          items: (c.items ?? []).map((it: any) => ({
            name: String(it.name || ""),
            description: it.description ?? "",
            price: String(it.price ?? ""),
            included: true,
            bbox: it.bbox,
          })),
        })),
      );
      toast.success("تم استخراج الأطباق بنجاح — راجعها ثم استورد");
    } catch (e) {
      toast.error((e as Error).message || "فشل تحليل الصورة");
    } finally {
      setParsing(false);
    }
  }

  function cropBbox(bbox?: [number, number, number, number]): string | null {
    const img = imgRef.current;
    if (!img || !bbox) return null;
    const [ymin, xmin, ymax, xmax] = bbox;
    if (ymax <= ymin || xmax <= xmin) return null;
    const sx = (xmin / 1000) * img.naturalWidth;
    const sy = (ymin / 1000) * img.naturalHeight;
    const sw = ((xmax - xmin) / 1000) * img.naturalWidth;
    const sh = ((ymax - ymin) / 1000) * img.naturalHeight;
    if (sw < 8 || sh < 8) return null;
    const canvas = document.createElement("canvas");
    const target = 360;
    const scale = Math.min(1, target / Math.max(sw, sh));
    canvas.width = Math.max(1, Math.round(sw * scale));
    canvas.height = Math.max(1, Math.round(sh * scale));
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    try {
      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
      return canvas.toDataURL("image/jpeg", 0.82);
    } catch {
      return null;
    }
  }

  function dataUrlToFile(dataUrl: string): File {
    const at = dataUrl.indexOf(",");
    const mime =
      at >= 0
        ? (dataUrl.slice(5, at).split(";")[0] ?? "image/jpeg")
        : "image/jpeg";
    const base64 = at >= 0 ? dataUrl.slice(at + 1) : dataUrl;
    const bin = atob(base64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return new File([bytes], "dish.jpg", { type: mime });
  }

  async function onImport() {
    if (!drafts || !restaurantId) return;
    setImporting(true);
    try {
      const byName = new Map<string, string>();
      let maxOrder = 0;
      for (const c of existingCategories) {
        byName.set(c.name.trim().toLowerCase(), c.id);
        if (c.display_order > maxOrder) maxOrder = c.display_order;
      }

      let createdCats = 0;
      let createdItems = 0;

      for (const cat of drafts) {
        if (!cat.included) continue;
        const included = cat.items.filter(
          (i) => i.included && i.name.trim() && Number(i.price) > 0,
        );
        if (!included.length) continue;

        const key = cat.name.trim().toLowerCase();
        let catId = byName.get(key);
        if (!catId) {
          maxOrder += 1;
          const { data: ins, error } = await supabase
            .from("categories")
            .insert({
              restaurant_id: restaurantId,
              name: cat.name.trim(),
              display_order: maxOrder,
            })
            .select("id")
            .single();
          if (error || !ins) throw new Error(error?.message || "فشل إنشاء فئة");
          catId = ins.id as string;
          byName.set(key, catId);
          createdCats += 1;
        }

        const rows: any[] = [];
        for (const it of included) {
          let imageUrl: string | null = null;
          const crop = cropBbox(it.bbox);
          if (crop) {
            const f = dataUrlToFile(crop);
            const path = `${restaurantId}/items/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`;
            const up = await uploadImageWithFallback(
              "menu-images",
              path,
              f,
              async (base64, p) => {
                try {
                  const r = (await ghUpload({ data: { path: p, base64 } })) as {
                    url?: string;
                  };
                  return r?.url ?? null;
                } catch {
                  return null;
                }
              },
            );
            imageUrl = up.url;
          }
          rows.push({
            restaurant_id: restaurantId,
            name: it.name.trim(),
            description: it.description.trim() || null,
            price: Number(it.price),
            category_id: catId!,
            image_url: imageUrl,
            is_available: true,
          });
        }
        const { error: insErr } = await supabase
          .from("menu_items")
          .insert(rows);
        if (insErr) throw new Error(insErr.message);
        createdItems += rows.length;
      }

      if (!createdItems) {
        toast.warning("لا توجد أطباق محددة للاستيراد");
        return;
      }
      toast.success(
        `تم استيراد ${createdItems} طبق في ${createdCats} فئة جديدة`,
      );
      reset();
      onOpenChange(false);
      onImported();
    } catch (e) {
      toast.error((e as Error).message || "فشل الاستيراد");
    } finally {
      setImporting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => (o ? undefined : reset())}>
      <DialogContent
        className="max-w-2xl max-h-[90vh] overflow-y-auto"
        dir="rtl"
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-[var(--primary)]" />
            استيراد المنيو من صورة (ذكاء اصطناعي)
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label>صورة المنيو</Label>
            <div className="mt-1 flex items-center gap-3">
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                className="text-sm"
              />
              {previewUrl && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={reset}
                >
                  <Trash2 className="w-4 h-4 ml-1" />
                  إزالة
                </Button>
              )}
            </div>
          </div>

          {previewUrl && (
            <img
              ref={imgRef}
              src={previewUrl}
              alt="منيو"
              className="max-h-64 rounded-lg border border-input object-contain bg-[var(--muted)]"
            />
          )}

          {previewUrl && !drafts && (
            <Button onClick={onAnalyze} disabled={parsing} className="gap-2">
              {parsing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <ImagePlus className="w-4 h-4" />
              )}
              {parsing ? "جارٍ استخراج الأطباق…" : "تحليل بالذكاء الاصطناعي"}
            </Button>
          )}

          {drafts && (
            <div className="space-y-4">
              <p className="text-xs text-[var(--muted-foreground)]">
                راجع النتائج ثم اضغط «استيراد». تُحفظ صور الأطباق تلقائياً عند
                توفّرها، مع رفعها لمخزن الصور أو حفظها داخل قاعدة البيانات
                احتياطياً.
              </p>
              {drafts.map((cat, ci) => (
                <div
                  key={ci}
                  className="rounded-lg border border-input p-3 space-y-3"
                >
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={cat.included}
                      onChange={(e) =>
                        setDrafts((p) =>
                          p!.map((c, i) =>
                            i === ci ? { ...c, included: e.target.checked } : c,
                          ),
                        )
                      }
                    />
                    <Input
                      value={cat.name}
                      onChange={(e) =>
                        setDrafts((p) =>
                          p!.map((c, i) =>
                            i === ci ? { ...c, name: e.target.value } : c,
                          ),
                        )
                      }
                      className="h-8 w-48"
                    />
                    <span className="text-xs text-[var(--muted-foreground)]">
                      {cat.items.filter((i) => i.included).length} طبق
                    </span>
                  </div>

                  <div className="space-y-2">
                    {cat.items.map((it, ii) => (
                      <div
                        key={ii}
                        className="flex items-center gap-2 rounded-md border border-input/70 p-2"
                      >
                        <input
                          type="checkbox"
                          checked={it.included}
                          onChange={(e) => {
                            setDrafts((p) =>
                              p!.map((c, i) =>
                                i === ci
                                  ? {
                                      ...c,
                                      items: c.items.map((x, j) =>
                                        j === ii
                                          ? { ...x, included: e.target.checked }
                                          : x,
                                      ),
                                    }
                                  : c,
                              ),
                            );
                          }}
                        />
                        <Input
                          value={it.name}
                          onChange={(e) => {
                            setDrafts((p) =>
                              p!.map((c, i) =>
                                i === ci
                                  ? {
                                      ...c,
                                      items: c.items.map((x, j) =>
                                        j === ii
                                          ? { ...x, name: e.target.value }
                                          : x,
                                      ),
                                    }
                                  : c,
                              ),
                            );
                          }}
                          className="h-8 flex-1 min-w-0"
                        />
                        <Input
                          type="number"
                          value={it.price}
                          onChange={(e) => {
                            setDrafts((p) =>
                              p!.map((c, i) =>
                                i === ci
                                  ? {
                                      ...c,
                                      items: c.items.map((x, j) =>
                                        j === ii
                                          ? { ...x, price: e.target.value }
                                          : x,
                                      ),
                                    }
                                  : c,
                              ),
                            );
                          }}
                          className="h-8 w-24 tabular-nums"
                          placeholder="0"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {drafts && (
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="text-xs text-[var(--muted-foreground)]">
                <Search className="w-3 h-3 text-[var(--primary)] inline-block ml-1" />
                مطابقة الفئات تتم بالاسم لتجنّب التكرار
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={reset}>
                  إلغاء
                </Button>
                <Button
                  onClick={onImport}
                  disabled={importing}
                  className="gap-2"
                >
                  {importing && <Loader2 className="w-4 h-4 animate-spin" />}
                  {importing ? "جارٍ الاستيراد…" : "استيراد"}
                </Button>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            size="sm"
          >
            إغلاق
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
