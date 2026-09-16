import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Settings,
  Users,
  Sparkles,
  Palette,
  ShoppingBag,
  Bike,
  ChevronLeft
} from "lucide-react";




export function SettingsHubView({ basePath }: { basePath: string }) {
  const SETTINGS_CARDS = [
    {
      title: "إعدادات المطعم",
      description: "تعديل اسم المطعم، الشعار، ورابط خرائط جوجل، ورقم التسجيل.",
      icon: Settings,
      to: `${basePath}/restaurant`,
      color: "from-blue-500/20 to-blue-500/5",
      iconColor: "text-blue-600",
    },
    {
      title: "الموظفون",
      description: "إضافة وحذف الموظفين وتعديل صلاحياتهم (كاشير، نادل، مطبخ...).",
      icon: Users,
      to: `${basePath}/employees`,
      color: "from-purple-500/20 to-purple-500/5",
      iconColor: "text-purple-600",
    },
    {
      title: "صفحة الترحيب (Splash)",
      description: "تخصيص الشاشة الأولى التي تظهر للعميل عند مسح QR الطاولة.",
      icon: Sparkles,
      to: `${basePath}/welcome`,
      color: "from-amber-500/20 to-amber-500/5",
      iconColor: "text-amber-600",
    },
    {
      title: "شكل المنيو",
      description: "تغيير الألوان، النسق (Layout)، ومظهر المنيو الرقمي للعميل.",
      icon: Palette,
      to: `${basePath}/appearance`,
      color: "from-pink-500/20 to-pink-500/5",
      iconColor: "text-pink-600",
    },
    {
      title: "نظام التوصيل (Delivery)",
      description: "تفعيل وتخصيص رابط الطلب من المنزل ومشاركته عبر مواقع التواصل.",
      icon: Bike,
      to: `${basePath}/delivery`,
      color: "from-green-500/20 to-green-500/5",
      iconColor: "text-green-600",
    },
    {
      title: "الطلب السريع (Takeaway)",
      description: "إنشاء وطباعة رمز QR للطلب السريع من الطاولة أو واجهة المحل.",
      icon: ShoppingBag,
      to: `${basePath}/takeaway`,
      color: "from-rose-500/20 to-rose-500/5",
      iconColor: "text-rose-600",
    },
  ];

  return (
    <div className="space-y-6" dir="rtl">
      {/* Premium header */}
      <div className="glass shadow-glass rounded-3xl p-6 md:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border border-border/50 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-transparent opacity-50"></div>
        <div className="relative z-10 flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center text-white shadow-xl shadow-primary/20 shrink-0">
            <Settings className="w-7 h-7" />
          </div>
          <div className="min-w-0">
            <h1 className="text-2xl md:text-3xl font-bold text-foreground tracking-tight">
              إعدادات النظام
            </h1>
            <p className="text-sm md:text-base text-muted-foreground mt-1">
              إدارة كافة تفاصيل مطعمك، الموظفين، والمظهر بكل سهولة
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {SETTINGS_CARDS.map((card, idx) => (
          <Link
            key={idx}
            to={card.to}
            className="group glass shadow-glass hover:shadow-glass-lg rounded-3xl p-6 border border-border/50 transition-all duration-300 hover:-translate-y-1 relative overflow-hidden flex flex-col h-full"
          >
            <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${card.color} rounded-bl-full -mr-16 -mt-16 transition-transform duration-500 group-hover:scale-110`}></div>
            
            <div className="relative z-10 mb-4 flex items-center justify-between">
              <div className={`w-12 h-12 rounded-2xl bg-white shadow-sm border border-border/50 flex items-center justify-center ${card.iconColor}`}>
                <card.icon className="w-6 h-6" />
              </div>
              <div className="w-8 h-8 rounded-full bg-muted/50 flex items-center justify-center text-muted-foreground group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                <ChevronLeft className="w-4 h-4" />
              </div>
            </div>
            
            <div className="relative z-10 flex-1">
              <h3 className="text-lg font-bold mb-2">{card.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {card.description}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
