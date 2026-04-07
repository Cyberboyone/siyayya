import { Link, useLocation, useNavigate } from "react-router-dom";
import { Search, Plus, User as UserIcon, Menu, X, Home, ShoppingBag, Wrench, LayoutDashboard, LogOut, Package, Heart, FileText, Shield } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { VerifiedBadge } from "./VerifiedBadge";
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
  { to: "/marketplace", label: "Marketplace", icon: ShoppingBag },
  { to: "/services", label: "Services", icon: Wrench },
  { to: "/requests", label: "Requests", icon: FileText },
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
];

export function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();

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
      <nav className="sticky top-0 z-50 border-b border-white/10 bg-white/70 backdrop-blur-xl supports-[backdrop-filter]:bg-white/40 shadow-sm">
        <div className="container flex h-16 items-center justify-between gap-4">
          <Link to="/" className="flex items-center gap-2 group transition-all">
            <div className="relative h-9 w-9 flex items-center justify-center rounded-xl bg-gradient-to-br from-[#1F6FEB] to-[#8A2BE2] text-white shadow-lg overflow-hidden group-hover:rotate-[10deg] transition-transform duration-300">
               <span className="font-black text-lg relative z-10">S</span>
               <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            <span className="hidden sm:inline font-black text-xl tracking-tighter text-[#222222]">Siyayya</span>
          </Link>

          <div className="hidden lg:flex items-center gap-1">
            {navLinks.map((link) => {
              const isActive = location.pathname === link.to;
              return (
                <Link
                  key={link.to}
                  to={link.to}
                  className={`relative px-4 py-2 text-sm font-bold transition-all duration-300 ${
                    isActive
                      ? "text-[#222222]"
                      : "text-muted-foreground hover:text-[#222222] hover:bg-black/5 rounded-xl"
                  }`}
                >
                  {link.label}
                  {isActive && (
                    <span className="absolute bottom-0 left-2 right-2 h-0.5 bg-accent rounded-full neon-glow animate-fade-in" />
                  )}
                </Link>
              );
            })}
          </div>

          <div className="flex-1 flex justify-center max-w-sm hidden md:flex items-center px-4">
             <Link to="/marketplace?search=true" className="w-full">
               <div className="relative w-full group">
                 <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors duration-300" />
                 <div className="h-10 w-full rounded-2xl border border-black/5 bg-black/5 pl-10 pr-4 text-sm text-muted-foreground flex items-center transition-all group-hover:bg-white group-hover:border-primary/30 group-hover:shadow-md">
                   Search anything...
                 </div>
               </div>
             </Link>
          </div>

          <div className="flex items-center gap-3">
            <Link to="/marketplace?search=true" className="md:hidden">
              <Button variant="ghost" size="icon" className="text-muted-foreground h-10 w-10 rounded-2xl">
                <Search className="h-5 w-5" />
              </Button>
            </Link>
            <Link to={isAuthenticated ? "/dashboard/new" : "/signin"}>
              <Button size="sm" className="btn-premium h-10 px-5 rounded-2xl text-white shadow-lg font-bold tracking-tight hidden sm:flex">
                <Plus className="h-4 w-4 mr-1.5" />
                List Item
              </Button>
            </Link>
            
            {isAuthenticated ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-10 w-10 rounded-2xl ml-1 p-0 overflow-hidden border border-black/5 hover:border-primary/20 transition-all">
                    <div className="h-full w-full bg-primary/10 flex items-center justify-center text-primary text-sm font-black">
                      {(user?.businessName || user?.name || "U").charAt(0)}
                    </div>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56 p-2 rounded-2xl shadow-2xl glass-card border-black/5" align="end" forceMount>
                  <DropdownMenuLabel className="font-normal p-2">
                    <div className="flex flex-col space-y-1">
                      <div className="flex items-center gap-1">
                        <p className="text-sm font-black leading-none text-[#222222]">{user?.businessName || user?.name}</p>
                        {user?.isVerified && <VerifiedBadge />}
                      </div>
                      <p className="text-[10px] leading-none text-muted-foreground font-bold">
                        {user?.email}
                      </p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator className="bg-black/5" />
                  <div className="py-1">
                    <DropdownMenuItem onClick={() => navigate("/dashboard")} className="cursor-pointer rounded-xl p-2.5 font-bold mb-1 focus:bg-primary/5">
                      <LayoutDashboard className="mr-3 h-4 w-4 text-primary" />
                      <span>Dashboard</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate("/dashboard?tab=listings")} className="cursor-pointer rounded-xl p-2.5 font-bold mb-1 focus:bg-primary/5">
                      <Package className="mr-3 h-4 w-4 text-primary" />
                      <span>My Listings</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate("/dashboard?tab=saved")} className="cursor-pointer rounded-xl p-2.5 font-bold mb-1 focus:bg-primary/5">
                      <Heart className="mr-3 h-4 w-4 text-primary" />
                      <span>Saved Items</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate("/dashboard?tab=requests")} className="cursor-pointer rounded-xl p-2.5 font-bold mb-1 focus:bg-primary/5">
                      <FileText className="mr-3 h-4 w-4 text-primary" />
                      <span>My Requests</span>
                    </DropdownMenuItem>
                    {user?.role === "admin" && (
                      <DropdownMenuItem onClick={() => navigate("/admin")} className="cursor-pointer rounded-xl p-2.5 font-bold mb-1 focus:bg-purple-500/10 text-purple-600">
                        <Shield className="mr-3 h-4 w-4" />
                        <span>Admin Panel</span>
                      </DropdownMenuItem>
                    )}
                  </div>
                  <DropdownMenuSeparator className="bg-black/5" />
                  <DropdownMenuItem onClick={handleLogout} className="cursor-pointer rounded-xl p-2.5 font-bold text-destructive focus:text-destructive focus:bg-destructive/10">
                    <LogOut className="mr-3 h-4 w-4" />
                    <span>Log out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Link to="/signin" className="flex items-center gap-1.5">
                <Button variant="ghost" size="sm" className="hidden sm:flex rounded-2xl px-5 h-10 font-bold hover:bg-black/5">
                  Sign In
                </Button>
                <Button variant="ghost" size="icon" className="sm:hidden text-muted-foreground h-10 w-10 rounded-2xl">
                  <UserIcon className="h-5 w-5" />
                </Button>
              </Link>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden text-muted-foreground h-10 w-10 rounded-2xl"
              onClick={() => setMobileOpen(!mobileOpen)}
            >
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </div>

        {mobileOpen && (
          <div className="lg:hidden border-t border-black/5 bg-white/95 backdrop-blur-xl px-4 pb-6 pt-3 animate-fade-in shadow-xl">
            <div className="grid grid-cols-1 gap-1">
              {navLinks.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  onClick={() => setMobileOpen(false)}
                  className={`flex items-center gap-4 px-4 py-3.5 rounded-2xl text-sm font-black transition-all ${
                    location.pathname === link.to
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-black/5"
                  }`}
                >
                  <link.icon className={`h-5 w-5 ${location.pathname === link.to ? "text-primary" : "text-muted-foreground/60"}`} />
                  {link.label}
                </Link>
              ))}
            </div>
          </div>
        )}
      </nav>

      {/* Mobile bottom nav */}
      <div className="fixed bottom-0 left-0 right-0 z-40 md:hidden border-t border-black/5 bg-white/80 backdrop-blur-xl pb-safe-area shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.1)]">
        <div className="flex items-center justify-around py-2 px-2">
          {navLinks.map((link) => {
            const isActive = location.pathname === link.to;
            return (
              <Link
                key={link.to}
                to={link.to}
                className={`flex flex-col items-center gap-1 px-4 py-2 rounded-2xl transition-all duration-300 ${
                  isActive ? "text-primary scale-110" : "text-muted-foreground/60"
                }`}
              >
                <link.icon className={`h-5 w-5 ${isActive ? "text-primary animate-pulse" : ""}`} />
                <span className={`text-[10px] font-black uppercase tracking-tighter ${isActive ? "opacity-100" : "opacity-0"}`}>{link.label}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </>

  );
}
