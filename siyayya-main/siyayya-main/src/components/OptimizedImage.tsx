import React, { useState, useEffect } from 'react';
import { getOptimizedUrl } from '@/lib/cloudinary-utils';

interface OptimizedImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  className?: string;
}

export const OptimizedImage: React.FC<OptimizedImageProps> = ({
  src,
  alt,
  width,
  height,
  className = '',
  ...props
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState(false);

  // Generate a tiny placeholder and the full image URL
  const placeholderUrl = getOptimizedUrl(src, { width: 50, blur: 1000, quality: '10' });
  const fullUrl = getOptimizedUrl(src, { width, height });

  // Reset state if src changes
  useEffect(() => {
    setIsLoaded(false);
    setError(false);
  }, [src]);

  if (error) {
    return (
      <div className={`bg-gray-200 flex items-center justify-center text-gray-400 ${className}`}>
        <span>Image failed to load</span>
      </div>
    );
  }

  return (
    <div className={`relative overflow-hidden ${className}`}>
      {/* Blurred Placeholder */}
      <img
        src={placeholderUrl}
        alt=""
        className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-500 ease-out ${
          isLoaded ? 'opacity-0' : 'opacity-100'
        }`}
        aria-hidden="true"
      />

      {/* Main Image */}
      <img
        src={fullUrl}
        alt={alt}
        className={`relative w-full h-full object-cover transition-opacity duration-500 ease-out ${
          isLoaded ? 'opacity-100' : 'opacity-0'
        }`}
        onLoad={() => setIsLoaded(true)}
        onError={() => setError(true)}
        loading="lazy"
        decoding="async"
        crossOrigin="anonymous"
        {...props}
      />
    </div>
  );
};
