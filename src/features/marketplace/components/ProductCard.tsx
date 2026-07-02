import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AuthModal } from "@/features/auth/components/AuthModal";
import { MessageCircle } from "lucide-react";
import { formatPrice } from "@/lib/mock-data";
import { useAuth } from "@/features/auth/contexts/AuthContext";
import { motion } from "framer-motion";
import { Product } from "@/lib/mock-data";
import { getOptimizedUrl } from "@/lib/cloudinary-utils";

export interface ProductCardProps {
  product: Product;
  index?: number;
  isSaved?: boolean;
  onToggleSave?: (id: string) => void;
}

function formatWhatsAppUrl(phone: string, message: string): string {
  const cleaned = phone.replace(/\D/g, "");
  const intl = cleaned.startsWith("234") ? cleaned : cleaned.startsWith("0") ? "234" + cleaned.slice(1) : "234" + cleaned;
  return `https://wa.me/${intl}?text=${encodeURIComponent(message)}`;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product, index = 0 }) => {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [showAuthModal, setShowAuthModal] = useState(false);

  const ownerPhone = (product as any).ownerPhone || (product as any).contactPhone || "";

  const displayOwnerName = String(
    product.ownerName ||
    (product as any).businessName ||
    (product as any).shopName ||
    'Seller'
  );

  const displayTitle = String(
    product.title ||
    ((product as any).name && (product as any).name !== displayOwnerName ? (product as any).name : '') ||
    ((product as any).productName && (product as any).productName !== displayOwnerName ? (product as any).productName : '') ||
    'Untitled Listing'
  );

  const handleContact = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isAuthenticated) {
      setShowAuthModal(true);
      return;
    }
    if (ownerPhone) {
      fetch('/api/listings/track-whatsapp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ listingId: product.id || (product as any)._id, collection: 'products' }),
      }).catch(() => {});
      const msg = `Hi! I saw your listing on Siyayya: *${displayTitle}* (₦${product.price?.toLocaleString()}). Is it still available?`;
      window.open(formatWhatsAppUrl(ownerPhone, msg), "_blank", "noopener,noreferrer");
    } else {
      navigate(`/product/${product.id || (product as any)._id}`);
    }
  };



  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ 
        duration: 0.4, 
        delay: index * 0.05,
        ease: [0.16, 1, 0.3, 1]
      }}
      whileHover={{ y: -8 }}
      className="group relative rounded-2xl md:rounded-3xl overflow-hidden bg-white dark:bg-surface border border-black/5 flex flex-col h-full transition-shadow duration-500 hover:shadow-lg hover:shadow-[0_30px_60px_rgba(0,0,0,0.1)] pb-2"
    >
      <Link
        to={`/product/${product.id || (product as any)._id}`}
        className={`flex flex-col flex-grow ${product.isSold ? "opacity-60 grayscale-[0.5]" : ""}`}
      >
        <div className="relative aspect-[4/5] sm:aspect-square w-full overflow-hidden bg-muted/20">
          <motion.img
            src={getOptimizedUrl(product.image, { width: 500 })}
            alt={displayTitle}
            crossOrigin="anonymous"
            className="h-full w-full object-cover"
            loading="lazy"
            whileHover={{ scale: 1.05 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          />
          
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          
          {product.isSold && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-[2px]">
              <span className="rounded-full bg-white px-4 py-1.5 text-[10px] font-black tracking-widest text-black shadow-xl">SOLD</span>
            </div>
          )}

          <div className="absolute top-3 left-3 flex items-center gap-2 text-white drop-shadow-md">
            <div className="h-6 w-6 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center text-[10px] font-black">
              {displayOwnerName?.charAt(0)}
            </div>
            <div className="flex items-center gap-1">
              <span className="text-[10px] font-black uppercase tracking-widest truncate max-w-[100px]">{displayOwnerName}</span>
            </div>
          </div>
        </div>
        
        <div className="px-2 pt-2 pb-1 flex flex-col flex-grow">
          <h3 className="text-xs font-bold text-textPrimary leading-tight group-hover:text-primary transition-colors duration-300 line-clamp-2 mb-1">
            {displayTitle}
          </h3>
          
          <div className="mt-1">
            <p className="text-sm font-black text-textPrimary tabular-nums tracking-tighter leading-none">
              {formatPrice(product.price)}
            </p>
          </div>
        </div>
      </Link>
      
      <div className="px-2 pb-2 pt-1 mt-auto">
        <button
          onClick={handleContact}
          aria-label={`Contact seller about ${displayTitle} via WhatsApp`}
          className="h-10 w-full rounded-xl bg-[#25D366] text-white flex items-center justify-center gap-1.5 hover:bg-[#1ebe5d] active:scale-95 transition-all shadow-sm text-[10px] font-black uppercase tracking-widest"
        >
          <MessageCircle className="h-3.5 w-3.5" />
          Chat Seller
        </button>
      </div>

      {showAuthModal && (
        <AuthModal 
          isOpen={showAuthModal} 
          onClose={() => setShowAuthModal(false)} 
        />
      )}
    </motion.div>
  );
};
