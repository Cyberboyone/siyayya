import React, { useState, useRef, useCallback } from 'react';
import { Upload, X, Loader2, Image as ImageIcon, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { uploadToCloudinary, deleteFromCloudinary } from '@/lib/cloudinary';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

interface CloudinaryUploadProps {
  onUpload: (data: { url: string; publicId: string; resourceType: string }) => void;
  multiple?: boolean;
  label?: string;
  accept?: string;
  className?: string;
}

export function CloudinaryUpload({
  onUpload,
  multiple = false,
  label = 'Upload Media',
  accept = 'image/*',
  className,
}: CloudinaryUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [previews, setPreviews] = useState<{ url: string; publicId: string; resourceType: string }[]>([]);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    setError(null);

    try {
      // Process files sequentially or in parallel; we'll do sequential for simplicity
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        
        const uploadData = await uploadToCloudinary(file);
        const newPreview = {
          url: uploadData.secure_url,
          publicId: uploadData.public_id,
          resourceType: uploadData.resource_type
        };
        
        if (multiple) {
          setPreviews((prev) => [...prev, newPreview]);
        } else {
          setPreviews([newPreview]);
        }
        
        onUpload({
          url: uploadData.secure_url,
          publicId: uploadData.public_id,
          resourceType: uploadData.resource_type
        });
        
        // If not multiple, break after the first file
        if (!multiple) break;
      }
    } catch (err: any) {
      const errorMessage = err.message || 'Error uploading image';
      setError(errorMessage);
      toast({
        title: 'Upload Failed',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsUploading(false);
      // Reset input so the same file could be selected again if needed
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      if (fileInputRef.current) {
        // We simulate a change event by setting the files on the input (not directly possible but we can trigger our upload function directly)
        fileInputRef.current.files = e.dataTransfer.files;
        // manually dispatch change event
        const event = new Event('change', { bubbles: true });
        fileInputRef.current.dispatchEvent(event);
      }
    }
  }, []);

  const handleRemove = async (index: number, e: React.MouseEvent) => {
    e.stopPropagation();
    const preview = previews[index];
    if (!preview) return;

    // Optional: Only delete from Cloudinary if it's not a fresh upload
    // but here we'll delete it to keep Cloudinary clean
    const success = await deleteFromCloudinary(preview.publicId, preview.resourceType);
    if (success) {
      setPreviews(prev => prev.filter((_, i) => i !== index));
      toast({
        title: 'Removed',
        description: 'Media removed successfully',
      });
    } else {
      toast({
        title: 'Error',
        description: 'Failed to delete media from Cloudinary',
        variant: 'destructive',
      });
      // Still remove from UI even if Cloudinary delete fails? 
      // Usually better to let user know and maybe still remove from UI if they insist
      setPreviews(prev => prev.filter((_, i) => i !== index));
    }
  };

  const clearPreviews = () => {
    setPreviews([]);
  };

  return (
    <div className={cn("w-full space-y-4", className)}>
      <div
        className={cn(
          "relative flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-lg transition-colors",
          "hover:bg-muted/50 border-muted-foreground/25",
          isUploading && "pointer-events-none opacity-60"
        )}
        onDragOver={handleDragOver}
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
          accept={accept}
          multiple={multiple}
        />
        
        <div className="flex flex-col items-center justify-center space-y-2 text-center">
          {isUploading ? (
            <>
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm font-medium text-muted-foreground">Uploading...</p>
            </>
          ) : (
            <>
              <div className="p-3 bg-muted rounded-full">
                <Upload className="h-6 w-6 text-muted-foreground" />
              </div>
              <p className="text-sm font-medium">{label}</p>
              <p className="text-xs text-muted-foreground">
                Drag and drop or click to browse
              </p>
            </>
          )}
        </div>
      </div>

      {error && (
        <div className="text-sm text-destructive font-medium">
          {error}
        </div>
      )}

      {previews.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
          {previews.map((preview, index) => (
            <div key={index} className="relative aspect-square border rounded-md overflow-hidden bg-muted group">
                <img
                  src={preview.url}
                  alt={`Preview ${index + 1}`}
                  className="object-cover w-full h-full"
                />
              <button
                onClick={(e) => handleRemove(index, e)}
                className="absolute top-1 right-1 p-1 bg-black/50 rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
