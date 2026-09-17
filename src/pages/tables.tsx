import { useEffect, useRef, useState } from "react";
import { Plus, Trash2, Download, Layers, LayoutGrid, Loader2 } from "lucide-react";
import QRCode from "qrcode";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useRestaurantId } from "@/lib/restaurant";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { appOrigin } from "@/lib/app-url";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type TableRow = {
  id: string;
  table_number: number;
  qr_token: string;
  restaurant_id: string;
};

export default function TablesPage() {
  const { t } = useTranslation();
  const { restaurantId, loading: rLoading } = useRestaurantId();
  const [tables, setTables] = useState<TableRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [number, setNumber] = useState("");
  const [saving, setSaving] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkCount, setBulkCount] = useState("");
  const [bulkSaving, setBulkSaving] = useState(false);
  const [toDelete, setToDelete] = useState<TableRow | null>(null);

  async function load(rid: string) {
    setLoading(true);
    const { data, error } = await supabase
      .from("tables")
      .select("*")
      .eq("restaurant_id", rid)
      .order("table_number", { ascending: true });
    if (error) toast.error(t("tables.loadFailed"));
    setTables((data as TableRow[]) ?? []);
    setLoading(false);
  }

  useEffect(() => {
    if (!restaurantId) {
      setLoading(false);
      return;
    }
    load(restaurantId);
    const ch = supabase
      .channel("tables-rt")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "tables", filter: `restaurant_id=eq.${restaurantId}` },
        () => load(restaurantId),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [restaurantId]);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!restaurantId) return;
    const n = Number(number);
    if (!Number.isInteger(n) || n <= 0) {
      toast.error(t("tables.mustBeGtZero"));
      return;
    }
    if (tables.some((row) => row.table_number === n)) {
      toast.error(t("tables.alreadyUsed"));
      return;
    }
    setSaving(true);
    const qr_token = crypto.randomUUID();
    const { error } = await supabase.from("tables").insert({
      restaurant_id: restaurantId,
      table_number: n,
      qr_token,
    });
    setSaving(false);
    if (error) {
      toast.error(error.message.includes("duplicate") ? t("tables.alreadyUsed") : t("tables.addFailed"));
      return;
    }
    toast.success(t("tables.added"));
    setNumber("");
    setOpen(false);
  }

  async function confirmDelete() {
    if (!toDelete) return;
    const { error } = await supabase.from("tables").delete().eq("id", toDelete.id);
    if (error) toast.error(t("tables.deleteFailed"));
    else toast.success(t("tables.deleted"));
    setToDelete(null);
  }

  async function handleBulkAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!restaurantId) return;
    const count = Number(bulkCount);
    if (!Number.isInteger(count) || count <= 0 || count > 200) {
      toast.error("أدخل عدداً صحيحاً بين 1 و 200");
      return;
    }
    setBulkSaving(true);
    const used = new Set(tables.map((row) => row.table_number));
    const rows: { restaurant_id: string; table_number: number; qr_token: string }[] = [];
    let n = 1;
    while (rows.length < count) {
      if (!used.has(n)) {
        rows.push({
          restaurant_id: restaurantId,
          table_number: n,
          qr_token: crypto.randomUUID(),
        });
        used.add(n);
      }
      n++;
      if (n > 100000) break;
    }
    const { error } = await supabase.from("tables").insert(rows);
    setBulkSaving(false);
    if (error) {
      toast.error(t("tables.addFailed"));
      return;
    }
    toast.success(`تمت إضافة ${rows.length} طاولة`);
    setBulkCount("");
    setBulkOpen(false);
  }

  if (rLoading || loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-[var(--primary)]" />
      </div>
    );
  }

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header */}
      <div className="bg-card border border-border rounded-xl p-5 md:p-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3.5 min-w-0">
          <div className="w-10 h-10 rounded-lg bg-secondary text-primary flex items-center justify-center shrink-0">
            <LayoutGrid className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <h1 className="text-xl md:text-2xl font-bold text-foreground tracking-tight">إدارة الطاولات</h1>
            <p className="text-xs md:text-sm text-muted-foreground mt-0.5">
              {tables.length} طاولة · رموز QR جاهزة
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => setBulkOpen(true)} variant="outline" className="rounded-lg">
            <Layers className="ml-2 h-4 w-4" />
            إضافة عدة طاولات
          </Button>
          <Button data-annotate="tables-add" onClick={() => setOpen(true)} className="rounded-lg">
            <Plus className="ml-2 h-4 w-4" />
            {t("tables.addTable")}
          </Button>
        </div>
      </div>

      {tables.length === 0 ? (
        <div className="bg-card border-2 border-dashed border-border rounded-xl p-12 text-center">
          <div className="w-12 h-12 mx-auto rounded-lg bg-secondary flex items-center justify-center mb-3 text-muted-foreground">
            <LayoutGrid className="w-6 h-6" />
          </div>
          <p className="text-base font-semibold text-foreground">ابدأ بإضافة طاولات</p>
          <p className="text-xs text-muted-foreground mt-1">أنشئ طاولات مع رموز QR للطلبات</p>
          <Button onClick={() => setOpen(true)} className="mt-4 rounded-lg">
            <Plus className="ml-2 h-4 w-4" />
            {t("tables.addTable")}
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {tables.map((t) => (
            <TableCard key={t.id} table={t} onDelete={() => setToDelete(t)} />
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("tables.addTable")}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAdd} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="num">{t("tables.tableNumber")}</Label>
              <Input
                id="num"
                type="number"
                min={1}
                value={number}
                onChange={(e) => setNumber(e.target.value)}
                required
                autoFocus
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                {t("common.cancel")}
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? t("common.saving") : t("common.save")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={bulkOpen} onOpenChange={setBulkOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>إضافة عدة طاولات</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleBulkAdd} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="bulk-num">عدد الطاولات المراد إضافتها</Label>
              <Input
                id="bulk-num"
                type="number"
                min={1}
                max={200}
                value={bulkCount}
                onChange={(e) => setBulkCount(e.target.value)}
                placeholder="مثال: 35"
                required
                autoFocus
              />
              <p className="text-xs text-muted-foreground">
                سيتم إنشاء رمز QR لكل طاولة برقم تلقائي يبدأ من أصغر رقم متاح.
              </p>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setBulkOpen(false)}>
                {t("common.cancel")}
              </Button>
              <Button type="submit" disabled={bulkSaving}>
                {bulkSaving ? t("common.saving") : t("common.save")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!toDelete} onOpenChange={(v) => !v && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("tables.deleteTable")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("tables.confirmDeleteWithNumber", { n: toDelete?.table_number ?? "" })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {t("common.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function TableCard({ table, onDelete }: { table: TableRow; onDelete: () => void }) {
  const { t } = useTranslation();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const url = `${appOrigin()}/r/${table.qr_token}`;

  useEffect(() => {
    if (!canvasRef.current || !url) return;
    QRCode.toCanvas(canvasRef.current, url, {
      width: 200,
      margin: 1,
      color: { dark: "#000000", light: "#ffffff" },
    }).catch(() => {});
  }, [url]);

  async function download() {
    try {
      const dataUrl = await QRCode.toDataURL(url, {
        width: 800,
        margin: 2,
        color: { dark: "#000000", light: "#ffffff" },
      });
      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = `table-${table.table_number}-qr.png`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch {
      toast.error(t("tables.qrFailed"));
    }
  }

  return (
    <div data-annotate="tables-card" className="group bg-card rounded-xl p-5 flex flex-col items-center gap-3 border border-border hover:border-primary/40 transition-colors">
      <div className="w-12 h-12 rounded-lg bg-secondary text-primary flex items-center justify-center mb-1">
        <span className="text-xl font-bold">{table.table_number}</span>
      </div>
      <h3 className="text-base font-bold text-foreground">{t("common.table")} {table.table_number}</h3>
      <div data-annotate="tables-qr" className="bg-white p-3 rounded-lg border border-border">
        <canvas ref={canvasRef} />
      </div>
      <p className="text-[10px] text-muted-foreground break-all text-center select-all opacity-60 group-hover:opacity-100 transition-opacity">{url}</p>
      <div className="flex gap-2 w-full">
        <Button onClick={download} variant="outline" className="flex-1 rounded-xl border-blue-500/20 text-blue-500 hover:bg-blue-500 hover:text-white hover:border-blue-500">
          <Download className="ml-2 h-4 w-4" />
          {t("tables.downloadQr")}
        </Button>
        <Button variant="outline" size="icon" onClick={onDelete} className="rounded-xl border-destructive/20 text-destructive hover:bg-destructive hover:text-white hover:border-destructive">
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
