import { createServerFn } from "@tanstack/react-start";
import { geminiVisionJson } from "@/lib/ai-vision";

export type ReceiptItem = {
  name: string;
  quantity: number;
  unit: string;
  unit_price: number;
};

export type ReceiptAnalysis = {
  items: ReceiptItem[];
  supplierName: string;
  totalAmount: number;
  previousDebt: number;
  grandTotalDebt: number;
  paidAmount: number;
  rawText: string;
};

export const analyzeReceipt = createServerFn({ method: "POST" })
  .validator((d: { imageBase64: string; mimeType: string }) => d)
  .handler(async ({ data }): Promise<ReceiptAnalysis> => {
    const prompt = `أنت محاسب مختص بقراءة فواتير الشراء الخاصة بالمطاعم.
اقرأ صورة الفاتورة واستخرج:
- supplierName: اسم المورد
- كل الأسطر: name (اسم المادة), quantity (الكمية), unit (الوحدة مثل كغ/لتر/حبة/قطعة), unit_price (سعر الوحدة بالدينار الجزائري)
- totalAmount: إجمالي الفاتورة الحالية
- previousDebt: الدين السابق إن ذُكر صراحة
- grandTotalDebt: الدين الإجمالي على المورد (المجموع العام للأسفل)
- paidAmount: المبلغ المدفوع من هذه الفاتورة
إن لم يظهر رقم لشيء اجعل قيمته 0، وإن لم تُعرف الوحدة اجعلها "حبة".
أعد JSON فقط بهذا الشكل:
{
  "supplierName": "",
  "items": [
    { "name": "", "quantity": 0, "unit": "كغ", "unit_price": 0 }
  ],
  "totalAmount": 0,
  "previousDebt": 0,
  "grandTotalDebt": 0,
  "paidAmount": 0,
  "rawText": ""
}`;

    const parsed = await geminiVisionJson<ReceiptAnalysis>({
      imageBase64: data.imageBase64,
      mimeType: data.mimeType || "image/jpeg",
      prompt,
      maxOutputTokens: 8192,
    });

    const items: ReceiptItem[] = (parsed.items ?? [])
      .map((it) => ({
        name: String(it.name || "").trim(),
        quantity: Math.max(Number(it.quantity) || 0, 0),
        unit: String(it.unit || "حبة").trim() || "حبة",
        unit_price: Math.max(Number(it.unit_price) || 0, 0),
      }))
      .filter((it) => it.name && it.quantity > 0);

    return {
      items,
      supplierName: String(parsed.supplierName || "").trim(),
      totalAmount: Number(parsed.totalAmount) || 0,
      previousDebt: Number(parsed.previousDebt) || 0,
      grandTotalDebt: Number(parsed.grandTotalDebt) || 0,
      paidAmount: Number(parsed.paidAmount) || 0,
      rawText: String(parsed.rawText || ""),
    };
  });
