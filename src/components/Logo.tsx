import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
  textClassName?: string;
  showDotCom?: boolean;
}

export function Logo({ className = "", textClassName = "", showDotCom = true }: LogoProps) {
  return (
    <div className={cn("flex items-center gap-0", className)}>
      <span className={cn("font-black text-2xl tracking-tighter text-textPrimary", textClassName)}>
        Siyayya
      </span>
      {showDotCom && (
        <span className={cn("font-bold text-2xl tracking-tighter text-textPrimary", textClassName)}>
          .com
        </span>
      )}
    </div>
  );
}
