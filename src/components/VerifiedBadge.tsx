import React from "react";
import { BadgeCheck } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface VerifiedBadgeProps {
  className?: string;
  iconClassName?: string;
}

export const VerifiedBadge: React.FC<VerifiedBadgeProps> = ({ className = "", iconClassName = "h-4 w-4" }) => {
  return (
    <TooltipProvider>
      <Tooltip delayDuration={300}>
        <TooltipTrigger asChild>
          <span className={`inline-flex items-center justify-center shrink-0 ml-1 ${className}`}>
            <BadgeCheck 
              className={`text-primary fill-white drop-shadow-sm ${iconClassName}`} 
              strokeWidth={1.5}
            />
          </span>
        </TooltipTrigger>
        <TooltipContent side="top" className="bg-black/90 text-white text-[10px] font-bold tracking-widest uppercase border-white/10">
          <p>Verified Account</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
