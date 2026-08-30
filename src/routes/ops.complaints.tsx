import { useEffect, useState, useMemo } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { MessageSquareWarning, Plus, Pencil, Trash2, Loader2, Search, CheckCircle2, AlertTriangle, Clock } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useRestaurantId } from "@/lib/restaurant";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { tx } from "@/lib/ops-tx";
import { useTranslation } from "react-i18next";

export const Route = createFileRoute("/ops/complaints")({
  component: OpsComplaints,
});

type Complaint = {
  id: string;
  title: string;
  description: string;
  customer_name: string;
  severity: string;
  status: string;
  created_at: string;
  resolved_at: string | null;
};

const STATUS_LABELS: Record<string, { label: string; color: string; icon: typeof Clock }> = {
  open: { label: tx("مفتوحة"), color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300", icon: AlertTriangle },
  investigating: { label: tx("قيد المراجعة"), color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300", icon: Clock },
  resolved: { label: tx("محلولة"), color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300", icon: CheckCircle2 },
};

const SEVERITY_LABELS: Record<string, { label: string; color: string }> = {
  low: { label: tx("منخفضة"), color: "bg-gray-100 text-gray-600" },
  medium: { label: tx("متوسطة"), color: "bg-amber-100 text-amber-700" },
  high: { label: tx("عالية"), color: "bg-orange-100 text-orange-700" },
  critical: { label: tx("حرجة"), color: "bg-red-100 text-red-700" },
};

const EMPTY_FORM = { title: "", description: "", customer_name: "", severity: "medium" as string };

function OpsComplaints() {
  const { restaurantId } = useRestaurantId();

  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [addOpen, setAddOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editItem, setEditItem] = useState<Complaint | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  async function loadComplaints() {
    if (!restaurantId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data: rows } = await supabase
      .from("complaints")
      .select("*")
      .eq("restaurant_id", restaurantId)
      .order("created_at", { ascending: false });
    setComplaints(
      (rows ?? []).map((r: any) => ({
        id: r.id,
        title: r.title ?? "",
        description: r.description ?? "",
        customer_name: r.customer_name ?? "",
        severity: r.severity ?? "medium",
        status: r.status ?? "open",
        created_at: r.created_at ?? "",
        resolved_at: r.resolved_at ?? null,
      }))
    );
    setLoading(false);
  }

  useEffect(() => {
    if (restaurantId === undefined) return;
    loadComplaints();
  }, [restaurantId]);

  const filtered = useMemo(() => {
    let list = complaints;
    if (statusFilter !== "all") list = list.filter((c) => c.status === statusFilter);
    if (search) list = list.filter((c) => c.title.includes(search) || c.customer_name.includes(search));
    return list;
  }, [complaints, statusFilter, search]);

  const counts = useMemo(() => ({
    open: complaints.filter((c) => c.status === "open").length,
    investigating: complaints.filter((c) => c.status === "investigating").length,
    resolved: complaints.filter((c) => c.status === "resolved").length,
  }), [complaints]);

  async function handleSave() {
    if (!form.title.trim()) { toast.error(tx("اكتب عنوان الشكوى")); return; }
    if (!restaurantId) { setAddOpen(false); setForm(EMPTY_FORM); return; }
    setSaving(true);
    try {
      const { error } = await supabase.from("complaints").insert({
        restaurant_id: restaurantId,
        title: form.title.trim(),
        description: form.description.trim(),
        customer_name: form.customer_name.trim(),
        severity: form.severity,
        status: "open",
        created_at: new Date().toISOString(),
      });
      if (error) throw new Error(error.message);
      toast.success(tx("تم إضافة الشكوى"));
      setAddOpen(false);
      setForm(EMPTY_FORM);
      loadComplaints();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function handleEdit() {
    if (!editItem) return;
    if (!restaurantId) { setEditOpen(false); return; }
    setSaving(true);
    try {
      const patch: any = {
        title: form.title.trim(),
        description: form.description.trim(),
        customer_name: form.customer_name.trim(),
        severity: form.severity,
      };
      const { error } = await supabase.from("complaints").update(patch).eq("id", editItem.id);
      if (error) throw new Error(error.message);
      toast.success(tx("تم التحديث"));
      setEditOpen(false);
      setEditItem(null);
      loadComplaints();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function handleChangeStatus(id: string, newStatus: string) {
    if (!restaurantId) return;
    const patch: any = { status: newStatus };
    if (newStatus === "resolved") patch.resolved_at = new Date().toISOString();
    const { error } = await supabase.from("complaints").update(patch).eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success(tx("تم التحديث"));
    loadComplaints();
  }

  async function handleDelete() {
    if (!deleteId || !restaurantId) return;
    setSaving(true);
    try {
      const { error } = await supabase.from("complaints").delete().eq("id", deleteId);
      if (error) throw new Error(error.message);
      toast.success(tx("تم الحذف"));
      setDeleteId(null);
      loadComplaints();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="p-2 space-y-4" dir="rtl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MessageSquareWarning className="w-5 h-5 text-[var(--primary)]" />
          <h1 className="text-lg font-bold">{tx("الشكاوى")}</h1>
          <Badge variant="secondary">{complaints.length}</Badge>
        </div>
        <Button size="sm" onClick={() => { setForm(EMPTY_FORM); setAddOpen(true); }} className="gap-1.5">
          <Plus className="w-4 h-4" />
          {tx("شكوى جديدة")}
        </Button>
      </div>

      {/* Status Counts */}
      <div className="grid gap-3 grid-cols-3">
        <Card className="p-3 text-center cursor-pointer hover:border-red-300 transition-colors" onClick={() => setStatusFilter(statusFilter === "open" ? "all" : "open")}>
          <AlertTriangle className="w-4 h-4 mx-auto text-red-500 mb-1" />
          <div className="text-lg font-bold">{counts.open}</div>
          <div className="text-[10px] text-[var(--muted-foreground)]">{tx("مفتوحة")}</div>
        </Card>
        <Card className="p-3 text-center cursor-pointer hover:border-amber-300 transition-colors" onClick={() => setStatusFilter(statusFilter === "investigating" ? "all" : "investigating")}>
          <Clock className="w-4 h-4 mx-auto text-amber-500 mb-1" />
          <div className="text-lg font-bold">{counts.investigating}</div>
          <div className="text-[10px] text-[var(--muted-foreground)]">{tx("قيد المراجعة")}</div>
        </Card>
        <Card className="p-3 text-center cursor-pointer hover:border-green-300 transition-colors" onClick={() => setStatusFilter(statusFilter === "resolved" ? "all" : "resolved")}>
          <CheckCircle2 className="w-4 h-4 mx-auto text-green-500 mb-1" />
          <div className="text-lg font-bold">{counts.resolved}</div>
          <div className="text-[10px] text-[var(--muted-foreground)]">{tx("محلولة")}</div>
        </Card>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="w-4 h-4 absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={tx("بحث بالعنوان أو اسم العميل...")}
          className="h-9 ps-3 pe-8 text-sm"
        />
      </div>

      {/* Table */}
      <Card>
        {loading ? (
          <div className="p-8 flex items-center justify-center">
            <Loader2 className="w-5 h-5 animate-spin text-[var(--muted-foreground)]" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-sm text-[var(--muted-foreground)]">
            {tx("لا توجد شكاوى")}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">{tx("التاريخ")}</TableHead>
                  <TableHead className="text-xs">{tx("العنوان")}</TableHead>
                  <TableHead className="text-xs">{tx("العميل")}</TableHead>
                  <TableHead className="text-xs">{tx("الخطورة")}</TableHead>
                  <TableHead className="text-xs">{tx("الحالة")}</TableHead>
                  <TableHead className="text-xs w-20"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((c) => {
                  const statusInfo = STATUS_LABELS[c.status] ?? STATUS_LABELS.open;
                  const sevInfo = SEVERITY_LABELS[c.severity] ?? SEVERITY_LABELS.medium;
                  return (
                    <TableRow key={c.id}>
                      <TableCell className="text-xs font-mono">
                        {new Date(c.created_at).toLocaleDateString("ar-DZ")}
                      </TableCell>
                      <TableCell>
                        <div className="text-sm font-medium">{c.title}</div>
                        {c.description && (
                          <div className="text-[11px] text-[var(--muted-foreground)] max-w-[200px] truncate">{c.description}</div>
                        )}
                      </TableCell>
                      <TableCell className="text-xs">{c.customer_name || "—"}</TableCell>
                      <TableCell>
                        <Badge variant="secondary" className={`text-[10px] ${sevInfo.color}`}>{sevInfo.label}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className={`text-[10px] ${statusInfo.color}`}>{statusInfo.label}</Badge>
                      </TableCell>
                      <TableCell className="text-left">
                        <div className="flex items-center gap-1">
                          {c.status !== "resolved" && (
                            <Button
                              variant="ghost" size="sm" className="h-7 text-[10px]"
                              onClick={() => handleChangeStatus(c.id, c.status === "open" ? "investigating" : "resolved")}
                            >
                              {c.status === "open" ? tx("مراجعة") : tx("حل")}
                            </Button>
                          )}
                          <Button
                            variant="ghost" size="sm" className="h-7 w-7 p-0"
                            onClick={() => { setEditItem(c); setForm({ title: c.title, description: c.description, customer_name: c.customer_name, severity: c.severity }); setEditOpen(true); }}
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            variant="ghost" size="sm" className="h-7 w-7 p-0 text-red-500 hover:text-red-700"
                            onClick={() => setDeleteId(c.id)}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>

      {/* Add Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-sm" dir="rtl">
          <DialogHeader><DialogTitle>{tx("شكوى جديدة")}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">{tx("العنوان")}</Label>
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="mt-1" />
            </div>
            <div>
              <Label className="text-xs">{tx("التفاصيل")}</Label>
              <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="mt-1" rows={3} />
            </div>
            <div>
              <Label className="text-xs">{tx("اسم العميل")}</Label>
              <Input value={form.customer_name} onChange={(e) => setForm({ ...form, customer_name: e.target.value })} className="mt-1" />
            </div>
            <div>
              <Label className="text-xs">{tx("الخطورة")}</Label>
              <Select value={form.severity} onValueChange={(v) => setForm({ ...form, severity: v })}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">{tx("منخفضة")}</SelectItem>
                  <SelectItem value="medium">{tx("متوسطة")}</SelectItem>
                  <SelectItem value="high">{tx("عالية")}</SelectItem>
                  <SelectItem value="critical">{tx("حرجة")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setAddOpen(false)}>{tx("إلغاء")}</Button>
            <Button size="sm" onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin ms-1" /> : null}
              {tx("حفظ")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-sm" dir="rtl">
          <DialogHeader><DialogTitle>{tx("تعديل الشكوى")}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">{tx("العنوان")}</Label>
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="mt-1" />
            </div>
            <div>
              <Label className="text-xs">{tx("التفاصيل")}</Label>
              <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="mt-1" rows={3} />
            </div>
            <div>
              <Label className="text-xs">{tx("اسم العميل")}</Label>
              <Input value={form.customer_name} onChange={(e) => setForm({ ...form, customer_name: e.target.value })} className="mt-1" />
            </div>
            <div>
              <Label className="text-xs">{tx("الخطورة")}</Label>
              <Select value={form.severity} onValueChange={(v) => setForm({ ...form, severity: v })}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">{tx("منخفضة")}</SelectItem>
                  <SelectItem value="medium">{tx("متوسطة")}</SelectItem>
                  <SelectItem value="high">{tx("عالية")}</SelectItem>
                  <SelectItem value="critical">{tx("حرجة")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setEditOpen(false)}>{tx("إلغاء")}</Button>
            <Button size="sm" onClick={handleEdit} disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin ms-1" /> : null}
              {tx("حفظ")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <DialogContent className="max-w-sm" dir="rtl">
          <DialogHeader><DialogTitle>{tx("حذف الشكوى")}</DialogTitle></DialogHeader>
          <p className="text-sm text-[var(--muted-foreground)]">{tx("هل أنت متأكد من حذف هذه الشكوى؟")}</p>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setDeleteId(null)}>{tx("إلغاء")}</Button>
            <Button size="sm" variant="destructive" onClick={handleDelete} disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin ms-1" /> : null}
              {tx("حذف")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
