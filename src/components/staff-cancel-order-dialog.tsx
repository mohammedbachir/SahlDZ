import { useState } from "react";
import { Loader2, Ban } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CANCEL_REASONS, isCancellableStatus } from "@/lib/order-cancel";
import { tx } from "@/lib/ops-tx";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** e.g. "الطلبية #12" for the dialog title. */
  orderLabel: string;
  /** Current order status; the dialog refuses anything not cancellable. */
  orderStatus: string | null | undefined;
  saving?: boolean;
  onSubmit: (
    reason: string,
    reasonOther: string | null,
  ) => void | Promise<void>;
};

/**
 * Mandatory-reason void dialog. Mirrors the waste form in `ops.inventory.tsx`:
 * a reason `Select` plus a free-text field that only appears for "أخرى", which
 * is then required. The confirm button stays disabled until the reason is
 * valid, so a void can never be recorded without attribution.
 */
export function StaffCancelOrderDialog({
  open,
  onOpenChange,
  orderLabel,
  orderStatus,
  saving = false,
  onSubmit,
}: Props) {
  const [reason, setReason] = useState("");
  const [reasonOther, setReasonOther] = useState("");

  const cancellable = isCancellableStatus(orderStatus);
  const needsOther = reason === "other";
  const canSubmit =
    cancellable && reason && (!needsOther || reasonOther.trim());

  function reset() {
    setReason("");
    setReasonOther("");
  }

  async function submit() {
    if (!canSubmit) return;
    await onSubmit(reason, needsOther ? reasonOther.trim() : null);
    reset();
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) reset();
        onOpenChange(next);
      }}
    >
      <DialogContent dir="rtl" className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Ban className="w-4 h-4 text-destructive" />
            {tx("إلغاء الطلبية")} — {orderLabel}
          </DialogTitle>
          <DialogDescription>
            {needsOther || !cancellable ? cancelHint : reasonHint(orderStatus)}
          </DialogDescription>
        </DialogHeader>

        {!cancellable ? (
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
            {tx("لا يمكن إلغاء طلبية في هذه الحالة")}
          </div>
        ) : (
          <div className="space-y-3">
            <div>
              <Label>{tx("سبب الإلغاء")} *</Label>
              <Select value={reason} onValueChange={setReason}>
                <SelectTrigger>
                  <SelectValue placeholder={tx("اختر السبب")} />
                </SelectTrigger>
                <SelectContent>
                  {CANCEL_REASONS.map((r) => (
                    <SelectItem key={r.value} value={r.value}>
                      {tx(r.label)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {needsOther && (
              <div>
                <Label>{tx("وصف السبب")} *</Label>
                <Textarea
                  value={reasonOther}
                  onChange={(e) => setReasonOther(e.target.value)}
                  placeholder={tx("اشرح سبب الإلغاء")}
                  rows={3}
                />
              </div>
            )}
          </div>
        )}

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {tx("تراجع")}
          </Button>
          <Button
            variant="destructive"
            onClick={submit}
            disabled={!canSubmit || saving}
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin ms-2" />
                {tx("جاري الإلغاء…")}
              </>
            ) : (
              <>
                <Ban className="w-4 h-4 ms-2" />
                {tx("تأكيد الإلغاء")}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Explains where the void will be recorded, so staff know it is not silent. */
function reasonHint(status: string | null | undefined): string {
  if (status === "ready" || status === "served")
    return "الطبق جاهز — سيُسجَّل الإلغاء في سجل الهدر بتكلفة المكونات.";
  return "سيُسجَّل الإلغاء في سجل أداء الفريق باسم الموظف.";
}

const cancelHint = "سيُسجَّل الإلغاء في سجل أداء الفريق باسم الموظف.";
