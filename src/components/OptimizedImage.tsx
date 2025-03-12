
import { useState, useEffect } from 'react';
import { optimizeImage } from '@/utils/imageOptimization';

interface OptimizedImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  quality?: number;
  maxWidth?: number;
  placeholderSrc?: string;
  eager?: boolean; // For above-the-fold images that should load immediately
}

export function OptimizedImage({
  src,
  alt,
  quality = 0.7,
  maxWidth = 800,
  placeholderSrc = '/placeholder.svg',
  className = '',
  eager = false,
  ...props
}: OptimizedImageProps) {
  const [optimizedSrc, setOptimizedSrc] = useState<string>(placeholderSrc);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);

  // Generate appropriate srcset for responsive images
  const generateSrcSet = (baseSrc: string): string | undefined => {
    if (!baseSrc || baseSrc === placeholderSrc) return undefined;
    
    // Don't generate srcset for SVGs or data URLs
    if (baseSrc.includes('data:') || baseSrc.endsWith('.svg')) return undefined;
    
    const widths = [400, 800, 1200, 1600];
    return widths
      .filter(w => w <= maxWidth * 2) // Don't go beyond double the maxWidth
      .map(w => `${baseSrc}?width=${w} ${w}w`)
      .join(', ');
  };

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

  const srcSet = generateSrcSet(optimizedSrc);
  const sizes = `(max-width: 768px) 100vw, ${maxWidth}px`;

  return (
    <>
      {isLoading && (
        <div 
          className={`bg-gray-200 animate-pulse ${className}`} 
          style={props.style}
          aria-hidden="true"
        >
          <img 
            src={placeholderSrc} 
            alt={alt} 
            className="w-full h-full object-cover opacity-30"
            width={props.width} 
            height={props.height}
          />
        </div>
      )}
      <img
        src={optimizedSrc}
        alt={alt}
        className={`${className} ${isLoading ? 'hidden' : ''}`}
        loading={eager ? "eager" : "lazy"}
        decoding={eager ? "sync" : "async"}
        fetchPriority={eager ? "high" : "auto"}
        srcSet={srcSet}
        sizes={srcSet ? sizes : undefined}
        onError={() => {
          setError(true);
          setOptimizedSrc(src); // Fallback to original source on error
        }}
        {...props}
      />
    </>
  );
}
