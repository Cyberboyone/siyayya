import { useRef, useState } from "react";
import { Upload, X, Loader2, Video as VideoIcon } from "lucide-react";
import { toast } from "sonner";
import { uploadToCloudinary } from "@/lib/cloudinary";
import { cn } from "@/lib/utils";

interface ListingVideoUploadProps {
  value: { url: string; publicId: string } | null;
  onChange: (value: { url: string; publicId: string } | null) => void;
  onUploadingChange?: (isUploading: boolean) => void;
  maxSizeMB?: number;
  className?: string;
}

/**
 * Direct-to-Cloudinary video uploader for listings — deliberately a
 * separate, small component from CloudinaryUpload.tsx (the multi-image
 * uploader used elsewhere) rather than generalizing that one, since this
 * has different concerns entirely: single file, video-only, a hard size
 * cap, and a <video> preview instead of an <img> grid. Access to this
 * component at all is gated by the caller (only rendered for the super
 * admin account — see NewListing.tsx/EditListing.tsx) and independently
 * enforced server-side (api/listings/create.ts + firestore.rules), so this
 * component itself has no admin-check responsibility — it only handles the
 * upload mechanics once it's already been decided the user may see it.
 */
export function ListingVideoUpload({
  value,
  onChange,
  onUploadingChange,
  maxSizeMB = 10,
  className,
}: ListingVideoUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    if (!file.type.startsWith("video/")) {
      toast.error("Please select a video file.");
      return;
    }

    const maxBytes = maxSizeMB * 1024 * 1024;
    if (file.size > maxBytes) {
      toast.error(`Video must be ${maxSizeMB}MB or smaller. This file is ${(file.size / (1024 * 1024)).toFixed(1)}MB.`);
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    setIsUploading(true);
    onUploadingChange?.(true);
    try {
      const uploaded = await uploadToCloudinary(file);
      onChange({ url: uploaded.secure_url, publicId: uploaded.public_id });
    } catch (err: any) {
      toast.error(err?.message || "Video upload failed. Please try again.");
    } finally {
      setIsUploading(false);
      onUploadingChange?.(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  if (value) {
    return (
      <div className={cn("relative rounded-[2rem] overflow-hidden border-2 border-primary/10 shadow-2xl bg-black", className)}>
        <video src={value.url} className="w-full max-h-80 object-contain" controls playsInline muted />
        <button
          type="button"
          onClick={() => onChange(null)}
          className="absolute top-3 right-3 h-9 w-9 rounded-full bg-black/60 hover:bg-black/80 text-white flex items-center justify-center transition-colors"
          aria-label="Remove video"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "relative flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-[2rem] transition-colors cursor-pointer",
        "hover:bg-muted/50 border-black/10 dark:border-white/10",
        isUploading && "pointer-events-none opacity-60",
        className
      )}
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleDrop}
      onClick={() => !isUploading && fileInputRef.current?.click()}
      role="button"
      tabIndex={0}
    >
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        className="hidden"
        accept="video/*"
      />
      <div className="flex flex-col items-center justify-center gap-2 text-center">
        {isUploading ? (
          <>
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm font-bold text-textPrimary">Uploading video...</p>
          </>
        ) : (
          <>
            <div className="p-3 bg-primary/10 rounded-full">
              <VideoIcon className="h-6 w-6 text-primary" />
            </div>
            <p className="text-sm font-bold text-textPrimary">Upload a video</p>
            <p className="text-xs text-textMuted font-medium flex items-center gap-1">
              <Upload className="h-3 w-3" /> Drag and drop or click to browse — max {maxSizeMB}MB
            </p>
          </>
        )}
      </div>
    </div>
  );
}
