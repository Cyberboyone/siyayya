import { Link } from "react-router-dom";
import { Logo } from "./Logo";

export function Footer() {
  return (
    <footer className="border-t border-black/5 bg-surface mt-auto">
      <div className="container py-8 md:py-16">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          <div className="col-span-2 md:col-span-1">
            <Link to="/" className="flex items-center gap-2 font-black text-xl tracking-tighter mb-5 text-textPrimary">
              <Logo />
            </Link>
            <p className="text-sm text-textSecondary font-medium leading-relaxed mb-4">
              The official marketplace for Federal University of Kashere students and staff.
            </p>
          </div>
          <div>
            <h3 className="font-black text-[10px] uppercase tracking-[0.2em] text-textSecondary opacity-40 mb-5">Marketplace</h3>
            <ul className="space-y-2.5 text-sm text-textSecondary font-bold">
              <li><Link to="/marketplace" className="hover:text-primary transition-colors">Products</Link></li>
              <li><Link to="/services" className="hover:text-primary transition-colors">Services</Link></li>
              <li><Link to="/marketplace?category=electronics" className="hover:text-primary transition-colors">Electronics</Link></li>
              <li><Link to="/marketplace?category=hostel" className="hover:text-primary transition-colors">Hostel Items</Link></li>
            </ul>
          </div>
          <div>
            <h3 className="font-black text-[10px] uppercase tracking-[0.2em] text-textSecondary opacity-40 mb-5">Support</h3>
            <ul className="space-y-2.5 text-sm text-textSecondary font-bold">
              <li><Link to="/about" className="hover:text-primary transition-colors">About Us</Link></li>
              <li><Link to="/contact" className="hover:text-primary transition-colors">Contact</Link></li>
              <li><Link to="/about" className="hover:text-primary transition-colors">FAQ</Link></li>
              <li><Link to="/about" className="hover:text-primary transition-colors">Safety Tips</Link></li>
            </ul>
          </div>
          <div>
            <h3 className="font-black text-[10px] uppercase tracking-[0.2em] text-textSecondary opacity-40 mb-5">Legal</h3>
            <ul className="space-y-2.5 text-sm text-textSecondary font-bold">
              <li><Link to="/about" className="hover:text-primary transition-colors">Terms of Service</Link></li>
              <li><Link to="/about" className="hover:text-primary transition-colors">Privacy Policy</Link></li>
            </ul>
          </div>
        </div>
        <div className="mt-12 pt-8 border-t border-black/5 text-center text-[10px] font-black uppercase tracking-widest text-textMuted">
          <p>© {new Date().getFullYear()} Siyayya.com — Federal University of Kashere Campus Marketplace</p>
        </div>
      </div>
    </footer>
  );
}
