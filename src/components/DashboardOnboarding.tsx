import { useState } from "react";
import { Button } from "@/components/ui/button";
import { tx } from "@/lib/ops-tx";
import {
  ShoppingBag,
  Menu,
  LayoutGrid,
  BarChart3,
  Star,
  Settings,
  ArrowLeft,
  Check,
  RotateCcw,
} from "lucide-react";

const ONBOARDING_KEY = "sahl_dz_dashboard_onboarding";

type OnboardingStep = {
  id: string;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  tip: string;
};

const steps: OnboardingStep[] = [
  {
    id: "orders",
    icon: ShoppingBag,
    title: tx("tour.dashboard.ordersTitle"),
    description:
      "هنا تشوف كل طلبات المطعم لحظياً. الطلبات الجديدة، قيد التحضير، والجاهزة. تقدر تغير حالة كل طلب بضغطة واحدة.",
    tip: tx("tour.dashboard.ordersTip"),
  },
  {
    id: "menu",
    icon: Menu,
    title: tx("tour.dashboard.menuTitle"),
    description:
      "تضيف أطباقك وتصنفاتها وسعرها. كل صنف تقدر تصوره وتكتب وصفه. الزبون يشوف هذي القائمة لما يمسح QR.",
    tip: tx("tour.dashboard.menuTip"),
  },
  {
    id: "tables",
    icon: LayoutGrid,
    title: tx("tour.dashboard.tablesTitle"),
    description:
      "تدير طاولات المطعم وتولّد QR Code لكل طاولة. الزبون يمسح الكود ويطلب مباشرة من هاتفه.",
    tip: tx("tour.dashboard.tablesTip"),
  },
  {
    id: "analytics",
    icon: BarChart3,
    title: tx("tour.dashboard.analyticsTitle"),
    description:
      "تقارير المبيعات والأرباح. تشوف كم باعت اليوم وهل أرباحك تزيد ولا تناقص. تقدر تصدر التقارير لـ PDF أو Excel.",
    tip: tx("tour.dashboard.analyticsTip"),
  },
  {
    id: "reviews",
    icon: Star,
    title: tx("tour.dashboard.reviewsTitle"),
    description:
      "تقييمات الزبائن لمطعمك. تشوف رأيهم وتتابع التقييم العام. لو فيه شكوى تقدر ترد عليها.",
    tip: tx("tour.dashboard.reviewsTip"),
  },
  {
    id: "settings",
    icon: Settings,
    title: tx("tour.dashboard.settingsTitle"),
    description:
      "تعدّل بيانات مطعمك، تضيف موظفين، تربط تليجرام، وتضبط إعدادات الطلبات. هنا التحكم الكامل في النظام.",
    tip: tx("tour.dashboard.settingsTip"),
  },
];

export function DashboardOnboarding({
  onComplete,
  onReset,
}: {
  onComplete: () => void;
  onReset: () => void;
}) {
  const [currentStep, setCurrentStep] = useState(0);
  const [showTip, setShowTip] = useState(false);

  const step = steps[currentStep];
  const Icon = step.icon;
  const isLast = currentStep === steps.length - 1;

  function handleNext() {
    if (showTip) {
      if (isLast) {
        localStorage.setItem(ONBOARDING_KEY, "done");
        onComplete();
      } else {
        setCurrentStep((s) => s + 1);
        setShowTip(false);
      }
    } else {
      setShowTip(true);
    }
  }

  function handleReset() {
    localStorage.removeItem(ONBOARDING_KEY);
    onReset();
  }

  return (
    <div
      className="min-h-screen bg-[var(--background)] flex items-center justify-center p-4"
      dir="rtl"
    >
      <div className="w-full max-w-md">
        {/* Progress */}
        <div className="flex items-center gap-1.5 mb-6 justify-center">
          {steps.map((_, i) => (
            <div
              key={i}
              className={`h-1.5 rounded-full transition-all ${
                i < currentStep
                  ? "w-6 bg-[var(--primary)]"
                  : i === currentStep
                    ? "w-8 bg-[var(--primary)]"
                    : "w-3 bg-[var(--border)]"
              }`}
            />
          ))}
        </div>

        {/* Card */}
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-6">
          {/* Icon */}
          <div className="w-12 h-12 rounded-lg bg-[var(--primary)]/10 flex items-center justify-center mb-4">
            <Icon className="w-6 h-6 text-[var(--primary)]" />
          </div>

          {/* Content */}
          <h2 className="text-lg font-bold text-[var(--foreground)] mb-2">
            {step.title}
          </h2>
          <p className="text-sm text-[var(--muted-foreground)] leading-relaxed mb-4">
            {step.description}
          </p>

          {/* Tip */}
          {showTip && (
            <div className="bg-[var(--primary)]/5 border border-[var(--primary)]/20 rounded-lg p-3 mb-4">
              <p className="text-xs text-[var(--primary)] font-medium">
                💡 {step.tip}
              </p>
            </div>
          )}

          {/* Main Button */}
          <Button
            onClick={handleNext}
            className="w-full bg-[var(--primary)] text-[#1a1612] hover:bg-[var(--primary)]/90"
          >
            {showTip ? (
              isLast ? (
                <>
                  <Check className="w-4 h-4 ml-1" />
                  {tx("tour.dashboard.understoodLetsStart")}
                </>
              ) : (
                <>
                  <ArrowLeft className="w-4 h-4 ml-1" />
                  {tx("tour.dashboard.next")}
                </>
              )
            ) : (
              tx("tour.dashboard.understood")
            )}
          </Button>

          {/* Start Over - only on last step */}
          {isLast && showTip && (
            <button
              onClick={handleReset}
              className="w-full flex items-center justify-center gap-2 text-xs text-[var(--muted-foreground)] mt-3 hover:text-[var(--foreground)] transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              {tx("tour.dashboard.restartFromBeginning")}
            </button>
          )}
        </div>

        {/* Skip */}
        <button
          onClick={() => {
            localStorage.setItem(ONBOARDING_KEY, "done");
            onComplete();
          }}
          className="w-full text-center text-xs text-[var(--muted-foreground)] mt-4 hover:text-[var(--foreground)] transition-colors"
        >
          {tx("tour.dashboard.skipTutorial")}
        </button>
      </div>
    </div>
  );
}

export function hasCompletedOnboarding(): boolean {
  if (typeof window === "undefined") return true;
  return localStorage.getItem(ONBOARDING_KEY) === "done";
}
