import React from "react";
import { Link } from "react-router-dom";
import { Star, ArrowRight } from "lucide-react";
import { formatPrice } from "@/lib/mock-data";
import { Button } from "@/components/ui/button";
import { VerifiedBadge } from "./VerifiedBadge";

export interface ServiceCardProps {
  service: any;
  index?: number;
  key?: string | number; // Explicitly allow key if needed by some linters
}

export const ServiceCard: React.FC<ServiceCardProps> = ({ service, index = 0 }) => {
  return (
    <Link
      to={`/service/${service.id || service._id}`}
      onClick={() => console.log(`Navigating to service: ${service.id || service._id}`)}
      className="group flex flex-col gap-4 p-6 rounded-3xl glass-card transition-all duration-500 hover:shadow-2xl hover:-translate-y-2 border border-white/40 animate-fade-up"
      style={{ animationDelay: `${index * 50}ms` }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <h3 className="text-base font-black text-[#222222] group-hover:text-primary transition-colors duration-300 truncate tracking-tight">{service.title}</h3>
          <div className="flex items-center gap-1 mt-0.5">
            <p className="text-xs font-bold text-muted-foreground/80 truncate">{service.ownerName || "User"}</p>
            {service.ownerIsVerified && <VerifiedBadge />}
          </div>
        </div>
        <div className="flex items-center gap-1.5 text-[10px] font-black bg-primary/10 text-primary px-3 py-1.5 rounded-xl shrink-0 border border-primary/10">
          <Star className="h-3.5 w-3.5 fill-current" />
          <span>{service.rating}</span>
        </div>
      </div>

      <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed h-8">
        {service.description}
      </p>

      <div className="flex items-center justify-between pt-4 border-t border-black/5">
        <p className="text-lg font-black text-secondary tabular-nums tracking-tight">
          {formatPrice(service.price)}
          <span className="text-[10px] font-bold text-muted-foreground/50 ml-1">/ service</span>
        </p>
        <div className="h-8 w-8 rounded-full bg-accent/10 flex items-center justify-center text-accent group-hover:bg-accent/20 transition-colors">
           <ArrowRight className="h-4 w-4" />
        </div>
      </div>
    </Link>
  );
}
