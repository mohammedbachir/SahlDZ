import { createServerFn } from "@tanstack/react-start";
import { previewExpiry } from "@/lib/preview-mode";

export type ReadyOrder = {
  id: string;
  total: number;
  created_at: string;
  table_number: number | null;
  daily_number: number | null;
  order_type?: string;
  customer_name?: string | null;
  customer_phone?: string | null;
  items: Array<{ name: string; qty: number; price: number }>;
};

export type ZReport = {
  dayKey: string;
  totalRevenue: number;
  totalOrders: number;
  avgTicket: number;
  byType: Record<"dine_in" | "takeaway" | "delivery", { count: number; revenue: number }>;
  unpaidCount: number;
  unpaidTotal: number;
};

export const getCashierContext = createServerFn({ method: "GET" })
  .validator((d: { token: string }) => d)
  .handler(async () => ({
    restaurant: { id: "mock-restaurant-id", name: "مطعم السهل", logo_url: null },
  }));

export const cashierLookupTable = createServerFn({ method: "GET" })
  .validator((d: { token: string; tableNumber: number }) => d)
  .handler(async () => ({ orders: [] as ReadyOrder[] }));

export const cashierMarkPaid = createServerFn({ method: "POST" })
  .validator((d: { token: string; orderIds: string[] }) => d)
  .handler(async () => ({ ok: true }));

export const cashierLogout = createServerFn({ method: "POST" })
  .validator((d: { token: string }) => d)
  .handler(async () => ({ ok: true }));

export const cashierListReady = createServerFn({ method: "GET" })
  .validator((d: { token: string }) => d)
  .handler(async () => ({ orders: [] as ReadyOrder[] }));

export const cashierZReport = createServerFn({ method: "GET" })
  .validator((d: { token: string }) => d)
  .handler(
    async (): Promise<ZReport> => ({
      dayKey: new Date().toISOString().slice(0, 10),
      totalRevenue: 0,
      totalOrders: 0,
      avgTicket: 0,
      byType: { dine_in: { count: 0, revenue: 0 }, takeaway: { count: 0, revenue: 0 }, delivery: { count: 0, revenue: 0 } },
      unpaidCount: 0,
      unpaidTotal: 0,
    }),
  );

export const verifyCashierPin = createServerFn({ method: "POST" })
  .validator((d: { restaurantId: string; pin: string }) => d)
  .handler(async () => ({
    token: "mock_cashier",
    expiresAt: previewExpiry(),
    restaurant: { id: "mock-restaurant-id", name: "مطعم السهل", logo_url: null },
  }));

export const getPublicCashierLoginInfo = createServerFn({ method: "GET" })
  .validator((d: { restaurantId: string }) => d)
  .handler(async () => ({ found: true, name: "مطعم السهل", enabled: true }));

export const setCashierPin = createServerFn({ method: "POST" })
  .validator((d: { pin: string }) => d)
  .handler(async () => ({ ok: true }));

export const disableCashier = createServerFn({ method: "POST" }).handler(async () => ({ ok: true }));

export const getCashierStatus = createServerFn({ method: "GET" }).handler(async () => ({
  enabled: false,
}));
