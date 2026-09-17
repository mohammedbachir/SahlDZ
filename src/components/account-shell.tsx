import { Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import { LayoutDashboard, LogOut } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { tx } from "@/lib/ops-tx";

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
    localStorage.removeItem("sahl_dz_preview_role");
    localStorage.removeItem("sahl_dz_auth_cache");
    await supabase.auth.signOut();
    navigate({ to: "/login" });
  };

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground" dir="rtl">
      {/* Header */}
      <header className="h-12 bg-card border-b border-border flex items-center justify-between px-4 sm:px-6 sticky top-0 z-30">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-7 h-7 rounded-sm bg-primary text-primary-foreground flex items-center justify-center font-bold text-xs shrink-0 overflow-hidden">
            {restaurant?.logo_url ? (
              <img
                src={restaurant.logo_url}
                alt={restaurant.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <span>{restaurant?.name?.[0] ?? tx("account.fallbackInitial")}</span>
            )}
          </div>
          <div className="leading-tight min-w-0">
            <div className="font-semibold text-xs truncate text-foreground">
              {restaurant?.name ?? tx("account.ownerAccount")}
            </div>
            <div className="text-[10px] text-muted-foreground">{tx("account.ownerAccount")}</div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link
            to="/ops"
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-sm text-xs font-medium bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
          >
            <LayoutDashboard className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{tx("account.operationsManagement")}</span>
            <span className="sm:hidden">{tx("account.operationsShort")}</span>
          </Link>
          <button
            onClick={handleLogout}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-sm text-xs font-medium text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{tx("account.logout")}</span>
          </button>
        </div>
      </header>

      <main className="flex-1 p-4 sm:p-6">{children(restaurant)}</main>
    </div>
  );
}
