import React, { useState } from "react";
import { Share2, Download, MessageCircle, Link as LinkIcon, Loader2 } from "lucide-react";
import { toPng } from "html-to-image";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

interface ShareCardButtonProps {
  cardRef: React.RefObject<HTMLDivElement>;
  title: string;
  urlPath: string; // e.g. /product/123
}

export const ShareCardButton: React.FC<ShareCardButtonProps> = ({ cardRef, title, urlPath }) => {
  const [isGenerating, setIsGenerating] = useState(false);

  const fullUrl = `${window.location.origin}${urlPath}?ref=share`;

  // Helper: Prepare card for sharing and capture
  const captureCard = async (): Promise<string | null> => {
    if (!cardRef.current) return null;
    setIsGenerating(true);

    try {
      // 1. Show watermark, hide 'no-share'
      const watermark = cardRef.current.querySelector('.share-watermark') as HTMLElement;
      if (watermark) watermark.style.opacity = '1';
      
      const noShareElements = cardRef.current.querySelectorAll('.no-share');
      noShareElements.forEach(el => ((el as HTMLElement).style.display = 'none'));

      // 2. Wait a frame for DOM to update
      await new Promise(resolve => requestAnimationFrame(resolve));

      // 3. Capture
      const dataUrl = await toPng(cardRef.current, {
        quality: 1.0,
        pixelRatio: 2,
        cacheBust: true,
        backgroundColor: '#ffffff', // Ensure solid background
        style: {
          transform: 'scale(1)',
          transformOrigin: 'top left',
        }
      });

      // 3. Restore styles
      if (watermark) watermark.style.opacity = '0';
      noShareElements.forEach(el => ((el as HTMLElement).style.display = ''));

      return dataUrl;
    } catch (error) {
      console.error("Failed to generate image", error);
      toast.error("Failed to generate shareable image.");
      
      // Cleanup styles on error
      const watermark = cardRef.current?.querySelector('.share-watermark') as HTMLElement;
      if (watermark) watermark.style.opacity = '0';
      const noShareElements = cardRef.current?.querySelectorAll('.no-share');
      noShareElements?.forEach(el => ((el as HTMLElement).style.display = ''));
      
      return null;
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = async () => {
    const dataUrl = await captureCard();
    if (dataUrl) {
      const link = document.createElement("a");
      link.download = `siyayya-${title.toLowerCase().replace(/\s+/g, '-')}.png`;
      link.href = dataUrl;
      link.click();
      toast.success("Image downloaded successfully!");
    }
  };

  const handleShareNative = async () => {
    const dataUrl = await captureCard();
    if (!dataUrl) return;

    // Convert dataUrl to blob to file for native sharing
    try {
      const res = await fetch(dataUrl);
      const blob = await res.blob();
      const file = new File([blob], "share.png", { type: blob.type });

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          title: `Check out ${title} on Siyayya`,
          text: `I found this amazing deal on Siyayya Campus Marketplace!`,
          url: fullUrl,
          files: [file],
        });
        toast.success("Shared successfully!");
      } else {
        // Fallback if browser can't share files
        handleWhatsAppShare();
      }
    } catch (err: any) {
      // User cancelled or unsupported
      if (err.name !== 'AbortError') {
        toast.error("Could not use native sharing. Trying WhatsApp...");
        handleWhatsAppShare();
      }
    }
  };

  const handleWhatsAppShare = () => {
    const text = encodeURIComponent(`Check out ${title} on Siyayya Campus Marketplace!\n\n${fullUrl}`);
    window.open(`https://wa.me/?text=${text}`, '_blank');
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(fullUrl);
    toast.success("Link copied to clipboard!");
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className="no-share absolute bottom-3 right-3 z-20 h-9 w-9 flex items-center justify-center rounded-full bg-black/40 backdrop-blur-md border border-white/20 transition-all hover:bg-black/60 hover:scale-110 active:scale-95 group/sharebtn shadow-lg"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
        >
          {isGenerating ? (
            <Loader2 className="h-4.5 w-4.5 text-white animate-spin drop-shadow-md" />
          ) : (
            <Share2 className="h-4.5 w-4.5 text-white drop-shadow-md group-hover/sharebtn:text-blue-400 transition-colors" />
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48 bg-[#161b2e]/95 backdrop-blur-xl border-white/10 text-white rounded-xl shadow-2xl p-1 z-[100]" onClick={(e) => e.stopPropagation()}>
         <DropdownMenuItem onClick={handleShareNative} className="gap-2 cursor-pointer rounded-lg item-hover">
           <Share2 className="h-4 w-4 text-blue-400" /> Share Image
         </DropdownMenuItem>
         <DropdownMenuItem onClick={handleWhatsAppShare} className="gap-2 cursor-pointer rounded-lg item-hover">
           <MessageCircle className="h-4 w-4 text-emerald-400" /> Share to WhatsApp
         </DropdownMenuItem>
         <DropdownMenuSeparator className="bg-white/10 opacity-50" />
         <DropdownMenuItem onClick={handleDownload} className="gap-2 cursor-pointer rounded-lg item-hover">
           <Download className="h-4 w-4 text-orange-400" /> Download PNG
         </DropdownMenuItem>
         <DropdownMenuItem onClick={handleCopyLink} className="gap-2 cursor-pointer rounded-lg item-hover">
           <LinkIcon className="h-4 w-4 text-white/70" /> Copy Link
         </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
