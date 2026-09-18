import { createServerFn } from "@tanstack/react-start";
import { getRequestHeader } from "@tanstack/react-start/server";
import { supabase } from "@/integrations/supabase/client";
import { getFirebaseDb } from "@/integrations/firebase/config";
import { requireRestaurantId } from "@/lib/server-staff-auth";

export type PayrollPayment = {
  id: string;
  employee_id: string;
  net_salary: number;
  paid_at: string;
  method: string | null;
  notes: string | null;
};

export type PayrollTx = {
  id: string;
  employee_id: string;
  type: "advance" | "loan" | "loan_repayment" | "salary";
  amount: number;
  date: string;
  notes: string | null;
};

// ─── DB logic ───────────────────────────────────────────────────

export async function employeePayrollCore(
  rid: string,
  employeeId: string,
): Promise<{
  salary: number | null;
  payments: PayrollPayment[];
  transactions: PayrollTx[];
  balance: number;
}> {
  const [staffRow, payRes, txRes] = await Promise.all([
    supabase.from("staff").select("salary").eq("id", employeeId).maybeSingle(),
    supabase
      .from("employee_salary_payments")
      .select("id, employee_id, net_salary, paid_at, method, notes")
      .eq("employee_id", employeeId)
      .order("paid_at", { ascending: false }),
    supabase
      .from("staff_transactions")
      .select("id, employee_id, type, amount, date, notes")
      .eq("employee_id", employeeId)
      .order("date", { ascending: false }),
  ]);

  if (payRes.error) throw new Error(payRes.error.message);
  if (txRes.error) throw new Error(txRes.error.message);

  const payments: PayrollPayment[] = (payRes.data ?? []).map((p: any) => ({
    id: p.id,
    employee_id: p.employee_id,
    net_salary: Number(p.net_salary || 0),
    paid_at: p.paid_at,
    method: p.method ?? null,
    notes: p.notes ?? null,
  }));

  const transactions: PayrollTx[] = (txRes.data ?? []).map((t: any) => ({
    id: t.id,
    employee_id: t.employee_id,
    type: t.type,
    amount: Number(t.amount || 0),
    date: t.date,
    notes: t.notes ?? null,
  }));

  // Balance = what the employer is owed by the employee
  // (advances + loans) minus repayments/deductions.
  const balance = transactions.reduce((sum, t) => {
    if (t.type === "advance" || t.type === "loan") return sum + t.amount;
    if (t.type === "loan_repayment") return sum - t.amount;
    return sum;
  }, 0);

  return {
    salary: Number((staffRow.data as any)?.salary ?? 0) || null,
    payments,
    transactions,
    balance,
  };
}

export async function payEmployeeSalaryCore(
  rid: string,
  employeeId: string,
  entry: { amount: number; method?: string | null; notes?: string | null },
): Promise<{ ok: boolean; paymentId?: string; error?: string }> {
  const amount = Math.round(Number(entry.amount || 0) * 100) / 100;
  if (amount <= 0) return { ok: false, error: "أدخل مبلغاً صحيحاً" };

  const { data: payment, error } = await supabase
    .from("employee_salary_payments")
    .insert({
      restaurant_id: rid,
      employee_id: employeeId,
      net_salary: amount,
      paid_at: new Date().toISOString(),
      method: entry.method?.trim() || null,
      notes: entry.notes?.trim() || null,
    })
    .select("id")
    .single();

  if (error || !payment) {
    return { ok: false, error: error?.message ?? "فشل تسجيل الراتب" };
  }

  const today = new Date().toISOString().slice(0, 10);
  await supabase.from("staff_transactions").insert({
    restaurant_id: rid,
    employee_id: employeeId,
    type: "salary",
    amount,
    date: today,
    notes: entry.notes?.trim() || "صرف راتب",
  });

  return { ok: true, paymentId: payment.id };
}

export async function recordStaffAdvanceCore(
  rid: string,
  employeeId: string,
  entry: { amount: number; type?: "advance" | "loan"; notes?: string | null },
): Promise<{ ok: boolean; error?: string }> {
  const amount = Math.round(Number(entry.amount || 0) * 100) / 100;
  if (amount <= 0) return { ok: false, error: "أدخل مبلغاً صحيحاً" };

  const { error } = await supabase.from("staff_transactions").insert({
    restaurant_id: rid,
    employee_id: employeeId,
    type: entry.type === "loan" ? "loan" : "advance",
    amount,
    date: new Date().toISOString().slice(0, 10),
    notes:
      entry.notes?.trim() ||
      (entry.type === "loan" ? "قرض للموظف" : "سلفة للموظف"),
  });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function saveStaffSalaryCore(
  rid: string,
  employeeId: string,
  salary: number | null,
): Promise<{ ok: boolean; error?: string }> {
  const { error } = await supabase
    .from("staff")
    .update({ salary: salary ?? null })
    .eq("id", employeeId)
    .eq("restaurant_id", rid);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

// ─── Server function bindings ───────────────────────────────────

function mockPayroll(employeeId: string) {
  return {
    salary: employeeId === "s1" ? 32000 : employeeId === "s2" ? 28000 : 26000,
    payments: [
      {
        id: "p1",
        employee_id: employeeId,
        net_salary: 30000,
        paid_at: new Date().toISOString(),
        method: "نقداً",
        notes: "راتب الشهر",
      },
    ],
    transactions: [
      {
        id: "t1",
        employee_id: employeeId,
        type: "advance" as const,
        amount: 5000,
        date: new Date().toISOString().slice(0, 10),
        notes: "سلفة",
      },
    ],
    balance: 5000,
  };
}

export const employeePayroll = createServerFn({ method: "POST" })
  .validator((d: { employeeId: string }) => d)
  .handler(async ({ data }) => {
    if (!getFirebaseDb()) return mockPayroll(data.employeeId);
    const rid = await requireRestaurantId(getRequestHeader("authorization"));
    return employeePayrollCore(rid, data.employeeId);
  });

export const payEmployeeSalary = createServerFn({ method: "POST" })
  .validator(
    (d: {
      employeeId: string;
      amount: number;
      method?: string | null;
      notes?: string | null;
    }) => d,
  )
  .handler(async ({ data }) => {
    if (!getFirebaseDb()) return { ok: true };
    const rid = await requireRestaurantId(getRequestHeader("authorization"));
    return payEmployeeSalaryCore(rid, data.employeeId, data);
  });

export const recordStaffAdvance = createServerFn({ method: "POST" })
  .validator(
    (d: {
      employeeId: string;
      amount: number;
      type?: "advance" | "loan";
      notes?: string | null;
    }) => d,
  )
  .handler(async ({ data }) => {
    if (!getFirebaseDb()) return { ok: true };
    const rid = await requireRestaurantId(getRequestHeader("authorization"));
    return recordStaffAdvanceCore(rid, data.employeeId, data);
  });

export const saveStaffSalary = createServerFn({ method: "POST" })
  .validator((d: { employeeId: string; salary: number | null }) => d)
  .handler(async ({ data }) => {
    if (!getFirebaseDb()) return { ok: true };
    const rid = await requireRestaurantId(getRequestHeader("authorization"));
    return saveStaffSalaryCore(rid, data.employeeId, data.salary);
  });
