import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Eye, EyeOff, BadgeCheck, Snowflake, User, KeyRound, Hash, Pencil } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useRestaurantId } from "@/lib/restaurant";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { tx } from "@/lib/ops-tx";
import { useTranslation } from "react-i18next";

export const Route = createFileRoute("/ops/employees/$employeeId")({
  component: EmployeeInfo,
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

const GLOBAL_ROLES = ["كاشير", "نادل", "مطبخ", "استقبال"];

function EmployeeInfo() {
  useTranslation();
  const { employeeId } = Route.useParams();
  const { restaurantId, loading: restaurantLoading } = useRestaurantId();
  const [member, setMember] = useState<StaffMember | null>(null);
  const [customRoles, setCustomRoles] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPin, setShowPin] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editRole, setEditRole] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (restaurantLoading) return;
      const [{ data: staff }, { data: roles }] = await Promise.all([
        supabase.from("staff").select("*").eq("id", employeeId).single(),
        supabase.from("roles").select("id,name").eq("restaurant_id", restaurantId ?? ""),
      ]);
      if (!cancelled) {
        setMember((staff as StaffMember) ?? null);
        setCustomRoles((roles as { id: string; name: string }[]) ?? []);
        setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [employeeId, restaurantId, restaurantLoading]);

  const allRoles = [...GLOBAL_ROLES, ...customRoles.map((r) => r.name)];

  const submitEdit = async () => {
    if (!member || !restaurantId) return;
    if (!editName.trim()) return toast.error(tx("أدخل اسم الموظف"));
    setSaving(true);
    const { error } = await supabase
      .from("staff")
      .update({ name: editName.trim(), role: editRole })
      .eq("id", member.id);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success(tx("تم تعديل الموظف"));
    setMember({ ...member, name: editName.trim(), role: editRole });
    setEditing(false);
  };

  if (loading) {
    return <div className="text-center py-12 text-[var(--muted-foreground)] text-sm">{tx("جاري التحميل…")}</div>;
  }

  if (!member) {
    return (
      <div className="p-2 space-y-3" dir="rtl">
        <Link to="/ops/employees" className="inline-flex items-center gap-1 text-sm text-[var(--muted-foreground)] hover:text-[var(--primary)]">
          <ArrowRight className="w-4 h-4" /> {tx("عودة للموظفين")}
        </Link>
        <Card className="p-8 text-center text-[var(--muted-foreground)]">{tx("لم يتم العثور على الموظف.")}</Card>
      </div>
    );
  }

  const created = member.created_at ? new Date(member.created_at).toLocaleDateString("ar-DZ") : "—";

  return (
    <div className="p-2 space-y-3" dir="rtl">
      <Link to="/ops/employees" className="inline-flex items-center gap-1 text-sm text-[var(--muted-foreground)] hover:text-[var(--primary)]">
        <ArrowRight className="w-4 h-4" /> {tx("عودة للموظفين")}
      </Link>

      <Card className="rounded-2xl glass shadow-glass border-border/60 p-4">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-[var(--primary)]/10 text-[var(--primary)] flex items-center justify-center">
              <User className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold">{member.name}</h2>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="secondary">{member.role}</Badge>
                {member.frozen ? (
                  <Badge variant="destructive"><Snowflake className="w-3 h-3 ml-1" /> {tx("مجمّد")}</Badge>
                ) : (
                  <Badge variant="default"><BadgeCheck className="w-3 h-3 ml-1" /> {tx("نشط")}</Badge>
                )}
              </div>
            </div>
          </div>
          {!editing && (
            <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs" onClick={() => { setEditing(true); setEditName(member.name); setEditRole(member.role); }}>
              <Pencil className="w-3.5 h-3.5" /> {tx("تعديل")}
            </Button>
          )}
        </div>

        {editing && (
          <div className="mt-3 flex items-end gap-2 flex-wrap">
            <div>
              <label className="text-xs text-[var(--muted-foreground)]">{tx("الاسم")}</label>
              <input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="mt-1 h-9 rounded-md border border-input bg-transparent px-3 text-sm"
              />
            </div>
            <div>
              <label className="text-xs text-[var(--muted-foreground)]">{tx("الدور")}</label>
              <select
                value={editRole}
                onChange={(e) => setEditRole(e.target.value)}
                className="mt-1 h-9 rounded-md border border-input bg-transparent px-3 text-sm"
              >
                {allRoles.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>
            <Button size="sm" onClick={submitEdit} disabled={saving}>{saving ? tx("جاري الحفظ…") : tx("حفظ")}</Button>
            <Button size="sm" variant="outline" onClick={() => setEditing(false)}>{tx("إلغاء")}</Button>
          </div>
        )}

        {member.frozen && member.freeze_reason && (
          <div className="mt-3 rounded-lg bg-[var(--destructive)]/10 text-[var(--destructive)] text-sm px-3 py-2">
            {tx("سبب التجميد: ")}{member.freeze_reason}
          </div>
        )}

        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2">
          <div className="rounded-lg bg-[var(--muted)]/50 px-3 py-2.5">
            <div className="text-xs text-[var(--muted-foreground)] flex items-center gap-1">
              <Hash className="w-3 h-3" /> {tx("الرقم التسلسلي")}
            </div>
            <div dir="ltr" className="font-mono text-base font-semibold tracking-widest mt-0.5 text-right">{member.serial}</div>
          </div>
          <div className="rounded-lg bg-[var(--muted)]/50 px-3 py-2.5">
            <div className="text-xs text-[var(--muted-foreground)] flex items-center gap-1">
              <KeyRound className="w-3 h-3" /> {tx("رقم PIN")}
            </div>
            <div className="flex items-center justify-between gap-2 mt-0.5">
              {member.pin_changed ? (
                <span className="text-sm text-[var(--muted-foreground)]">{tx("PIN خاص — غيّره الموظف")}</span>
              ) : (
                <>
                  <span dir="ltr" className="font-mono text-base font-semibold tracking-widest">
                    {showPin ? member.pin : "••••••"}
                  </span>
                  <Button variant="ghost" size="sm" className="h-7 gap-1 text-[11px]" onClick={() => setShowPin(!showPin)}>
                    {showPin ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    {showPin ? tx("إخفاء") : tx("إظهار")}
                  </Button>
                </>
              )}
            </div>
            {!member.pin_changed && (
              <div className="text-[11px] text-[var(--muted-foreground)] mt-1">{tx("يظهر PIN لأن الموظف لم يغيّره بعد.")}</div>
            )}
          </div>
          <div className="rounded-lg bg-[var(--muted)]/50 px-3 py-2.5">
            <div className="text-xs text-[var(--muted-foreground)]">{tx("الإيميل")}</div>
            <div className="text-sm font-medium mt-0.5">{member.email || tx("لم يضِفه الموظف بعد")}</div>
          </div>
          <div className="rounded-lg bg-[var(--muted)]/50 px-3 py-2.5">
            <div className="text-xs text-[var(--muted-foreground)]">{tx("تاريخ الإنشاء")}</div>
            <div className="text-sm font-medium mt-0.5">{created}</div>
          </div>
        </div>
      </Card>

      <Card className="rounded-2xl glass shadow-glass border-border/60 p-4">
        <h3 className="font-bold text-sm">{tx("أداء الموظف")}</h3>
        <p className="text-xs text-[var(--muted-foreground)] mt-1">{tx("قريباً: سجلات الأداء، الرواتب، والسحب المالي.")}</p>
      </Card>
    </div>
  );
}
