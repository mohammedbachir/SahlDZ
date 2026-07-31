import { Button } from "@/components/ui/button";
import { Check, ArrowLeft, Lightbulb } from "lucide-react";
import { TourAnnotation } from "@/components/TourAnnotation";

export type Annotation = {
  target: string;
  label: string;
  text: string;
};

export type TourStep = {
  id: string;
  title: string;
  explanation: string;
  tip: string;
  annotations: Annotation[];
};

export const tourSteps: TourStep[] = [
  {
    id: "orders",
    title: "الطلبات",
    explanation: "شاشة الطلبات: كل طلب يدخل مطعمك يظهر هنا. الأعمدة تمثل مراحل الطلب من الاستلام إلى التوصيل.",
    tip: "الألوان تميز أولوية الطلب — الأحمر مستعجل، الأخضر عادي",
    annotations: [
      {
        target: "[data-annotate='orders-columns']",
        label: "أعمدة الطلبات",
        text: "كل عمود يمثل مرحلة: جديد، قيد التحضير، جاهز، مكتمل. الطلبات تنتقل تلقائياً بين الأعمدة حسب حالتها.",
      },
      {
        target: "[data-annotate='orders-card']",
        label: "بطاقة الطلب",
        text: "رقم الطلب، اسم الزبون، المبلغ الإجمالي، الوقت المنقضي. كل بطاقة تمثل طلباً واحداً.",
      },
      {
        target: "[data-annotate='orders-actions']",
        label: "إجراءات الطلب",
        text: "أزرار أسفل كل طلب لتحديث حالته: قبول، تجهيز، تسليم. تغيير الحالة ينقل البطاقة للعمود التالي.",
      },
    ],
  },
  {
    id: "menu",
    title: "القائمة",
    explanation: "قائمة الطعام: كل الأطباق التي تقدمها. تضيف أصنافاً جديدة وتحدد أسعارها وتصنيفاتها.",
    tip: "أضف صوراً للأطباق — المطاعم التي تستخدم صوراً تحصل على طلبات أكثر",
    annotations: [
      {
        target: "[data-annotate='menu-card']",
        label: "بطاقة الصنف",
        text: "صورة الصنف، اسمه، سعره، وتصنيفه (مقبلات، رئيسي، مشروبات، حلويات). كل بطاقة تمثل صنفاً في القائمة.",
      },
      {
        target: "[data-annotate='menu-controls']",
        label: "أزرار التحكم",
        text: "تعديل بيانات الصنف، إخفاءه مؤقتاً، أو حذفه. التغييرات تنعكس فوراً على قائمة QR.",
      },
      {
        target: "[data-annotate='menu-add']",
        label: "إضافة صنف جديد",
        text: "زر إضافة + يفتح نموذج إدخال: اسم، سعر، صورة، تصنيف. الصنف يظهر مباشرة بعد الحفظ.",
      },
    ],
  },
  {
    id: "tables",
    title: "الطاولات",
    explanation: "إدارة طاولات المطعم. كل طاولة لها رمز QR خاص — الزبون يمسحه ويطلب مباشرة.",
    tip: "اطبع QR على ورق لاصق شفاف وضعه على حافة الطاولة ليبقى نظيفاً",
    annotations: [
      {
        target: "[data-annotate='tables-card']",
        label: "بطاقة الطاولة",
        text: "رقم الطاولة، حالتها (فارغة، مشغولة، تنتظر الدفع)، ورمز QR خاص يطلب منه الزبون.",
      },
      {
        target: "[data-annotate='tables-qr']",
        label: "رمز QR",
        text: "الزبون يمسح الرمز بجواله، تفتح له قائمة الطعام، يطلب ويدفع إلكترونياً دون حاجة للنادل.",
      },
      {
        target: "[data-annotate='tables-add']",
        label: "إدارة الطاولات",
        text: "أضف طاولات جديدة وحدد عدد الكراسي. النظام يولد QR تلقائياً لكل طاولة تضيفها.",
      },
    ],
  },
  {
    id: "analytics",
    title: "التحليلات",
    explanation: "تقارير مبيعاتك وأرباحك. تعرف أداء مطعمك يومياً، أسبوعياً، وشهرياً.",
    tip: "قارن هذا الأسبوع بالأسبوع الماضي لترى اتجاه النمو",
    annotations: [
      {
        target: "[data-annotate='analytics-cards']",
        label: "بطاقات المؤشرات",
        text: "إجمالي المبيعات، عدد الطلبات، متوسط الفاتورة. هذه الأرقام تتجدد تلقائياً مع كل طلب جديد.",
      },
      {
        target: "[data-annotate='analytics-chart']",
        label: "الرسوم البيانية",
        text: "حركة المبيعات عبر الزمن. الخط البياني يظهر فترات الذروة والركود ليساعدك في تنظيم الموظفين.",
      },
      {
        target: "[data-annotate='analytics-export']",
        label: "تصدير التقارير",
        text: "حمّل التقرير PDF أو صورة. التصدير يشمل كل البيانات المعروضة في الشاشة.",
      },
    ],
  },
  {
    id: "ops",
    title: "إدارة العمليات",
    explanation: "جرد المخزون والوصفات: تتبع المواد الخام، تعرف الكميات المتبقية، وحدد مكونات كل طبق.",
    tip: "تحديد الوصفات بدقة يضمن لك معرفة تكلفة الطبق الفعلية",
    annotations: [
      {
        target: "[data-annotate='ops-tabs']",
        label: "تبويبات الأقسام",
        text: "جرد المخزون: يعرض المواد الخام وكمياتها. الوصفات: تحدد مكونات كل طبق. التنقل بينهما بالضغط على التبويب.",
      },
      {
        target: "[data-annotate='ops-table']",
        label: "جرد المخزون",
        text: "جدول يحتوي على: المادة (اسم الخامة)، الكمية (الرصيد المتبقي)، الوحدة (كغ، لتر، قطعة)، التكلفة (سعر الوحدة). المواد قرب النفاد تظهر باللون البرتقالي.",
      },
      {
        target: "[data-annotate='ops-recipe']",
        label: "الوصفات",
        text: "كل بطاقة تمثل طبقاً: اسم الطبق، مكوناته، تكلفة المكونات، وسعر البيع. الفرق بين التكلفة والسعر يحدد هامش الربح لكل طبق.",
      },
    ],
  },
  {
    id: "reviews",
    title: "التقييمات",
    explanation: "آراء الزبائن في مطعمك. كل تقييم يعطي فرصة لتحسين الخدمة وبناء الثقة.",
    tip: "الرد على التقييمات السلبية يعطيك فرصة لإظهار اهتمامك بالزبائن",
    annotations: [
      {
        target: "[data-annotate='reviews-rating']",
        label: "التقييم العام",
        text: "معدل تقييمات جميع الزبائن (من 5). يظهر في الأعلى ويساعد الزبائن الجدد في تقييم مطعمك.",
      },
      {
        target: "[data-annotate='reviews-card']",
        label: "بطاقة التقييم",
        text: "اسم الزبون، تاريخ الزيارة، عدد النجوم، والتعليق المكتوب. يمكنك الرد على كل تقييم بالضغط على زر الرد.",
      },
      {
        target: "[data-annotate='reviews-stats']",
        label: "توزيع التقييمات",
        text: "رسم بياني يظهر عدد الزبائن حسب التقييم: كم زبون أعطى 5 نجوم، 4 نجوم، إلخ.",
      },
    ],
  },
  {
    id: "settings",
    title: "الإعدادات",
    explanation: "مركز التحكم في مطعمك. بيانات المطعم، الموظفون، الإشعارات، والتوصيل.",
    tip: "أضف موظفيك أولاً ورتب صلاحياتهم قبل تشغيل النظام",
    annotations: [
      {
        target: "[data-annotate='settings-info']",
        label: "بيانات المطعم",
        text: "اسم المطعم، الشعار، العنوان، رقم الهاتف. هذه المعلومات تظهر للزبائن في الفواتير وقائمة QR.",
      },
      {
        target: "[data-annotate='settings-staff']",
        label: "الموظفون",
        text: "أضف موظفين جدد: مدير، كاشير، طباخ، نادل. كل دور له صلاحياته الخاصة في النظام. يرسل دعوة لكل موظف.",
      },
      {
        target: "[data-annotate='settings-notify']",
        label: "الإشعارات والتوصيل",
        text: "ربط تليجرام: تصلك إشعارات الطلبات الجديدة. التوصيل: ضبط مناطق التوصيل وأسعارها.",
      },
    ],
  },
];

export function DashboardTour({
  tourStep,
  showTip,
  onNext,
  onComplete,
  onShowTip,
}: {
  tourStep: number;
  showTip: boolean;
  onNext: () => void;
  onComplete: () => void;
  onShowTip: () => void;
}) {
  const current = tourSteps[tourStep];
  const isLast = tourStep === tourSteps.length - 1;
  const progress = ((tourStep + 1) / tourSteps.length) * 100;
  const visibleAnnotations = current.annotations.slice(0, showTip ? 3 : 1);

  function handleClick() {
    if (!showTip) {
      onShowTip();
      return;
    }
    if (isLast) {
      onComplete();
      return;
    }
    onNext();
  }

  function handleSkip() {
    onComplete();
  }

  return (
    <>
      {/* Content annotations using Floating UI */}
      {visibleAnnotations.map((ann, i) => (
        <TourAnnotation
          key={i}
          target={ann.target}
          label={ann.label}
          text={ann.text}
        />
      ))}

      {/* Arrow coachmark pointing to sidebar */}
      <div className="hidden md:block fixed z-[60]" style={{
        top: `${90 + tourStep * 38}px`,
        right: "268px",
        transition: "top 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)",
      }}>
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
      <div className="fixed bottom-0 inset-x-0 z-[60] bg-[var(--card)] border-t border-[var(--border)] shadow-lg" dir="rtl">
        <div className="h-1 bg-[var(--border)]">
          <div
            className="h-full bg-[var(--primary)] transition-all duration-500 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>

        <div className="max-w-6xl mx-auto px-4 py-2.5 flex items-center gap-4">
          {/* Dots */}
          <div className="hidden sm:flex items-center gap-1.5 shrink-0">
            {tourSteps.map((_, i) => (
              <div
                key={i}
                className={`rounded-full transition-all duration-300 ${
                  i < tourStep
                    ? "w-2 h-2 bg-[var(--primary)]"
                    : i === tourStep
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
                {tourStep + 1} / {tourSteps.length}
              </span>
            </div>
            {!showTip ? (
              <p className="text-xs text-[var(--muted-foreground)] leading-relaxed truncate">
                {current.explanation}
              </p>
            ) : (
              <div className="flex items-center gap-1.5">
                <Lightbulb className="w-3.5 h-3.5 text-[var(--primary)] shrink-0" />
                <p className="text-xs text-[var(--foreground)] font-medium truncate">{current.tip}</p>
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
