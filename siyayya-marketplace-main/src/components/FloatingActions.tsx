import { Link } from "react-router-dom";
import { Plus } from "lucide-react";

export function FloatingActions() {
  return (
    <Link
      to="/dashboard/new"
      className="fixed bottom-24 right-6 z-50 flex items-center gap-2 rounded-full px-6 py-4 shadow-2xl active:scale-95 transition-all font-bold text-sm btn-premium animate-bounce-subtle text-white border border-white/20 backdrop-blur-sm group"
    >
      <div className="absolute inset-0 bg-gradient-to-r from-[#1F6FEB] via-[#8A2BE2] to-[#1F6FEB] bg-[length:200%_auto] group-hover:bg-right transition-all duration-700 opacity-90" />
      <Plus className="h-5 w-5 relative z-10" />
      <span className="relative z-10 hidden sm:inline tracking-tight">Post Your Listing</span>
      <span className="relative z-10 sm:hidden">Post</span>
    </Link>
  );
}

