import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { requireOpsAccess, useAreaPermission } from "@/lib/permissions";
import { CanWrite } from "@/components/PermissionsGate";
import { UserPlus, RefreshCw, Pencil, Trash2, Snowflake, ShieldCheck, Users, X, Info } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useRestaurantId } from "@/lib/restaurant";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { tx } from "@/lib/ops-tx";
import { GLOBAL_ROLES, generateUniqueSerial, generateUniquePin } from "@/lib/staff-core";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/ops/employees/")({
  beforeLoad: requireOpsAccess("employees"),
  component: OpsEmployees,
});

type StaffMember = {
  id: string;
  restaurant_id: string;
  name: string;
  role: string;
  serial: string;
  pin: string;
  pin_changed?: boolean;
  email?: string | null;
  frozen: boolean;
  freeze_reason: string | null;
  created_at?: string;
};

type CustomRole = { id: string; name: string };

function OpsEmployees() {
  useTranslation();
  const { restaurantId, loading: restaurantLoading } = useRestaurantId();
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [customRoles, setCustomRoles] = useState<CustomRole[]>([]);
  const [loading, setLoading] = useState(true);

  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState<{ name: string; role: string }>({ name: "", role: GLOBAL_ROLES[0] });
  const [serial, setSerial] = useState("");
  const [pin, setPin] = useState("");
  const [saving, setSaving] = useState(false);

  const [editOpen, setEditOpen] = useState(false);
  const [editMember, setEditMember] = useState<StaffMember | null>(null);
  const [editForm, setEditForm] = useState<{ name: string; role: string }>({ name: "", role: "" });

  const [freezeOpen, setFreezeOpen] = useState(false);
  const [freezeMember, setFreezeMember] = useState<StaffMember | null>(null);
  const [freezeReason, setFreezeReason] = useState("");

  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleteMember, setDeleteMember] = useState<StaffMember | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [rolesOpen, setRolesOpen] = useState(false);
  const [newRoleName, setNewRoleName] = useState("");

  const allRoles = [...GLOBAL_ROLES, ...customRoles.map((r) => r.name)];

  const loadAll = async (rid: string) => {
    const [s, r] = await Promise.all([
      supabase.from("staff").select("*").eq("restaurant_id", rid),
      supabase.from("roles").select("id,name").eq("restaurant_id", rid),
    ]);
    const list = (s.data ?? []) as StaffMember[];
    list.sort((a, b) => a.name.localeCompare(b.name, "ar"));
    const roles = (r.data ?? []) as CustomRole[];
    roles.sort((a, b) => a.name.localeCompare(b.name, "ar"));
    setStaff(list);
    setCustomRoles(roles);
    setLoading(false);
  };

  useEffect(() => {
    if (restaurantLoading) return;
    if (!restaurantId) {
      setStaff([
        { id: "s1", restaurant_id: "mock", name: "أحمد بلحاج", role: "مطبخ", serial: "XKQM-482913", pin: "4821", pin_changed: false, frozen: false, freeze_reason: null },
        { id: "s2", restaurant_id: "mock", name: "سمير حمداني", role: "كاشير", serial: "BZHT-937145", pin: "937145", pin_changed: false, frozen: false, freeze_reason: null },
        { id: "s3", restaurant_id: "mock", name: "ليلى بوعلام", role: "نادل", serial: "QRWE-660241", pin: "6602", pin_changed: true, frozen: true, freeze_reason: "غياب متكرر" },
      ]);
      setLoading(false);
      return;
    }
    void loadAll(restaurantId);
  }, [restaurantId, restaurantLoading]);

  const openAdd = async () => {
    setForm({ name: "", role: GLOBAL_ROLES[0] });
    setSerial(await generateUniqueSerial());
    setPin(await generateUniquePin());
    setAddOpen(true);
  };

  const submitAdd = async () => {
    if (!restaurantId) return;
    if (!form.name.trim()) return toast.error(tx("أدخل اسم الموظف"));
    if (!serial || !pin) return toast.error(tx("لم يُولَّد الرقم التسلسلي أو PIN"));
    setSaving(true);
    const { error } = await supabase.from("staff").insert({
      restaurant_id: restaurantId,
      name: form.name.trim(),
      role: form.role,
      serial,
      pin,
      pin_changed: false,
      frozen: false,
      freeze_reason: null,
      created_at: new Date().toISOString(),
    });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success(tx("تمت الإضافة — التسلسلي: ") + serial + tx(" — PIN: ") + pin);
    setAddOpen(false);
    await loadAll(restaurantId);
  };

  const openEdit = (m: StaffMember) => {
    setEditMember(m);
    setEditForm({ name: m.name, role: m.role });
    setEditOpen(true);
  };

  const submitEdit = async () => {
    if (!editMember || !restaurantId) return;
    if (!editForm.name.trim()) return toast.error(tx("أدخل اسم الموظف"));
    setSaving(true);
    const { error } = await supabase
      .from("staff")
      .update({ name: editForm.name.trim(), role: editForm.role })
      .eq("id", editMember.id);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success(tx("تم تعديل الموظف"));
    setEditOpen(false);
    await loadAll(restaurantId);
  };

  const openFreeze = (m: StaffMember) => {
    setFreezeMember(m);
    setFreezeReason("");
    setFreezeOpen(true);
  };

  const submitFreeze = async () => {
    if (!freezeMember || !restaurantId) return;
    if (!freezeReason.trim()) return toast.error(tx("أدخل سبب التجميد"));
    setSaving(true);
    const { error } = await supabase
      .from("staff")
      .update({ frozen: true, freeze_reason: freezeReason.trim(), frozen_at: new Date().toISOString() })
      .eq("id", freezeMember.id);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success(tx("تم تجميد الموظف"));
    setFreezeOpen(false);
    await loadAll(restaurantId);
  };

  const unfreeze = async (m: StaffMember) => {
    if (!restaurantId) return;
    const { error } = await supabase
      .from("staff")
      .update({ frozen: false, freeze_reason: null, frozen_at: null })
      .eq("id", m.id);
    if (error) return toast.error(error.message);
    toast.success(tx("تم إلغاء التجميد"));
    await loadAll(restaurantId);
  };

  const deleteSelected = async () => {
    if (!deleteMember || !restaurantId) return;
    setDeleting(true);
    const { error } = await supabase.from("staff").delete().eq("id", deleteMember.id);
    setDeleting(false);
    setConfirmDelete(false);
    if (error) return toast.error(error.message);
    toast.success(tx("تم حذف الموظف"));
    setDeleteMember(null);
    await loadAll(restaurantId);
  };

  const submitAddRole = async () => {
    if (!restaurantId) return;
    const name = newRoleName.trim();
    if (!name) return;
    if (GLOBAL_ROLES.includes(name) || customRoles.some((r) => r.name === name)) {
      return toast.error(tx("الدور موجود مسبقاً"));
    }
    const { error } = await supabase.from("roles").insert({ restaurant_id: restaurantId, name });
    if (error) return toast.error(error.message);
    toast.success(tx("تمت إضافة الدور"));
    setNewRoleName("");
    await loadAll(restaurantId);
  };

  const deleteRole = async (r: CustomRole) => {
    if (!restaurantId) return;
    const used = staff.some((s) => s.role === r.name);
    if (used) return toast.error(tx("لا يمكن حذف دور مستخدم من قبل موظف"));
    const { error } = await supabase.from("roles").delete().eq("id", r.id);
    if (error) return toast.error(error.message);
    toast.success(tx("تم حذف الدور"));
    await loadAll(restaurantId);
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
              {tx("أضف الموظفين والأدوار. الكود يُسلم للموظف للدخول ولا يُعرض في الواجهات.")}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <CanWrite area="employees">
            <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5" onClick={() => setRolesOpen(true)}>
              <ShieldCheck className="w-3.5 h-3.5" /> {tx("الأدوار")}
            </Button>
            <Button size="sm" className="h-8 text-xs gap-1.5" onClick={() => void openAdd()}>
              <UserPlus className="w-3.5 h-3.5" /> {tx("إضافة موظف")}
            </Button>
            </CanWrite>
          </div>
        </div>
      </div>

      <Card className="rounded-2xl glass shadow-glass border-border/60 overflow-x-auto">
        <Table className="min-w-[560px]">
          <TableHeader>
            <TableRow>
              <TableHead className="text-right">{tx("الاسم")}</TableHead>
              <TableHead className="text-right">{tx("الدور")}</TableHead>
              <TableHead className="text-right">{tx("الحالة")}</TableHead>
              <TableHead className="text-right">{tx("إجراء")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                  {tx("جاري التحميل…")}
                </TableCell>
              </TableRow>
            ) : staff.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                  {tx("لا يوجد موظفون بعد")}
                </TableCell>
              </TableRow>
            ) : (
              staff.map((m) => (
                <TableRow key={m.id}>
                  <TableCell className="font-medium">{m.name}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">{m.role}</Badge>
                  </TableCell>
                  <TableCell>
                    {m.frozen ? (
                      <Badge variant="destructive">{tx("مجمّد")}</Badge>
                    ) : (
                      <Badge variant="default">{tx("نشط")}</Badge>
                    )}
                    {m.frozen && m.freeze_reason && (
                      <span className="text-[11px] text-[var(--muted-foreground)] block mt-1">
                        {tx("السبب: ")}{m.freeze_reason}
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1 justify-end">
                      <Button asChild variant="outline" size="sm" className="gap-1.5 h-7 text-[11px]">
                        <Link to="/ops/employees/$employeeId" params={{ employeeId: m.id }}>
                          <Info className="w-3 h-3" /> {tx("معلومات")}
                        </Link>
                      </Button>
                      <CanWrite area="employees">
                      <Button variant="outline" size="sm" className="gap-1.5 h-7 text-[11px]" onClick={() => openEdit(m)}>
                        <Pencil className="w-3 h-3" /> {tx("تعديل")}
                      </Button>
                      {m.frozen ? (
                        <Button variant="outline" size="sm" className="gap-1.5 h-7 text-[11px]" onClick={() => unfreeze(m)}>
                          <RefreshCw className="w-3 h-3" /> {tx("إلغاء التجميد")}
                        </Button>
                      ) : (
                        <Button variant="outline" size="sm" className="gap-1.5 h-7 text-[11px]" onClick={() => openFreeze(m)}>
                          <Snowflake className="w-3 h-3" /> {tx("تجميد")}
                        </Button>
                      )}
                      <Button variant="ghost" size="sm" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => { setDeleteMember(m); setConfirmDelete(true); }}>
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
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder={tx("مثال: أحمد بلحاج")} />
            </div>
            <div>
              <Label>{tx("الدور")}</Label>
              <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v })}>
                <SelectTrigger>
                  <SelectValue placeholder={tx("اختر الدور")} />
                </SelectTrigger>
                <SelectContent>
                  {allRoles.map((r) => (
                    <SelectItem key={r} value={r}>{r}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>{tx("الرقم التسلسلي")}</Label>
              <div className="flex items-center gap-2">
                <Input dir="ltr" readOnly value={serial} className="font-mono tracking-widest text-center" />
                <Button variant="outline" size="icon" title={tx("توليد رقم آخر")} onClick={() => void generateUniqueSerial().then(setSerial)}>
                  <RefreshCw className="w-4 h-4" />
                </Button>
              </div>
              <p className="text-[11px] text-[var(--muted-foreground)] mt-1">{tx("رقم تسلسلي فريد على مستوى المنصة.")}</p>
            </div>
            <div>
              <Label>{tx("رقم PIN للدخول")}</Label>
              <div className="flex items-center gap-2">
                <Input dir="ltr" readOnly value={pin} className="font-mono tracking-widest text-center" />
                <Button variant="outline" size="icon" title={tx("توليد PIN آخر")} onClick={() => void generateUniquePin().then(setPin)}>
                  <RefreshCw className="w-4 h-4" />
                </Button>
              </div>
              <p className="text-[11px] text-[var(--muted-foreground)] mt-1">{tx("سلّمه PIN للموظف — سيغيّره بنفسه عند أول دخول.")}</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>{tx("إلغاء")}</Button>
            <Button onClick={submitAdd} disabled={saving}>{saving ? tx("جاري الحفظ…") : tx("حفظ")}</Button>
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
              <Input value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} />
            </div>
            <div>
              <Label>{tx("الدور")}</Label>
              <Select value={editForm.role} onValueChange={(v) => setEditForm({ ...editForm, role: v })}>
                <SelectTrigger>
                  <SelectValue placeholder={tx("اختر الدور")} />
                </SelectTrigger>
                <SelectContent>
                  {allRoles.map((r) => (
                    <SelectItem key={r} value={r}>{r}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>{tx("إلغاء")}</Button>
            <Button onClick={submitEdit} disabled={saving}>{saving ? tx("جاري الحفظ…") : tx("حفظ")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Freeze */}
      <Dialog open={freezeOpen} onOpenChange={setFreezeOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{tx("تجميد الموظف")} — {freezeMember?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-xs text-[var(--muted-foreground)]">
              {tx("سيظهر سبب التجميد للموظف عند محاولة الدخول.")}
            </p>
            <div>
              <Label>{tx("سبب التجميد")}</Label>
              <Input value={freezeReason} onChange={(e) => setFreezeReason(e.target.value)} placeholder={tx("مثال: غياب متكرر")} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFreezeOpen(false)}>{tx("إلغاء")}</Button>
            <Button variant="destructive" onClick={submitFreeze} disabled={saving}>{saving ? tx("جاري الحفظ…") : tx("تجميد")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Roles */}
      <Dialog open={rolesOpen} onOpenChange={setRolesOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{tx("إدارة الأدوار")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <div className="text-xs font-semibold text-[var(--muted-foreground)]">{tx("أدوار ثابتة")}</div>
            {GLOBAL_ROLES.map((r) => (
              <div key={r} className="flex items-center justify-between bg-[var(--muted)]/50 rounded-lg px-3 py-2">
                <span className="text-sm">{r}</span>
                <Badge variant="secondary">{tx("افتراضي")}</Badge>
              </div>
            ))}
            <div className="text-xs font-semibold text-[var(--muted-foreground)] pt-2">{tx("أدوار المطعم")}</div>
            {customRoles.length === 0 && (
              <div className="text-sm text-[var(--muted-foreground)] py-1">{tx("لا توجد أدوار مخصصة")}</div>
            )}
            {customRoles.map((r) => (
              <div key={r.id} className="flex items-center justify-between bg-[var(--card)] border border-[var(--border)] rounded-lg px-3 py-2">
                <span className="text-sm">{r.name}</span>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => deleteRole(r)}>
                  <X className="w-3.5 h-3.5" />
                </Button>
              </div>
            ))}
            <div className="flex items-center gap-2 pt-2">
              <Input value={newRoleName} onChange={(e) => setNewRoleName(e.target.value)} placeholder={tx("اسم الدور الجديد...")} onKeyDown={(e) => { if (e.key === "Enter") void submitAddRole(); }} />
              <Button onClick={submitAddRole} className="gap-1.5"><UserPlus className="w-3.5 h-3.5" /> {tx("إضافة")}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title={`${tx("حذف الموظف")} "${deleteMember?.name}"؟`}
        description={tx("الحذف نهائي ولا يمكن التراجع عنه. سيُحرم الموظف من الدخول نهائياً.")}
        confirmLabel={deleting ? tx("جاري الحذف…") : tx("نعم، احذف")}
        destructive
        onConfirm={() => void deleteSelected()}
      />
    </div>
  );
}
