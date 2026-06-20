import { Link, useLocation, useNavigate } from "react-router-dom";
import { Search, Plus, User as UserIcon, Menu, X, Home, ShoppingBag, Wrench, LayoutDashboard, LogOut, Package, Heart, Shield, Download } from "lucide-react";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/features/auth/contexts/AuthContext";
import { toast } from "sonner";
import { VerifiedBadge } from "./VerifiedBadge";
import { SearchBar } from "./SearchBar";
import { Logo } from "./Logo";
import { isAdmin } from "@/lib/config";
import { BottomNav } from "./BottomNav";
import { motion, AnimatePresence } from "framer-motion";
import { NotificationDropdown } from "@/features/notifications/components/NotificationDropdown";
import { useCart } from "@/features/marketplace/contexts/CartContext";
import { ShoppingCart } from "lucide-react";
import { usePWAInstall } from "@/hooks/usePWAInstall";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const navLinks = [
  { to: "/", label: "Home", icon: Home },
  { to: "/marketplace", label: "Market", icon: ShoppingBag },
  { to: "/services", label: "Services", icon: Wrench },
];

export function Navbar() {
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const initialSearch = searchParams.get("search") || "";
  
  const [mobileOpen, setMobileOpen] = useState(false);
  const [search, setSearch] = useState(initialSearch);
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  
  const { totalItems, setIsCartOpen } = useCart();
  const { isInstallable, handleInstall } = usePWAInstall();

  useEffect(() => {
    setSearch(new URLSearchParams(location.search).get("search") || "");
  }, [location.search]);

  const handleLogout = async () => {
    try {
      await logout();
      toast.success("Successfully logged out");
      navigate("/");
    } catch (error: any) {
      toast.error("Failed to log out");
    }
  };

  return (
    <>
      <nav className="sticky top-0 z-[100] transition-all duration-500 py-4 px-3 sm:px-6">
        <div className="max-w-7xl mx-auto flex h-20 items-center justify-between gap-6 glass rounded-[2.5rem] px-6 sm:px-10 shadow-[0_20px_50px_rgba(0,0,0,0.1)] border-white/40">
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Link to="/" className="flex items-center gap-3 group">
              <Logo textClassName="text-2xl sm:text-3xl font-black italic tracking-tighter" />
            </Link>
          </motion.div>

          <div className="hidden lg:flex items-center gap-2">
            {navLinks.map((link) => {
              const isActive = location.pathname === link.to;
              return (
                <Link
                  key={link.to}
                  to={link.to}
                  className={`relative px-5 py-2.5 text-[11px] font-black uppercase tracking-[0.15em] transition-all duration-300 ${
                    isActive
                      ? "text-primary bg-primary/5 rounded-2xl"
                      : "text-textMuted/60 hover:text-textPrimary hover:bg-black/5 rounded-2xl"
                  }`}
                >
                  <motion.span 
                    className="flex items-center gap-2"
                    whileHover={{ scale: 1.05 }}
                  >
                    {link.label}
                    {isActive && (
                      <motion.div
                        layoutId="nav-active"
                        className="absolute bottom-1 left-5 right-5 h-0.5 bg-primary rounded-full"
                        transition={{ type: "spring", stiffness: 380, damping: 30 }}
                      />
                    )}
                  </motion.span>
                </Link>
              );
            })}
          </div>

          <div className="flex-1 flex justify-center max-w-lg hidden lg:flex px-4">
             <SearchBar 
              value={search} 
              onChange={setSearch} 
              className="bg-black/5 border-none h-12 rounded-2xl px-6 focus-within:bg-white focus-within:shadow-xl transition-all"
              placeholder="Search campus..." 
            />
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              {isInstallable && (
                <Button 
                  onClick={handleInstall}
                  size="sm" 
                  className="bg-primary/10 hover:bg-primary/20 text-primary h-12 px-4 sm:px-6 rounded-2xl font-black uppercase tracking-widest text-[10px] flex transition-all active:scale-95"
                >
                  <Download className="h-4 w-4 sm:mr-2 stroke-[3px]" />
                  <span className="hidden sm:inline">Install App</span>
                </Button>
              )}
              <Link to={isAuthenticated ? "/dashboard/new" : "/signin"}>
                <Button size="sm" className="bg-[#111] hover:bg-black h-12 px-6 rounded-2xl text-white shadow-xl font-black uppercase tracking-widest text-[10px] hidden sm:flex transition-all hover:-translate-y-1 active:scale-95">
                  <Plus className="h-4 w-4 mr-2 text-primary stroke-[3px]" />
                  List Item
                </Button>
              </Link>
            </div>
            
            {isAuthenticated && (
              <NotificationDropdown />
            )}

            <Button
              variant="ghost"
              size="icon"
              aria-label="Open shopping cart"
              className="relative h-12 w-12 rounded-2xl border border-black/5 hover:border-primary/20 transition-all"
              onClick={() => setIsCartOpen(true)}
            >
              <ShoppingCart className="h-5 w-5 text-textPrimary" />
              {totalItems > 0 && (
                <span className="absolute -top-1 -right-1 h-5 min-w-[20px] flex items-center justify-center rounded-full bg-primary px-1.5 text-[9px] font-black text-white shadow-lg shadow-primary/20">
                  {totalItems}
                </span>
              )}
            </Button>
            
            {isAuthenticated ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <motion.button 
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="relative h-12 w-12 rounded-2xl p-0 overflow-hidden border border-black/5 hover:border-primary/20 transition-all shadow-inner"
                  >
                    <div className="h-full w-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center text-primary text-sm font-black uppercase">
                      {(user?.businessName || user?.name || "U").charAt(0)}
                    </div>
                  </motion.button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-64 p-3 rounded-[2rem] shadow-[0_30px_60px_rgba(0,0,0,0.2)] glass border-white/20 animate-in fade-in zoom-in-95 duration-300" align="end">
                  <DropdownMenuLabel className="font-normal p-3">
                    <div className="flex flex-col space-y-2">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-black text-textPrimary leading-none uppercase italic tracking-tighter">
                          {user?.businessName || user?.name || "Member"}
                        </p>
                        {user?.isVerified && <VerifiedBadge />}
                      </div>
                      <p className="text-[9px] font-bold text-textMuted uppercase tracking-widest opacity-60">
                        {user?.email}
                      </p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator className="bg-black/5 my-2" />
                  <div className="space-y-1">
                    <DropdownMenuItem onClick={() => navigate("/dashboard")} className="cursor-pointer rounded-xl p-3 font-black text-[10px] uppercase tracking-widest focus:bg-primary/10 focus:text-primary transition-colors">
                      <LayoutDashboard className="mr-3 h-4 w-4" />
                      <span>Dashboard</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate("/dashboard?tab=listings")} className="cursor-pointer rounded-xl p-3 font-black text-[10px] uppercase tracking-widest focus:bg-primary/10 focus:text-primary transition-colors">
                      <Package className="mr-3 h-4 w-4" />
                      <span>My Listings</span>
                    </DropdownMenuItem>
                    {isAdmin(user?.email) && (
                      <DropdownMenuItem onClick={() => navigate("/admin")} className="cursor-pointer rounded-xl p-3 font-black text-[10px] uppercase tracking-widest focus:bg-purple-500/10 text-purple-600">
                        <Shield className="mr-3 h-4 w-4" />
                        <span>Admin Console</span>
                      </DropdownMenuItem>
                    )}
                  </div>
                  <DropdownMenuSeparator className="bg-black/5 my-2" />
                  <DropdownMenuItem onClick={handleLogout} className="cursor-pointer rounded-xl p-3 font-black text-[10px] uppercase tracking-widest text-destructive focus:bg-destructive/10 focus:text-destructive">
                    <LogOut className="mr-3 h-4 w-4" />
                    <span>Sign Out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Link to="/signin">
                <Button variant="ghost" className="h-12 px-6 rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-black/5 transition-all">
                  Sign In
                </Button>
              </Link>
            )}
            <Button
              variant="ghost"
              size="icon"
              aria-label={mobileOpen ? "Close menu" : "Open menu"}
              aria-expanded={mobileOpen}
              className="lg:hidden text-muted-foreground h-12 w-12 rounded-2xl border border-black/5"
              onClick={() => setMobileOpen(!mobileOpen)}
            >
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </div>
 
        <AnimatePresence>
          {mobileOpen && (
            <motion.div 
              initial={{ opacity: 0, y: -20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="lg:hidden mt-4 glass rounded-[2.5rem] p-6 shadow-2xl"
            >
              <div className="grid grid-cols-1 gap-2">
                {navLinks.map((link) => (
                  <Link
                    key={link.to}
                    to={link.to}
                    onClick={() => setMobileOpen(false)}
                    className={`flex items-center gap-4 px-6 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${
                      location.pathname === link.to
                        ? "bg-primary/10 text-primary"
                        : "text-textMuted/60 hover:bg-black/5"
                    }`}
                  >
                    <link.icon className="h-5 w-5" />
                    {link.label}
                  </Link>
                ))}
                {isAdmin(user?.email) && (
                  <Link
                    to="/admin"
                    onClick={() => setMobileOpen(false)}
                    className="flex items-center gap-4 px-6 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest bg-purple-500/5 text-purple-600"
                  >
                    <Shield className="h-5 w-5" />
                    Admin Console
                  </Link>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      <BottomNav />
    </>
  );
}
