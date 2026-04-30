import React from "react";
import { Link } from "react-router-dom";
import { Star, ArrowRight } from "lucide-react";
import { formatPrice } from "@/lib/mock-data";
import { VerifiedBadge } from "./VerifiedBadge";
import { ShareCardButton } from "./ShareCardButton";
import { useRef } from "react";

export interface ServiceCardProps {
  service: any;
  index?: number;
}

export const ServiceCard: React.FC<ServiceCardProps> = ({ service, index = 0 }) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const reviewCount = service.reviewCount || Math.floor(Math.random() * 30) + 3;

  return (
    <div ref={cardRef} className="group relative rounded-xl overflow-hidden bg-surface border border-black/5 animate-fade-up transition-all duration-300 hover:shadow-xl hover:-translate-y-1 hover:scale-[1.02]" style={{ animationDelay: `${index * 50}ms` }}>
      {/* ── Hidden Watermark (Unchanged) ── */}
      <div className="share-watermark absolute bottom-0 left-0 w-full bg-[#0a0a0a] p-4 flex items-center justify-between z-50 pointer-events-none transition-opacity duration-0" style={{ opacity: 0 }}>
        {/* ... watermark ... */}
      </div>

      <Link
        to={`/service/${service.id || service._id}`}
        className="flex flex-col h-full"
      >
        {service.image && (
          <div className="relative h-40 sm:h-44 w-full overflow-hidden bg-muted/20">
            <img 
              src={service.image} 
              alt={service.title} 
              width={480}
              height={360}
              crossOrigin="anonymous"
              className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110" 
              loading="lazy"
            />
            <ShareCardButton cardRef={cardRef} title={service.title} urlPath={`/service/${service.id || service._id}`} />
            
            {/* New: Top Service Badge */}
            {service.ownerRating >= 4 && (
              <span className="absolute top-2 left-2 rounded-lg bg-secondary/90 backdrop-blur-md px-2 py-0.5 text-[8px] font-black tracking-widest text-white shadow-lg border border-white/20 uppercase">
                Top Service
              </span>
            )}
          </div>
        )}

        <div className="p-3 flex flex-col flex-1 bg-surface">
          <h3 className="text-xs sm:text-sm font-medium text-textPrimary group-hover:text-primary transition-colors duration-200 line-clamp-2 leading-snug min-h-[2rem] mb-1">
            {service.title}
          </h3>

          <div className="flex flex-col gap-1 mt-auto">
            <p className="text-sm font-black text-primary tabular-nums tracking-tight">
              {formatPrice(service.price)}
            </p>

            {/* Rating UI */}
            <div className="flex items-center gap-1">
              <div className="flex items-center">
                <Star className="h-3 w-3 fill-warning text-warning" />
                <span className="text-[10px] font-bold text-textPrimary ml-0.5 tabular-nums">
                  {(service.ownerRating || 4.2).toFixed(1)}
                </span>
              </div>
              <span className="text-[10px] text-textMuted font-medium">
                ({reviewCount})
              </span>
            </div>

            {/* User Info */}
            <div className="flex items-center justify-between mt-2 pt-2 border-t border-black/5">
              <div className="flex items-center gap-1.5 min-w-0">
                 <span className="text-[9px] font-bold text-textSecondary truncate">{service.ownerName || "User"}</span>
                 {service.ownerIsVerified && <VerifiedBadge className="h-3 w-3" />}
              </div>
              <div className="h-6 w-6 rounded-full bg-secondary/10 flex items-center justify-center text-secondary group-hover:bg-secondary/20 transition-all">
                 <ArrowRight className="h-3.5 w-3.5" />
              </div>
            </div>
          </div>
        </div>
      </Link>
    </div>
  );
};
