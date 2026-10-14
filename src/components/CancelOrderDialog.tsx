import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatDZD } from "@/lib/restaurant";
import {
  AlertTriangle,
  Clock,
  HelpCircle,
  PackageX,
  UserX,
  CreditCard,
  XCircle,
  Loader2,
} from "lucide-react";

export type CancelReasonPreset = {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
};

/**
 * Reason presets. `id` is the stable code stored on the order and consumed by
 * `@/lib/order-cancel` (`normalizeCancelReason`); `label` is only for display.
 * Codes must stay in sync with `CANCEL_REASONS` in `@/lib/order-cancel`.
 */
export const CANCEL_REASONS: CancelReasonPreset[] = [
  {
    id: "customer_changed_mind",
    label: "العميل غيّر رأيه / ألغى",
    icon: UserX,
    color: "bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100",
  },
  {
    id: "customer_left",
    label: "العميل غادر المطعم",
    icon: UserX,
    color: "bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100",
  },
  {
    id: "long_wait",
    label: "تأخر التحضير / انتظار طويل",
    icon: Clock,
    color: "bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100",
  },
  {
    id: "out_of_stock",
    label: "نفاد الصنف أو المكونات",
    icon: PackageX,
    color: "bg-orange-50 text-orange-700 border-orange-200 hover:bg-orange-100",
  },
  {
    id: "wrong_order",
    label: "خطأ في تسجيل الطلب",
    icon: AlertTriangle,
    color: "bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100",
  },
  {
    id: "quality_issue",
    label: "عيب في الجودة أو التحضير",
    icon: AlertTriangle,
    color: "bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100",
  },
  {
    id: "manager_decision",
    label: "قرار الإدارة",
    icon: CreditCard,
    color: "bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100",
  },
  {
    id: "other",
    label: "سبب آخر (توضيح أدناه)",
    icon: HelpCircle,
    color: "bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100",
  },
];

/** Payload handed back to the caller once the reason is validated. */
export type CancelOrderReason = {
  /** Stable reason code (see `@/lib/order-cancel`). */
  reason: string;
  /** Free-text note; mandatory for the `other` code. */
  reasonOther: string | null;
};

interface CancelOrderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order: {
    id: string;
    daily_number?: number | null;
    table_number?: number | null;
    total: number;
    order_type?: string | null;
  } | null;
  onConfirm: (payload: CancelOrderReason) => Promise<void>;
  loading?: boolean;
  /** Refund mode: the order is already paid and money is returned. */
  refund?: boolean;
}

export function CancelOrderDialog({
  open,
  onOpenChange,
  order,
  onConfirm,
  loading = false,
  refund = false,
}: CancelOrderDialogProps) {
  const [selectedPreset, setSelectedPreset] = useState<string>("customer_changed_mind");
  const [customReason, setCustomReason] = useState("");
  const [busy, setBusy] = useState(false);

  if (!order) return null;

  const orderNumStr = order.daily_number
    ? `#${String(order.daily_number).padStart(3, "0")}`
    : "";
  const tableStr =
    order.table_number != null
      ? `طاولة ${order.table_number}`
      : order.order_type === "delivery"
        ? "طلب توصيل"
        : order.order_type === "takeaway"
          ? "طلب سفري"
          : "طلب محلي";

  const handleConfirm = async () => {
    const reasonOther = customReason.trim();
    try {
      setBusy(true);
      await onConfirm({
        reason: selectedPreset,
        reasonOther: reasonOther || null,
      });
      setCustomReason("");
      onOpenChange(false);
    } finally {
      setBusy(false);
    }
  };

  const isWorking = loading || busy;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md text-right" dir="rtl">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-destructive/10 text-destructive flex items-center justify-center shrink-0">
              <XCircle className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-foreground">
                {refund ? "استرجاع مبلغ الطلب" : "إلغاء الطلب"} {orderNumStr} ({tableStr})
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                {refund
                  ? "سيتم تسجيل عملية الاسترجاع بسببها ومَن نفّذها في تقرير الإلغاء"
                  : "حدد سبب الإلغاء ليتم تسجيله في التقارير التشغيلية والإحصائيات"}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Warning banner */}
          <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-3 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 text-destructive font-semibold">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>
                {refund
                  ? "سيتم إرجاع المبلغ للعميل وتسجيل العملية"
                  : "سيتم إلغاء الطلب وتحويله لسجل الملغيات"}
              </span>
            </div>
            <span className="font-extrabold text-destructive tabular-nums text-sm">
              {formatDZD(order.total)}
            </span>
          </div>

          {/* Reason Presets */}
          <div>
            <label className="text-xs font-semibold text-foreground block mb-2">
              سبب الإلغاء الأساسي:
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {CANCEL_REASONS.map((r) => {
                const Icon = r.icon;
                const isSelected = selectedPreset === r.id;
                return (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => setSelectedPreset(r.id)}
                    className={`flex items-center gap-2 p-2.5 rounded-xl border text-xs font-medium text-right transition-all ${
                      isSelected
                        ? "border-destructive bg-destructive/10 text-destructive font-bold ring-2 ring-destructive/20"
                        : "border-border bg-card text-foreground hover:bg-muted"
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5 shrink-0 opacity-80" />
                    <span className="truncate">{r.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Custom explanation / note */}
          <div>
            <label className="text-xs font-semibold text-foreground block mb-1.5">
              ملاحظة أو توضيح إضافي (اختياري):
            </label>
            <Input
              value={customReason}
              onChange={(e) => setCustomReason(e.target.value)}
              placeholder="مثال: الزبون طلب تبديل الوجبة أو خرج على عجل..."
              className="h-10 text-xs"
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            type="button"
            onClick={() => onOpenChange(false)}
            disabled={isWorking}
            className="text-xs"
          >
            تراجع
          </Button>
          <Button
            variant="destructive"
            type="button"
            onClick={handleConfirm}
            disabled={isWorking}
            className="text-xs gap-1.5 font-bold"
          >
            {isWorking && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            {refund ? "تأكيد استرجاع المبلغ" : "تأكيد إلغاء الطلب"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
