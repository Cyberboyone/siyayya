import { Link } from "react-router-dom";
import { Plus } from "lucide-react";

export function FloatingActions() {
  return (
    <Link
      to="/dashboard/new"
      className="fixed bottom-10 right-10 z-50 flex items-center gap-3 rounded-2xl px-8 py-5 shadow-[0_20px_50px_rgba(255,92,0,0.3)] active:scale-95 transition-all font-black text-xs uppercase tracking-widest text-white group overflow-hidden border border-primary/20"
    >
      {/* Premium Gradient Background */}
      <div className="absolute inset-0 bg-gradient-to-r from-primary via-accent to-primary bg-[length:200%_auto] group-hover:bg-right transition-all duration-700" />
      
      {/* Subtle Glow Effect */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 bg-white/20 blur-xl transition-opacity duration-500" />

      <Plus className="h-5 w-5 relative z-10 stroke-[3px]" />
      <span className="relative z-10 hidden sm:inline">Launch Listing</span>
      <span className="relative z-10 sm:hidden">Launch</span>
      
      {/* Animated Shine Effect */}
      <div className="absolute top-0 -left-[100%] w-full h-full bg-gradient-to-r from-transparent via-white/30 to-transparent group-hover:left-[100%] transition-all duration-1000 ease-in-out" />
    </Link>
  );
}

