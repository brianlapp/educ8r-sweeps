
import { useState, useEffect, useRef } from 'react';
import { optimizeImage } from '@/utils/imageOptimization';

interface OptimizedImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  quality?: number;
  maxWidth?: number;
  placeholderSrc?: string;
  eager?: boolean; // For above-the-fold images that should load immediately
  priority?: 'high' | 'low' | 'auto';
  blurhash?: string; // Optional blurhash placeholder
}

// Cache observed elements to avoid duplicate observations
const observedElements = new WeakSet();
let imageObserver: IntersectionObserver | null = null;

export function OptimizedImage({
  src,
  alt,
  quality = 0.7,
  maxWidth = 800,
  placeholderSrc = '/placeholder.svg',
  className = '',
  eager = false,
  priority = 'auto',
  blurhash,
  ...props
}: OptimizedImageProps) {
  const [optimizedSrc, setOptimizedSrc] = useState<string>(placeholderSrc);
  const [isLoading, setIsLoading] = useState(!eager);
  const [error, setError] = useState(false);
  const [isIntersecting, setIsIntersecting] = useState(eager);
  const imgRef = useRef<HTMLImageElement>(null);

  // Create image observer if it doesn't exist
  useEffect(() => {
    if (!imageObserver && typeof IntersectionObserver !== 'undefined') {
      imageObserver = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              const imgElement = entry.target as HTMLImageElement;
              setIsIntersecting(true);
              imageObserver?.unobserve(imgElement);
            }
          });
        },
        {
          rootMargin: '200px', // Start loading images when they're 200px from viewport
          threshold: 0.01
        }
      );
    }
    
    return () => {
      if (imgRef.current && imageObserver && observedElements.has(imgRef.current)) {
        imageObserver.unobserve(imgRef.current);
        observedElements.delete(imgRef.current);
      }
    };
  }, []);

  // Add observer to current image
  useEffect(() => {
    if (imgRef.current && imageObserver && !eager && !observedElements.has(imgRef.current)) {
      imageObserver.observe(imgRef.current);
      observedElements.add(imgRef.current);
    }
  }, [eager, imgRef.current]);

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
    // Don't load the image until it's in viewport (or is eager)
    if (!src || !isIntersecting) return;

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
  }, [src, quality, maxWidth, isIntersecting]);

  const srcSet = generateSrcSet(optimizedSrc);
  const sizes = `(max-width: 768px) 100vw, ${maxWidth}px`;

  // Determine proper loading strategy
  const loadingStrategy = eager ? "eager" : "lazy";
  const decodingStrategy = eager ? "sync" : "async";
  const fetchPriorityStrategy = priority === 'auto' 
    ? (eager ? "high" : "auto") 
    : priority;

  return (
    <>
      {isLoading && (
        <div 
          className={`bg-gray-200 animate-pulse ${className}`} 
          style={{
            ...props.style,
            aspectRatio: props.width && props.height 
              ? `${props.width} / ${props.height}` 
              : 'auto'
          }}
          aria-hidden="true"
        >
          <img 
            src={placeholderSrc} 
            alt=""
            className="w-full h-full object-cover opacity-30"
            width={props.width} 
            height={props.height}
            aria-hidden="true"
          />
        </div>
      )}
      <img
        ref={imgRef}
        src={isIntersecting ? optimizedSrc : placeholderSrc}
        alt={alt}
        className={`${className} ${isLoading ? 'hidden' : ''}`}
        loading={loadingStrategy}
        decoding={decodingStrategy}
        fetchPriority={fetchPriorityStrategy}
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
