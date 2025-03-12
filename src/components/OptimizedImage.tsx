
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
  isLCP?: boolean; // Mark as Largest Contentful Paint element
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
  isLCP = false,
  width: propWidth,
  height: propHeight,
  ...props
}: OptimizedImageProps) {
  const [optimizedSrc, setOptimizedSrc] = useState<string>(placeholderSrc);
  const [isLoading, setIsLoading] = useState(!eager);
  const [error, setError] = useState(false);
  const [isIntersecting, setIsIntersecting] = useState(eager || isLCP);
  const imgRef = useRef<HTMLImageElement>(null);
  const [dimensions, setDimensions] = useState<{width?: number, height?: number}>({
    width: propWidth as number,
    height: propHeight as number
  });

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
    if (imgRef.current && imageObserver && !eager && !isLCP && !observedElements.has(imgRef.current)) {
      imageObserver.observe(imgRef.current);
      observedElements.add(imgRef.current);
    }
  }, [eager, isLCP, imgRef.current]);

  // Preload LCP images
  useEffect(() => {
    if (isLCP) {
      const link = document.createElement('link');
      link.rel = 'preload';
      link.as = 'image';
      link.href = src;
      link.type = 'image/webp'; // Prefer WebP format
      document.head.appendChild(link);
      
      // Clean up
      return () => {
        document.head.removeChild(link);
      };
    }
  }, [isLCP, src]);

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
    if (!src || (!isIntersecting && !isLCP)) return;

    let isMounted = true;
    setIsLoading(true);
    setError(false);

    const loadAndOptimize = async () => {
      try {
        // Handle absolute URLs vs relative paths
        const fullSrc = src.startsWith('http') ? src : (src.startsWith('/') ? src : `/${src}`);
        const optimized = await optimizeImage(fullSrc, { 
          quality, 
          maxWidth,
          preferWebP: true // Force WebP when supported
        });
        
        if (isMounted) {
          setOptimizedSrc(optimized);
          setIsLoading(false);
          
          // Extract and store image dimensions if not provided via props
          if (!propWidth || !propHeight) {
            const img = new Image();
            img.onload = () => {
              if (isMounted) {
                setDimensions({
                  width: img.naturalWidth,
                  height: img.naturalHeight
                });
              }
            };
            img.src = optimized;
          }
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
  }, [src, quality, maxWidth, isIntersecting, isLCP, propWidth, propHeight]);

  const srcSet = generateSrcSet(optimizedSrc);
  const sizes = `(max-width: 768px) 100vw, ${maxWidth}px`;

  // Determine proper loading strategy
  const loadingStrategy = eager || isLCP ? "eager" : "lazy";
  const decodingStrategy = eager || isLCP ? "sync" : "async";
  const fetchPriorityStrategy = isLCP ? "high" : (priority === 'auto' 
    ? (eager ? "high" : "auto") 
    : priority);

  // Ensure we have width and height - critical for preventing layout shifts
  const imgWidth = dimensions.width || propWidth;
  const imgHeight = dimensions.height || propHeight;
  const hasExplicitDimensions = Boolean(imgWidth && imgHeight);

  return (
    <>
      {isLoading && (
        <div 
          className={`bg-gray-200 animate-pulse ${className}`} 
          style={{
            width: imgWidth ? `${imgWidth}px` : undefined,
            height: imgHeight ? `${imgHeight}px` : undefined,
            aspectRatio: hasExplicitDimensions 
              ? `${imgWidth} / ${imgHeight}` 
              : '16 / 9'
          }}
          aria-hidden="true"
        >
          <img 
            src={placeholderSrc} 
            alt=""
            className="w-full h-full object-cover opacity-30"
            width={imgWidth} 
            height={imgHeight}
            aria-hidden="true"
          />
        </div>
      )}
      <img
        ref={imgRef}
        src={isIntersecting || isLCP ? optimizedSrc : placeholderSrc}
        alt={alt}
        className={`${className} ${isLoading ? 'hidden' : ''}`}
        loading={loadingStrategy}
        decoding={decodingStrategy}
        fetchPriority={fetchPriorityStrategy}
        srcSet={srcSet}
        sizes={srcSet ? sizes : undefined}
        width={imgWidth}
        height={imgHeight}
        style={{
          aspectRatio: hasExplicitDimensions 
            ? `${imgWidth} / ${imgHeight}` 
            : undefined,
          ...props.style
        }}
        onError={() => {
          setError(true);
          setOptimizedSrc(src); // Fallback to original source on error
        }}
        {...props}
      />
    </>
  );
}
