import React, { useRef } from "react";
import { Link } from "react-router-dom";
import { Star, ArrowRight } from "lucide-react";
import { formatPrice } from "@/lib/mock-data";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { motion } from "framer-motion";
import { Service } from "@/lib/mock-data";
import { getOptimizedUrl } from "@/lib/cloudinary-utils";

export interface ServiceCardProps {
  service: Service;
  index?: number;
}

export const ServiceCard: React.FC<ServiceCardProps> = ({ service, index = 0 }) => {
  const cardRef = useRef<HTMLDivElement>(null);

  const displayOwnerName = String(
    service.ownerName ||
    (service as any).businessName ||
    (service as any).shopName ||
    'Provider'
  );

  const displayTitle = String(
    service.title ||
    ((service as any).name && (service as any).name !== displayOwnerName ? (service as any).name : '') ||
    ((service as any).serviceName && (service as any).serviceName !== displayOwnerName ? (service as any).serviceName : '') ||
    'Untitled Service'
  );

  return (
    <motion.div
      ref={cardRef}
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
      className="group relative rounded-3xl overflow-hidden bg-white dark:bg-surface border border-black/5 transition-shadow duration-500 hover:shadow-[0_40px_80px_rgba(0,0,0,0.12)]"
    >
      <Link
        to={`/service/${service.id || service._id}`}
        className="flex flex-col h-full"
      >
        <div className="relative aspect-[3/4] w-full overflow-hidden bg-muted/20">
          <motion.img 
            src={getOptimizedUrl(service.image, { width: 600 })} 
            alt={displayTitle} 
            crossOrigin="anonymous"
            className="h-full w-full object-cover" 
            loading="lazy"
            whileHover={{ scale: 1.1 }}
            transition={{ duration: 1.5, ease: "easeOut" }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
          
          <div className="absolute top-4 left-4 flex flex-col gap-2">
            {/* Badges removed for cleaner layout */}
          </div>

          <div className="absolute bottom-4 left-4 right-4 text-white">
            <div className="flex items-center gap-2 mb-2">
              <div className="h-8 w-8 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-xs font-black border border-white/20">
                {displayOwnerName?.charAt(0)}
              </div>
              <div>
                <p className="font-tag text-[10px] font-black uppercase tracking-widest leading-none">{displayOwnerName}</p>
                <div className="flex items-center gap-1 mt-0.5">
                  {service.ownerIsVerified && <VerifiedBadge className="h-2.5 w-2.5" />}
                  <span className="font-tag text-[8px] font-bold text-white/60 uppercase tracking-tighter">Verified Provider</span>
                </div>
              </div>
            </div>
          </div>

          {/* Share button removed */}
        </div>

        <div className="p-4 flex flex-col flex-1">
          <h3 className="text-sm font-black text-textPrimary leading-tight group-hover:text-primary transition-colors duration-300 line-clamp-1 mb-3 italic">
            "{displayTitle}"
          </h3>

          <div className="mt-auto flex items-center justify-between">
            <div className="flex flex-col">
              <span className="font-tag text-[9px] font-bold text-textMuted uppercase tracking-widest mb-1 opacity-60">Starting From</span>
              <p className="font-price text-lg font-black text-primary tabular-nums tracking-tighter leading-none">
                {formatPrice(service.price)}
              </p>
            </div>
            <div className="h-10 w-10 rounded-2xl bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-all duration-300 shadow-xl shadow-primary/5">
               <ArrowRight className="h-5 w-5" />
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
};
