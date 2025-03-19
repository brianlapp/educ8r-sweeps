import { useState, useEffect, useRef } from 'react';
import { optimizeImage, getImageDimensions } from '@/utils/imageOptimization';

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
  const [optimizedSrc, setOptimizedSrc] = useState<string>(isLCP || eager ? src : placeholderSrc);
  const [isLoading, setIsLoading] = useState(!eager && !isLCP);
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
              observedElements.delete(imgElement);
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

  // Preload LCP images immediately to improve performance score
  useEffect(() => {
    if (isLCP && typeof document !== 'undefined') {
      // Add to head immediately for LCP images
      const link = document.createElement('link');
      link.rel = 'preload';
      link.as = 'image';
      link.href = src;
      link.type = 'image/webp'; // Prefer WebP format
      link.setAttribute('fetchpriority', 'high');
      
      // Set media type for responsive images if necessary
      const numericWidth = typeof propWidth === 'number' ? propWidth : 
                          typeof propWidth === 'string' ? parseInt(propWidth, 10) : null;
      
      if (numericWidth !== null && numericWidth < 768) {
        link.setAttribute('media', '(max-width: 768px)');
      }
      
      document.head.appendChild(link);
      
      // Start optimization immediately for LCP images
      optimizeImage(src, { 
        quality, 
        maxWidth,
        preferWebP: true,
        preferCache: false // Don't use cache for LCP images, ensure freshness
      }).then(optimized => {
        setOptimizedSrc(optimized);
        setIsLoading(false);
      }).catch(() => {
        setOptimizedSrc(src);
        setIsLoading(false);
      });
      
      // Cleanup
      return () => {
        document.head.removeChild(link);
      };
    }
  }, [isLCP, src, quality, maxWidth]);

  // Add observer to non-LCP, non-eager images
  useEffect(() => {
    if (imgRef.current && imageObserver && !eager && !isLCP && !observedElements.has(imgRef.current)) {
      imageObserver.observe(imgRef.current);
      observedElements.add(imgRef.current);
    }
  }, [eager, isLCP, imgRef.current]);

  // Generate appropriate srcset for responsive images
  const generateSrcSet = (baseSrc: string): string | undefined => {
    if (!baseSrc || baseSrc === placeholderSrc || baseSrc.includes('data:') || baseSrc.endsWith('.svg')) {
      return undefined;
    }
    
    const widths = [400, 800, 1200, 1600];
    return widths
      .filter(w => w <= maxWidth * 2) // Don't go beyond double the maxWidth
      .map(w => `${baseSrc}?width=${w} ${w}w`)
      .join(', ');
  };

  // Load and optimize non-LCP images when they come into view
  useEffect(() => {
    // Don't load the image until it's in viewport (or is eager)
    if (!src || (!isIntersecting && !isLCP)) return;
    
    // Skip if we've already optimized for LCP
    if (isLCP && optimizedSrc !== placeholderSrc) return;

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
          preferWebP: true
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
  }, [src, quality, maxWidth, isIntersecting, isLCP]);

  // Ensure we have width and height - critical for preventing layout shifts
  const imgWidth = dimensions.width || propWidth;
  const imgHeight = dimensions.height || propHeight;
  const hasExplicitDimensions = Boolean(imgWidth && imgHeight);

  const srcSet = generateSrcSet(optimizedSrc);
  const sizes = `(max-width: 768px) 100vw, ${maxWidth}px`;

  // Determine proper loading strategy
  const loadingStrategy = eager || isLCP ? "eager" : "lazy";
  
  // Fix TypeScript errors by using the correct attribute name and type
  const imgAttributes: React.ImgHTMLAttributes<HTMLImageElement> = {
    src: isIntersecting || isLCP ? optimizedSrc : placeholderSrc,
    alt,
    className: `${className} ${isLoading ? 'opacity-0' : 'opacity-100 transition-opacity duration-300'}`,
    loading: loadingStrategy as "eager" | "lazy",
    decoding: isLCP ? "sync" : "async",
    srcSet: srcSet,
    sizes: srcSet ? sizes : undefined,
    width: imgWidth,
    height: imgHeight,
    fetchPriority: (isLCP ? "high" : (priority === 'high' ? "high" : "auto")) as "high" | "low" | "auto",
    style: {
      aspectRatio: hasExplicitDimensions ? `${imgWidth} / ${imgHeight}` : undefined,
      objectFit: 'contain', // Ensure the image maintains its aspect ratio
      ...(props.style || {})
    },
    onError: () => {
      setError(true);
      setOptimizedSrc(src); // Fallback to original source on error
    },
    ...props
  };

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
        {...imgAttributes}
      />
    </>
  );
}
