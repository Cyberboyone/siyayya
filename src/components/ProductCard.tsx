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

  return (
    <div ref={cardRef} className="group relative rounded-2xl overflow-hidden bg-surface border border-black/5 animate-fade-up card-hover shadow-sm" style={{ animationDelay: `${index * 50}ms` }}>
      {/* ── Hidden Watermark ── */}
      <div className="share-watermark absolute bottom-0 left-0 w-full bg-black/60 backdrop-blur-xl p-4 flex items-center justify-between z-50 pointer-events-none transition-opacity duration-0" style={{ opacity: 0 }}>
        <div className="flex items-center gap-2">
           <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center font-bold text-primary border border-primary text-sm">
             {(product.ownerName || "U").charAt(0)}
           </div>
           <div>
             <p className="text-white font-bold text-xs uppercase tracking-widest leading-tight">{product.ownerName || "User"}</p>
             <p className="text-[10px] text-textSecondary line-clamp-2 leading-relaxed font-medium">
               {product.description}
             </p>
           </div>
        </div>
        <div className="flex flex-col items-end">
           <p className="text-white/80 text-[10px] uppercase font-bold tracking-widest text-shadow mb-0.5">Siyayya Marketplace</p>
           <p className="text-primary text-[10px] font-black">siyayya.com/product/{product.id || product._id}</p>
        </div>
      </div>



      {onToggleSave && (
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onToggleSave(product.id);
          }}
          className="no-share absolute top-3 right-3 z-10 h-9 w-9 flex items-center justify-center rounded-full bg-black/20 backdrop-blur-md border border-white/10 transition-all hover:bg-black/40 hover:scale-110 active:scale-95 group/heart"
        >
          <Heart
            className={`h-4.5 w-4.5 transition-all duration-300 ${isSaved ? "fill-error text-error animate-pulse" : "text-white drop-shadow-md"}`}
          />
        </button>
      )}
      <Link
        to={`/product/${product.id || product._id}`}
        className={`block h-full flex flex-col ${product.isSold ? "opacity-60 grayscale-[0.5]" : ""}`}
      >
        <div className="relative aspect-[4/3] w-full overflow-hidden bg-muted/20">
          <img
            src={product.image || ""}
            alt={product.title}
            className={`h-full w-full object-cover transition-transform duration-700 group-hover:scale-110 ${!product.image ? "opacity-0" : ""}`}
            loading="lazy"
          />
          {!product.image && (
            <div className="absolute inset-0 flex items-center justify-center bg-muted/40 backdrop-blur-sm">
              <ImageIcon className="h-10 w-10 text-muted-foreground/40" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          
          {product.isSold && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-[2px]">
              <span className="rounded-full bg-white/90 px-4 py-1.5 text-[10px] font-black tracking-widest text-black shadow-xl">SOLD</span>
            </div>
          )}
          {product.condition === "New" && !product.isSold && (
            <span className="absolute top-4 left-4 rounded-full bg-primary/95 backdrop-blur-md px-3 py-1 text-[10px] font-black tracking-widest text-white shadow-lg border border-white/20 uppercase">
              New
            </span>
          )}
          
          <div className="absolute bottom-3 left-3 flex items-center gap-2 translate-y-4 group-hover:translate-y-0 transition-transform duration-500">
             <p className="text-lg font-black text-white drop-shadow-md tabular-nums tracking-tight">{formatPrice(product.price)}</p>
          </div>

          <ShareCardButton cardRef={cardRef} title={product.title} urlPath={`/product/${product.id || product._id}`} />
        </div>
        
        <div className="p-5 flex flex-col flex-1 relative bg-surface transition-all duration-200 group-hover:bg-muted/30">
           <div className="flex items-center justify-between mb-2">
              <span className="capitalize px-2.5 py-1 bg-primary/10 text-primary rounded-lg font-bold text-[9px] tracking-wider border border-primary/10">{product.category}</span>
              <div className="flex gap-0.5 bg-warning/5 px-2 py-1 rounded-lg border border-warning/10">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star 
                    key={i} 
                    className={`h-3 w-3 ${i < Math.round(product.ownerRating || 0) ? "fill-warning text-warning" : "text-textMuted/20"}`} 
                  />
                ))}
                {product.ownerRating > 0 && (
                  <span className="text-[9px] font-black text-warning ml-1 tabular-nums">{product.ownerRating}</span>
                )}
              </div>
           </div>
           
          <h3 className="text-sm font-bold text-textPrimary line-clamp-2 leading-snug group-hover:text-primary transition-colors duration-200">{product.title}</h3>
          
          <div className="mt-auto pt-4 flex items-center justify-between border-t border-black/5 pr-10">
            <div className="flex items-center gap-2">
               <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-black text-primary border border-primary/20 shrink-0">
                 {(product.ownerName || "U").charAt(0)}
               </div>
               <span className="text-[10px] font-bold text-textSecondary truncate max-w-[80px] break-all">{product.ownerName || "User"}</span>
               {product.ownerIsVerified && <VerifiedBadge />}
            </div>
            <span className="flex items-center gap-1 text-[9px] font-bold text-textMuted uppercase tracking-tighter shrink-0">
              <Clock className="h-3 w-3" />
              {formatDate(product.createdAt)}
            </span>
          </div>
        </div>
      </Link>
    </div>
  );
}
