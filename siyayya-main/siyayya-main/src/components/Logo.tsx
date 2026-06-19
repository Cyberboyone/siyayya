import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
  textClassName?: string;
  showDotCom?: boolean;
}

export function Logo({ className = "", textClassName = "", showDotCom = true }: LogoProps) {
  return (
    <div className={cn("flex items-center", className)}>
      <img 
        src="/logo.png" 
        alt="Siyayya" 
        className={cn("h-16 sm:h-14 w-auto object-contain scale-110 sm:scale-100 origin-left", textClassName)}
      />
    </div>
  );
}
