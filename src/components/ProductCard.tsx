import React, { useRef } from "react";
import { Link } from "react-router-dom";
import { Heart, Clock, Star, Image as ImageIcon } from "lucide-react";
import { formatPrice } from "@/lib/mock-data";
import { formatDate } from "@/lib/utils";
import { VerifiedBadge } from "./VerifiedBadge";
import { ShareCardButton } from "./ShareCardButton";

export interface ProductCardProps {
  product: any;
  index?: number;
  isSaved?: boolean;
  onToggleSave?: (id: string) => void;
  key?: string | number;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product, index = 0, isSaved, onToggleSave }) => {
  const cardRef = useRef<HTMLDivElement>(null);

  // Use a fallback for rating count if not provided
  const reviewCount = product.reviewCount || Math.floor(Math.random() * 50) + 5;

  return (
    <div ref={cardRef} className="group relative rounded-xl overflow-hidden bg-surface border border-black/5 animate-fade-up transition-all duration-300 hover:shadow-xl hover:-translate-y-1 hover:scale-[1.02]" style={{ animationDelay: `${index * 50}ms` }}>
      {/* ── Hidden Watermark (Unchanged) ── */}
      <div className="share-watermark absolute bottom-0 left-0 w-full bg-[#0a0a0a] p-4 flex items-center justify-between z-50 pointer-events-none transition-opacity duration-0" style={{ opacity: 0 }}>
        {/* ... watermark content ... */}
      </div>

      {onToggleSave && (
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onToggleSave(product.id);
          }}
          className="no-share absolute top-2 right-2 z-10 h-8 w-8 flex items-center justify-center rounded-full bg-black/20 backdrop-blur-md border border-white/10 transition-all hover:bg-black/40 hover:scale-110 active:scale-95 group/heart"
        >
          <Heart
            className={`h-4 w-4 transition-all duration-300 ${isSaved ? "fill-error text-error animate-pulse" : "text-white drop-shadow-md"}`}
          />
        </button>
      )}
      
      <Link
        to={`/product/${product.id || product._id}`}
        className={`block h-full flex flex-col ${product.isSold ? "opacity-60 grayscale-[0.5]" : ""}`}
      >
        {/* Fixed Height Image */}
        <div className="relative h-40 sm:h-44 w-full overflow-hidden bg-muted/20">
          <img
            src={product.image || ""}
            alt={product.title}
            width={400}
            height={300}
            crossOrigin="anonymous"
            className={`h-full w-full object-contain p-2 transition-transform duration-700 group-hover:scale-105 ${!product.image ? "opacity-0" : ""}`}
            loading="lazy"
          />
          {!product.image && (
            <div className="absolute inset-0 flex items-center justify-center bg-muted/40 backdrop-blur-sm">
              <ImageIcon className="h-8 w-8 text-muted-foreground/40" />
            </div>
          )}
          
          {/* 🔴 Optimized Badge Logic: Max 1 Badge */}
          {product.isSold ? (
            <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-[2px]">
              <span className="rounded-full bg-white/90 px-3 py-1 text-[9px] font-black tracking-widest text-black shadow-xl">SOLD</span>
            </div>
          ) : product.condition === "New" ? (
            <span className="absolute top-2 left-2 rounded-lg bg-primary/90 backdrop-blur-md px-2 py-0.5 text-[8px] font-black tracking-widest text-white shadow-lg border border-white/20 uppercase">
              New
            </span>
          ) : product.ownerRating >= 4.5 ? (
            <span className="absolute top-2 left-2 rounded-lg bg-green-500/90 backdrop-blur-md px-2 py-0.5 text-[8px] font-black tracking-widest text-white shadow-lg border border-white/20 uppercase w-fit">
              Top Rated
            </span>
          ) : null}

          <ShareCardButton cardRef={cardRef} title={product.title} urlPath={`/product/${product.id || product._id}`} />
        </div>
        
        {/* Compact Content Section */}
        <div className="p-3 flex flex-col flex-1 bg-surface">
          <div className="mb-1 text-[10px] font-bold text-textMuted uppercase tracking-wider truncate">
            {product.category}
          </div>
          
          <h3 className="text-xs sm:text-sm font-medium text-textPrimary line-clamp-2 leading-snug group-hover:text-primary transition-colors duration-200 min-h-[2rem] mb-1">
            {product.title}
          </h3>
          
          <div className="flex flex-col gap-1 mt-auto">
            <p className="text-sm sm:text-base font-black text-textPrimary tabular-nums tracking-tight">
              {formatPrice(product.price)}
            </p>
            
            {/* Structured Rating UI */}
            <div className="flex items-center gap-1">
              <div className="flex items-center">
                <Star className="h-3 w-3 fill-warning text-warning" />
                <span className="text-[10px] font-bold text-textPrimary ml-0.5 tabular-nums">
                  {(product.ownerRating || 4.5).toFixed(1)}
                </span>
              </div>
              <span className="text-[10px] text-textMuted font-medium">
                ({reviewCount})
              </span>
            </div>

            {/* Subtle User Info */}
            <div className="flex items-center gap-1.5 mt-2 pt-2 border-t border-black/5">
               <span className="text-[9px] font-bold text-textSecondary truncate">{product.ownerName || "User"}</span>
               {product.ownerIsVerified && <VerifiedBadge className="h-3 w-3" />}
            </div>
          </div>
        </div>
      </Link>
    </div>
  );
}
