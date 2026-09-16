import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  Loader2, Trash2, UserPlus, Users, Power, Pencil, Eye, EyeOff, Copy
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { getFirebaseDb } from "@/integrations/firebase/config";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { PermissionsSelect } from "@/components/permissions-select";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { useServerFn } from "@tanstack/react-start";
import {
  listStaff, addStaff, updateStaff, toggleStaff, deleteStaff, type StaffRecord,
} from "@/lib/staff.functions";
import { permissionLabel } from "@/lib/staff-permissions";



type EmployeeForm = {
  name: string;
  pin: string;
  permissions: string[];
  email: string;
  password: string;
  showWeb: boolean;
};

const EMPTY_FORM: EmployeeForm = {
  name: "", pin: "", permissions: [], email: "", password: "", showWeb: false,
};

async function getServerAuthHeaders() {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error("الجلسة منتهية، سجّل دخولك من جديد");
  return { Authorization: `Bearer ${token}` };
}

export function EmployeesSettingsPageView() {
  const listStaffFn = useServerFn(listStaff);
  const addStaffFn = useServerFn(addStaff);
  const updateStaffFn = useServerFn(updateStaff);
  const toggleStaffFn = useServerFn(toggleStaff);
  const deleteStaffFn = useServerFn(deleteStaff);

  const [employees, setEmployees] = useState<StaffRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const [addOpen, setAddOpen] = useState(false);
  const [addForm, setAddForm] = useState<EmployeeForm>(EMPTY_FORM);
  const [editOpen, setEditOpen] = useState(false);
  const [editMember, setEditMember] = useState<StaffRecord | null>(null);
  const [editForm, setEditForm] = useState<EmployeeForm>(EMPTY_FORM);
  
  const [savingEmp, setSavingEmp] = useState(false);
  const [addedCreds, setAddedCreds] = useState<{ serial: string; pin: string; } | null>(null);
  const [showAddPw, setShowAddPw] = useState(false);
  const [showEditPw, setShowEditPw] = useState(false);
  
  const [deleteMember, setDeleteMember] = useState<StaffRecord | null>(null);

  useEffect(() => {
    (async () => {
      await refreshEmployees();
      setLoading(false);
    })();
  }, []);

  async function refreshEmployees() {
    try {
      let headers: Record<string, string> = {};
      if (getFirebaseDb()) headers = await getServerAuthHeaders();
      const res = await listStaffFn({ headers });
      setEmployees((res.staff ?? []) as StaffRecord[]);
    } catch {
      // ignore
    }
  }

  const openAdd = () => {
    setAddForm(EMPTY_FORM);
    setAddedCreds(null);
    setAddOpen(true);
  };

  async function submitAdd() {
    const frm = addForm;
    if (!frm.name.trim()) return toast.error("أدخل اسم الموظف");
    if (frm.pin && !/^\d{4,6}$/.test(frm.pin)) return toast.error("PIN من 4 إلى 6 أرقام");
    if (frm.showWeb) {
      if (!frm.email.includes("@")) return toast.error("بريد غير صالح");
      if (frm.password.length < 6) return toast.error("كلمة السر 6 أحرف على الأقل");
    }
    setSavingEmp(true);
    try {
      const headers = await getServerAuthHeaders();
      const res = await addStaffFn({
        headers,
        data: {
          name: frm.name.trim(),
          pin: frm.pin.trim(),
          permissions: frm.permissions,
          email: frm.showWeb ? frm.email.trim().toLowerCase() : null,
          password: frm.showWeb ? frm.password : null,
        },
      });
      setAddOpen(false);
      setAddedCreds({ serial: res.serial, pin: res.pin ?? frm.pin });
      toast.success("تمت إضافة الموظف");
      await refreshEmployees();
    } catch (e) {
      toast.error((e as Error).message || "فشل الإضافة");
    } finally {
      setSavingEmp(false);
    }
  }

  const openEdit = (m: StaffRecord) => {
    setEditMember(m);
    setEditForm({
      name: m.name,
      pin: "",
      permissions: m.permissions ?? [],
      email: m.email ?? "",
      password: "",
      showWeb: !!m.email,
    });
    setEditOpen(true);
  };

  async function submitEdit() {
    if (!editMember) return;
    if (!editForm.name.trim()) return toast.error("أدخل اسم الموظف");
    if (editForm.pin && !/^\d{4,6}$/.test(editForm.pin)) return toast.error("PIN من 4 إلى 6 أرقام");
    if (editForm.showWeb && !editMember.email) {
      if (!editForm.email.includes("@")) return toast.error("بريد غير صالح");
      if (editForm.password.length < 6) return toast.error("كلمة السر 6 أحرف على الأقل");
    }
    setSavingEmp(true);
    try {
      const headers = await getServerAuthHeaders();
      const input: Record<string, unknown> = {
        name: editForm.name.trim(),
        permissions: editForm.permissions,
      };
      if (editForm.pin) input.pin = editForm.pin;
      if (editForm.showWeb && !editMember.email) {
        input.email = editForm.email.trim().toLowerCase();
        input.password = editForm.password;
      }
      await updateStaffFn({ headers, data: { staffId: editMember.id, input } });
      setEditOpen(false);
      toast.success("تم تعديل الموظف");
      await refreshEmployees();
    } catch (e) {
      toast.error((e as Error).message || "فشل التعديل");
    } finally {
      setSavingEmp(false);
    }
  }

  async function toggleEmp(m: StaffRecord, active: boolean) {
    try {
      const headers = await getServerAuthHeaders();
      await toggleStaffFn({ headers, data: { staffId: m.id, active } });
      setEmployees((prev) => prev.map((x) => (x.id === m.id ? { ...x, frozen: !active } : x)));
      toast.success(active ? "تم تفعيل الحساب" : "تم تعطيل الحساب");
    } catch (e) {
      toast.error((e as Error).message || "فشل");
    }
  }

  async function submitDelete() {
    if (!deleteMember) return;
    try {
      const headers = await getServerAuthHeaders();
      await deleteStaffFn({ headers, data: { staffId: deleteMember.id } });
      setEmployees((prev) => prev.filter((x) => x.id !== deleteMember.id));
      toast.success("تم حذف الموظف");
      setDeleteMember(null);
    } catch (e) {
      toast.error((e as Error).message || "فشل الحذف");
    }
  }

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 mb-6">
        <Users className="w-6 h-6 text-primary" />
        <h2 className="text-xl font-bold">الموظفون</h2>
      </div>

      <div className="glass shadow-glass rounded-2xl border border-border/60 p-6 space-y-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <p className="text-sm text-muted-foreground flex-1">
            مكان واحد لكل الموظفين: الاسم + PIN + الصلاحيات (مطبخ، نادل، كاشير، وأقسام الإدارة). الموظف الذي له أكثر من صلاحية يجدها تبويبات في تطبيق سطح المكتب.
          </p>
          <Button onClick={openAdd} className="gap-1.5 shrink-0">
            <UserPlus className="w-4 h-4" /> إضافة موظف
          </Button>
        </div>

        {employees.length === 0 ? (
          <div className="rounded-xl bg-muted/40 p-6 text-center text-sm text-muted-foreground">
            لا يوجد موظفون بعد — أضف أول موظف
          </div>
        ) : (
          <div className="space-y-2">
            {employees.map((emp) => (
              <div key={emp.id} className="flex items-center justify-between gap-2 rounded-xl bg-muted/40 px-3 py-2.5 hover:bg-muted/60 transition-colors">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="flex flex-col min-w-0">
                    <span className="font-medium truncate">{emp.name}</span>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(emp.serial ?? "");
                        toast.success("تم نسخ رقم الموظف");
                      }}
                      className="text-[11px] font-mono text-muted-foreground hover:text-primary underline decoration-dotted text-left"
                      dir="ltr"
                      title="نسخ رقم الموظف"
                    >
                      {emp.serial ?? ""} ⧉
                    </button>
                    {!emp.frozen ? <span className="text-xs text-green-600">نشط</span> : <span className="text-xs text-red-500">موقوف</span>}
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0 flex-wrap max-w-[45%] justify-end">
                  {(emp.permissions ?? []).slice(0, 3).map((p) => (
                    <span key={p} className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                      {permissionLabel(p)}
                    </span>
                  ))}
                  {(emp.permissions ?? []).length > 3 && (
                    <span className="text-[10px] text-muted-foreground">+{(emp.permissions ?? []).length - 3}</span>
                  )}
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <Button size="sm" variant="ghost" onClick={() => openEdit(emp)} title="تعديل">
                    <Pencil className="w-3.5 h-3.5" />
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => void toggleEmp(emp, emp.frozen)} title={emp.frozen ? "تفعيل" : "تعطيل"}>
                    <Power className={`w-3.5 h-3.5 ${emp.frozen ? "text-muted-foreground" : "text-green-600"}`} />
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setDeleteMember(emp)} className="text-red-500 hover:text-red-700 hover:bg-red-50" title="حذف">
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="rounded-xl bg-blue-50 border border-blue-200 p-4 text-xs text-blue-900 mt-4 leading-relaxed">
          <p className="mb-2"><strong>تسجيل الدخول على سطح المكتب:</strong> رقم الموظف (السيريال) + PIN. الموظفون ذوو صلاحيات واجهات (مطبخ/نادل/كاشير) وأقسام إدارة يفتحونها من تبويبات التطبيق.</p>
          <p>إدارة تفصيلية للموظفين (تجميد بسبب، سجل الأداء) موجودة في قسم الموظفين من لوحة التشغيل.</p>
        </div>
      </div>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>إضافة موظف</DialogTitle>
            <DialogDescription>أضف موظفاً وحدد صلاحياته.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>الاسم الكامل</Label>
              <Input autoFocus value={addForm.name} onChange={(e) => setAddForm({ ...addForm, name: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>PIN الدخول (أجهزة الكاشير والمطبخ)</Label>
              <Input type="number" placeholder="4 إلى 6 أرقام" value={addForm.pin} onChange={(e) => setAddForm({ ...addForm, pin: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>الصلاحيات (مهام الموظف)</Label>
              <PermissionsSelect value={addForm.permissions} onChange={(p) => setAddForm({ ...addForm, permissions: p })} />
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <Label>دخول للوحة التحكم (الويب)؟</Label>
                <div className="text-xs text-muted-foreground">يحتاج بريد وكلمة سر.</div>
              </div>
              <input type="checkbox" className="h-4 w-4" checked={addForm.showWeb} onChange={(e) => setAddForm({ ...addForm, showWeb: e.target.checked })} />
            </div>
            {addForm.showWeb && (
              <div className="space-y-4 bg-muted/30 p-3 rounded-lg border">
                <div className="space-y-2">
                  <Label>البريد الإلكتروني</Label>
                  <Input type="email" placeholder="email@example.com" value={addForm.email} onChange={(e) => setAddForm({ ...addForm, email: e.target.value })} dir="ltr" />
                </div>
                <div className="space-y-2 relative">
                  <Label>كلمة السر</Label>
                  <div className="relative">
                    <Input type={showAddPw ? "text" : "password"} value={addForm.password} onChange={(e) => setAddForm({ ...addForm, password: e.target.value })} dir="ltr" className="pr-10" />
                    <button type="button" onClick={() => setShowAddPw(!showAddPw)} className="absolute right-2 top-2.5 text-muted-foreground hover:text-foreground">
                      {showAddPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>إلغاء</Button>
            <Button onClick={submitAdd} disabled={savingEmp}>{savingEmp && <Loader2 className="w-4 h-4 ml-2 animate-spin" />} إضافة وحفظ</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!addedCreds} onOpenChange={(o) => !o && setAddedCreds(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-green-600 flex items-center gap-2">تم إنشاء الموظف بنجاح</DialogTitle>
            <DialogDescription>أعطِ هذه البيانات للموظف للدخول من تطبيق الأجهزة:</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 bg-muted/40 p-4 rounded-xl border">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">رقم الموظف (السيريال)</Label>
              <div className="text-xl font-bold tracking-wider font-mono text-primary flex items-center gap-2" dir="ltr">
                {addedCreds?.serial}
                <Button size="sm" variant="ghost" onClick={() => navigator.clipboard.writeText(addedCreds?.serial || "")}><Copy className="w-4 h-4" /></Button>
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">رمز الدخول (PIN)</Label>
              <div className="text-xl font-bold tracking-wider font-mono text-primary" dir="ltr">{addedCreds?.pin || "—"}</div>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => setAddedCreds(null)} className="w-full">حسناً، تم النسخ</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>تعديل الموظف</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>الاسم الكامل</Label>
              <Input autoFocus value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>PIN جديد (اتركه فارغاً إن لم ترغب بتغييره)</Label>
              <Input type="number" placeholder="4 إلى 6 أرقام" value={editForm.pin} onChange={(e) => setEditForm({ ...editForm, pin: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>الصلاحيات</Label>
              <PermissionsSelect value={editForm.permissions} onChange={(p) => setEditForm({ ...editForm, permissions: p })} />
            </div>
            {!editMember?.email && (
              <div className="flex items-center justify-between rounded-lg border p-3 mt-4">
                <div>
                  <Label>تفعيل حساب لوحة التحكم؟</Label>
                  <div className="text-xs text-muted-foreground">لإعطاء دخول من الويب برقم سري وبريد.</div>
                </div>
                <input type="checkbox" className="h-4 w-4" checked={editForm.showWeb} onChange={(e) => setEditForm({ ...editForm, showWeb: e.target.checked })} />
              </div>
            )}
            {editMember?.email && (
              <div className="p-3 bg-muted/30 rounded-lg border text-sm text-muted-foreground">
                هذا الموظف لديه حساب ويب بالفعل ({editMember.email}).
              </div>
            )}
            {editForm.showWeb && !editMember?.email && (
              <div className="space-y-4 bg-muted/30 p-3 rounded-lg border mt-2">
                <div className="space-y-2">
                  <Label>البريد الإلكتروني</Label>
                  <Input type="email" value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} dir="ltr" />
                </div>
                <div className="space-y-2 relative">
                  <Label>كلمة السر الأولية</Label>
                  <div className="relative">
                    <Input type={showEditPw ? "text" : "password"} value={editForm.password} onChange={(e) => setEditForm({ ...editForm, password: e.target.value })} dir="ltr" className="pr-10" />
                    <button type="button" onClick={() => setShowEditPw(!showEditPw)} className="absolute right-2 top-2.5 text-muted-foreground hover:text-foreground">
                      {showEditPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>إلغاء</Button>
            <Button onClick={submitEdit} disabled={savingEmp}>{savingEmp && <Loader2 className="w-4 h-4 ml-2 animate-spin" />} حفظ التغييرات</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <ConfirmDialog
        open={!!deleteMember}
        onOpenChange={(open) => !open && setDeleteMember(null)}
        title="تأكيد الحذف"
        description={`هل أنت متأكد من حذف الموظف ${deleteMember?.name}؟`}
        onConfirm={submitDelete}
        confirmText="حذف الموظف"
        variant="destructive"
      />
    </div>
  );
}
