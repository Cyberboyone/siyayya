import { Link, useLocation, useNavigate } from "react-router-dom";
import { Search, Plus, User as UserIcon, Menu, X, Home, ShoppingBag, Wrench, LayoutDashboard, LogOut, Package, Heart, FileText, Shield } from "lucide-react";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { VerifiedBadge } from "./VerifiedBadge";
import { SearchBar } from "./SearchBar";
import { Logo } from "./Logo";
import { isAdmin } from "@/lib/config";
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
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const initialSearch = searchParams.get("search") || "";
  
  const [mobileOpen, setMobileOpen] = useState(false);
  const [search, setSearch] = useState(initialSearch);
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();

  // Keep search state in sync with URL changes (e.g. going from marketplace back to home)
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
      <nav className="sticky top-0 z-50 border-b border-black/5 bg-surface/80 backdrop-blur-xl supports-[backdrop-filter]:bg-surface/40 shadow-sm transition-all duration-200">
        <div className="px-3 sm:px-4 md:px-6 max-w-7xl mx-auto flex h-16 items-center justify-between gap-4">
          <Link to="/" className="flex items-center gap-2 group transition-all">
            <Logo textClassName="text-lg sm:text-2xl" />
          </Link>

          <div className="hidden lg:flex items-center gap-1">
            {navLinks.map((link) => {
              const isActive = location.pathname === link.to;
              return (
                <Link
                  key={link.to}
                  to={link.to}
                  className={`relative px-4 py-2 text-sm font-bold transition-all duration-200 ${
                    isActive
                      ? "text-textPrimary"
                      : "text-textSecondary hover:text-textPrimary item-hover rounded-xl"
                  }`}
                >
                  {link.label}
                  {isActive && (
                    <span className="absolute bottom-0 left-2 right-2 h-0.5 bg-primary rounded-full neon-glow animate-fade-in shadow-[0_0_10px_rgba(255,92,0,0.4)]" />
                  )}
                </Link>
              );
            })}
          </div>

          <div className="flex-1 flex justify-center max-w-sm hidden md:flex items-center px-4">
            <SearchBar 
              value={search} 
              onChange={setSearch} 
              className="max-w-none"
              placeholder="Search..."
            />
          </div>

          <div className="flex items-center gap-3">
            <Link to="/marketplace?search=true" className="md:hidden">
              <Button variant="ghost" size="icon" className="text-muted-foreground h-10 w-10 rounded-2xl">
                <Search className="h-5 w-5" />
              </Button>
            </Link>
            <div className="flex items-center gap-2">
              <Link to={isAuthenticated ? "/dashboard/new" : "/signin"}>
                <Button size="sm" className="bg-primary hover:bg-primaryDark h-10 px-5 rounded-2xl text-white shadow-lg font-black tracking-tight hidden sm:flex transition-all duration-200 hover:shadow-primary/30 active:scale-95">
                  <Plus className="h-4 w-4 mr-1.5" />
                  List Item
                </Button>
              </Link>
              <Link to="/request">
                <Button variant="ghost" size="sm" className="h-10 px-5 rounded-2xl bg-muted hover:bg-gray-200 text-textPrimary font-bold tracking-tight hidden sm:flex transition-all duration-200">
                  <FileText className="h-4 w-4 mr-1.5" />
                  Request
                </Button>
              </Link>
            </div>
            
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
                        <p className="text-sm font-black leading-none text-textPrimary">
                          {user?.businessName || user?.name || "Member"}
                        </p>
                        {user?.isVerified && <VerifiedBadge />}
                      </div>
                      <p className="text-[10px] leading-none text-textMuted font-bold">
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
                    {isAdmin(user?.email) && (
                      <DropdownMenuItem onClick={() => navigate("/admin")} className="cursor-pointer rounded-xl p-2.5 font-bold mb-1 focus:bg-purple-500/10 text-purple-600">
                        <Shield className="mr-3 h-4 w-4" />
                        <span>Admin Panel</span>
                      </DropdownMenuItem>
                    )}
                  </div>
                  <DropdownMenuSeparator className="bg-black/5" />
                  <DropdownMenuItem onClick={handleLogout} className="cursor-pointer rounded-xl p-2.5 font-bold text-destructive focus:text-destructive item-hover hover:bg-destructive/10">
                    <LogOut className="mr-3 h-4 w-4" />
                    <span>Log out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Link to="/signin" className="flex items-center gap-1.5">
                <Button variant="ghost" size="sm" className="hidden sm:flex rounded-2xl px-5 h-10 font-bold hover:bg-muted text-textPrimary transition-all duration-200">
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
          <div className="lg:hidden border-t border-black/5 bg-surface px-4 pb-6 pt-3 animate-fade-in shadow-xl">
            <div className="grid grid-cols-1 gap-1">
              {navLinks.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  onClick={() => setMobileOpen(false)}
                  className={`flex items-center gap-4 px-4 py-3.5 rounded-2xl text-sm font-black transition-all ${
                    location.pathname === link.to
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground item-hover"
                  }`}
                >
                  <link.icon className={`h-5 w-5 ${location.pathname === link.to ? "text-primary" : "text-muted-foreground/60"}`} />
                  {link.label}
                </Link>
              ))}
              {isAdmin(user?.email) && (
                <Link
                  to="/admin"
                  onClick={() => setMobileOpen(false)}
                  className={`flex items-center gap-4 px-4 py-3.5 rounded-2xl text-sm font-black transition-all bg-purple-500/5 text-purple-600`}
                >
                  <Shield className="h-5 w-5" />
                  Admin Panel
                </Link>
              )}
            </div>
          </div>
        )}
      </nav>

      {/* Mobile bottom nav */}
      <div className="fixed bottom-0 left-0 right-0 z-40 md:hidden border-t border-black/5 bg-surface/80 backdrop-blur-xl pb-safe-area shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.1)]">
        <div className="flex items-center justify-around py-2 px-2">
          {navLinks.map((link) => {
            const isActive = location.pathname === link.to;
            return (
              <Link
                key={link.to}
                to={link.to}
                className={`flex flex-col items-center gap-1 px-4 py-2 rounded-2xl transition-all duration-200 ${
                  isActive ? "text-primary scale-110" : "text-textMuted"
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
