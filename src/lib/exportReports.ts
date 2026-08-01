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

const fmt = (n: number) => new Intl.NumberFormat("ar-DZ", { maximumFractionDigits: 2 }).format(n);

export async function exportAnalyticsExcel(payload: AnalyticsExportPayload): Promise<void> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet(payload.restaurantName || "تحليلات");

  sheet.columns = [
    { header: "المؤشر", key: "label", width: 24 },
    { header: "القيمة", key: "value", width: 20 },
  ];

  const { kpis } = payload;
  sheet.addRow({ label: "طلبات اليوم", value: kpis.ordersToday });
  sheet.addRow({ label: "مبيعات اليوم (دج)", value: kpis.salesToday });
  sheet.addRow({ label: "متوسط الطلب الأسبوعي (دج)", value: kpis.avgOrderWeek });
  sheet.addRow({ label: "مبيعات الشهر (دج)", value: kpis.salesMonth });
  sheet.getRow(1).font = { bold: true };

  const dailySheet = workbook.addWorksheet("المبيعات اليومية");
  dailySheet.columns = [
    { header: "التاريخ", key: "date", width: 20 },
    { header: "الإجمالي (دج)", key: "total", width: 20 },
  ];
  payload.daily.forEach((d) => dailySheet.addRow({ date: d.date, total: d.total }));
  dailySheet.getRow(1).font = { bold: true };

  const itemsSheet = workbook.addWorksheet("الأصناف");
  itemsSheet.columns = [
    { header: "الصنف", key: "name", width: 24 },
    { header: "الكمية", key: "qty", width: 12 },
    { header: "الإيراد (دج)", key: "revenue", width: 20 },
  ];
  payload.topItems.forEach((i) => itemsSheet.addRow({ name: i.name, qty: i.qty, revenue: i.revenue }));
  payload.bottomItems.forEach((i) => itemsSheet.addRow({ name: i.name, qty: i.qty, revenue: i.revenue }));
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

export function exportAnalyticsPDF(payload: AnalyticsExportPayload): void {
  const doc = new jsPDF();
  const { kpis } = payload;

  doc.setFontSize(16);
  doc.text(payload.restaurantName || "تقرير التحليلات", 105, 20, { align: "center" });

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
      ...payload.bottomItems.map((i) => [i.name, String(i.qty), fmt(i.revenue)]),
    ],
    startY: itemsStartY + 8,
  });

  doc.save(`analytics-${payload.restaurantName || "report"}.pdf`);
}
