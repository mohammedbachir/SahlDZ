import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Check, ArrowLeft, Lightbulb } from "lucide-react";
import { TourAnnotation } from "@/components/TourAnnotation";

const OPS_PATHS = ["/ops", "/ops/inventory", "/ops/recipes"] as const;
type OpsPath = (typeof OPS_PATHS)[number];

type Annotation = {
  target: string;
  label: string;
  text: string;
};

type OpsTourStep = {
  id: string;
  path: OpsPath;
  navIndex: number;
  title: string;
  explanation: string;
  tip: string;
  annotations: Annotation[];
};

export const opsTourSteps: OpsTourStep[] = [
  {
    id: "overview",
    path: "/ops",
    navIndex: 0,
    title: "نظرة عامة",
    explanation:
      "شاشة إدارة العمليات: مؤشرات مالية وتشغيلية للمطعم في مكان واحد، مع قائمة أقسام جانبية للتنقل بين كل أدوات التشغيل.",
    tip: "راجع مؤشر «المكونات الناقصة» أول كل يوم قبل بدء التحضير",
    annotations: [
      {
        target: "[data-annotate='ops-nav']",
        label: "قائمة أقسام العمليات",
        text: "من هنا تنتقل بين: المخزون، جرد المخزون، الوصفات، الموردين، الموظفين، المصاريف، سجل الهدر، الشكاوى، والتقارير. كل قسم له دور محدد في سير عمل المطعم اليومي.",
      },
      {
        target: "[data-annotate='ops-overview-kpis']",
        label: "مؤشرات الأداء",
        text: "إيرادات هذا الشهر، صافي الربح، المصاريف، المكونات الناقصة، الرواتب المعلقة، وتكلفة الهدر. هذه الأرقام محسوبة من بيانات المطعم الحقيقية وتتحدث تلقائياً.",
      },
    ],
  },
  {
    id: "inventory",
    path: "/ops/inventory",
    navIndex: 1,
    title: "المخزون",
    explanation:
      "سجل المواد الخام في المطعم: الكميات المتبقية، حد التنبيه، سعر الوحدة، وحالة كل مادة مع أزرار إدارة لكل صف.",
    tip: "اضبط «حد التنبيه» لكل مادة لتصلك تنبيهات تلقائية قبل نفادها",
    annotations: [
      {
        target: "[data-annotate='ops-inventory-actions']",
        label: "أدوات إدارة المخزون",
        text: "«تصوير الفاتورة» يقرأ فاتورة الشراء بالكاميرا ويرصد المواد والمورد تلقائياً، و«إضافة مكون» يدخل مادة جديدة يدوياً.",
      },
      {
        target: "[data-annotate='ops-inventory-table']",
        label: "جدول المخزون",
        text: "الاسم، الوحدة، الكمية الحالية، حد التنبيه، والسعر لكل وحدة. المادة التي تنخفض عن الحد تظهر بشارة «ناقص»، ولكل صف أزرار: هدر، إضافة/خصم، تعديل، حذف.",
      },
    ],
  },
  {
    id: "recipes",
    path: "/ops/recipes",
    navIndex: 3,
    title: "الوصفات",
    explanation:
      "اربط كل صنف في قائمتك بالمكونات التي يستهلكها. عند تأكيد دفع الطلب يُنقص المخزون تلقائياً حسب الوصفة.",
    tip: "دقق الوصفات أولاً — أي خطأ فيها يعطيك تكلفة خاطئة وربحاً غير دقيق",
    annotations: [
      {
        target: "[data-annotate='ops-recipe-card']",
        label: "بطاقة الوصفة",
        text: "اسم الصنف وسعره وعدد مكوناته. البطاقة التي عليها «بدون وصفة» لم تُربط بعد — افتحها بالضغط عليها لإضافة المكونات.",
      },
      {
        target: "[data-annotate='ops-recipe-cost']",
        label: "التكلفة والربح",
        text: "التكلفة هي مجموع أسعار المكونات المستهلكة في الطبق، والربح هو الفرق بين سعر البيع والتكلفة مع نسبته. الربح السالب يعني أنك تبيع الطبق بخسارة.",
      },
    ],
  },
];

export function OpsTour() {
  const location = useLocation();
  const navigate = useNavigate();
  const stepIndex = Math.max(
    0,
    opsTourSteps.findIndex((s) => location.pathname === s.path),
  );
  const current = opsTourSteps[stepIndex];
  const [showTip, setShowTip] = useState(false);
  const isLast = stepIndex === opsTourSteps.length - 1;
  const progress = ((stepIndex + 1) / opsTourSteps.length) * 100;
  const visibleAnnotations = current.annotations.slice(0, showTip ? current.annotations.length : 1);

  useEffect(() => {
    setShowTip(false);
  }, [current.id]);

  const handleComplete = () => {
    // Full load on the canonical child route so the layout can read the tour params on mount
    window.location.href = "/dashboard/orders?tab=reviews&tour=1";
  };

  const handleClick = () => {
    if (!showTip) {
      setShowTip(true);
      return;
    }
    if (isLast) {
      handleComplete();
      return;
    }
    const next = opsTourSteps[stepIndex + 1];
    navigate({ to: next.path, search: { tour: 1 } });
  };

  const handleSkip = () => {
    window.location.href = "/dashboard/orders?tab=orders&tour=0";
  };

  return (
    <>
      {/* Content annotations using Floating UI */}
      {visibleAnnotations.map((ann, i) => (
        <TourAnnotation key={i} target={ann.target} label={ann.label} text={ann.text} />
      ))}

      {/* Arrow coachmark pointing to the ops sidebar item */}
      <div
        className="hidden md:block fixed z-[60] md:right-[92px] lg:right-[240px]"
        style={{
          top: `${98 + current.navIndex * 38}px`,
          transition: "top 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)",
        }}
      >
        <div className="relative">
          <div className="absolute -right-2 top-1/2 -translate-y-1/2 w-4 h-4 bg-[var(--primary)] rotate-45" />
          <div className="bg-[var(--primary)] rounded-lg px-3 py-2 shadow-lg max-w-[200px]">
            <p className="text-xs text-[#1a1612] font-medium leading-relaxed">
              {showTip ? current.tip : current.explanation}
            </p>
          </div>
        </div>
      </div>

      {/* Sidebar very subtle dim */}
      <div className="fixed right-0 top-0 w-[260px] h-full z-[55] pointer-events-none bg-black/[0.03] hidden md:block" />

      {/* Bottom bar */}
      <div
        className="fixed bottom-0 inset-x-0 z-[60] bg-[var(--card)] border-t border-[var(--border)] shadow-lg"
        dir="rtl"
      >
        <div className="h-1 bg-[var(--border)]">
          <div
            className="h-full bg-[var(--primary)] transition-all duration-500 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>

        <div className="max-w-6xl mx-auto px-4 py-2.5 flex items-center gap-4">
          {/* Dots */}
          <div className="hidden sm:flex items-center gap-1.5 shrink-0">
            {opsTourSteps.map((_, i) => (
              <div
                key={i}
                className={`rounded-full transition-all duration-300 ${
                  i < stepIndex
                    ? "w-2 h-2 bg-[var(--primary)]"
                    : i === stepIndex
                      ? "w-3 h-3 bg-[var(--primary)] ring-2 ring-[var(--primary)]/30"
                      : "w-2 h-2 bg-[var(--border)]"
                }`}
              />
            ))}
          </div>

          {/* Text */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <span className="text-xs font-bold text-[var(--primary)]">{current.title}</span>
              <span className="text-[10px] text-[var(--muted-foreground)]">
                {stepIndex + 1} / {opsTourSteps.length}
              </span>
            </div>
            {!showTip ? (
              <p className="text-xs text-[var(--muted-foreground)] leading-relaxed truncate">
                {current.explanation}
              </p>
            ) : (
              <div className="flex items-center gap-1.5">
                <Lightbulb className="w-3.5 h-3.5 text-[var(--primary)] shrink-0" />
                <p className="text-xs text-[var(--foreground)] font-medium truncate">
                  {current.tip}
                </p>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleSkip}
              className="text-[10px] text-[var(--muted-foreground)] hover:text-[var(--foreground)] whitespace-nowrap transition-colors"
            >
              تخطي
            </button>
            <Button
              size="sm"
              onClick={handleClick}
              className="bg-[var(--primary)] text-[#1a1612] hover:bg-[var(--primary)]/90 h-7 text-xs font-bold whitespace-nowrap"
            >
              {!showTip ? (
                "فهمت"
              ) : isLast ? (
                <>
                  أنهينا
                  <Check className="w-3.5 h-3.5 mr-1" />
                </>
              ) : (
                <>
                  التالي
                  <ArrowLeft className="w-3.5 h-3.5 mr-1" />
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
