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
        className={cn("h-12 w-auto object-contain", textClassName)}
      />
    </div>
  );
}
