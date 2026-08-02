import { Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import { LayoutDashboard, LogOut } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type Restaurant = { name: string; logo_url: string | null };

export function AccountShell({
  children,
}: {
  children: (restaurant: Restaurant | null) => ReactNode;
}) {
  const navigate = useNavigate();
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return;
      const { data } = await supabase
        .from("restaurants")
        .select("name, logo_url")
        .eq("owner_id", u.user.id)
        .maybeSingle();
      if (data) setRestaurant(data);
    })();
  }, []);

  // Re-read restaurant from localStorage when settings updates it
  useEffect(() => {
    const onStorage = () => {
      const saved = localStorage.getItem("sahl_dz_restaurant");
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          setRestaurant({ name: parsed.name, logo_url: parsed.logo_url });
        } catch {
          /* ignore */
        }
      }
    };
    window.addEventListener("restaurant-updated", onStorage);
    return () => window.removeEventListener("restaurant-updated", onStorage);
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/login" });
  };

  return (
    <div className="min-h-screen flex flex-col bg-[var(--background)]" dir="rtl">
      {/* Header */}
      <header className="h-14 md:h-16 bg-[var(--card)] border-b border-[var(--border)] flex items-center justify-between px-4 md:px-6 sticky top-0 z-30">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-lg bg-[var(--primary)] flex items-center justify-center text-[#1a1612] font-bold text-sm shrink-0 overflow-hidden">
            {restaurant?.logo_url ? (
              <img
                src={restaurant.logo_url}
                alt={restaurant.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <span>{restaurant?.name?.[0] ?? "م"}</span>
            )}
          </div>
          <div className="leading-tight min-w-0">
            <div className="font-bold text-sm truncate text-[var(--foreground)]">
              {restaurant?.name ?? "حساب المالك"}
            </div>
            <div className="text-[11px] text-[var(--muted-foreground)]">حساب المالك</div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link
            to="/ops"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[var(--primary)]/10 text-[var(--primary)] hover:bg-[var(--primary)]/20 transition-colors"
          >
            <LayoutDashboard className="w-4 h-4" />
            <span className="hidden sm:inline">إدارة العمليات</span>
            <span className="sm:hidden">العمليات</span>
          </Link>
          <button
            onClick={handleLogout}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-[var(--muted-foreground)] hover:bg-[var(--muted)] hover:text-[var(--foreground)] transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">تسجيل الخروج</span>
          </button>
        </div>
      </header>

      <main className="flex-1 p-4 md:p-6">{children(restaurant)}</main>
    </div>
  );
}
