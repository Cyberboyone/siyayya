import React, { useState, useEffect } from "react";
import { Youtube, Play, Loader2 } from "lucide-react";
import { cn, getYouTubeEmbedUrl, extractYouTubeId } from "@/lib/utils";

interface MediaRendererProps {
  url: string;
  type?: "image" | "video" | "youtube";
  alt?: string;
  className?: string;
  containerClassName?: string;
  objectFit?: "cover" | "contain";
  showControls?: boolean;
}

export const MediaRenderer: React.FC<MediaRendererProps> = ({
  url,
  type: initialType,
  alt = "Media content",
  className,
  containerClassName,
  objectFit = "cover",
  showControls = true,
}) => {
  const [aspectRatio, setAspectRatio] = useState<number | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState(false);
  const [type, setType] = useState<"image" | "video" | "youtube">(initialType || "image");

  const optimizedUrl = React.useMemo(() => {
    if (!url || typeof url !== 'string') return url;
    // If it's a Cloudinary URL, inject optimization parameters
    if (url.includes("res.cloudinary.com") && !url.includes("/f_auto,q_auto/")) {
      return url.replace("/upload/", "/upload/f_auto,q_auto,w_1000/");
    }
    return url;
  }, [url]);

  useEffect(() => {
    // Auto-detect type if not provided
    if (!initialType) {
      if (optimizedUrl.includes("youtube.com") || optimizedUrl.includes("youtu.be") || optimizedUrl.length === 11) {
        setType("youtube");
      } else if (optimizedUrl.match(/\.(mp4|webm|ogg|mov)$|^data:video/i)) {
        setType("video");
      } else {
        setType("image");
      }
    } else {
      setType(initialType);
    }
  }, [optimizedUrl, initialType]);

  // Reset load/error/aspect state whenever the URL changes. Without this,
  // switching between images in a gallery (e.g. clicking a thumbnail) reused
  // the same MediaRenderer instance and kept isLoaded=true from the previous
  // image, so the new image would render at full opacity before it actually
  // loaded (or silently stay blank on a slow connection) instead of showing
  // the loading spinner again.
  useEffect(() => {
    setIsLoaded(false);
    setError(false);
    setAspectRatio(null);
  }, [optimizedUrl]);

  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const { naturalWidth, naturalHeight } = e.currentTarget;
    if (naturalWidth && naturalHeight) {
      setAspectRatio(naturalWidth / naturalHeight);
    }
    setIsLoaded(true);
  };

  const handleVideoMetadata = (e: React.SyntheticEvent<HTMLVideoElement>) => {
    const { videoWidth, videoHeight } = e.currentTarget;
    if (videoWidth && videoHeight) {
      setAspectRatio(videoWidth / videoHeight);
    }
    setIsLoaded(true);
  };

  if (type === "youtube") {
    if (!url) return null;
    // Handle both full URLs and raw Video IDs
    const videoId = url.length === 11 ? url : (extractYouTubeId(url) || url);
    const embedUrl = `https://www.youtube.com/embed/${videoId}`;
    const isShort = url.includes("/shorts/");
    
    return (
      <div 
        className={cn(
          "relative w-full overflow-hidden bg-muted transition-all duration-500",
          isShort ? "aspect-[9/16] max-w-[350px] mx-auto" : "aspect-video",
          containerClassName
        )}
      >
        {!isLoaded && (
          <div className="absolute inset-0 flex items-center justify-center bg-muted animate-pulse">
            <Loader2 className="h-6 w-6 animate-spin text-primary/40" />
          </div>
        )}
        <iframe
          src={embedUrl || ""}
          title={alt}
          className={cn("w-full h-full border-0", className)}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          onLoad={() => setIsLoaded(true)}
        />
      </div>
    );
  }

  if (type === "video") {
    if (!url) return null;
    return (
      <div 
        className={cn(
          "relative w-full bg-muted flex items-center justify-center overflow-hidden transition-all duration-500",
          containerClassName
        )}
        style={{ aspectRatio: aspectRatio ? `${aspectRatio}` : undefined }}
      >
        {!isLoaded && (
          <div className="absolute inset-0 flex items-center justify-center bg-muted z-10">
            <Loader2 className="h-6 w-6 animate-spin text-primary/40" />
          </div>
        )}
        <video
          src={optimizedUrl}
          className={cn(
            "w-full h-full transition-opacity duration-500",
            objectFit === "cover" ? "object-cover" : "object-contain",
            !isLoaded ? "opacity-0" : "opacity-100",
            className
          )}
          controls={showControls}
          onLoadedMetadata={handleVideoMetadata}
          onError={() => setError(true)}
          playsInline
          muted
        />
        {error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-muted text-muted-foreground p-4 text-center">
            <Play className="h-8 w-8 mb-2 opacity-20" />
            <p className="text-xs font-medium">Video could not be loaded</p>
          </div>
        )}
      </div>
    );
  }

  // Default to Image
  return (
    <div 
      className={cn(
        "relative w-full bg-muted flex items-center justify-center overflow-hidden transition-all duration-500",
        containerClassName
      )}
      style={{ aspectRatio: aspectRatio ? `${aspectRatio}` : undefined }}
    >
      {!isLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted z-10 animate-pulse">
          <Loader2 className="h-6 w-6 animate-spin text-primary/40" />
        </div>
      )}
      <img
        src={optimizedUrl}
        alt={alt}
        className={cn(
          "w-full h-full transition-all duration-700",
          objectFit === "cover" ? "object-cover" : "object-contain",
          !isLoaded ? "opacity-0" : "opacity-100",
          className
        )}
        onLoad={handleImageLoad}
        onError={() => setError(true)}
        loading="lazy"
      />
      {error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-muted text-muted-foreground p-4 text-center">
          <Play className="h-8 w-8 mb-2 opacity-20" />
          <p className="text-xs font-medium">Image could not be loaded</p>
        </div>
      )}
    </div>
  );
};
