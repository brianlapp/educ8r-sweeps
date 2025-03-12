
import { useState, useEffect } from 'react';
import { optimizeImage } from '@/utils/imageOptimization';

interface OptimizedImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  quality?: number;
  maxWidth?: number;
  placeholderSrc?: string;
}

export function OptimizedImage({
  src,
  alt,
  quality = 0.7,
  maxWidth = 800,
  placeholderSrc = '/placeholder.svg',
  className = '',
  ...props
}: OptimizedImageProps) {
  const [optimizedSrc, setOptimizedSrc] = useState<string>(placeholderSrc);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!src) return;

    let isMounted = true;
    setIsLoading(true);
    setError(false);

    const loadAndOptimize = async () => {
      try {
        // Handle absolute URLs vs relative paths
        const fullSrc = src.startsWith('http') ? src : (src.startsWith('/') ? src : `/${src}`);
        const optimized = await optimizeImage(fullSrc, { quality, maxWidth });
        
        if (isMounted) {
          setOptimizedSrc(optimized);
          setIsLoading(false);
        }
      } catch (err) {
        console.error('Failed to optimize image:', err);
        if (isMounted) {
          setOptimizedSrc(src);
          setIsLoading(false);
          setError(true);
        }
      }
    };

    loadAndOptimize();

    return () => {
      isMounted = false;
    };
  }, [src, quality, maxWidth]);

  return (
    <>
      {isLoading && (
        <div className={`bg-gray-200 animate-pulse ${className}`} {...props}>
          <img 
            src={placeholderSrc} 
            alt={alt} 
            className="w-full h-full object-cover opacity-30"
          />
        </div>
      )}
      <img
        src={optimizedSrc}
        alt={alt}
        className={`${className} ${isLoading ? 'hidden' : ''}`}
        loading="lazy"
        onError={() => {
          setError(true);
          setOptimizedSrc(src); // Fallback to original source on error
        }}
        {...props}
      />
    </>
  );
}
