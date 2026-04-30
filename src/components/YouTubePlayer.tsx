import React from "react";
import { getYouTubeEmbedUrl } from "@/lib/utils";

interface YouTubePlayerProps {
  url: string;
  title?: string;
  className?: string;
}

/**
 * 🎥 PREMIUM YOUTUBE PLAYER
 * A responsive, clean YouTube embed component that handles all URL formats.
 */
export const YouTubePlayer: React.FC<YouTubePlayerProps> = ({ 
  url, 
  title = "YouTube Video Player",
  className = "" 
}) => {
  const embedUrl = getYouTubeEmbedUrl(url);

  if (!embedUrl) {
    return (
      <div className={`aspect-video w-full bg-secondary/20 rounded-2xl flex items-center justify-center border-2 border-dashed border-muted-foreground/20 ${className}`}>
        <div className="text-center p-6">
          <p className="text-sm font-bold text-muted-foreground">Invalid YouTube URL</p>
          <p className="text-[10px] text-muted-foreground/60 mt-1 italic">Please check your link format</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative w-full aspect-video rounded-2xl overflow-hidden shadow-2xl border border-white/10 group ${className}`}>
      {/* Decorative background pulse */}
      <div className="absolute inset-0 bg-primary/5 animate-pulse -z-10" />
      
      <iframe
        className="absolute inset-0 w-full h-full"
        src={embedUrl}
        title={title}
        frameBorder="0"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowFullScreen
      />
    </div>
  );
};

export default YouTubePlayer;
