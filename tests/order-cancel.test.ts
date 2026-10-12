import { describe, expect, it } from "vitest";
import {
  CANCELLABLE_STATUSES,
  CANCEL_REASONS,
  cancelReasonLabel,
  cancellationGeneratesWaste,
  isCancellableStatus,
  normalizeCancelReason,
  wasteReasonForCancelReason,
} from "@/lib/order-cancel";

// ─── Order cancellation unit tests ───────────────────────────────
//
// The feature has two rules a refactor could silently break:
//   1. a void is never allowed without a reason, and "أخرى" needs free text;
//   2. whether the void lands in the waste log or the staff-performance log is
//      decided purely by the stage the order had reached.
describe("normalizeCancelReason", () => {
  it("rejects a missing reason", () => {
    expect(() => normalizeCancelReason("", null)).toThrow(/السبب/);
    expect(() => normalizeCancelReason(null, null)).toThrow();
    expect(() => normalizeCancelReason("   ", null)).toThrow();
  });

  it("rejects a reason outside the vocabulary", () => {
    expect(() => normalizeCancelReason("because_i_said_so", null)).toThrow(
      /غير معروف/,
    );
  });

  it("requires free text for 'other'", () => {
    expect(() => normalizeCancelReason("other", "")).toThrow(/اكتب وصف السبب/);
    expect(() => normalizeCancelReason("other", "   ")).toThrow();
    // Surrounding whitespace is trimmed before it is stored.
    expect(normalizeCancelReason("other", "  العميل رفض الانتظار  ")).toEqual({
      reason: "other",
      reasonOther: "العميل رفض الانتظار",
    });
  });

  it("accepts every reason in the vocabulary", () => {
    for (const r of CANCEL_REASONS) {
      if (r.value === "other") continue;
      expect(normalizeCancelReason(r.value, null).reason).toBe(r.value);
    }
  });

  it("trims the reason and drops the other text for a known reason", () => {
    expect(normalizeCancelReason("  customer_left  ", "ignored")).toEqual({
      reason: "customer_left",
      reasonOther: "ignored",
    });
  });
});

describe("isCancellableStatus", () => {
  it("allows every non-paid stage", () => {
    for (const s of CANCELLABLE_STATUSES)
      expect(isCancellableStatus(s)).toBe(true);
    expect(isCancellableStatus("new")).toBe(true);
    expect(isCancellableStatus("preparing")).toBe(true);
    expect(isCancellableStatus("ready")).toBe(true);
    expect(isCancellableStatus("served")).toBe(true);
  });

  it("never allows a paid, cancelled or unknown status", () => {
    expect(isCancellableStatus("paid")).toBe(false);
    expect(isCancellableStatus("cancelled")).toBe(false);
    expect(isCancellableStatus("completed")).toBe(false);
    expect(isCancellableStatus(null)).toBe(false);
    expect(isCancellableStatus(undefined)).toBe(false);
  });
});

describe("cancellationGeneratesWaste", () => {
  it("logs waste once the dish left the kitchen", () => {
    expect(cancellationGeneratesWaste("ready")).toBe(true);
    expect(cancellationGeneratesWaste("served")).toBe(true);
  });

  it("logs staff time instead while the dish is unfinished", () => {
    expect(cancellationGeneratesWaste("new")).toBe(false);
    expect(cancellationGeneratesWaste("preparing")).toBe(false);
  });

  it("treats a paid order as no-waste (it cannot be voided at all)", () => {
    expect(cancellationGeneratesWaste("paid")).toBe(false);
  });
});

describe("wasteReasonForCancelReason", () => {
  it("maps quality and data-entry faults onto the existing prep_error chip", () => {
    expect(wasteReasonForCancelReason("quality_issue")).toBe("prep_error");
    expect(wasteReasonForCancelReason("wrong_order")).toBe("prep_error");
    expect(wasteReasonForCancelReason("duplicate")).toBe("prep_error");
  });

  it("maps a walked-out customer onto dropped", () => {
    expect(wasteReasonForCancelReason("customer_changed_mind")).toBe("dropped");
    expect(wasteReasonForCancelReason("customer_left")).toBe("dropped");
  });

  it("maps a missing item onto expired so the chip stays meaningful", () => {
    expect(wasteReasonForCancelReason("out_of_stock")).toBe("expired");
  });

  it("falls back to 'other' for an unmapped reason", () => {
    expect(wasteReasonForCancelReason("other")).toBe("other");
    expect(wasteReasonForCancelReason("something_new")).toBe("other");
  });
});

describe("cancelReasonLabel", () => {
  it("resolves a stored value back to Arabic", () => {
    expect(cancelReasonLabel("customer_left")).toBe("العميل غادر المطعم");
  });

  it("returns the raw value for anything unknown", () => {
    expect(cancelReasonLabel("brand_new_reason")).toBe("brand_new_reason");
    expect(cancelReasonLabel(null)).toBe("");
  });
});
