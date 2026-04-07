import React, { useState, useRef, useCallback } from 'react';
import { Upload, X, Loader2, Image as ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { uploadToCloudinary } from '@/lib/cloudinary';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

interface CloudinaryUploadProps {
  onUpload: (url: string) => void;
  multiple?: boolean;
  label?: string;
  className?: string;
}

export function CloudinaryUpload({
  onUpload,
  multiple = false,
  label = 'Upload Image',
  className,
}: CloudinaryUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [previews, setPreviews] = useState<string[]>([]);
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
        
        // Basic validation
        if (!file.type.startsWith('image/')) {
          throw new Error('Please select only image files.');
        }

        const url = await uploadToCloudinary(file);
        
        if (multiple) {
          setPreviews((prev) => [...prev, url]);
        } else {
          setPreviews([url]);
        }
        
        onUpload(url);
        
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
          accept="image/*"
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
            <div key={index} className="relative aspect-square border rounded-md overflow-hidden bg-muted">
              <img
                src={preview}
                alt={`Preview ${index + 1}`}
                className="object-cover w-full h-full"
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
