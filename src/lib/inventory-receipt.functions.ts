import { createServerFn } from "@tanstack/react-start";

export type ReceiptItem = {
  name: string;
  qty: number;
  unit: string;
  category: string;
  cost: number;
};

export const analyzeReceipt = createServerFn({ method: "POST" })
  .validator((d: { imageBase64: string; mimeType: string }) => d)
  .handler(async (): Promise<{ items: ReceiptItem[]; rawText: string }> => ({
    items: [],
    rawText: "",
  }));
