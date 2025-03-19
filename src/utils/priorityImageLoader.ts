/**
 * Priority image loader for critical images
 * Ensures proper preloading of LCP and above-the-fold images
 */

import { optimizeImage } from './imageOptimization';

// Track already preloaded images to avoid duplicates
const preloadedImages = new Set<string>();

/**
 * Preload critical images as early as possible
 * @param urls Array of image URLs to preload
 * @param priority 'high' or 'low'
 */
export const preloadCriticalImages = (urls: string[], priority: 'high' | 'low' = 'high'): void => {
  if (!urls.length || typeof document === 'undefined') return;
  
  urls.forEach(url => {
    // Skip if already preloaded
    if (preloadedImages.has(url)) return;
    
    const link = document.createElement('link');
    link.rel = 'preload';
    link.as = 'image';
    link.href = url;
    link.type = 'image/webp'; // Prefer WebP
    
    if (priority === 'high') {
      link.setAttribute('fetchpriority', 'high');
    }
    
    document.head.appendChild(link);
    preloadedImages.add(url);
  });
};

/**
 * Identify and preload the LCP image based on heuristics
 * Helps improve LCP score significantly
 */
export const identifyAndPreloadLCPImage = (): void => {
  if (typeof document === 'undefined') return;
  
  // Common selectors that typically contain the LCP image
  const lcpSelectors = [
    'img.hero-image', 
    '.banner img',
    'header img',
    '.hero-section img',
    'img[width="800"]',
    'img[width="600"]',
    'img[width="580"]',
    'img.main-image'
  ];
  
  // Wait for DOM to be ready but execute ASAP
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', findAndPreloadLCP);
  } else {
    findAndPreloadLCP();
  }
  
  function findAndPreloadLCP() {
    // Try to find a potential LCP image using the selectors
    for (const selector of lcpSelectors) {
      const img = document.querySelector(selector) as HTMLImageElement;
      if (img && img.src) {
        preloadCriticalImages([img.src], 'high');
        break;
      }
    }
  }
};

/**
 * Lazy load all non-critical images on the page
 */
export const setupLazyLoading = (): void => {
  if (typeof document === 'undefined' || typeof IntersectionObserver === 'undefined') return;
  
  // Only target images that don't have loading attribute already set
  const images = document.querySelectorAll('img:not([loading])') as NodeListOf<HTMLImageElement>;
  
  const imageObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const img = entry.target as HTMLImageElement;
        
        // If image has a data-src, load from that
        if (img.dataset.src) {
          img.src = img.dataset.src;
        }
        
        // Only optimize images that aren't already optimized
        if (!img.src.includes('data:image') && !img.classList.contains('optimized')) {
          optimizeImage(img.src, { quality: 0.8 })
            .then(optimizedSrc => {
              img.src = optimizedSrc;
              img.classList.add('optimized');
            })
            .catch(() => {
              // Fallback - keep original src
            });
        }
        
        imageObserver.unobserve(img);
      }
    });
  }, {
    rootMargin: '200px', // Start loading before they come into view
    threshold: 0.01
  });
  
  images.forEach(img => {
    // Don't lazy load above-the-fold images
    const rect = img.getBoundingClientRect();
    if (rect.top < window.innerHeight) return;
    
    // Add loading=lazy for native lazy loading
    img.loading = 'lazy';
    
    // Also use Intersection Observer as a fallback
    imageObserver.observe(img);
  });
};

export default {
  preloadCriticalImages,
  identifyAndPreloadLCPImage,
  setupLazyLoading
};
