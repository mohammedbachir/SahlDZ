import { createFileRoute, Link, redirect, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  ShoppingBag,
  Menu,
  Users,
  Package,
  BarChart3,
  Send,
  Check,
  ArrowLeft,
  ChevronDown,
  Star,
  Smartphone,
  Globe,
  Shield,
} from "lucide-react";
import { freshCachedTarget, getPostAuthRedirect } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { AnimatedCounter } from "@/components/ui/animated-counter";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  beforeLoad: async () => {
    if (typeof window === "undefined") return;
    const fast = freshCachedTarget();
    if (fast) {
      throw redirect({ to: fast });
    }
    const { data } = await supabase.auth.getSession();
    if (data.session?.user?.id) {
      const to = await getPostAuthRedirect(data.session.user.id);
      throw redirect({ to });
    }
  },
  head: () => ({
    meta: [
      { title: "Sahl DZ - نظام إدارة المطاعم في الجزائر" },
      {
        name: "description",
        content: "Sahl DZ هو نظام سحابي متكامل لإدارة المطاعم في الجزائر. إدارة الطلبات، القائمة، الموظفين، المخزون، والتحليلات.",
      },
    ],
    links: [
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700;800;900&display=swap",
      },
    ],
  }),
  component: LandingPage,
});

/* ============================================
   DATA
   ============================================ */

const features = [
  {
    icon: ShoppingBag,
    title: "إدارة الطلبات",
    description: "تتبع الطلبات من المطبخ للزبون مع إشعارات فورية",
  },
  {
    icon: Menu,
    title: "القائمة الرقمية",
    description: "QR Code لكل طاولة مع خيارات التوصيل والاستلام السريع",
  },
  {
    icon: Users,
    title: "إدارة الموظفين",
    description: "حسابات منفصلة لكل دور مع نظام PIN آمن",
  },
  {
    icon: Package,
    title: "المخزون والمشتريات",
    description: "جرد المكونات وتنبيه نفاد وتتبع المشتريات",
  },
  {
    icon: BarChart3,
    title: "التحليلات والتقارير",
    description: "تقارير مبيعات وأرباح مع تصدير PDF و Excel",
  },
  {
    icon: Send,
    title: "ربط تليجرام",
    description: "إشعارات الطلبات فورية مع بوت مخصص للمطعم",
  },
];

const plans = [
  {
    name: "Starter",
    nameAr: "المبتدئ",
    price: 0,
    period: "مجاني",
    description: "للمطاعم الصغيرة التي تريد البدء",
    features: [
      "طاولة واحدة",
      "50 صنف في القائمة",
      "طلبات محدودة",
      "تقارير أساسية",
      "دعم عبر البريد",
    ],
    cta: "ابدأ مجاناً",
    popular: false,
  },
  {
    name: "Growth",
    nameAr: "النمو",
    price: 4900,
    period: "شهرياً",
    description: "للمطاعم النامية التي تريد النمو",
    features: [
      "10 طاولات",
      "أصناف غير محدودة",
      "طلبات غير محدودة",
      "توصيل + استلام سريع",
      "تليجرام إشعارات",
      "تقارير متقدمة",
      "دعم سريع",
    ],
    cta: "ابدأ تجربة مجانية",
    popular: true,
  },
  {
    name: "Enterprise",
    nameAr: "المؤسسات",
    price: 14900,
    period: "شهرياً",
    description: "للمؤسسات الكبيرة والسلسلات",
    features: [
      "طاولات غير محدودة",
      "جميع مميزات Growth",
      "API مخصص",
      "ربط مع أنظمة خارجية",
      "مدير حساب مخصص",
      "دعم هاتفي 24/7",
    ],
    cta: "تواصل معنا",
    popular: false,
  },
];

const steps = [
  {
    number: "01",
    title: "سجّل حسابك",
    description: "إنشاء حساب مجاني في أقل من دقيقة",
  },
  {
    number: "02",
    title: "أضف مطعمك",
    description: "اسم وشعار وقائمة أطباقك",
  },
  {
    number: "03",
    title: "ابدأ الاستقبال",
    description: "اطبع QR Code وابدأ في استقبال الطلبات",
  },
];

const testimonials = [
  {
    name: "محمد بن عمر",
    role: "مالك مطعم",
    content: "Sahl DZ غيّر طريقة إدارة مطعمي. أصبحت أتتبع كل شيء من هواتفي.",
    rating: 5,
  },
  {
    name: "فاطمة الزهراء",
    role: "مديرة مطعم",
    content: "النظام سهل جداً والدعم الفني ممتاز. أنصح به كل مطاعم الجزائر.",
    rating: 5,
  },
  {
    name: "أحمد سعيد",
    role: "صاحب مطعم",
    content: "التقارير ساعدتني أعرف أرباحي بدقة وأخطط للمستقبل.",
    rating: 5,
  },
];

const faqs = [
  {
    question: "هل النظام يدعم اللغة العربية؟",
    answer: "نعم، النظام مصمم بالكامل للغة العربية مع دعم كامل لـ RTL.",
  },
  {
    question: "كيف يعمل نظام الطلبات بالـ QR؟",
    answer: "كل طاولة تحصل على QR Code فريد. الزبون يمسحه ويظهر له القائمة مباشرة.",
  },
  {
    question: "هل يمكنني تجربة النظام مجاناً؟",
    answer: "نعم، خطة Starter مجانية بالكامل ولا تتطلب بطاقة ائتمان.",
  },
  {
    question: "كيف أربط تليجرام مع النظام؟",
    answer: "من صفحة الإعدادات، يمكنك ربط حسابك مع بوت تليجرام في خطوات بسيطة.",
  },
  {
    question: "هل النظام يدعم التوصيل؟",
    answer: "نعم، النظام يدعم التوصيل مع تتبع الطلبات وإشعارات للعملاء.",
  },
];

/* ============================================
   COMPONENTS
   ============================================ */

function Logo({ size = 40 }: { size?: number }) {
  return (
    <div
      className="flex items-center justify-center rounded-lg bg-[var(--primary)]"
      style={{ width: size, height: size }}
    >
      <span className="text-white font-bold" style={{ fontSize: size * 0.4 }}>
        S
      </span>
    </div>
  );
}

function Navbar() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <nav
      className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${
        scrolled
          ? "bg-[var(--card)] border-b border-[var(--border)] py-3"
          : "bg-transparent py-5"
      }`}
    >
      <div className="container-sahl flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Logo size={36} />
          <span className="font-bold text-lg text-[var(--foreground)]">Sahl DZ</span>
        </div>
        <div className="flex items-center gap-3">
          <Link to="/login" className="text-sm font-semibold text-[var(--foreground)] hover:text-[var(--primary)] transition-colors">
            تسجيل الدخول
          </Link>
          <Link to="/signup">
            <Button size="sm" className="bg-[var(--primary)] text-[#1a1612] hover:bg-[var(--primary)]/90">
              ابدأ مجاناً
            </Button>
          </Link>
        </div>
      </div>
    </nav>
  );
}

function HeroSection() {
  return (
    <section className="relative pt-32 pb-20 md:pt-40 md:pb-28">
      <div className="container-sahl">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold text-[var(--foreground)] mb-6">
            إدارة مطعمك
            <br />
            <span className="text-[var(--primary)]">بسهولة</span>
          </h1>

          <p className="text-lg md:text-xl text-[var(--muted-foreground)] mb-10 max-w-2xl mx-auto">
            نظام سحابي متكامل للمطاعم في الجزائر. إدارة الطلبات، القائمة، الموظفين، المخزون، والتحليلات في مكان واحد.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link to="/signup">
              <Button size="lg" className="bg-[var(--primary)] text-[#1a1612] hover:bg-[var(--primary)]/90 px-8">
                ابدأ مجاناً
                <ArrowLeft className="w-5 h-5 mr-2" />
              </Button>
            </Link>
            <a href="#features">
              <Button variant="outline" size="lg" className="px-8">
                اكتشف المزيد
                <ChevronDown className="w-5 h-5 mr-2" />
              </Button>
            </a>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-16">
            <div className="text-center">
              <div className="text-3xl font-bold text-[var(--primary)]">
                <AnimatedCounter value={500} suffix="+" />
              </div>
              <div className="text-sm text-[var(--muted-foreground)] mt-1">مطعم نشط</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-[var(--primary)]">
                <AnimatedCounter value={50000} suffix="+" />
              </div>
              <div className="text-sm text-[var(--muted-foreground)] mt-1">طلب شهرياً</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-[var(--primary)]">
                <AnimatedCounter value={99} suffix="%" />
              </div>
              <div className="text-sm text-[var(--muted-foreground)] mt-1">رضا العملاء</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-[var(--primary)]">
                <AnimatedCounter value={24} suffix="/7" />
              </div>
              <div className="text-sm text-[var(--muted-foreground)] mt-1">دعم فني</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function FeaturesSection() {
  return (
    <section id="features" className="py-20 md:py-28">
      <div className="container-sahl">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-[var(--foreground)] mb-4">
            كل ما تحتاجه لإدارة مطعمك
          </h2>
          <p className="text-[var(--muted-foreground)] max-w-2xl mx-auto">
            نظام متكامل يوفر لك الوقت ويحسن أداء مطعمك
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {features.map((feature, index) => (
            <div
              key={index}
              className="bg-[var(--card)] border border-[var(--border)] rounded-lg p-5 hover:border-[var(--primary)]/30 transition-colors"
            >
              <div className="w-10 h-10 rounded-lg bg-[var(--primary)]/10 flex items-center justify-center mb-3">
                <feature.icon className="w-5 h-5 text-[var(--primary)]" />
              </div>
              <h3 className="text-base font-bold text-[var(--foreground)] mb-2">
                {feature.title}
              </h3>
              <p className="text-sm text-[var(--muted-foreground)] leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function PricingSection() {
  return (
    <section id="pricing" className="py-20 md:py-28 bg-[var(--foreground)]">
      <div className="container-sahl">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-white mt-3 mb-4">
            اختر الخطة المناسبة لك
          </h2>
          <p className="text-white/60 max-w-2xl mx-auto">
            خطط مرنة تناسب جميع أحجام المطاعم
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {plans.map((plan, index) => (
            <div
              key={index}
              className={`relative rounded-xl p-6 transition-all duration-300 hover:-translate-y-1 ${
                plan.popular
                  ? "bg-[#D4A853]/20 border-2 border-[#D4A853]"
                  : "bg-white/5 border border-white/10 hover:border-white/20"
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded bg-[#D4A853] text-white text-xs font-semibold">
                  الأكثر شعبية
                </div>
              )}

              <div className="text-center mb-6">
                <h3 className="text-lg font-bold text-white mb-1">{plan.nameAr}</h3>
                <p className="text-xs text-white/50">{plan.description}</p>
              </div>

              <div className="text-center mb-6">
                <div className="flex items-baseline justify-center gap-1">
                  {plan.price === 0 ? (
                    <span className="text-3xl font-bold text-[#D4A853]">مجاني</span>
                  ) : (
                    <>
                      <span className="text-3xl font-bold text-white">
                        {plan.price.toLocaleString("ar-DZ")}
                      </span>
                      <span className="text-sm text-white/50">دج</span>
                    </>
                  )}
                </div>
                <span className="text-xs text-white/50">{plan.period}</span>
              </div>

              <ul className="space-y-2.5 mb-6">
                {plan.features.map((feature, i) => (
                  <li key={i} className="flex items-center gap-2.5">
                    <Check className="w-4 h-4 text-[#D4A853] shrink-0" />
                    <span className="text-sm text-white/80">{feature}</span>
                  </li>
                ))}
              </ul>

              <Link to="/signup" className="block">
                <button
                  className={`w-full py-2.5 rounded-lg font-semibold text-sm transition-colors ${
                    plan.popular
                      ? "bg-[#D4A853] text-[#1a1612] hover:bg-[#D4A853]/90"
                      : "border border-white/20 text-white hover:bg-white/10"
                  }`}
                >
                  {plan.cta}
                </button>
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function StepsSection() {
  return (
    <section className="py-20 md:py-28">
      <div className="container-sahl">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-[var(--foreground)] mb-4">
            3 خطوات للبدء
          </h2>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
          {steps.map((step, index) => (
            <div key={index} className="text-center">
              <div className="w-14 h-14 rounded-full bg-[var(--primary)] flex items-center justify-center mx-auto mb-5 text-xl font-bold text-white">
                {step.number}
              </div>
              <h3 className="text-lg font-bold text-[var(--foreground)] mb-2">
                {step.title}
              </h3>
              <p className="text-sm text-[var(--muted-foreground)]">{step.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function TestimonialsSection() {
  return (
    <section className="py-20 md:py-28 bg-[var(--foreground)]">
      <div className="container-sahl">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            ماذا يقول عملاؤنا
          </h2>
        </div>

        <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {testimonials.map((testimonial, index) => (
            <div
              key={index}
              className="bg-white/5 border border-white/10 rounded-xl p-5 hover:border-[#D4A853]/30 transition-colors"
            >
              <div className="flex gap-1 mb-3">
                {Array.from({ length: testimonial.rating }).map((_, i) => (
                  <Star
                    key={i}
                    className="w-4 h-4 fill-[#D4A853] text-[#D4A853]"
                  />
                ))}
              </div>
              <p className="text-sm text-white/70 mb-4 leading-relaxed">
                "{testimonial.content}"
              </p>
              <div>
                <div className="font-semibold text-sm text-white">{testimonial.name}</div>
                <div className="text-xs text-white/50">{testimonial.role}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function FAQSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <section id="faq" className="py-20 md:py-28">
      <div className="container-sahl">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-[var(--foreground)] mb-4">
            الأسئلة الشائعة
          </h2>
        </div>

        <div className="max-w-3xl mx-auto space-y-3">
          {faqs.map((faq, index) => (
            <div
              key={index}
              className="border border-[var(--border)] rounded-lg overflow-hidden"
            >
              <button
                onClick={() => setOpenIndex(openIndex === index ? null : index)}
                className="w-full flex items-center justify-between p-4 text-right hover:bg-[var(--muted)]/50 transition-colors"
              >
                <span className="font-semibold text-sm text-[var(--foreground)]">
                  {faq.question}
                </span>
                <ChevronDown
                  className={`w-4 h-4 text-[var(--muted-foreground)] transition-transform ${
                    openIndex === index ? "rotate-180" : ""
                  }`}
                />
              </button>
              {openIndex === index && (
                <div className="px-4 pb-4 text-sm text-[var(--muted-foreground)] leading-relaxed">
                  {faq.answer}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function CTASection() {
  return (
    <section className="py-20 md:py-28 bg-[#D4A853]">
      <div className="container-sahl text-center">
        <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
          جاهز لبدء رحلتك؟
        </h2>
        <p className="text-white/80 mb-8 max-w-xl mx-auto">
          سجّل الآن واحصل على حساب مجاني بدون بطاقة ائتمان
        </p>
        <Link to="/signup">
          <button className="inline-flex items-center justify-center px-8 py-3 rounded-lg bg-white text-[#1a1612] font-semibold text-sm hover:bg-white/90 transition-colors">
            ابدأ مجاناً الآن
            <ArrowLeft className="w-5 h-5 mr-2" />
          </button>
        </Link>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="py-10 border-t border-[var(--border)]">
      <div className="container-sahl">
        <div className="grid md:grid-cols-4 gap-8 mb-8">
          <div>
            <div className="flex items-center gap-2.5 mb-3">
              <Logo size={28} />
              <span className="font-bold text-[var(--foreground)]">Sahl DZ</span>
            </div>
            <p className="text-xs text-[var(--muted-foreground)] leading-relaxed">
              نظام سحابي متكامل لإدارة المطاعم في الجزائر
            </p>
          </div>

          <div>
            <h4 className="font-semibold text-sm text-[var(--foreground)] mb-3">المنتج</h4>
            <ul className="space-y-1.5">
              <li><a href="#features" className="text-xs text-[var(--muted-foreground)] hover:text-[var(--primary)] transition-colors">المميزات</a></li>
              <li><a href="#pricing" className="text-xs text-[var(--muted-foreground)] hover:text-[var(--primary)] transition-colors">الأسعار</a></li>
              <li><a href="#faq" className="text-xs text-[var(--muted-foreground)] hover:text-[var(--primary)] transition-colors">الأسئلة الشائعة</a></li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-sm text-[var(--foreground)] mb-3">الدعم</h4>
            <ul className="space-y-1.5">
              <li><a href="#" className="text-xs text-[var(--muted-foreground)] hover:text-[var(--primary)] transition-colors">تواصل معنا</a></li>
              <li><a href="#" className="text-xs text-[var(--muted-foreground)] hover:text-[var(--primary)] transition-colors">التوثيق</a></li>
              <li><a href="#" className="text-xs text-[var(--muted-foreground)] hover:text-[var(--primary)] transition-colors">الحالة</a></li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-sm text-[var(--foreground)] mb-3">القانوني</h4>
            <ul className="space-y-1.5">
              <li><a href="#" className="text-xs text-[var(--muted-foreground)] hover:text-[var(--primary)] transition-colors">سياسة الخصوصية</a></li>
              <li><a href="#" className="text-xs text-[var(--muted-foreground)] hover:text-[var(--primary)] transition-colors">شروط الاستخدام</a></li>
            </ul>
          </div>
        </div>

        <div className="flex flex-col md:flex-row items-center justify-between pt-6 border-t border-[var(--border)]">
          <p className="text-xs text-[var(--muted-foreground)]">
            © {new Date().getFullYear()} Sahl DZ. جميع الحقوق محفوظة.
          </p>
          <div className="flex items-center gap-3 mt-3 md:mt-0">
            <a href="#" className="text-[var(--muted-foreground)] hover:text-[var(--primary)] transition-colors">
              <Globe className="w-4 h-4" />
            </a>
            <a href="#" className="text-[var(--muted-foreground)] hover:text-[var(--primary)] transition-colors">
              <Smartphone className="w-4 h-4" />
            </a>
            <a href="#" className="text-[var(--muted-foreground)] hover:text-[var(--primary)] transition-colors">
              <Shield className="w-4 h-4" />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}

/* ============================================
   MAIN PAGE
   ============================================ */

function LandingPage() {
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;
    const fast = freshCachedTarget();
    if (fast) {
      navigate({ to: fast });
      return;
    }
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (cancelled || !data.session?.user?.id) return;
      const to = await getPostAuthRedirect(data.session.user.id);
      if (!cancelled) navigate({ to });
    })();
    return () => {
      cancelled = true;
    };
  }, [navigate]);

  return (
    <div className="min-h-screen" dir="rtl">
      <Navbar />
      <HeroSection />
      <FeaturesSection />
      <PricingSection />
      <StepsSection />
      <TestimonialsSection />
      <FAQSection />
      <CTASection />
      <Footer />
    </div>
  );
}
