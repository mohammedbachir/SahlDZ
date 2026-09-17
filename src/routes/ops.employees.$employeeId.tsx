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
} from "lucide-react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { getFirebaseDb } from "@/integrations/firebase/config";
import { useRestaurantId } from "@/lib/restaurant";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PermissionsSelect } from "@/components/permissions-select";
import { permissionLabel } from "@/lib/staff-permissions";
import { tx } from "@/lib/ops-tx";
import {
  listStaff,
  updateStaff,
  type StaffRecord,
} from "@/lib/staff.functions";
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
              {tx("تاريخ الإنشاء")}
            </div>
            <div className="text-sm font-medium mt-0.5">{created}</div>
          </div>
        </div>
      </Card>

      <Card className="rounded-xl border border-border bg-card p-4">
        <h3 className="font-bold text-sm">{tx("أداء الموظف")}</h3>
        <p className="text-xs text-[var(--muted-foreground)] mt-1">
          {tx("قريباً: سجلات الأداء، الرواتب، والسحب المالي.")}
        </p>
      </Card>
    </div>
  );
}
