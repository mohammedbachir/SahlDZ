import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { requireOpsAccess } from "@/lib/permissions";
import { CanWrite } from "@/components/PermissionsGate";
import {
  UserPlus,
  Pencil,
  Trash2,
  Snowflake,
  RefreshCw,
  Users,
  Info,
} from "lucide-react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { getFirebaseDb } from "@/integrations/firebase/config";
import { useRestaurantId } from "@/lib/restaurant";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { PermissionsSelect } from "@/components/permissions-select";
import { permissionLabel } from "@/lib/staff-permissions";
import { generateUniquePin } from "@/lib/staff-core";
import {
  listStaff,
  addStaff,
  updateStaff,
  deleteStaff,
  type StaffRecord,
} from "@/lib/staff.functions";
import { tx } from "@/lib/ops-tx";
import { useTranslation } from "react-i18next";

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

export const Route = createFileRoute("/ops/employees/")({
  beforeLoad: requireOpsAccess("employees"),
  component: OpsEmployees,
});

type EmployeeForm = {
  name: string;
  pin: string;
  permissions: string[];
};

const EMPTY_FORM: EmployeeForm = { name: "", pin: "", permissions: [] };

function OpsEmployees() {
  useTranslation();
  const { restaurantId, loading: restaurantLoading } = useRestaurantId();
  const listStaffFn = useServerFn(listStaff);
  const addStaffFn = useServerFn(addStaff);
  const updateStaffFn = useServerFn(updateStaff);
  const deleteStaffFn = useServerFn(deleteStaff);
  const [staff, setStaff] = useState<StaffRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState<EmployeeForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const [editOpen, setEditOpen] = useState(false);
  const [editMember, setEditMember] = useState<StaffRecord | null>(null);
  const [editForm, setEditForm] = useState<EmployeeForm>(EMPTY_FORM);

  const [freezeOpen, setFreezeOpen] = useState(false);
  const [freezeMember, setFreezeMember] = useState<StaffRecord | null>(null);
  const [freezeReason, setFreezeReason] = useState("");

  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleteMember, setDeleteMember] = useState<StaffRecord | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function getServerAuthHeaders() {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) throw new Error(tx("الجلسة منتهية، سجّل دخولك من جديد"));
    return { Authorization: `Bearer ${token}` };
  }

  const loadAll = async () => {
    try {
      let headers: Record<string, string> = {};
      if (getFirebaseDb()) headers = await getServerAuthHeaders();
      const res = await listStaffFn({ headers });
      setStaff((res.staff ?? []) as StaffRecord[]);
    } catch (e) {
      toast.error((e as Error).message || tx("فشل تحميل الموظفين"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (restaurantLoading) return;
    void loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restaurantId, restaurantLoading]);

  const openAdd = () => {
    void generateUniquePin().then((p) => {
      setForm({ name: "", pin: p, permissions: [] });
      setAddOpen(true);
    });
  };

  const submitAdd = async () => {
    if (!form.name.trim()) return toast.error(tx("أدخل اسم الموظف"));
    if (form.pin && !/^\d{4,6}$/.test(form.pin))
      return toast.error(tx("PIN من 4 إلى 6 أرقام"));
    setSaving(true);
    try {
      let headers: Record<string, string> = {};
      if (getFirebaseDb()) headers = await getServerAuthHeaders();
      const res = await addStaffFn({
        headers,
        data: {
          name: form.name.trim(),
          pin: form.pin.trim(),
          permissions: form.permissions,
        },
      });
      toast.success(
        tx("تمت الإضافة — التسلسلي: ") +
          res.serial +
          tx(" — PIN: ") +
          (res.pin ?? form.pin),
      );
      setAddOpen(false);
      await loadAll();
    } catch (e) {
      toast.error((e as Error).message || tx("فشل الإضافة"));
    } finally {
      setSaving(false);
    }
  };

  const openEdit = (m: StaffRecord) => {
    setEditMember(m);
    setEditForm({ name: m.name, pin: "", permissions: m.permissions ?? [] });
    setEditOpen(true);
  };

  const submitEdit = async () => {
    if (!editMember) return;
    if (!editForm.name.trim()) return toast.error(tx("أدخل اسم الموظف"));
    if (editForm.pin && !/^\d{4,6}$/.test(editForm.pin))
      return toast.error(tx("PIN من 4 إلى 6 أرقام"));
    setSaving(true);
    try {
      let headers: Record<string, string> = {};
      if (getFirebaseDb()) headers = await getServerAuthHeaders();
      const input: Record<string, unknown> = {
        name: editForm.name.trim(),
        permissions: editForm.permissions,
      };
      if (editForm.pin) input.pin = editForm.pin;
      await updateStaffFn({ headers, data: { staffId: editMember.id, input } });
      toast.success(tx("تم تعديل الموظف"));
      setEditOpen(false);
      await loadAll();
    } catch (e) {
      toast.error((e as Error).message || tx("فشل التعديل"));
    } finally {
      setSaving(false);
    }
  };

  const openFreeze = (m: StaffRecord) => {
    setFreezeMember(m);
    setFreezeReason("");
    setFreezeOpen(true);
  };

  const submitFreeze = async () => {
    if (!freezeMember) return;
    if (!freezeReason.trim()) return toast.error(tx("أدخل سبب التجميد"));
    setSaving(true);
    try {
      let headers: Record<string, string> = {};
      if (getFirebaseDb()) headers = await getServerAuthHeaders();
      await updateStaffFn({
        headers,
        data: {
          staffId: freezeMember.id,
          input: { frozen: true, freeze_reason: freezeReason.trim() },
        },
      });
      toast.success(tx("تم تجميد الموظف"));
      setFreezeOpen(false);
      await loadAll();
    } catch (e) {
      toast.error((e as Error).message || tx("فشل التجميد"));
    } finally {
      setSaving(false);
    }
  };

  const unfreeze = async (m: StaffRecord) => {
    try {
      let headers: Record<string, string> = {};
      if (getFirebaseDb()) headers = await getServerAuthHeaders();
      await updateStaffFn({
        headers,
        data: { staffId: m.id, input: { frozen: false, freeze_reason: null } },
      });
      toast.success(tx("تم إلغاء التجميد"));
      await loadAll();
    } catch (e) {
      toast.error((e as Error).message || tx("فشل إلغاء التجميد"));
    }
  };

  const deleteSelected = async () => {
    if (!deleteMember) return;
    if (getFirebaseDb()) {
      setDeleting(true);
      try {
        const headers = await getServerAuthHeaders();
        await deleteStaffFn({ headers, data: { staffId: deleteMember.id } });
        toast.success(tx("تم حذف الموظف"));
        setDeleteMember(null);
        setConfirmDelete(false);
        await loadAll();
      } catch (e) {
        toast.error((e as Error).message || tx("فشل الحذف"));
      } finally {
        setDeleting(false);
      }
    } else {
      setStaff((prev) => prev.filter((x) => x.id !== deleteMember.id));
      setDeleteMember(null);
      setConfirmDelete(false);
      toast.success(tx("تم حذف الموظف"));
    }
  };

  const copySerial = (m: StaffRecord) => {
    navigator.clipboard.writeText(m.serial ?? "");
    toast.success(tx("تم نسخ رقم الموظف"));
  };

  return (
    <div className="p-2 space-y-3" dir="rtl">
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-lg p-3">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h3 className="font-bold text-sm flex items-center gap-2">
              <Users className="w-4 h-4 text-[var(--primary)]" />
              {tx("الموظفون")}
            </h3>
            <p className="text-xs text-[var(--muted-foreground)] mt-0.5">
              {tx(
                "نفس بيانات الموظفين في صفحة الإعدادات — صلاحيات متعددة لكل موظف.",
              )}
            </p>
          </div>
          <CanWrite area="employees">
            <Button size="sm" className="h-8 text-xs gap-1.5" onClick={openAdd}>
              <UserPlus className="w-3.5 h-3.5" /> {tx("إضافة موظف")}
            </Button>
          </CanWrite>
        </div>
      </div>

      <Card className="rounded-2xl glass shadow-glass border-border/60 overflow-x-auto">
        <Table className="min-w-[620px]">
          <TableHeader>
            <TableRow>
              <TableHead className="text-right">{tx("الاسم")}</TableHead>
              <TableHead className="text-right">{tx("الصلاحيات")}</TableHead>
              <TableHead className="text-right">{tx("الحالة")}</TableHead>
              <TableHead className="text-right">{tx("إجراء")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell
                  colSpan={4}
                  className="text-center text-muted-foreground py-8"
                >
                  {tx("جاري التحميل…")}
                </TableCell>
              </TableRow>
            ) : staff.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={4}
                  className="text-center text-muted-foreground py-8"
                >
                  {tx("لا يوجد موظفون بعد")}
                </TableCell>
              </TableRow>
            ) : (
              staff.map((m) => (
                <TableRow key={m.id}>
                  <TableCell className="font-medium">
                    <span className="block">{m.name}</span>
                    <button
                      type="button"
                      onClick={() => copySerial(m)}
                      className="text-[11px] font-mono text-[var(--muted-foreground)] hover:text-[var(--primary)] underline decoration-dotted text-left"
                      dir="ltr"
                      title={tx("نسخ رقم الموظف")}
                    >
                      {m.serial ?? ""} ⧉
                    </button>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1 max-w-[220px]">
                      {(m.permissions ?? []).slice(0, 3).map((p) => (
                        <Badge
                          key={p}
                          variant="secondary"
                          className="text-[10px]"
                        >
                          {permissionLabel(p)}
                        </Badge>
                      ))}
                      {(m.permissions ?? []).length > 3 && (
                        <span className="text-[11px] text-[var(--muted-foreground)]">
                          +{(m.permissions ?? []).length - 3}
                        </span>
                      )}
                      {(m.permissions ?? []).length === 0 && (
                        <span className="text-[11px] text-[var(--muted-foreground)]">
                          {tx("بدون صلاحيات")}
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {m.frozen ? (
                      <Badge variant="destructive">{tx("مجمّد")}</Badge>
                    ) : (
                      <Badge variant="default">{tx("نشط")}</Badge>
                    )}
                    {m.frozen && m.freeze_reason && (
                      <span className="text-[11px] text-[var(--muted-foreground)] block mt-1">
                        {tx("السبب: ")}
                        {m.freeze_reason}
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1 justify-end">
                      <Button
                        asChild
                        variant="outline"
                        size="sm"
                        className="gap-1.5 h-7 text-[11px]"
                      >
                        <Link
                          to="/ops/employees/$employeeId"
                          params={{ employeeId: m.id }}
                        >
                          <Info className="w-3 h-3" /> {tx("معلومات")}
                        </Link>
                      </Button>
                      <CanWrite area="employees">
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-1.5 h-7 text-[11px]"
                          onClick={() => openEdit(m)}
                        >
                          <Pencil className="w-3 h-3" /> {tx("تعديل")}
                        </Button>
                        {m.frozen ? (
                          <Button
                            variant="outline"
                            size="sm"
                            className="gap-1.5 h-7 text-[11px]"
                            onClick={() => void unfreeze(m)}
                          >
                            <RefreshCw className="w-3 h-3" />{" "}
                            {tx("إلغاء التجميد")}
                          </Button>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            className="gap-1.5 h-7 text-[11px]"
                            onClick={() => openFreeze(m)}
                          >
                            <Snowflake className="w-3 h-3" /> {tx("تجميد")}
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 text-destructive hover:text-destructive"
                          onClick={() => {
                            setDeleteMember(m);
                            setConfirmDelete(true);
                          }}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </CanWrite>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      {/* Add employee */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{tx("إضافة موظف جديد")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>{tx("الاسم")}</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder={tx("مثال: أحمد بلحاج")}
              />
            </div>
            <div>
              <Label>{tx("الصلاحيات")}</Label>
              <PermissionsSelect
                value={form.permissions}
                onChange={(perms) => setForm({ ...form, permissions: perms })}
              />
            </div>
            <div>
              <Label>{tx("رقم PIN للدخول")}</Label>
              <div className="flex items-center gap-2">
                <Input
                  dir="ltr"
                  value={form.pin}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      pin: e.target.value.replace(/\D/g, "").slice(0, 6),
                    })
                  }
                  className="font-mono tracking-widest text-center"
                />
                <Button
                  variant="outline"
                  size="icon"
                  title={tx("توليد PIN آخر")}
                  onClick={() =>
                    void generateUniquePin().then((p) =>
                      setForm((f) => ({ ...f, pin: p })),
                    )
                  }
                >
                  <RefreshCw className="w-4 h-4" />
                </Button>
              </div>
              <p className="text-[11px] text-[var(--muted-foreground)] mt-1">
                {tx("رقم تسلسلي يُولد تلقائياً عند الحفظ.")}
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>
              {tx("إلغاء")}
            </Button>
            <Button onClick={submitAdd} disabled={saving}>
              {saving ? tx("جاري الحفظ…") : tx("حفظ")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit employee */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{tx("تعديل الموظف")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>{tx("الاسم")}</Label>
              <Input
                value={editForm.name}
                onChange={(e) =>
                  setEditForm({ ...editForm, name: e.target.value })
                }
              />
            </div>
            <div>
              <Label>{tx("الصلاحيات")}</Label>
              <PermissionsSelect
                value={editForm.permissions}
                onChange={(perms) =>
                  setEditForm({ ...editForm, permissions: perms })
                }
              />
            </div>
            <div>
              <Label>
                {tx("رقم PIN للدخول")} — {tx("اتركه فارغاً لعدم التغيير")}
              </Label>
              <div className="flex items-center gap-2">
                <Input
                  dir="ltr"
                  value={editForm.pin}
                  onChange={(e) =>
                    setEditForm({
                      ...editForm,
                      pin: e.target.value.replace(/\D/g, "").slice(0, 6),
                    })
                  }
                  className="font-mono tracking-widest text-center"
                />
                <Button
                  variant="outline"
                  size="icon"
                  title={tx("توليد PIN")}
                  onClick={() =>
                    void generateUniquePin().then((p) =>
                      setEditForm((f) => ({ ...f, pin: p })),
                    )
                  }
                >
                  <RefreshCw className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>
              {tx("إلغاء")}
            </Button>
            <Button onClick={submitEdit} disabled={saving}>
              {saving ? tx("جاري الحفظ…") : tx("حفظ")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Freeze */}
      <Dialog open={freezeOpen} onOpenChange={setFreezeOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {tx("تجميد الموظف")} — {freezeMember?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-xs text-[var(--muted-foreground)]">
              {tx("سيظهر سبب التجميد للموظف عند محاولة الدخول.")}
            </p>
            <div>
              <Label>{tx("سبب التجميد")}</Label>
              <Input
                value={freezeReason}
                onChange={(e) => setFreezeReason(e.target.value)}
                placeholder={tx("مثال: غياب متكرر")}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFreezeOpen(false)}>
              {tx("إلغاء")}
            </Button>
            <Button
              variant="destructive"
              onClick={submitFreeze}
              disabled={saving}
            >
              {saving ? tx("جاري الحفظ…") : tx("تجميد")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title={`${tx("حذف الموظف")} "${deleteMember?.name}"؟`}
        description={tx(
          "الحذف نهائي ولا يمكن التراجع عنه. سيُحرم الموظف من الدخول نهائياً.",
        )}
        confirmLabel={deleting ? tx("جاري الحذف…") : tx("نعم، احذف")}
        destructive
        onConfirm={() => void deleteSelected()}
      />
    </div>
  );
}
