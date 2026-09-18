import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { requireOpsAccess } from "@/lib/permissions";
import { CanWrite } from "@/components/PermissionsGate";
import {
  ArrowRight,
  Eye,
  EyeOff,
  BadgeCheck,
  Snowflake,
  User,
  KeyRound,
  Hash,
  Pencil,
  Wallet,
  HandCoins,
  CalendarDays,
  ArrowDownCircle,
} from "lucide-react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { getFirebaseDb } from "@/integrations/firebase/config";
import { useRestaurantId, formatDZD } from "@/lib/restaurant";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { PermissionsSelect } from "@/components/permissions-select";
import { permissionLabel } from "@/lib/staff-permissions";
import { tx } from "@/lib/ops-tx";
import {
  listStaff,
  updateStaff,
  type StaffRecord,
} from "@/lib/staff.functions";
import {
  employeePayroll,
  payEmployeeSalary,
  recordStaffAdvance,
  saveStaffSalary,
} from "@/lib/payroll.functions";
import { useTranslation } from "react-i18next";

export const Route = createFileRoute("/ops/employees/$employeeId")({
  beforeLoad: requireOpsAccess("employees"),
  component: EmployeeInfo,
});

function EmployeeInfo() {
  useTranslation();
  const { employeeId } = Route.useParams();
  const { restaurantId, loading: restaurantLoading } = useRestaurantId();
  const listStaffFn = useServerFn(listStaff);
  const updateStaffFn = useServerFn(updateStaff);
  const [member, setMember] = useState<StaffRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [showPin, setShowPin] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editPermissions, setEditPermissions] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const payrollFn = useServerFn(employeePayroll);
  const paySalaryFn = useServerFn(payEmployeeSalary);
  const advanceFn = useServerFn(recordStaffAdvance);
  const saveSalaryFn = useServerFn(saveStaffSalary);

  type PayrollView = {
    salary: number | null;
    payments: { id: string; net_salary: number; paid_at: string; method: string | null; notes: string | null }[];
    transactions: { id: string; type: string; amount: number; date: string; notes: string | null }[];
    balance: number;
  };
  const [payroll, setPayroll] = useState<PayrollView | null>(null);
  const [payLoading, setPayLoading] = useState(false);

  const [payOpen, setPayOpen] = useState(false);
  const [payForm, setPayForm] = useState({ amount: "", method: "نقداً", notes: "" });
  const [paySaving, setPaySaving] = useState(false);

  const [advOpen, setAdvOpen] = useState(false);
  const [advForm, setAdvForm] = useState({ amount: "", type: "advance", notes: "" });
  const [advSaving, setAdvSaving] = useState(false);

  const loadPayroll = async () => {
    if (!restaurantId) return;
    setPayLoading(true);
    try {
      let headers: Record<string, string> = {};
      if (getFirebaseDb()) {
        const { data } = await supabase.auth.getSession();
        const token = data.session?.access_token;
        if (token) headers = { Authorization: `Bearer ${token}` };
      }
      const res = await payrollFn({ headers, data: { employeeId } });
      setPayroll(res as unknown as PayrollView);
    } catch {
      setPayroll(null);
    } finally {
      setPayLoading(false);
    }
  };

  useEffect(() => {
    if (!restaurantLoading) void loadPayroll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [employeeId, restaurantId, restaurantLoading]);

  const submitPay = async () => {
    if (!restaurantId) return;
    const amount = Number(payForm.amount);
    if (!amount || amount <= 0) return toast.error(tx("أدخل مبلغاً صحيحاً"));
    setPaySaving(true);
    try {
      let headers: Record<string, string> = {};
      if (getFirebaseDb()) {
        const { data } = await supabase.auth.getSession();
        const token = data.session?.access_token;
        if (token) headers = { Authorization: `Bearer ${token}` };
      }
      await paySalaryFn({
        headers,
        data: {
          employeeId,
          amount,
          method: payForm.method || null,
          notes: payForm.notes.trim() || null,
        },
      });
      toast.success(tx("تم تسجيل الراتب"));
      setPayOpen(false);
      await loadPayroll();
    } catch (e) {
      toast.error((e as Error).message || tx("فشل تسجيل الراتب"));
    } finally {
      setPaySaving(false);
    }
  };

  const submitAdvance = async () => {
    if (!restaurantId) return;
    const amount = Number(advForm.amount);
    if (!amount || amount <= 0) return toast.error(tx("أدخل مبلغاً صحيحاً"));
    setAdvSaving(true);
    try {
      let headers: Record<string, string> = {};
      if (getFirebaseDb()) {
        const { data } = await supabase.auth.getSession();
        const token = data.session?.access_token;
        if (token) headers = { Authorization: `Bearer ${token}` };
      }
      await advanceFn({
        headers,
        data: {
          employeeId,
          amount,
          type: advForm.type === "loan" ? "loan" : "advance",
          notes: advForm.notes.trim() || null,
        },
      });
      toast.success(advForm.type === "loan" ? tx("تم تسجيل القرض") : tx("تم تسجيل السلفة"));
      setAdvOpen(false);
      await loadPayroll();
    } catch (e) {
      toast.error((e as Error).message || tx("فشل التسجيل"));
    } finally {
      setAdvSaving(false);
    }
  };

  const saveSalary = async (salary: string) => {
    if (!restaurantId) return;
    try {
      let headers: Record<string, string> = {};
      if (getFirebaseDb()) {
        const { data } = await supabase.auth.getSession();
        const token = data.session?.access_token;
        if (token) headers = { Authorization: `Bearer ${token}` };
      }
      await saveSalaryFn({
        headers,
        data: { employeeId, salary: salary ? Number(salary) : null },
      });
      setMember({ ...member!, salary: salary ? Number(salary) : null });
      setPayroll((p) => (p ? { ...p, salary: salary ? Number(salary) : null } : p));
      toast.success(tx("تم حفظ الراتب"));
    } catch (e) {
      toast.error((e as Error).message || tx("فشل حفظ الراتب"));
    }
  };

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (restaurantLoading) return;
      try {
        let headers: Record<string, string> = {};
        if (getFirebaseDb()) {
          const { data } = await supabase.auth.getSession();
          const token = data.session?.access_token;
          if (token) headers = { Authorization: `Bearer ${token}` };
        }
        const res = await listStaffFn({ headers });
        const found = (res.staff ?? []).find((s) => s.id === employeeId);
        if (!cancelled) {
          setMember((found as StaffRecord) ?? null);
          setLoading(false);
        }
      } catch {
        if (!cancelled) {
          setMember(null);
          setLoading(false);
        }
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [employeeId, restaurantId, restaurantLoading]);

  const submitEdit = async () => {
    if (!member) return;
    if (!editName.trim()) return toast.error(tx("أدخل اسم الموظف"));
    setSaving(true);
    try {
      let headers: Record<string, string> = {};
      if (getFirebaseDb()) {
        const { data } = await supabase.auth.getSession();
        const token = data.session?.access_token;
        if (token) headers = { Authorization: `Bearer ${token}` };
      }
      await updateStaffFn({
        headers,
        data: {
          staffId: member.id,
          input: { name: editName.trim(), permissions: editPermissions },
        },
      });
      toast.success(tx("تم تعديل الموظف"));
      setMember({
        ...member,
        name: editName.trim(),
        permissions: editPermissions,
      });
      setEditing(false);
    } catch (e) {
      toast.error((e as Error).message || tx("فشل التعديل"));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-12 text-[var(--muted-foreground)] text-sm">
        {tx("جاري التحميل…")}
      </div>
    );
  }

  if (!member) {
    return (
      <div className="p-2 space-y-3" dir="rtl">
        <Link
          to="/ops/employees"
          className="inline-flex items-center gap-1 text-sm text-[var(--muted-foreground)] hover:text-[var(--primary)]"
        >
          <ArrowRight className="w-4 h-4" /> {tx("عودة للموظفين")}
        </Link>
        <Card className="p-8 text-center text-[var(--muted-foreground)]">
          {tx("لم يتم العثور على الموظف.")}
        </Card>
      </div>
    );
  }

  const created = member.created_at
    ? new Date(member.created_at).toLocaleDateString("ar-DZ")
    : "—";

  return (
    <div className="p-2 space-y-3" dir="rtl">
      <Link
        to="/ops/employees"
        className="inline-flex items-center gap-1 text-sm text-[var(--muted-foreground)] hover:text-[var(--primary)]"
      >
        <ArrowRight className="w-4 h-4" /> {tx("عودة للموظفين")}
      </Link>

      <Card className="rounded-xl border border-border bg-card p-4">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-[var(--primary)]/10 text-[var(--primary)] flex items-center justify-center">
              <User className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold">{member.name}</h2>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <Badge variant="secondary">
                  {member.role || tx("بدون صلاحية رئيسية")}
                </Badge>
                <div className="flex flex-wrap gap-1">
                  {(member.permissions ?? []).slice(0, 5).map((p) => (
                    <Badge key={p} variant="outline" className="text-[10px]">
                      {permissionLabel(p)}
                    </Badge>
                  ))}
                  {(member.permissions ?? []).length > 5 && (
                    <span className="text-[11px] text-[var(--muted-foreground)]">
                      +{(member.permissions ?? []).length - 5}
                    </span>
                  )}
                  {(member.permissions ?? []).length === 0 && (
                    <span className="text-[11px] text-[var(--muted-foreground)]">
                      {tx("بدون صلاحيات")}
                    </span>
                  )}
                </div>
                {member.frozen ? (
                  <Badge variant="destructive">
                    <Snowflake className="w-3 h-3 ml-1" /> {tx("مجمّد")}
                  </Badge>
                ) : (
                  <Badge variant="default">
                    <BadgeCheck className="w-3 h-3 ml-1" /> {tx("نشط")}
                  </Badge>
                )}
              </div>
            </div>
          </div>
          {!editing && (
            <CanWrite area="employees">
              <Button
                variant="outline"
                size="sm"
                className="h-8 gap-1.5 text-xs"
                onClick={() => {
                  setEditing(true);
                  setEditName(member.name);
                  setEditPermissions(member.permissions ?? []);
                }}
              >
                <Pencil className="w-3.5 h-3.5" /> {tx("تعديل")}
              </Button>
            </CanWrite>
          )}
        </div>

        {editing && (
          <div className="mt-3 space-y-3">
            <div>
              <Label>{tx("الاسم")}</Label>
              <Input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
              />
            </div>
            <div>
              <Label>{tx("الصلاحيات")}</Label>
              <PermissionsSelect
                value={editPermissions}
                onChange={setEditPermissions}
              />
            </div>
            <div className="flex items-center gap-2">
              <Button size="sm" onClick={submitEdit} disabled={saving}>
                {saving ? tx("جاري الحفظ…") : tx("حفظ")}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setEditing(false)}
              >
                {tx("إلغاء")}
              </Button>
            </div>
          </div>
        )}

        {member.frozen && member.freeze_reason && (
          <div className="mt-3 rounded-lg bg-[var(--destructive)]/10 text-[var(--destructive)] text-sm px-3 py-2">
            {tx("سبب التجميد: ")}
            {member.freeze_reason}
          </div>
        )}

        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2">
          <div className="rounded-lg bg-[var(--muted)]/50 px-3 py-2.5">
            <div className="text-xs text-[var(--muted-foreground)] flex items-center gap-1">
              <Hash className="w-3 h-3" /> {tx("الرقم التسلسلي")}
            </div>
            <div
              dir="ltr"
              className="font-mono text-base font-semibold tracking-widest mt-0.5 text-right"
            >
              {member.serial}
            </div>
          </div>
          <div className="rounded-lg bg-[var(--muted)]/50 px-3 py-2.5">
            <div className="text-xs text-[var(--muted-foreground)] flex items-center gap-1">
              <KeyRound className="w-3 h-3" /> {tx("رقم PIN")}
            </div>
            <div className="flex items-center justify-between gap-2 mt-0.5">
              {member.pin_changed ? (
                <span className="text-sm text-[var(--muted-foreground)]">
                  {tx("PIN خاص — غيّره الموظف")}
                </span>
              ) : (
                <>
                  <span
                    dir="ltr"
                    className="font-mono text-base font-semibold tracking-widest"
                  >
                    {showPin ? member.pin : "••••••"}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 gap-1 text-[11px]"
                    onClick={() => setShowPin(!showPin)}
                  >
                    {showPin ? (
                      <EyeOff className="w-3.5 h-3.5" />
                    ) : (
                      <Eye className="w-3.5 h-3.5" />
                    )}
                    {showPin ? tx("إخفاء") : tx("إظهار")}
                  </Button>
                </>
              )}
            </div>
            {!member.pin_changed && (
              <div className="text-[11px] text-[var(--muted-foreground)] mt-1">
                {tx("يظهر PIN لأن الموظف لم يغيّره بعد.")}
              </div>
            )}
          </div>
          <div className="rounded-lg bg-[var(--muted)]/50 px-3 py-2.5">
            <div className="text-xs text-[var(--muted-foreground)]">
              {tx("الإيميل")}
            </div>
            <div className="text-sm font-medium mt-0.5">
              {member.email || tx("لم يضِفه الموظف بعد")}
            </div>
          </div>
          <div className="rounded-lg bg-[var(--muted)]/50 px-3 py-2.5">
            <div className="text-xs text-[var(--muted-foreground)]">
              {tx("الراتب الشهري")}
            </div>
            <div className="text-sm font-bold mt-0.5 text-[var(--primary)]">
              {member.salary ? formatDZD(member.salary) : tx("غير محدد")}
            </div>
          </div>
          <div className="rounded-lg bg-[var(--muted)]/50 px-3 py-2.5">
            <div className="text-xs text-[var(--muted-foreground)]">
              {tx("تاريخ الإنشاء")}
            </div>
            <div className="text-sm font-medium mt-0.5">{created}</div>
          </div>
        </div>
      </Card>

      <Card className="rounded-xl border border-border bg-card p-4">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <h3 className="font-bold text-sm flex items-center gap-1.5">
            <Wallet className="w-4 h-4 text-[var(--primary)]" />
            {tx("الرواتب والسلف")}
          </h3>
          <div className="flex items-center gap-2">
            <CanWrite area="employees">
              <Button
                size="sm"
                className="h-8 gap-1.5 text-xs"
                onClick={() => {
                  setPayForm({
                    amount: payroll?.salary ? String(payroll.salary) : "",
                    method: "نقداً",
                    notes: "",
                  });
                  setPayOpen(true);
                }}
              >
                <HandCoins className="w-3.5 h-3.5" /> {tx("صرف راتب")}
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="h-8 gap-1.5 text-xs"
                onClick={() => {
                  setAdvForm({ amount: "", type: "advance", notes: "" });
                  setAdvOpen(true);
                }}
              >
                <ArrowDownCircle className="w-3.5 h-3.5" /> {tx("سلفة/قرض")}
              </Button>
            </CanWrite>
          </div>
        </div>

        {payLoading && !payroll ? (
          <p className="text-xs text-[var(--muted-foreground)] mt-3">
            {tx("جاري التحميل…")}
          </p>
        ) : payroll ? (
          <div className="mt-3 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <div className="rounded-lg bg-[var(--muted)]/50 px-3 py-2.5">
                <div className="text-xs text-[var(--muted-foreground)]">
                  {tx("الراتب الشهري")}
                </div>
                <div className="text-base font-bold mt-0.5 text-[var(--primary)]">
                  {payroll.salary ? formatDZD(payroll.salary) : tx("غير محدد")}
                </div>
                <div className="mt-1">
                  <Input
                    type="number"
                    className="h-7 text-xs"
                    placeholder={tx("تحديث الراتب")}
                    defaultValue={payroll.salary ? String(payroll.salary) : ""}
                    onBlur={(e) => {
                      const v = e.target.value.trim();
                      if (v !== String(payroll.salary ?? "")) void saveSalary(v);
                    }}
                  />
                </div>
              </div>
              <div className="rounded-lg bg-[var(--muted)]/50 px-3 py-2.5">
                <div className="text-xs text-[var(--muted-foreground)]">
                  {tx("رصيد السلف/القروض (على الموظف)")}
                </div>
                <div
                  className={`text-base font-bold mt-0.5 ${
                    payroll.balance > 0 ? "text-[var(--destructive)]" : "text-[var(--muted-foreground)]"
                  }`}
                >
                  {formatDZD(payroll.balance)}
                </div>
              </div>
              <div className="rounded-lg bg-[var(--muted)]/50 px-3 py-2.5">
                <div className="text-xs text-[var(--muted-foreground)]">
                  {tx("عدد مستحقات الرواتب")}
                </div>
                <div className="text-base font-bold mt-0.5">
                  {payroll.payments.length}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              <div>
                <div className="text-xs font-semibold mb-1.5 flex items-center gap-1">
                  <HandCoins className="w-3.5 h-3.5" /> {tx("مدفوعات الرواتب")}
                </div>
                {payroll.payments.length === 0 ? (
                  <p className="text-xs text-[var(--muted-foreground)]">
                    {tx("لا توجد مدفوعات بعد")}
                  </p>
                ) : (
                  <div className="space-y-1.5">
                    {payroll.payments.slice(0, 8).map((p) => (
                      <div
                        key={p.id}
                        className="flex items-center justify-between gap-2 rounded-lg border border-border px-3 py-2 text-xs"
                      >
                        <div className="flex items-center gap-2">
                          <CalendarDays className="w-3.5 h-3.5 text-[var(--muted-foreground)]" />
                          <div>
                            <div className="font-medium">
                              {formatDZD(p.net_salary)}
                            </div>
                            <div className="text-[var(--muted-foreground)] text-[10px]">
                              {new Date(p.paid_at).toLocaleDateString("ar-DZ")}
                              {p.method ? ` — ${p.method}` : ""}
                            </div>
                          </div>
                        </div>
                        {p.notes && (
                          <span className="text-[var(--muted-foreground)] text-[10px]">
                            {p.notes}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <div className="text-xs font-semibold mb-1.5 flex items-center gap-1">
                  <ArrowDownCircle className="w-3.5 h-3.5" /> {tx("السلف والقروض")}
                </div>
                {payroll.transactions.filter((t) => t.type !== "salary").length === 0 ? (
                  <p className="text-xs text-[var(--muted-foreground)]">
                    {tx("لا توجد سلف أو قروض")}
                  </p>
                ) : (
                  <div className="space-y-1.5">
                    {payroll.transactions
                      .filter((t) => t.type !== "salary")
                      .slice(0, 8)
                      .map((t) => (
                        <div
                          key={t.id}
                          className="flex items-center justify-between gap-2 rounded-lg border border-border px-3 py-2 text-xs"
                        >
                          <div className="flex items-center gap-2">
                            <span
                              className={
                                t.type === "advance" || t.type === "loan"
                                  ? "text-[var(--destructive)]"
                                  : "text-[var(--muted-foreground)]"
                              }
                            >
                              {t.type === "advance"
                                ? tx("سلفة")
                                : t.type === "loan"
                                  ? tx("قرض")
                                  : tx("خصم/سداد")}
                            </span>
                            <span className="text-[var(--muted-foreground)] text-[10px]">
                              {t.date}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            {t.notes && (
                              <span className="text-[var(--muted-foreground)] text-[10px]">
                                {t.notes}
                              </span>
                            )}
                            <span className="font-bold">
                              {formatDZD(t.amount)}
                            </span>
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <p className="text-xs text-[var(--muted-foreground)] mt-3">
            {tx("تعذّر تحميل بيانات الرواتب")}
          </p>
        )}
      </Card>

      <Card className="rounded-xl border border-border bg-card p-4">
        <h3 className="font-bold text-sm">{tx("أداء الموظف")}</h3>
        <p className="text-xs text-[var(--muted-foreground)] mt-1">
          {tx("قريباً: إحصاءات الطلبات والهدر مرتبطة بالموظف.")}
        </p>
      </Card>

      {/* Pay salary dialog */}
      <Dialog open={payOpen} onOpenChange={setPayOpen}>
        <DialogContent dir="rtl" className="max-w-md">
          <DialogHeader>
            <DialogTitle>{tx("صرف راتب")} — {member.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>{tx("المبلغ (دج)")}</Label>
              <Input
                type="number"
                value={payForm.amount}
                onChange={(e) => setPayForm({ ...payForm, amount: e.target.value })}
              />
            </div>
            <div>
              <Label>{tx("طريقة الصرف")}</Label>
              <Select
                value={payForm.method}
                onValueChange={(v) => setPayForm({ ...payForm, method: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {["نقداً", "تحويل بنكي", "شيك"].map((m) => (
                    <SelectItem key={m} value={m}>
                      {m}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>{tx("ملاحظة (اختياري)")}</Label>
              <Input
                value={payForm.notes}
                onChange={(e) => setPayForm({ ...payForm, notes: e.target.value })}
                placeholder={tx("مثال: راتب شهر")}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPayOpen(false)}>
              {tx("إلغاء")}
            </Button>
            <Button onClick={submitPay} disabled={paySaving}>
              {paySaving ? tx("جاري الحفظ…") : tx("صرف")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Advance/loan dialog */}
      <Dialog open={advOpen} onOpenChange={setAdvOpen}>
        <DialogContent dir="rtl" className="max-w-md">
          <DialogHeader>
            <DialogTitle>{tx("سلفة أو قرض")} — {member.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>{tx("النوع")}</Label>
              <Select
                value={advForm.type}
                onValueChange={(v) => setAdvForm({ ...advForm, type: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="advance">{tx("سلفة")}</SelectItem>
                  <SelectItem value="loan">{tx("قرض")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>{tx("المبلغ (دج)")}</Label>
              <Input
                type="number"
                value={advForm.amount}
                onChange={(e) => setAdvForm({ ...advForm, amount: e.target.value })}
              />
            </div>
            <div>
              <Label>{tx("ملاحظة (اختياري)")}</Label>
              <Input
                value={advForm.notes}
                onChange={(e) => setAdvForm({ ...advForm, notes: e.target.value })}
                placeholder={tx("مثال: سلفة للعلاج")}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAdvOpen(false)}>
              {tx("إلغاء")}
            </Button>
            <Button onClick={submitAdvance} disabled={advSaving}>
              {advSaving ? tx("جاري الحفظ…") : tx("تسجيل")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
