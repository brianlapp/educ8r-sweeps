
/**
 * Performance optimization bootstrapper
 * Initializes all performance optimizations at the right time
 */

import { preloadCriticalImages, identifyAndPreloadLCPImage, setupLazyLoading } from './priorityImageLoader';
import { optimizeAnalyticsScripts } from './scriptOptimizer';
import { stabilizeLayout, inlineCriticalCSS, addResourceHints } from './criticalPathOptimizer';
import { markPerformance, initPerformanceMonitoring } from './performance-monitor';

// Critical paths that should be preloaded
const CRITICAL_IMAGE_PATHS = [
  '/lovable-uploads/2b96223c-82ba-48db-9c96-5c37da48d93e.png', // Logo
  '/lovable-uploads/308c0411-e546-4640-ab1a-b354a074f9c4.png'  // Hero
];

/**
 * Initialize early (before DOM is complete)
 * Critical optimizations that can't wait for DOMContentLoaded
 */
export const initEarlyOptimizations = (): void => {
  markPerformance('perf:early-optimizations:start');
  
  // Preload most critical assets
  preloadCriticalImages(CRITICAL_IMAGE_PATHS, 'high');
  
  // Add resource hints as early as possible
  addResourceHints();
  
  // Inline critical CSS
  if (typeof document !== 'undefined') {
    inlineCriticalCSS();
  }
  
  markPerformance('perf:early-optimizations:end');
};

/**
 * Initialize when DOM is ready but before all resources
 */
export const initDOMReadyOptimizations = (): void => {
  markPerformance('perf:dom-ready-optimizations:start');
  
  // Setup monitoring first to catch any issues
  initPerformanceMonitoring();
  
  // Identify and preload LCP image if not already preloaded
  identifyAndPreloadLCPImage();
  
  // Stabilize layout to prevent CLS
  stabilizeLayout();
  
  markPerformance('perf:dom-ready-optimizations:end');
};

/**
 * Initialize when page is fully loaded
 * Lower priority optimizations can wait until here
 */
export const initPageLoadOptimizations = (): void => {
  markPerformance('perf:page-load-optimizations:start');
  
  // Setup lazy loading for images
  setupLazyLoading();
  
  // Optimize analytics and tracking scripts
  optimizeAnalyticsScripts();
  
  markPerformance('perf:page-load-optimizations:end');
};

/**
 * Master initialization function
 */
export const initAllOptimizations = (): void => {
  // Run early optimizations immediately
  initEarlyOptimizations();
  
  // Run DOM ready optimizations when appropriate
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initDOMReadyOptimizations);
  } else {
    initDOMReadyOptimizations();
  }
  
  // Run page load optimizations after window load
  if (document.readyState === 'complete') {
    initPageLoadOptimizations();
  } else {
    window.addEventListener('load', initPageLoadOptimizations);
  }
};

export default {
  initAllOptimizations,
  initEarlyOptimizations,
  initDOMReadyOptimizations,
  initPageLoadOptimizations
};
