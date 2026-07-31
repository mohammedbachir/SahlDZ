import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  ShoppingBag,
  Menu,
  LayoutGrid,
  BarChart3,
  Star,
  Settings,
  ArrowLeft,
  Check,
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
    title: "إدارة الطلبات",
    description: "هنا تشوف كل طلبات المطعم لحظياً. الطلبات الجديدة، قيد التحضير، والجاهزة. تقدر تغير حالة كل طلب بضغطة واحدة.",
    tip: "ابدأ من هنا كل يوم — هذي أهم شاشة عندك",
  },
  {
    id: "menu",
    icon: Menu,
    title: "القائمة",
    description: "تضيف أطباقك وتصنفاتها وسعرها. كل صنف تقدر تصوره وתكتب وصفه. الزبون يشوف هذي القائمة لما يمسح QR.",
    tip: "أضف أصنافك هنا أول شي قبل ما تبدأ",
  },
  {
    id: "tables",
    icon: LayoutGrid,
    title: "الطاولات",
    description: "تدير طاولات المطعم وتولّد QR Code لكل طاولة. الزبون يمسح الكود ويطلب مباشرة من هاتفه.",
    tip: "اطبع الـ QR وحطيه على كل طاولة",
  },
  {
    id: "analytics",
    icon: BarChart3,
    title: "التحليلات",
    description: "تقارير المبيعات والأرباح. تشوف كم باعت اليوم وهل أرباحك تزيد ولا تناقص. تقدر تصدر التقارير لـ PDF أو Excel.",
    tip: "راجعها كل أسبوع عشان تعرف وضعك",
  },
  {
    id: "reviews",
    icon: Star,
    title: "التقييمات",
    description: "تقييمات الزبائن لمطعمك. تشوف رأيهم وتتابع التقييم العام. لو فيه شكوى تقدر ترد عليها.",
    tip: "الزبائن يحبوا المطاعم اللي ترد على تقييماتهم",
  },
  {
    id: "settings",
    icon: Settings,
    title: "الإعدادات",
    description: "تعدّل بيانات مطعمك، تضيف موظفين، تربط تليجرام، وتضبط إعدادات الطلبات. هنا التحكم الكامل في النظام.",
    tip: "عدّل بياناتك هنا عشان تظهر صح للزبائن",
  },
];

export function DashboardOnboarding({ onComplete }: { onComplete: () => void }) {
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

  return (
    <div className="min-h-screen bg-[var(--background)] flex items-center justify-center p-4" dir="rtl">
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
          <h2 className="text-lg font-bold text-[var(--foreground)] mb-2">{step.title}</h2>
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

          {/* Button */}
          <Button
            onClick={handleNext}
            className="w-full bg-[var(--primary)] text-[#1a1612] hover:bg-[var(--primary)]/90"
          >
            {showTip ? (
              isLast ? (
                <>
                  <Check className="w-4 h-4 ml-1" />
                  فهمت، نبدأ!
                </>
              ) : (
                <>
                  <ArrowLeft className="w-4 h-4 ml-1" />
                  التالي
                </>
              )
            ) : (
              "فهمت"
            )}
          </Button>
        </div>

        {/* Skip */}
        <button
          onClick={() => {
            localStorage.setItem(ONBOARDING_KEY, "done");
            onComplete();
          }}
          className="w-full text-center text-xs text-[var(--muted-foreground)] mt-4 hover:text-[var(--foreground)] transition-colors"
        >
          تخطى الشرح
        </button>
      </div>
    </div>
  );
}

export function hasCompletedOnboarding(): boolean {
  if (typeof window === "undefined") return true;
  return localStorage.getItem(ONBOARDING_KEY) === "done";
}
