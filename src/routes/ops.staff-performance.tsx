import { useEffect, useState, useMemo } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { requireOpsAccess } from "@/lib/permissions";
import { TrendingUp, Users, UtensilsCrossed, Trash2, Loader2, Filter, CalendarDays, Ban } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useRestaurantId, formatDZD } from "@/lib/restaurant";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { tx } from "@/lib/ops-tx";
import { cancelReasonLabel } from "@/lib/order-cancel";

/** One row of the `order_cancellations` audit trail, as selected above. */
type CancellationRow = {
  id: string;
  order_id: string;
  daily_number: number | null;
  cancelled_from_status: string;
  reason: string;
  reason_other: string | null;
  staff_id: string | null;
  staff_name: string | null;
  staff_role: string | null;
  generated_waste: boolean;
  estimated_cost: number | null;
  created_at: string;
};

/** Arabic stage labels for the "cancelled from" column. */
const CANCEL_STAGE_LABELS: Record<string, string> = {
  new: "جديدة",
  preparing: "قيد التحضير",
  ready: "جاهزة",
  served: "مقدّمة",
};


export const Route = createFileRoute("/ops/staff-performance")({
  beforeLoad: requireOpsAccess("staffPerformance"),
  component: OpsStaffPerformance,
});

type StaffPerf = {
  id: string;
  name: string;
  role: string;
  days_present: number;
  dishes_count: number;
  orders_served: number;
  orders_prepared: number;
  avg_prep_min: number | null;
  waste_logged: number;
  waste_cost: number;
  /** Orders voided before the dish was ready, i.e. staff-time losses. */
  orders_cancelled: number;
  cancellations: CancellationRow[];
};

const ROLE_COLORS: Record<string, string> = {
  "نادل": "bg-[#3D6F9E]/10 text-[#3D6F9E] border border-[#3D6F9E]/20",
  "مطبخ": "bg-warning/10 text-warning border border-warning/20",
  "كاشير": "bg-success/10 text-success border border-success/20",
  "استقبال": "bg-primary/10 text-primary border border-primary/20",
};

function startOfMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function OpsStaffPerformance() {
  const { restaurantId } = useRestaurantId();


  const [staff, setStaff] = useState<StaffPerf[]>([]);
  const [loading, setLoading] = useState(true);
  const [from, setFrom] = useState(startOfMonth());
  const [to, setTo] = useState(today());

  useEffect(() => {
    if (restaurantId === undefined) return;
    if (!restaurantId) {
      setLoading(false);
      return;
    }
    let cancel = false;
    (async () => {
      setLoading(true);

      // 1. Get all staff
      const { data: staffRows } = await supabase
        .from("staff")
        .select("*")
        .eq("restaurant_id", restaurantId);
      if (cancel) return;

      // 2. Get orders served per staff (served_by field)
      const { data: orders } = await supabase
        .from("orders")
        .select("served_by")
        .eq("restaurant_id", restaurantId)
        .eq("status", "paid")
        .gte("created_at", from + "T00:00:00")
        .lte("created_at", to + "T23:59:59");

      const servedCounts = new Map<string, number>();
      for (const o of orders ?? []) {
        const sb = (o as any).served_by;
        if (sb) servedCounts.set(sb, (servedCounts.get(sb) ?? 0) + 1);
      }

      // 3. Get orders prepared per chef (chef_id + prep times)
      const { data: kitchenOrders } = await supabase
        .from("orders")
        .select("chef_id, started_at, ready_at")
        .eq("restaurant_id", restaurantId)
        .gte("started_at", from + "T00:00:00")
        .lte("started_at", to + "T23:59:59");

      const prepByStaff = new Map<string, { count: number; totalSec: number }>();
      for (const o of kitchenOrders ?? []) {
        const cid = (o as any).chef_id;
        const ready = (o as any).ready_at;
        const started = (o as any).started_at;
        if (!cid || !ready || !started) continue;
        const prev = prepByStaff.get(cid) ?? { count: 0, totalSec: 0 };
        prev.count++;
        prev.totalSec +=
          (new Date(ready).getTime() - new Date(started).getTime()) / 1000;
        prepByStaff.set(cid, prev);
      }

      // 4. Cancellations: the audit trail written by `order-cancel.functions`.
      //    `generated_waste === false` rows are the ones that cost staff time
      //    rather than food, so those are the ones reported on this screen.
      const { data: cancelRows } = await supabase
        .from("order_cancellations")
        .select(
          "id,order_id,daily_number,cancelled_from_status,reason,reason_other,staff_id,staff_name,staff_role,generated_waste,estimated_cost,created_at",
        )
        .eq("restaurant_id", restaurantId)
        .eq("generated_waste", false)
        .gte("created_at", from + "T00:00:00")
        .lte("created_at", to + "T23:59:59");

      const cancelsByStaff = new Map<string, { count: number; rows: CancellationRow[] }>();
      for (const c of (cancelRows ?? []) as unknown as CancellationRow[]) {
        const key = c.staff_id || c.staff_name || "";
        const prev = cancelsByStaff.get(key) ?? { count: 0, rows: [] };
        prev.count++;
        prev.rows.push(c);
        cancelsByStaff.set(key, prev);
      }

      // 5. Get waste logged per staff (logged_by field)
      const { data: wasteRows } = await supabase
        .from("waste_logs")
        .select("logged_by,cost")
        .eq("restaurant_id", restaurantId)
        .gte("created_at", from + "T00:00:00")
        .lte("created_at", to + "T23:59:59");

      const wasteByStaff = new Map<string, { count: number; cost: number }>();
      for (const w of wasteRows ?? []) {
        const lb = (w as any).logged_by;
        if (lb) {
          const prev = wasteByStaff.get(lb) ?? { count: 0, cost: 0 };
          prev.count++;
          prev.cost += Number((w as any).cost ?? 0);
          wasteByStaff.set(lb, prev);
        }
      }

      // 6. Get attendance & dishes per staff
      const { data: attendanceRows } = await supabase
        .from("staff_attendance")
        .select("staff_id, date, status, dishes_count")
        .eq("restaurant_id", restaurantId)
        .gte("date", from)
        .lte("date", to);

      const attendanceByStaff = new Map<string, { daysPresent: number; totalDishes: number }>();
      for (const a of attendanceRows ?? []) {
        const sid = (a as any).staff_id;
        if (!sid) continue;
        const prev = attendanceByStaff.get(sid) ?? { daysPresent: 0, totalDishes: 0 };
        if (a.status === "confirmed" || a.status === "checked_in") {
          prev.daysPresent++;
        }
        prev.totalDishes += Number(a.dishes_count) || 0;
        attendanceByStaff.set(sid, prev);
      }

      const result: StaffPerf[] = (staffRows ?? []).map((s: any) => {
        const name = s.name as string;
        const waste = wasteByStaff.get(name) ?? { count: 0, cost: 0 };
        const prep = prepByStaff.get(s.id as string);
        const att = attendanceByStaff.get(s.id as string) ?? { daysPresent: 0, totalDishes: 0 };
        const cancels =
          cancelsByStaff.get(s.id as string) ?? cancelsByStaff.get(name) ?? { count: 0, rows: [] };
        return {
          id: s.id,
          name,
          role: s.role ?? "",
          days_present: att.daysPresent,
          dishes_count: att.totalDishes,
          orders_cancelled: cancels.count,
          cancellations: cancels.rows,
          orders_served: servedCounts.get(s.id) ?? 0,
          orders_prepared: prep?.count ?? 0,
          avg_prep_min: prep && prep.count > 0 ? prep.totalSec / prep.count / 60 : null,
          waste_logged: waste.count,
          waste_cost: waste.cost,
        };
      });

      result.sort((a, b) => b.dishes_count - a.dishes_count || b.orders_served - a.orders_served);
      setStaff(result);
      setLoading(false);
    })();
    return () => { cancel = true; };
  }, [restaurantId, from, to]);

  const totalDishes = staff.reduce((s, st) => s + st.dishes_count, 0);
  const allCancellations = staff
    .flatMap((st) => st.cancellations)
    .sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    );

  return (
    <div className="p-2 space-y-4" dir="rtl">
      <div className="flex items-center gap-2">
        <TrendingUp className="w-5 h-5 text-[var(--primary)]" />
        <h1 className="text-lg font-bold">{tx("أداء الموظفين")}</h1>
      </div>

      {/* Date Range */}
      <Card className="p-3">
        <div className="flex flex-wrap items-center gap-2">
          <Filter className="w-4 h-4 text-[var(--muted-foreground)]" />
          <span className="text-xs font-medium">{tx("من")}</span>
          <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="h-8 w-32 text-xs" />
          <span className="text-xs font-medium">{tx("إلى")}</span>
          <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="h-8 w-32 text-xs" />
        </div>
      </Card>

      {/* Summary Cards */}
      <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
        <Card className="p-3 text-center">
          <Users className="w-4 h-4 mx-auto text-[var(--primary)] mb-1" />
          <div className="text-xs text-[var(--muted-foreground)]">{tx("عدد الموظفين")}</div>
          <div className="text-lg font-bold">{staff.length}</div>
        </Card>
        <Card className="p-3 text-center">
          <UtensilsCrossed className="w-4 h-4 mx-auto text-emerald-600 mb-1" />
          <div className="text-xs text-[var(--muted-foreground)]">{tx("إجمالي الأطباق المنجزة")}</div>
          <div className="text-lg font-bold text-emerald-600">{totalDishes}</div>
        </Card>
        <Card className="p-3 text-center">
          <UtensilsCrossed className="w-4 h-4 mx-auto text-blue-500 mb-1" />
          <div className="text-xs text-[var(--muted-foreground)]">{tx("الطلبات المُقدّمة")}</div>
          <div className="text-lg font-bold">{staff.reduce((s, st) => s + st.orders_served, 0)}</div>
        </Card>
        <Card className="p-3 text-center">
          <Trash2 className="w-4 h-4 mx-auto text-red-500 mb-1" />
          <div className="text-xs text-[var(--muted-foreground)]">{tx("الهدر المسجّل")}</div>
          <div className="text-lg font-bold">{staff.reduce((s, st) => s + st.waste_logged, 0)}</div>
        </Card>
      </div>

      {/* Table */}
      <Card>
        {loading ? (
          <div className="p-8 flex items-center justify-center">
            <Loader2 className="w-5 h-5 animate-spin text-[var(--muted-foreground)]" />
          </div>
        ) : staff.length === 0 ? (
          <div className="p-8 text-center text-sm text-[var(--muted-foreground)]">
            {tx("لا يوجد موظفين")}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">{tx("الموظف")}</TableHead>
                  <TableHead className="text-xs">{tx("الدور")}</TableHead>
                  <TableHead className="text-xs text-left">{tx("أيام الحضور")}</TableHead>
                  <TableHead className="text-xs text-left">{tx("الأطباق المنجزة")}</TableHead>
                  <TableHead className="text-xs text-left">{tx("طلبات مُقدّمة")}</TableHead>
                  <TableHead className="text-xs text-left">{tx("طلبات حضّرها")}</TableHead>
                  <TableHead className="text-xs text-left">{tx("طلبات ألغاها")}</TableHead>
                  <TableHead className="text-xs text-left">{tx("متوسط وقت التحضير")}</TableHead>
                  <TableHead className="text-xs text-left">{tx("هدر مسجّل")}</TableHead>
                  <TableHead className="text-xs text-left">{tx("تكلفة الهدر")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {staff.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="text-sm font-medium">{s.name}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className={`text-[10px] ${ROLE_COLORS[s.role] ?? ""}`}>
                        {s.role}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-left tabular-nums">
                      <span className="font-semibold text-emerald-600">{s.days_present}</span> {tx("يوم")}
                    </TableCell>
                    <TableCell className="text-xs font-bold text-left tabular-nums text-[var(--primary)]">
                      {s.dishes_count > 0 ? (
                        <span className="flex items-center gap-1 justify-end">
                          <UtensilsCrossed className="w-3 h-3" />
                          {s.dishes_count}
                        </span>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell className="text-xs font-bold text-left tabular-nums">{s.orders_served}</TableCell>
                    <TableCell className="text-xs font-bold text-left tabular-nums">
                      {s.orders_prepared > 0 ? s.orders_prepared : "—"}
                    </TableCell>
                    <TableCell
                      className={`text-xs font-bold text-left tabular-nums ${
                        s.orders_cancelled > 0 ? "text-destructive" : ""
                      }`}
                    >
                      {s.orders_cancelled > 0 ? s.orders_cancelled : "—"}
                    </TableCell>
                    <TableCell className="text-xs text-left tabular-nums">
                      {s.avg_prep_min !== null
                        ? `${s.avg_prep_min.toFixed(1)} ${tx("دقيقة")}`
                        : "—"}
                    </TableCell>
                    <TableCell className="text-xs text-left tabular-nums">{s.waste_logged}</TableCell>
                    <TableCell className="text-xs text-left tabular-nums text-red-600">
                      {s.waste_cost > 0 ? formatDZD(s.waste_cost) : "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>

      {/* Cancellations log — who voided which order, from which stage, why. */}
      <Card>
        <div className="p-3 border-b border-[var(--border)] flex items-center gap-2">
          <Ban className="w-4 h-4 text-destructive" />
          <h2 className="text-sm font-bold">{tx("سجل الطلبات الملغاة")}</h2>
          <span className="text-[10px] text-[var(--muted-foreground)]">
            {tx("التي أُلغيت قبل جاهزيتها — تظهر في سجل الهدر غيرها")}
          </span>
        </div>
        {loading ? (
          <div className="p-8 flex items-center justify-center">
            <Loader2 className="w-5 h-5 animate-spin text-[var(--muted-foreground)]" />
          </div>
        ) : allCancellations.length === 0 ? (
          <div className="p-8 text-center text-sm text-[var(--muted-foreground)]">
            {tx("لا توجد طلبات ملغاة في هذه الفترة")}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">{tx("الموظف")}</TableHead>
                  <TableHead className="text-xs text-left">{tx("رقم الطلبية")}</TableHead>
                  <TableHead className="text-xs text-left">{tx("أُلغيت من")}</TableHead>
                  <TableHead className="text-xs text-left">{tx("السبب")}</TableHead>
                  <TableHead className="text-xs text-left">{tx("التكلفة التقديرية")}</TableHead>
                  <TableHead className="text-xs text-left">{tx("التاريخ")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {allCancellations.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="text-sm font-medium">
                      {c.staff_name ?? "—"}
                      {c.staff_role && (
                        <span className="text-[10px] text-[var(--muted-foreground)]">
                          {" "}· {c.staff_role}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-left font-mono tabular-nums">
                      {c.daily_number != null ? `#${c.daily_number}` : c.order_id.slice(-6)}
                    </TableCell>
                    <TableCell className="text-xs text-left">
                      {CANCEL_STAGE_LABELS[c.cancelled_from_status] ??
                        c.cancelled_from_status}
                    </TableCell>
                    <TableCell className="text-xs text-left">
                      {cancelReasonLabel(c.reason)}
                      {c.reason_other ? `: ${c.reason_other}` : ""}
                    </TableCell>
                    <TableCell className="text-xs text-left tabular-nums text-muted-foreground">
                      {Number(c.estimated_cost ?? 0) > 0
                        ? formatDZD(Number(c.estimated_cost))
                        : "—"}
                    </TableCell>
                    <TableCell className="text-xs text-left tabular-nums text-muted-foreground">
                      {c.created_at
                        ? new Date(c.created_at).toLocaleString("ar-DZ", {
                            dateStyle: "short",
                            timeStyle: "short",
                          })
                        : "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>
    </div>
  );
}
