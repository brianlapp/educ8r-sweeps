
// ImageOptimization utility with performance optimizations

const MAX_IMAGE_DIMENSION = 1024;

// Enhanced cache for optimized images with LRU capabilities
class ImageCache {
  private cache = new Map<string, string>();
  private maxSize: number = 50; // Maximum number of entries to store

  get(key: string): string | undefined {
    const value = this.cache.get(key);
    if (value) {
      // Move the accessed item to the end (most recently used)
      this.cache.delete(key);
      this.cache.set(key, value);
    }
    return value;
  }

  set(key: string, value: string): void {
    // If cache is full, delete oldest entry (first in map)
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
    this.cache.set(key, value);
  }

  has(key: string): boolean {
    return this.cache.has(key);
  }

  clear(): void {
    this.cache.clear();
  }

  // Reduced size by removing older entries when memory is low
  prune(keepCount: number = 10): void {
    if (this.cache.size <= keepCount) return;
    
    const entriesToRemove = this.cache.size - keepCount;
    const keys = Array.from(this.cache.keys());
    
    for (let i = 0; i < entriesToRemove; i++) {
      this.cache.delete(keys[i]);
    }
  }
}

const imageCache = new ImageCache();

// Preload cache for commonly used images
const PRELOAD_IMAGES: string[] = [
  "/lovable-uploads/2b96223c-82ba-48db-9c96-5c37da48d93e.png", // Logo
  "/lovable-uploads/308c0411-e546-4640-ab1a-b354a074f9c4.png"  // Hero
];

// Dimensions cache to prevent layout shifts
const dimensionsCache = new Map<string, {width: number, height: number}>();

function resizeImageIfNeeded(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D, image: HTMLImageElement) {
  let width = image.naturalWidth;
  let height = image.naturalHeight;

  // Store original dimensions in cache
  const imageUrl = image.src.split('?')[0]; // Remove query params
  dimensionsCache.set(imageUrl, {width, height});

  // Check if resizing is needed
  if (width > MAX_IMAGE_DIMENSION || height > MAX_IMAGE_DIMENSION) {
    if (width > height) {
      height = Math.round((height * MAX_IMAGE_DIMENSION) / width);
      width = MAX_IMAGE_DIMENSION;
    } else {
      width = Math.round((width * MAX_IMAGE_DIMENSION) / height);
      height = MAX_IMAGE_DIMENSION;
    }
  }

  canvas.width = width;
  canvas.height = height;
  ctx.drawImage(image, 0, 0, width, height);
  return { width, height };
}

/**
 * Gets cached image dimensions if available
 */
export const getImageDimensions = (src: string): {width?: number, height?: number} => {
  const imageUrl = src.split('?')[0]; // Remove query params
  return dimensionsCache.get(imageUrl) || {};
};

/**
 * Loads an image from a URL
 */
export const loadImage = (src: string): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = (e) => reject(e);
    img.src = src;
  });
};

/**
 * Detect if WebP format is supported
 */
const detectWebPSupport = (): Promise<boolean> => {
  return new Promise((resolve) => {
    const webP = new Image();
    webP.onload = () => resolve(true);
    webP.onerror = () => resolve(false);
    webP.src = 'data:image/webp;base64,UklGRhoAAABXRUJQVlA4TA0AAAAvAAAAEAcQERGIiP4HAA==';
  });
};

// Detect WebP support once and store the result
let webPSupportPromise: Promise<boolean> | null = null;

function getWebPSupport() {
  if (!webPSupportPromise) {
    webPSupportPromise = detectWebPSupport();
  }
  return webPSupportPromise;
}

// Preload common images
if (typeof window !== 'undefined') {
  window.addEventListener('load', () => {
    setTimeout(() => {
      PRELOAD_IMAGES.forEach(async (imgSrc) => {
        try {
          await optimizeImage(imgSrc, { quality: 0.85, preferCache: true });
          console.log(`Preloaded image: ${imgSrc}`);
        } catch (e) {
          // Silently fail preloading
        }
      });
    }, 1000); // Delay preloading to not compete with critical resources
  });
}

/**
 * Compresses and optimizes an image
 * @param imageUrl URL of the image to optimize
 * @param options Quality and size options
 * @returns A promise that resolves to the optimized image URL
 */
export const optimizeImage = async (
  imageUrl: string, 
  options: { 
    quality?: number,
    maxWidth?: number,
    preferWebP?: boolean,
    preferCache?: boolean
  } = {}
): Promise<string> => {
  const { 
    quality = 0.7, 
    maxWidth = 800, 
    preferWebP = true,
    preferCache = false 
  } = options;
  
  // Don't optimize SVGs
  if (imageUrl.endsWith('.svg')) {
    return imageUrl;
  }
  
  // Check cache first
  const cacheKey = `${imageUrl}-${quality}-${maxWidth}-${preferWebP}`;
  if (imageCache.has(cacheKey)) {
    return imageCache.get(cacheKey)!;
  }

  try {
    // Skip optimization for non-image extensions
    const skipExtensions = ['.pdf', '.txt', '.json', '.js', '.css', '.html'];
    if (skipExtensions.some(ext => imageUrl.toLowerCase().endsWith(ext))) {
      return imageUrl;
    }

    // Skip external URLs if preferCache is true (except for first load)
    if (preferCache && imageUrl.startsWith('http') && !PRELOAD_IMAGES.includes(imageUrl)) {
      return imageUrl;
    }

    // Load the image
    const image = await loadImage(imageUrl);
    
    // Store dimensions in cache for future reference
    dimensionsCache.set(imageUrl.split('?')[0], {
      width: image.naturalWidth,
      height: image.naturalHeight
    });
    
    // Create a canvas to draw the image
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    if (!ctx) {
      throw new Error('Could not get canvas context');
    }
    
    // Resize if needed
    const { width, height } = resizeImageIfNeeded(canvas, ctx, image);
    
    // Check for WebP support
    const supportsWebP = await getWebPSupport();
    
    // Compress with best available format
    const format = (supportsWebP && preferWebP) ? 'image/webp' : 'image/jpeg';
    const optimizedUrl = canvas.toDataURL(format, quality);
    
    // Cache the result
    imageCache.set(cacheKey, optimizedUrl);
    
    console.log(`Optimized image: ${imageUrl} -> ${Math.round(optimizedUrl.length / 1024)} KB (${format}), dimensions: ${width}x${height}`);
    return optimizedUrl;
  } catch (error) {
    console.error('Error optimizing image:', error);
    // Return original on error
    return imageUrl;
  }
};

// Clean up cache in low-memory situations
if (typeof window !== 'undefined') {
  // Listen for page unload
  window.addEventListener('beforeunload', () => {
    imageCache.clear();
  });
  
  // Handle low memory situations (if the browser supports it)
  if ('addEventListener' in window && 'memory' in performance) {
    setInterval(() => {
      const memoryInfo = (performance as any).memory;
      if (memoryInfo && memoryInfo.usedJSHeapSize > memoryInfo.jsHeapSizeLimit * 0.8) {
        // If using more than 80% of available memory, prune cache
        imageCache.prune(5);
      }
    }, 10000); // Check every 10 seconds
  }
}
