import { Link, useLocation } from "react-router-dom";
import { Home, ShoppingBag, Plus, MessageSquare, User as UserIcon } from "lucide-react";
import { useMessagingStore } from "@/features/messaging/store/useMessagingStore";
import { useAuth } from "@/features/auth/contexts/AuthContext";

export function BottomNav() {
  const location = useLocation();
  const { isAuthenticated } = useAuth();
  const totalUnreadCount = useMessagingStore((state) => state.totalUnreadCount);

  const navItems = [
    { label: "Home", to: "/", icon: Home },
    { label: "Market", to: "/marketplace", icon: ShoppingBag },
    { label: "Create", to: isAuthenticated ? "/dashboard/new" : "/signin", icon: Plus, isSpecial: true },
    { label: "Inbox", to: isAuthenticated ? "/messages" : "/signin", icon: MessageSquare, badge: totalUnreadCount },
    { label: "Account", to: isAuthenticated ? "/dashboard" : "/signin", icon: UserIcon },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[60] md:hidden pb-6">
      <div className="mx-6 px-3 py-2 rounded-[2.5rem] bg-white/80 dark:bg-black/80 backdrop-blur-3xl border border-black/[0.08] dark:border-white/[0.08] shadow-[0_20px_50px_rgba(0,0,0,0.15)]">
        <div className="flex items-center justify-between relative">
          {navItems.map((item) => {
            const isActive = location.pathname === item.to || (item.to !== '/' && location.pathname.startsWith(item.to));
            
            if (item.isSpecial) {
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className="flex items-center justify-center relative -mt-12"
                >
                  <div className="h-16 w-16 rounded-full bg-gradient-to-br from-primary via-primary to-accent flex items-center justify-center text-white shadow-[0_15px_30px_rgba(var(--primary),0.4)] border-[6px] border-[#fafafa] dark:border-[#0a0a0a] active:scale-90 transition-all duration-300">
                    <item.icon className="h-8 w-8 stroke-[3px]" />
                  </div>
                </Link>
              );
            }

            return (
              <Link
                key={item.to}
                to={item.to}
                className="flex flex-col items-center gap-1.5 py-2 px-1 relative flex-1"
              >
                <div className={`transition-all duration-500 relative ${isActive ? "text-primary scale-110" : "text-textMuted/60 hover:text-textPrimary"}`}>
                  <item.icon className={`h-5 w-5 ${isActive ? 'stroke-[2.5px]' : 'stroke-[2px]'}`} />
                  {item.badge !== undefined && item.badge > 0 && (
                    <span className="absolute -top-2 -right-2 flex h-4.5 min-w-[18px] items-center justify-center rounded-full bg-destructive px-1 text-[8px] font-black text-white ring-4 ring-white dark:ring-black">
                      {item.badge}
                    </span>
                  )}
                </div>
                <span className={`text-[9px] font-black uppercase tracking-tighter transition-all duration-500 leading-none ${isActive ? "text-primary opacity-100 translate-y-0" : "opacity-0 translate-y-2 h-0"}`}>
                  {item.label}
                </span>
                {isActive && (
                  <div className="absolute -bottom-1.5 h-1.5 w-1.5 rounded-full bg-primary shadow-[0_0_10px_rgba(var(--primary),0.5)]" />
                )}
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
