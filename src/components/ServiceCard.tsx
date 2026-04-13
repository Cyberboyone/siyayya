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

  return (
    <div ref={cardRef} className="group relative rounded-2xl overflow-hidden bg-surface border border-black/5 animate-fade-up card-hover shadow-sm" style={{ animationDelay: `${index * 50}ms` }}>

      
      <Link
        to={`/service/${service.id || service._id}`}
        className="flex flex-col gap-2 p-4 h-full group-hover:bg-muted/30 transition-colors duration-200"
      >
        <h3 className="text-sm font-black text-textPrimary group-hover:text-primary transition-colors duration-200 truncate tracking-tight">{service.title}</h3>

        {service.image && (
          <div className="relative aspect-video rounded-xl overflow-hidden bg-muted/20">
            <img 
              src={service.image} 
              alt={service.title} 
              width={480}
              height={270}
              className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110" 
              loading="lazy"
            />
            <div className="absolute bottom-2 left-2 bg-black/60 backdrop-blur-md text-white text-[9px] font-black px-2 py-0.5 rounded-lg border border-white/10">
               {formatPrice(service.price)}
            </div>
            <ShareCardButton cardRef={cardRef} title={service.title} urlPath={`/service/${service.id || service._id}`} />
          </div>
        )}

        <p className="text-[10px] text-textSecondary line-clamp-2 leading-relaxed font-medium">
          {service.description}
        </p>

        <div className="flex items-center justify-between pt-3 border-t border-black/5 mt-auto pr-10">
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
               <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-black text-primary border border-primary/20 shrink-0">
                 {(service.ownerName || "U").charAt(0)}
               </div>
               <span className="text-[10px] font-bold text-textSecondary truncate max-w-[80px]">{service.ownerName || "User"}</span>
               {service.ownerIsVerified && <VerifiedBadge />}
            </div>
            {service.ownerRating > 0 && (
              <div className="flex gap-0.5 mt-0.5">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star 
                    key={i} 
                    className={`h-3 w-3 ${i < Math.round(service.ownerRating) ? "fill-warning text-warning" : "text-textMuted/20"}`} 
                  />
                ))}
              </div>
            )}
          </div>
          <div className="h-7 w-7 rounded-full bg-secondary/10 flex items-center justify-center text-secondary group-hover:bg-secondary/20 transition-all active:scale-95">
             <ArrowRight className="h-4 w-4" />
          </div>
        </div>
      </Link>
    </div>
  );
};
