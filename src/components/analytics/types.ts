export type DateRangePreset = "today" | "yesterday" | "week" | "month" | "custom";

export type OrderRecord = {
  id: string;
  restaurant_id: string;
  total: number;
  status: "paid" | "cancelled" | "new" | "preparing" | "ready" | "served";
  created_at: string;
  order_type: "dine_in" | "takeaway" | "delivery";
  table_id: string | null;
  table_number?: number | null;
  hall_name?: string | null;
  daily_number?: number | null;
  customer_name?: string | null;
  customer_phone?: string | null;
  customer_address?: string | null;
  cashier_staff_id?: string | null;
  payment_mode?: string | null;
  paid_amount?: number | null;
  debt_amount?: number | null;
  discount_amount?: number | null;
  cancel_reason?: string | null;
  cancel_reason_other?: string | null;
  cancelled_at?: string | null;
  cancelled_by?: string | null;
  cancelled_by_name?: string | null;
  served_at?: string | null;
  refunded?: boolean | null;
  refund_amount?: number | null;
  items?: OrderItemRecord[];
};

export type OrderItemRecord = {
  id: string;
  order_id: string;
  menu_item_id: string | null;
  category_id?: string | null;
  name_snapshot: string;
  price_snapshot: number;
  quantity: number;
};

export type TablePerformance = {
  tableId: string;
  tableNumber: number;
  hallName: string;
  totalRevenue: number;
  ordersCount: number;
  avgOrderValue: number;
  percentageOfTableSales: number;
  rank: number;
};

export type CategoryPerformance = {
  categoryId: string;
  categoryName: string;
  totalRevenue: number;
  quantitySold: number;
  percentageOfFoodSales: number;
  topItemName: string | null;
  itemsCount: number;
};

export type TopItemPerformance = {
  menuItemId: string | null;
  name: string;
  imageUrl: string | null;
  categoryName: string;
  quantity: number;
  revenue: number;
  percentageOfSales: number;
};

export type CashierPerformance = {
  staffId: string;
  name: string;
  role: string;
  totalRevenue: number;
  ordersCount: number;
  avgOrderValue: number;
  percentageOfTotalSales: number;
  fullPaymentsCount: number;
  debtPaymentsCount: number;
};

export type CancellationReasonStat = {
  reason: string;
  count: number;
  totalAmount: number;
  percentage: number;
};

export type DailyDetailSummary = {
  dateKey: string;
  displayDate: string;
  totalRevenue: number;
  completedCount: number;
  cancelledCount: number;
  cancelledTotal: number;
  avgTicket: number;
  byType: {
    dine_in: { count: number; revenue: number; percentage: number };
    takeaway: { count: number; revenue: number; percentage: number };
    delivery: { count: number; revenue: number; percentage: number };
  };
  hourly: { hour: number; revenue: number; count: number }[];
  orders: OrderRecord[];
};

export type FullAnalyticsData = {
  dateRangeLabel: string;
  kpis: {
    totalRevenue: number;
    ordersCount: number;
    avgOrderValue: number;
    cancelledCount: number;
    cancelledRevenue: number;
    cancellationRate: number;
    dineInRevenue: number;
    takeawayRevenue: number;
    deliveryRevenue: number;
  };
  dailyTrend: { date: string; total: number; count: number }[];
  hourlyTrend: { hour: number; count: number; revenue: number }[];
  tables: TablePerformance[];
  categories: CategoryPerformance[];
  topItems: TopItemPerformance[];
  bottomItems: TopItemPerformance[];
  cashiers: CashierPerformance[];
  cancellations: {
    reasons: CancellationReasonStat[];
    cancelledOrders: OrderRecord[];
    totalLost: number;
    count: number;
    mostCommonReason: string | null;
  };
  dailyDetail: DailyDetailSummary;
};
