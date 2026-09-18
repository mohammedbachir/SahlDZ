import { useEffect, useState, useMemo } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { requireOpsAccess } from "@/lib/permissions";
import {
  Truck,
  Plus,
  Pencil,
  Trash2,
  Loader2,
  Search,
  DollarSign,
  HandCoins,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useRestaurantId, formatDZD } from "@/lib/restaurant";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { tx } from "@/lib/ops-tx";
import { useTranslation } from "react-i18next";
import { useAreaPermission } from "@/lib/permissions";
import { CanWrite } from "@/components/PermissionsGate";

export const Route = createFileRoute("/ops/suppliers")({
  beforeLoad: requireOpsAccess("suppliers"),
  component: OpsSuppliers,
});

type Supplier = {
  id: string;
  name: string;
  balance: number;
  total_purchases: number;
  total_payments: number;
};

function OpsSuppliers() {
  const { restaurantId } = useRestaurantId();
  const { canWrite } = useAreaPermission("suppliers");

  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editSupplier, setEditSupplier] = useState<Supplier | null>(null);
  const [newName, setNewName] = useState("");
  const [editName, setEditName] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const [paySupplier, setPaySupplier] = useState<Supplier | null>(null);
  const [payAmount, setPayAmount] = useState("");
  const [payDate, setPayDate] = useState(new Date().toISOString().slice(0, 10));
  const [payNotes, setPayNotes] = useState("");

  async function loadSuppliers() {
    if (!restaurantId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const [supsRes, purchRes, txRes] = await Promise.all([
      supabase
        .from("suppliers")
        .select("id,name")
        .eq("restaurant_id", restaurantId)
        .order("name"),
      supabase
        .from("purchase_orders")
        .select("supplier_id,total")
        .eq("restaurant_id", restaurantId),
      supabase
        .from("supplier_transactions")
        .select("supplier_id,type,amount")
        .eq("restaurant_id", restaurantId),
    ]);

    const purchasesBySupplier = new Map<string, number>();
    for (const p of purchRes.data ?? []) {
      const sid = (p as any).supplier_id;
      if (!sid) continue;
      purchasesBySupplier.set(
        sid,
        (purchasesBySupplier.get(sid) ?? 0) + Number((p as any).total ?? 0),
      );
    }
    const paymentsBySupplier = new Map<string, number>();
    for (const t of txRes.data ?? []) {
      if (!["payment", "advance", "return"].includes((t as any).type)) continue;
      const sid = (t as any).supplier_id;
      if (!sid) continue;
      paymentsBySupplier.set(
        sid,
        (paymentsBySupplier.get(sid) ?? 0) + Number((t as any).amount ?? 0),
      );
    }

    const result: Supplier[] = (supsRes.data ?? []).map((s: any) => {
      const totalPurchases = purchasesBySupplier.get(s.id) ?? 0;
      const totalPayments = paymentsBySupplier.get(s.id) ?? 0;
      return {
        id: s.id,
        name: s.name ?? "",
        total_purchases: totalPurchases,
        total_payments: totalPayments,
        balance: totalPurchases - totalPayments,
      };
    });
    setSuppliers(result);
    setLoading(false);
  }

  useEffect(() => {
    if (restaurantId === undefined) return;
    loadSuppliers();
  }, [restaurantId]);

  const filtered = useMemo(() => {
    if (!search) return suppliers;
    return suppliers.filter((s) => s.name.includes(search));
  }, [suppliers, search]);

  async function handleAdd() {
    if (!canWrite) return;
    if (!newName.trim()) {
      toast.error(tx("اكتب اسم المورد"));
      return;
    }
    if (!restaurantId) {
      setAddOpen(false);
      setNewName("");
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase.from("suppliers").insert({
        restaurant_id: restaurantId,
        name: newName.trim(),
      });
      if (error) throw new Error(error.message);
      toast.success(tx("تم إضافة المورد"));
      setAddOpen(false);
      setNewName("");
      loadSuppliers();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function handleEdit() {
    if (!canWrite) return;
    if (!editSupplier || !editName.trim()) return;
    if (!restaurantId) {
      setEditOpen(false);
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase
        .from("suppliers")
        .update({ name: editName.trim() })
        .eq("id", editSupplier.id);
      if (error) throw new Error(error.message);
      toast.success(tx("تم التحديث"));
      setEditOpen(false);
      setEditSupplier(null);
      loadSuppliers();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!canWrite) return;
    if (!deleteId || !restaurantId) return;
    setSaving(true);
    try {
      const [poRes, txRes] = await Promise.all([
        supabase
          .from("purchase_orders")
          .select("id")
          .eq("restaurant_id", restaurantId)
          .eq("supplier_id", deleteId)
          .limit(1),
        supabase
          .from("supplier_transactions")
          .select("id")
          .eq("restaurant_id", restaurantId)
          .eq("supplier_id", deleteId)
          .limit(1),
      ]);
      if ((poRes.data?.length ?? 0) > 0 || (txRes.data?.length ?? 0) > 0) {
        toast.error(
          tx("لا يمكن حذف مورد لديه فواتير أو معاملات — يمكنك تعديل اسمه فقط"),
        );
        setDeleteId(null);
        return;
      }
      const { error } = await supabase
        .from("suppliers")
        .delete()
        .eq("id", deleteId);
      if (error) throw new Error(error.message);
      toast.success(tx("تم الحذف"));
      setDeleteId(null);
      loadSuppliers();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  function openPay(sup: Supplier) {
    setPaySupplier(sup);
    setPayAmount(sup.balance > 0 ? String(sup.balance) : "");
    setPayDate(new Date().toISOString().slice(0, 10));
    setPayNotes("");
  }

  async function handlePay() {
    if (!canWrite) return;
    if (!paySupplier || !restaurantId) return;
    const amount = Number(payAmount);
    if (!amount || amount <= 0) {
      toast.error(tx("أدخل مبلغاً صحيحاً"));
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase.from("supplier_transactions").insert({
        restaurant_id: restaurantId,
        supplier_id: paySupplier.id,
        type: "payment",
        amount,
        date: payDate,
        notes: payNotes.trim() || null,
      });
      if (error) throw new Error(error.message);
      toast.success(tx("تم تسجيل الدفعة"));
      setPaySupplier(null);
      loadSuppliers();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  const totalBalance = useMemo(
    () => suppliers.reduce((s, sup) => s + sup.balance, 0),
    [suppliers],
  );

  return (
    <div className="p-2 space-y-4" dir="rtl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Truck className="w-5 h-5 text-[var(--primary)]" />
          <h1 className="text-lg font-bold">{tx("الموردين")}</h1>
          <Badge variant="secondary">{suppliers.length}</Badge>
        </div>
        <CanWrite area="suppliers">
          <Button
            size="sm"
            onClick={() => setAddOpen(true)}
            className="gap-1.5"
          >
            <Plus className="w-4 h-4" />
            {tx("إضافة مورد")}
          </Button>
        </CanWrite>
      </div>

      {/* Total Balance */}
      <Card className="p-3">
        <div className="flex items-center gap-2 text-[var(--muted-foreground)] text-xs mb-1">
          <DollarSign className="w-3.5 h-3.5" />
          {tx("إجمالي أرصدة الموردين")}
        </div>
        <div
          className={`text-xl font-bold ${totalBalance >= 0 ? "text-red-600" : "text-green-600"}`}
        >
          {formatDZD(totalBalance)}
        </div>
      </Card>

      {/* Search */}
      <div className="relative">
        <Search className="w-4 h-4 absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={tx("بحث بالاسم...")}
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
            {tx("لا يوجد موردين")}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">{tx("المورد")}</TableHead>
                  <TableHead className="text-xs text-left">
                    {tx("المشتريات")}
                  </TableHead>
                  <TableHead className="text-xs text-left">
                    {tx("المدفوعات")}
                  </TableHead>
                  <TableHead className="text-xs text-left">
                    {tx("الرصيد")}
                  </TableHead>
                  <TableHead className="text-xs w-20"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((sup) => (
                  <TableRow key={sup.id}>
                    <TableCell className="text-sm font-medium">
                      {sup.name}
                    </TableCell>
                    <TableCell className="text-xs text-left tabular-nums">
                      {formatDZD(sup.total_purchases)}
                    </TableCell>
                    <TableCell className="text-xs text-left tabular-nums text-green-600">
                      {formatDZD(sup.total_payments)}
                    </TableCell>
                    <TableCell
                      className={`text-xs font-bold text-left tabular-nums ${sup.balance > 0 ? "text-red-600" : "text-green-600"}`}
                    >
                      {formatDZD(sup.balance)}
                    </TableCell>
                    <TableCell className="text-left">
                      <CanWrite area="suppliers">
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0 text-green-600 hover:text-green-700"
                            title={tx("تسجيل دفعة")}
                            onClick={() => openPay(sup)}
                          >
                            <HandCoins className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0"
                            onClick={() => {
                              setEditSupplier(sup);
                              setEditName(sup.name);
                              setEditOpen(true);
                            }}
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0 text-red-500 hover:text-red-700"
                            onClick={() => setDeleteId(sup.id)}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </CanWrite>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>

      {/* Add Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-sm" dir="rtl">
          <DialogHeader>
            <DialogTitle>{tx("إضافة مورد")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">{tx("اسم المورد")}</Label>
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder={tx("مثال: مورد الدقيق")}
                className="mt-1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setAddOpen(false)}
            >
              {tx("إلغاء")}
            </Button>
            <Button size="sm" onClick={handleAdd} disabled={saving}>
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin ms-1" />
              ) : null}
              {tx("حفظ")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-sm" dir="rtl">
          <DialogHeader>
            <DialogTitle>{tx("تعديل المورد")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">{tx("اسم المورد")}</Label>
              <Input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="mt-1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setEditOpen(false)}
            >
              {tx("إلغاء")}
            </Button>
            <Button size="sm" onClick={handleEdit} disabled={saving}>
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin ms-1" />
              ) : null}
              {tx("حفظ")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <DialogContent className="max-w-sm" dir="rtl">
          <DialogHeader>
            <DialogTitle>{tx("حذف المورد")}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-[var(--muted-foreground)]">
            {tx("هل أنت متأكد من حذف هذا المورد؟")}
          </p>
          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDeleteId(null)}
            >
              {tx("إلغاء")}
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={handleDelete}
              disabled={saving}
            >
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin ms-1" />
              ) : null}
              {tx("حذف")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Payment Dialog */}
      <Dialog
        open={!!paySupplier}
        onOpenChange={(o) => !o && setPaySupplier(null)}
      >
        <DialogContent className="max-w-sm" dir="rtl">
          <DialogHeader>
            <DialogTitle>{tx("تسجيل دفعة للمورد")}</DialogTitle>
          </DialogHeader>
          {paySupplier && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-[var(--muted-foreground)]">
                  {tx("المورد")}
                </span>
                <span className="font-bold">{paySupplier.name}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-[var(--muted-foreground)]">
                  {tx("الرصيد الحالي")}
                </span>
                <span
                  className={`font-bold tabular-nums ${paySupplier.balance > 0 ? "text-red-600" : "text-green-600"}`}
                >
                  {formatDZD(paySupplier.balance)}
                </span>
              </div>
              <div>
                <Label className="text-xs">{tx("المبلغ")}</Label>
                <Input
                  type="number"
                  inputMode="decimal"
                  value={payAmount}
                  onChange={(e) => setPayAmount(e.target.value)}
                  className="mt-1 tabular-nums"
                  placeholder="0"
                />
              </div>
              <div>
                <Label className="text-xs">{tx("التاريخ")}</Label>
                <Input
                  type="date"
                  value={payDate}
                  onChange={(e) => setPayDate(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-xs">{tx("ملاحظات (اختياري)")}</Label>
                <Textarea
                  value={payNotes}
                  onChange={(e) => setPayNotes(e.target.value)}
                  className="mt-1"
                  rows={2}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPaySupplier(null)}
            >
              {tx("إلغاء")}
            </Button>
            <Button size="sm" onClick={handlePay} disabled={saving}>
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin ms-1" />
              ) : null}
              {tx("تسجيل")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
