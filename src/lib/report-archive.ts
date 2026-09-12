import { supabase } from "@/integrations/supabase/client";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import {
  loadAccountingReport,
  type AccountingReport,
} from "@/lib/accounting-data";
import {
  buildAccountingPDF,
  downloadDataUrl,
  type AccountingExportPayload,
} from "@/lib/exportReports";

export type ReportType = "accounting" | "reports" | "staff_performance";

export type ArchivedReport = {
  id: string;
  restaurant_id: string;
  restaurant_name: string;
  type: ReportType;
  month: string;
  generated_at: string;
  summary: Record<string, unknown>;
  pdf: string;
};

export const REPORT_LABELS: Record<ReportType, string> = {
  accounting: "المحاسبة (ربح وخسارة)",
  reports: "التقارير (إيرادات ومصاريف)",
  staff_performance: "أداء الموظفين",
};

const fmt = (n: number) =>
  new Intl.NumberFormat("ar-DZ", { maximumFractionDigits: 2 }).format(n);

const sum = (arr: Array<{ [k: string]: any }>, key: string) =>
  arr.reduce((s, x) => s + Number(x[key] ?? 0), 0);

async function safeFetch<T extends any[]>(
  builder: () => Promise<{ data: any; error: any }>,
): Promise<T> {
  try {
    const { data, error } = await builder();
    if (error) {
      console.warn("[report-archive] query failed", error);
      return [] as unknown as T;
    }
    return (data ?? []) as T;
  } catch (e) {
    console.warn("[report-archive] query threw", e);
    return [] as unknown as T;
  }
}

export function monthKey(d: Date = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function monthLabel(mk: string): string {
  const [y, m] = mk.split("-").map(Number);
  const names = [
    "يناير",
    "فبراير",
    "مارس",
    "أبريل",
    "مايو",
    "يونيو",
    "يوليو",
    "أغسطس",
    "سبتمبر",
    "أكتوبر",
    "نوفمبر",
    "ديسمبر",
  ];
  return `${names[m - 1]} ${y}`;
}

function monthRange(mk: string): { from: string; to: string } {
  const [y, m] = mk.split("-").map(Number);
  const lastDay = new Date(y, m, 0).getDate();
  return {
    from: `${y}-${String(m).padStart(2, "0")}-01`,
    to: `${y}-${String(m).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`,
  };
}

function timestampNow(): string {
  return new Date().toISOString();
}

function sanitizeFilename(name: string): string {
  return (name || "report").replace(/[^\w\u0600-\u06FF-]+/g, "_");
}

// ─── PDF builders ────────────────────────────────────────────────

function buildReportsPDF(opts: {
  restaurantName: string;
  month: string;
  revenue: number;
  ordersCount: number;
  purchases: number;
  salaries: number;
  wasteCost: number;
  totalExpenses: number;
  netProfit: number;
  avgOrder: number;
}): string {
  const doc = new jsPDF();
  doc.setFontSize(16);
  doc.text(opts.restaurantName || "تقرير الفترة", 105, 18, { align: "center" });
  doc.setFontSize(11);
  doc.text(monthLabel(opts.month), 105, 26, { align: "center" });

  autoTable(doc, {
    head: [["البند", "القيمة (دج)"]],
    body: [
      ["الإيرادات", fmt(opts.revenue)],
      ["عدد الطلبات", String(opts.ordersCount)],
      ["متوسط الطلب", fmt(opts.avgOrder)],
      ["المشتريات", fmt(opts.purchases)],
      ["الرواتب", fmt(opts.salaries)],
      ["الهدر", fmt(opts.wasteCost)],
      ["إجمالي المصروفات", fmt(opts.totalExpenses)],
      ["صافي الربح", fmt(opts.netProfit)],
    ],
    startY: 34,
  });

  return doc.output("dataurlstring");
}

function buildStaffPerformancePDF(opts: {
  restaurantName: string;
  month: string;
  rows: {
    name: string;
    role: string;
    orders_served: number;
    waste_logged: number;
    waste_cost: number;
  }[];
}): string {
  const doc = new jsPDF();
  doc.setFontSize(16);
  doc.text(opts.restaurantName || "أداء الموظفين", 105, 18, {
    align: "center",
  });
  doc.setFontSize(11);
  doc.text(monthLabel(opts.month), 105, 26, { align: "center" });

  const totalOrders = opts.rows.reduce((s, r) => s + r.orders_served, 0);
  const totalWaste = opts.rows.reduce((s, r) => s + r.waste_logged, 0);

  autoTable(doc, {
    head: [["الموظف", "الدور", "طلبات مقدّمة", "هدر مسجّل", "تكلفة الهدر"]],
    body: [
      ...opts.rows.map((r) => [
        r.name,
        r.role,
        String(r.orders_served),
        String(r.waste_logged),
        fmt(r.waste_cost),
      ]),
      [
        "",
        "الإجمالي",
        String(totalOrders),
        String(totalWaste),
        fmt(opts.rows.reduce((s, r) => s + r.waste_cost, 0)),
      ],
    ],
    startY: 34,
    styles: { fontSize: 9 },
  });

  return doc.output("dataurlstring");
}

// ─── Data loaders ────────────────────────────────────────────────

async function loadReportsData(restaurantId: string, mk: string) {
  const { from, to } = monthRange(mk);
  const [orders, purchases, salaries, waste] = await Promise.all([
    safeFetch<any[]>(() =>
      supabase
        .from("orders")
        .select("total")
        .eq("restaurant_id", restaurantId)
        .eq("status", "paid")
        .gte("created_at", from + "T00:00:00")
        .lte("created_at", to + "T23:59:59"),
    ),
    safeFetch<any[]>(() =>
      supabase
        .from("purchase_orders")
        .select("total")
        .eq("restaurant_id", restaurantId)
        .gte("created_at", from + "T00:00:00")
        .lte("created_at", to + "T23:59:59"),
    ),
    safeFetch<any[]>(() =>
      supabase
        .from("employee_salary_payments")
        .select("net_salary")
        .eq("restaurant_id", restaurantId)
        .gte("paid_at", from + "T00:00:00")
        .lte("paid_at", to + "T23:59:59"),
    ),
    safeFetch<any[]>(() =>
      supabase
        .from("waste_logs")
        .select("cost")
        .eq("restaurant_id", restaurantId)
        .gte("created_at", from + "T00:00:00")
        .lte("created_at", to + "T23:59:59"),
    ),
  ]);

  const revenue = sum(orders, "total");
  const ordersCount = orders.length;
  const purchasesVal = sum(purchases, "total");
  const salariesVal = sum(salaries, "net_salary");
  const wasteVal = sum(waste, "cost");
  const totalExpenses = purchasesVal + salariesVal + wasteVal;
  const netProfit = revenue - totalExpenses;
  const avgOrder = ordersCount ? Math.round(revenue / ordersCount) : 0;

  return {
    revenue,
    ordersCount,
    purchases: purchasesVal,
    salaries: salariesVal,
    wasteCost: wasteVal,
    totalExpenses,
    netProfit,
    avgOrder,
  };
}

async function loadStaffPerformanceData(restaurantId: string, mk: string) {
  const { from, to } = monthRange(mk);

  const staffRows = await safeFetch<any[]>(() =>
    supabase
      .from("staff")
      .select("id,name,role")
      .eq("restaurant_id", restaurantId),
  );
  const orders = await safeFetch<any[]>(() =>
    supabase
      .from("orders")
      .select("served_by")
      .eq("restaurant_id", restaurantId)
      .eq("status", "paid")
      .gte("created_at", from + "T00:00:00")
      .lte("created_at", to + "T23:59:59"),
  );
  const wasteRows = await safeFetch<any[]>(() =>
    supabase
      .from("waste_logs")
      .select("logged_by,cost")
      .eq("restaurant_id", restaurantId)
      .gte("created_at", from + "T00:00:00")
      .lte("created_at", to + "T23:59:59"),
  );

  const servedCounts = new Map<string, number>();
  for (const o of orders) {
    const sb = (o as any).served_by;
    if (sb) servedCounts.set(sb, (servedCounts.get(sb) ?? 0) + 1);
  }
  const wasteByStaff = new Map<string, { count: number; cost: number }>();
  for (const w of wasteRows) {
    const lb = (w as any).logged_by;
    if (lb) {
      const prev = wasteByStaff.get(lb) ?? { count: 0, cost: 0 };
      prev.count++;
      prev.cost += Number((w as any).cost ?? 0);
      wasteByStaff.set(lb, prev);
    }
  }

  const rows = (staffRows ?? []).map((s: any) => {
    const waste = wasteByStaff.get(s.id) ?? { count: 0, cost: 0 };
    return {
      name: s.name as string,
      role: (s.role ?? "") as string,
      orders_served: servedCounts.get(s.id) ?? 0,
      waste_logged: waste.count,
      waste_cost: waste.cost,
    };
  });
  rows.sort((a, b) => b.orders_served - a.orders_served);
  return rows;
}

// ─── Generation ─────────────────────────────────────────────────

export async function generateAccountingReport(
  restaurantId: string,
  restaurantName: string,
  mk: string,
): Promise<ArchivedReport | null> {
  const { from, to } = monthRange(mk);
  const period = { from, to, label: monthLabel(mk) };
  const rep: AccountingReport = await loadAccountingReport(
    restaurantId,
    period,
  );
  const payload: AccountingExportPayload = {
    restaurantName: restaurantName || "تقرير المحاسبة",
    periodLabel: period.label,
    from,
    to,
    revenue: rep.revenue,
    ordersCount: rep.ordersCount,
    avgOrder: rep.avgOrder,
    cogs: rep.cogs,
    grossProfit: rep.grossProfit,
    grossMarginPct: rep.grossMarginPct,
    purchases: rep.expenses.purchases,
    salaries: rep.expenses.salaries,
    waste: rep.expenses.waste,
    other: rep.expenses.other,
    totalExpenses: rep.expenses.total,
    netProfit: rep.netProfit,
    netMarginPct: rep.netMarginPct,
    byChannel: rep.byChannel,
    daily: rep.daily.map((d) => ({
      date: d.date,
      revenue: d.revenue,
      expenses: d.expenses,
      net: d.net,
    })),
  };
  const pdf = buildAccountingPDF(payload);
  return saveReport({
    restaurant_id: restaurantId,
    restaurant_name: restaurantName,
    type: "accounting",
    month: mk,
    generated_at: timestampNow(),
    summary: {
      revenue: rep.revenue,
      netProfit: rep.netProfit,
      ordersCount: rep.ordersCount,
    },
    pdf,
  });
}

export async function generateReportsReport(
  restaurantId: string,
  restaurantName: string,
  mk: string,
): Promise<ArchivedReport | null> {
  const data = await loadReportsData(restaurantId, mk);
  const {
    revenue,
    ordersCount,
    purchases,
    salaries,
    wasteCost,
    totalExpenses,
    netProfit,
    avgOrder,
  } = data;
  const pdf = buildReportsPDF({
    restaurantName: restaurantName || "تقرير الفترة",
    month: mk,
    revenue,
    ordersCount,
    purchases,
    salaries,
    wasteCost,
    totalExpenses,
    netProfit,
    avgOrder,
  });
  return saveReport({
    restaurant_id: restaurantId,
    restaurant_name: restaurantName,
    type: "reports",
    month: mk,
    generated_at: timestampNow(),
    summary: { revenue, netProfit, ordersCount },
    pdf,
  });
}

export async function generateStaffPerformanceReport(
  restaurantId: string,
  restaurantName: string,
  mk: string,
): Promise<ArchivedReport | null> {
  const rows = await loadStaffPerformanceData(restaurantId, mk);
  const pdf = buildStaffPerformancePDF({
    restaurantName: restaurantName || "أداء الموظفين",
    month: mk,
    rows,
  });
  return saveReport({
    restaurant_id: restaurantId,
    restaurant_name: restaurantName,
    type: "staff_performance",
    month: mk,
    generated_at: timestampNow(),
    summary: {
      staffCount: rows.length,
      totalOrders: rows.reduce((s, r) => s + r.orders_served, 0),
      totalWaste: rows.reduce((s, r) => s + r.waste_logged, 0),
    },
    pdf,
  });
}

// ─── Persistence ────────────────────────────────────────────────

async function saveReport(
  input: Omit<ArchivedReport, "id">,
): Promise<ArchivedReport | null> {
  try {
    const existing = await supabase
      .from("restaurant_reports")
      .select("id")
      .eq("restaurant_id", input.restaurant_id)
      .eq("type", input.type)
      .eq("month", input.month)
      .maybeSingle();

    if (existing?.data?.id) {
      const upd = await supabase
        .from("restaurant_reports")
        .update({
          restaurant_name: input.restaurant_name,
          generated_at: input.generated_at,
          summary: input.summary,
          pdf: input.pdf,
        })
        .eq("id", existing.data.id)
        .maybeSingle();
      return upd?.data ? { id: existing.data.id, ...input } : null;
    }

    const ins = await supabase
      .from("restaurant_reports")
      .insert(input)
      .select()
      .maybeSingle();
    if (ins?.error) {
      console.warn("[report-archive] insert failed", ins.error);
      return null;
    }
    return ins?.data ?? null;
  } catch (e) {
    console.warn("[report-archive] save failed", e);
    return null;
  }
}

export async function listReports(
  restaurantId: string,
): Promise<ArchivedReport[]> {
  try {
    const { data } = await supabase
      .from("restaurant_reports")
      .select(
        "id,restaurant_id,restaurant_name,type,month,generated_at,summary",
      )
      .eq("restaurant_id", restaurantId)
      .order("month", { ascending: false });
    return (data ?? []) as ArchivedReport[];
  } catch (e) {
    console.warn("[report-archive] list failed", e);
    return [];
  }
}

export async function getReportFull(
  reportId: string,
): Promise<ArchivedReport | null> {
  try {
    const { data } = await supabase
      .from("restaurant_reports")
      .select("*")
      .eq("id", reportId)
      .maybeSingle();
    return (data as ArchivedReport) ?? null;
  } catch (e) {
    console.warn("[report-archive] get failed", e);
    return null;
  }
}

export function openReportPdf(report: ArchivedReport): void {
  const w = window.open("", "_blank");
  if (!w) {
    downloadDataUrl(report.pdf, `${report.type}-${report.month}.pdf`);
    return;
  }
  w.document.write(
    `<html dir="rtl"><head><title>${REPORT_LABELS[report.type]} - ${monthLabel(report.month)}</title></head>` +
      `<body style="margin:0"><iframe src="${report.pdf}" style="width:100%;height:100%;border:0"></iframe></body></html>`,
  );
  w.document.close();
}

export function downloadReportPdf(report: ArchivedReport): void {
  downloadDataUrl(
    report.pdf,
    `${sanitizeFilename(report.restaurant_name)}-${report.type}-${report.month}.pdf`,
  );
}

// ─── Automatic monthly generation ───────────────────────────────

export async function ensureMonthlyArchive(
  restaurantId: string,
  restaurantName: string,
): Promise<void> {
  if (!restaurantId) return;
  const mk = monthKey();
  const generated: ReportType[] = [];

  const { data } = await supabase
    .from("restaurant_reports")
    .select("type")
    .eq("restaurant_id", restaurantId)
    .eq("month", mk);

  const existing = new Set((data ?? []).map((r: any) => r.type));

  const types: ReportType[] = ["accounting", "reports", "staff_performance"];
  for (const t of types) {
    if (existing.has(t)) continue;
    try {
      if (t === "accounting")
        await generateAccountingReport(restaurantId, restaurantName, mk);
      else if (t === "reports")
        await generateReportsReport(restaurantId, restaurantName, mk);
      else
        await generateStaffPerformanceReport(restaurantId, restaurantName, mk);
      generated.push(t);
    } catch (e) {
      console.warn("[report-archive] auto generation failed", t, e);
    }
  }

  if (generated.length) {
    console.info("[report-archive] generated reports for", mk, generated);
  }
}

// Used only client-side in archive page to force a (re)generation.
export async function regenerateReport(
  restaurantId: string,
  restaurantName: string,
  type: ReportType,
  mk: string,
): Promise<ArchivedReport | null> {
  if (type === "accounting")
    return generateAccountingReport(restaurantId, restaurantName, mk);
  if (type === "reports")
    return generateReportsReport(restaurantId, restaurantName, mk);
  return generateStaffPerformanceReport(restaurantId, restaurantName, mk);
}
