import { describe, expect, it } from "vitest";
import {
  bestMatches,
  confidenceOf,
  hasMeaningfulQuery,
  isGreeting,
  normalizeArabic,
} from "@/lib/assistant/engine";

describe("assistant engine", () => {
  it("normalizes Arabic variants", () => {
    expect(normalizeArabic("وضع المعاينة")).toBe("وضع المعاينه");
    expect(normalizeArabic("سجّل الدخول")).toBe("سجل الدخول");
    expect(normalizeArabic("إعدادات")).toBe("اعدادات");
  });

  it("detects greetings", () => {
    expect(isGreeting("اهلا بالخير")).toBe(true);
    expect(isGreeting("السلام عليكم")).toBe(true);
  });

  const cases: Array<[string, string]> = [
    ["كيف أضيف موظفا جديدا", "settings-staff"],
    ["ما هو وضع المعاينة", "preview-mode"],
    ["كيف أربط تيليجرام للإشعارات", "settings-telegram"],
    ["أين أرى الطلبات الجديدة", "orders-flow"],
    ["ما هي تكلفة الطبق", "ops-recipes"],
    ["كيف أعمل جرد للمخزون", "ops-inventory-count"],
    ["تحميل تطبيق الأندرويد", "download-apps"],
    ["استعادة كلمة المرور", "owner-login"],
    ["تسجيل الخروج", "logout-safety"],
    ["شاشة الطباخ", "kitchen-screen"],
  ];

  it.each(cases)('resolves "%s" to %s', (query, expectedId) => {
    const matches = bestMatches(query, 1);
    expect(matches.length).toBeGreaterThan(0);
    expect(matches[0].entry.id).toBe(expectedId);
    expect(confidenceOf(matches)).toBeGreaterThanOrEqual(0.35);
  });

  it("distinguishes inventory page from inventory count", () => {
    const count = bestMatches("كيف أعمل جرد للمخزون", 1);
    const page = bestMatches("كيف أضيف مادة جديدة للمخزون", 1);
    expect(count[0].entry.id).toBe("ops-inventory-count");
    expect(page[0].entry.id).toBe("ops-inventory");
  });

  it("distinguishes download page from mobile app page", () => {
    const download = bestMatches("تحميل تطبيق الأندرويد", 1);
    const mobile = bestMatches("ما هو تطبيق الموبايل", 1);
    expect(download[0].entry.id).toBe("download-apps");
    expect(mobile[0].entry.id).toBe("mobile-app");
  });

  it("rejects gibberish with zero confidence", () => {
    const matches = bestMatches("زلزمة قزقز كبكبة", 3);
    expect(confidenceOf(matches)).toBe(0);
    expect(hasMeaningfulQuery("x")).toBe(false);
  });

  it("scales with the search window", () => {
    const wide = bestMatches("كيف أربط تيليجرام للإشعارات", 5);
    expect(wide.length).toBeGreaterThanOrEqual(2);
    expect(wide[0].entry.id).toBe("settings-telegram");
  });
});
