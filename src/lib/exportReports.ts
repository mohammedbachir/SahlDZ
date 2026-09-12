import ExcelJS from "exceljs";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

export type AnalyticsExportPayload = {
  restaurantName: string;
  kpis: {
    ordersToday: number;
    salesToday: number;
    avgOrderWeek: number;
    salesMonth: number;
  };
  daily: { date: string; total: number }[];
  topItems: { name: string; qty: number; revenue: number }[];
  bottomItems: { name: string; qty: number; revenue: number }[];
};

const fmt = (n: number) =>
  new Intl.NumberFormat("ar-DZ", { maximumFractionDigits: 2 }).format(n);

export async function exportAnalyticsExcel(
  payload: AnalyticsExportPayload,
): Promise<void> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet(payload.restaurantName || "تحليلات");

  sheet.columns = [
    { header: "المؤشر", key: "label", width: 24 },
    { header: "القيمة", key: "value", width: 20 },
  ];

  const { kpis } = payload;
  sheet.addRow({ label: "طلبات اليوم", value: kpis.ordersToday });
  sheet.addRow({ label: "مبيعات اليوم (دج)", value: kpis.salesToday });
  sheet.addRow({
    label: "متوسط الطلب الأسبوعي (دج)",
    value: kpis.avgOrderWeek,
  });
  sheet.addRow({ label: "مبيعات الشهر (دج)", value: kpis.salesMonth });
  sheet.getRow(1).font = { bold: true };

  const dailySheet = workbook.addWorksheet("المبيعات اليومية");
  dailySheet.columns = [
    { header: "التاريخ", key: "date", width: 20 },
    { header: "الإجمالي (دج)", key: "total", width: 20 },
  ];
  payload.daily.forEach((d) =>
    dailySheet.addRow({ date: d.date, total: d.total }),
  );
  dailySheet.getRow(1).font = { bold: true };

  const itemsSheet = workbook.addWorksheet("الأصناف");
  itemsSheet.columns = [
    { header: "الصنف", key: "name", width: 24 },
    { header: "الكمية", key: "qty", width: 12 },
    { header: "الإيراد (دج)", key: "revenue", width: 20 },
  ];
  payload.topItems.forEach((i) =>
    itemsSheet.addRow({ name: i.name, qty: i.qty, revenue: i.revenue }),
  );
  payload.bottomItems.forEach((i) =>
    itemsSheet.addRow({ name: i.name, qty: i.qty, revenue: i.revenue }),
  );
  itemsSheet.getRow(1).font = { bold: true };

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `analytics-${payload.restaurantName || "report"}.xlsx`;
  link.click();
  URL.revokeObjectURL(link.href);
}

export function buildAnalyticsPDF(payload: AnalyticsExportPayload): string {
  const doc = new jsPDF();
  const { kpis } = payload;

  doc.setFontSize(16);
  doc.text(payload.restaurantName || "تقرير التحليلات", 105, 20, {
    align: "center",
  });

  autoTable(doc, {
    head: [["المؤشر", "القيمة"]],
    body: [
      ["طلبات اليوم", String(kpis.ordersToday)],
      ["مبيعات اليوم (دج)", fmt(kpis.salesToday)],
      ["متوسط الطلب الأسبوعي (دج)", fmt(kpis.avgOrderWeek)],
      ["مبيعات الشهر (دج)", fmt(kpis.salesMonth)],
    ],
    startY: 30,
  });

  const dailyStartY = (doc as any).lastAutoTable?.finalY ?? 50;
  autoTable(doc, {
    head: [["التاريخ", "الإجمالي (دج)"]],
    body: payload.daily.map((d) => [d.date, fmt(d.total)]),
    startY: dailyStartY + 8,
  });

  const itemsStartY = (doc as any).lastAutoTable?.finalY ?? 90;
  autoTable(doc, {
    head: [["الصنف", "الكمية", "الإيراد (دج)"]],
    body: [
      ...payload.topItems.map((i) => [i.name, String(i.qty), fmt(i.revenue)]),
      ...payload.bottomItems.map((i) => [
        i.name,
        String(i.qty),
        fmt(i.revenue),
      ]),
    ],
    startY: itemsStartY + 8,
  });

  return doc.output("dataurlstring");
}

export function exportAnalyticsPDF(payload: AnalyticsExportPayload): void {
  downloadDataUrl(
    buildAnalyticsPDF(payload),
    `analytics-${payload.restaurantName || "report"}.pdf`,
  );
}

/* ─────────────────────────────────────────────────────────────────────
   Accounting (Profit & Loss) report export
   ───────────────────────────────────────────────────────────────────── */

export type AccountingExportPayload = {
  restaurantName: string;
  periodLabel: string;
  from: string;
  to: string;
  revenue: number;
  ordersCount: number;
  avgOrder: number;
  cogs: number;
  grossProfit: number;
  grossMarginPct: number;
  purchases: number;
  salaries: number;
  waste: number;
  other: number;
  totalExpenses: number;
  netProfit: number;
  netMarginPct: number;
  byChannel: { key: string; count: number; revenue: number }[];
  daily: { date: string; revenue: number; expenses: number; net: number }[];
};

export async function exportAccountingExcel(
  payload: AccountingExportPayload,
): Promise<void> {
  const workbook = new ExcelJS.Workbook();
  const ws = workbook.addWorksheet("قائمة الدخل");

  ws.columns = [
    { header: "البند", key: "label", width: 26 },
    { header: "القيمة (دج)", key: "value", width: 22 },
  ];

  ws.addRow({ label: `التقرير: ${payload.restaurantName || ""}` });
  ws.addRow({
    label: `الفترة: ${payload.periodLabel} (${payload.from} → ${payload.to})`,
  });
  ws.addRow({});

  const add = (label: string, value: number, bold = false) => {
    const row = ws.addRow({ label, value: fmt(value) });
    if (bold) row.font = { bold: true };
  };

  add("الإيرادات", payload.revenue, true);
  ws.addRow({ label: `عدد الطلبات: ${payload.ordersCount}` });
  ws.addRow({ label: `متوسط الطلب: ${fmt(payload.avgOrder)}` });
  add("تكلفة الأصناف (COGS)", payload.cogs);
  add("الربح الإجمالي", payload.grossProfit, true);
  ws.addRow({ label: `هامش الربح الإجمالي: ${payload.grossMarginPct}%` });
  ws.addRow({});
  add("المشتريات", payload.purchases);
  add("الرواتب", payload.salaries);
  add("الهدر", payload.waste);
  add("مصاريف أخرى", payload.other);
  add("إجمالي المصروفات", payload.totalExpenses, true);
  ws.addRow({});
  add("صافي الربح/الخسارة", payload.netProfit, true);
  ws.addRow({ label: `هامش صافي الربح: ${payload.netMarginPct}%` });
  ws.getColumn(1).font = { bold: true } as any;

  const ch = workbook.addWorksheet("القنوات");
  ch.columns = [
    { header: "القناة", key: "key", width: 18 },
    { header: "الطلبات", key: "count", width: 12 },
    { header: "الإيراد (دج)", key: "revenue", width: 20 },
  ];
  const channelNames: Record<string, string> = {
    dine_in: "في الصالة",
    takeaway: "سفري",
    delivery: "توصيل",
  };
  payload.byChannel.forEach((c) =>
    ch.addRow({
      key: channelNames[c.key] ?? c.key,
      count: c.count,
      revenue: c.revenue,
    }),
  );
  ch.getRow(1).font = { bold: true };

  const dailySheet = workbook.addWorksheet("تفاصيل يومية");
  dailySheet.columns = [
    { header: "التاريخ", key: "date", width: 20 },
    { header: "الإيراد (دج)", key: "revenue", width: 20 },
    { header: "المصاريف اليومية (دج)", key: "expenses", width: 24 },
    { header: "الصافي (دج)", key: "net", width: 20 },
  ];
  payload.daily.forEach((d) =>
    dailySheet.addRow({
      date: d.date,
      revenue: fmt(d.revenue),
      expenses: fmt(d.expenses),
      net: fmt(d.net),
    }),
  );
  dailySheet.getRow(1).font = { bold: true };

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `accounting-${payload.restaurantName || "report"}.xlsx`;
  link.click();
  URL.revokeObjectURL(link.href);
}

export function buildAccountingPDF(payload: AccountingExportPayload): string {
  const doc = new jsPDF();
  doc.setFontSize(15);
  doc.text(payload.restaurantName || "تقرير المحاسبة", 105, 18, {
    align: "center",
  });
  doc.setFontSize(10);
  doc.text(
    `${payload.periodLabel} (${payload.from} → ${payload.to})`,
    105,
    25,
    { align: "center" },
  );

  autoTable(doc, {
    head: [["البند", "القيمة (دج)"]],
    body: [
      ["الإيرادات", fmt(payload.revenue)],
      ["عدد الطلبات", String(payload.ordersCount)],
      ["متوسط الطلب", fmt(payload.avgOrder)],
      ["تكلفة الأصناف (COGS)", fmt(payload.cogs)],
      ["الربح الإجمالي", fmt(payload.grossProfit)],
      ["هامش الربح الإجمالي", `${payload.grossMarginPct}%`],
      ["المشتريات", fmt(payload.purchases)],
      ["الرواتب", fmt(payload.salaries)],
      ["الهدر", fmt(payload.waste)],
      ["مصاريف أخرى", fmt(payload.other)],
      ["إجمالي المصروفات", fmt(payload.totalExpenses)],
      ["صافي الربح/الخسارة", fmt(payload.netProfit)],
      ["هامش صافي الربح", `${payload.netMarginPct}%`],
    ],
    startY: 32,
  });

  const dailyStartY = (doc as any).lastAutoTable?.finalY ?? 80;
  autoTable(doc, {
    head: [["التاريخ", "الإيراد (دج)", "المصاريف اليومية (دج)", "الصافي (دج)"]],
    body: payload.daily.map((d) => [
      d.date,
      fmt(d.revenue),
      fmt(d.expenses),
      fmt(d.net),
    ]),
    startY: dailyStartY + 8,
    styles: { fontSize: 8 },
  });

  return doc.output("dataurlstring");
}

export function exportAccountingPDF(payload: AccountingExportPayload): void {
  downloadDataUrl(
    buildAccountingPDF(payload),
    `accounting-${payload.restaurantName || "report"}.pdf`,
  );
}

export function downloadDataUrl(dataUrl: string, filename: string): void {
  const link = document.createElement("a");
  link.href = dataUrl;
  link.download = filename;
  link.click();
}
