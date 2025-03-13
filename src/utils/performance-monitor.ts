
/**
 * Performance monitoring utilities
 */

// Performance marks for key user interactions
const PERF_MARKS = {
  APP_INIT: 'app:init',
  APP_READY: 'app:ready',
  ROUTE_CHANGE_START: 'route:change:start',
  ROUTE_CHANGE_COMPLETE: 'route:change:complete',
  FORM_SUBMIT_START: 'form:submit:start',
  FORM_SUBMIT_COMPLETE: 'form:submit:complete',
  DATA_FETCH_START: 'data:fetch:start',
  DATA_FETCH_COMPLETE: 'data:fetch:complete',
};

/**
 * Mark a performance event
 */
export const markPerformance = (name: string, data?: Record<string, any>): void => {
  if (typeof performance === 'undefined' || !performance.mark) return;
  
  try {
    performance.mark(name, { detail: data });
  } catch (e) {
    console.error('Error marking performance:', e);
  }
};

/**
 * Measure time between two performance marks
 */
export const measurePerformance = (
  name: string,
  startMark: string,
  endMark: string,
  shouldLog = false
): PerformanceMeasure | undefined => {
  if (typeof performance === 'undefined' || !performance.measure) return;
  
  try {
    const measure = performance.measure(name, startMark, endMark);
    
    if (shouldLog) {
      console.log(`[Performance] ${name}: ${measure.duration.toFixed(2)}ms`);
    }
    
    // Report to analytics if configured
    if (window.gtag && measure.duration > 3000) {
      window.gtag('event', 'performance_measure', {
        measure_name: name,
        duration: measure.duration,
        start_mark: startMark,
        end_mark: endMark
      });
    }
    
    return measure;
  } catch (e) {
    console.error('Error measuring performance:', e);
    return undefined;
  }
};

/**
 * Start tracking a performance event
 */
export const startTracking = (name: string, data?: Record<string, any>): string => {
  const uniqueName = `${name}:${Date.now()}`;
  markPerformance(uniqueName, data);
  return uniqueName;
};

/**
 * End tracking and measure a performance event
 */
export const endTracking = (
  name: string,
  startName: string,
  shouldLog = false
): number | undefined => {
  if (typeof performance === 'undefined') return;
  
  try {
    const measure = performance.measure(name, startName);
    
    if (shouldLog) {
      console.log(`[Performance] ${name}: ${measure.duration.toFixed(2)}ms`);
    }
    
    // Clean up marks
    try {
      performance.clearMarks(startName);
    } catch (e) {
      // Ignore errors when clearing marks
    }
    
    return measure.duration;
  } catch (e) {
    console.error('Error ending performance tracking:', e);
    return undefined;
  }
};

/**
 * Initialize performance monitoring
 */
export const initPerformanceMonitoring = (): void => {
  if (typeof window === 'undefined' || typeof PerformanceObserver === 'undefined') return;
  
  // Mark initial app load
  markPerformance(PERF_MARKS.APP_INIT);
  
  // Listen for long tasks
  try {
    const longTaskObserver = new PerformanceObserver((list) => {
      list.getEntries().forEach((entry) => {
        if (entry.duration > 50) {
          console.warn(`Long task detected: ${entry.duration.toFixed(2)}ms`, entry);
          
          // Report to analytics
          if (window.gtag) {
            window.gtag('event', 'long_task', {
              duration: entry.duration,
              attribution: JSON.stringify(entry.toJSON())
            });
          }
        }
      });
    });
    
    longTaskObserver.observe({ entryTypes: ['longtask'] });
  } catch (e) {
    console.error('Error setting up long task observer:', e);
  }
  
  // Report LCP (Largest Contentful Paint)
  try {
    const lcpObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const lastEntry = entries[entries.length - 1];
      
      // Report final LCP value
      if (lastEntry && window.gtag) {
        window.gtag('event', 'web_vitals', {
          metric_name: 'LCP',
          metric_value: lastEntry.startTime,
          metric_delta: 0
        });
      }
    });
    
    lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
  } catch (e) {
    console.error('Error setting up LCP observer:', e);
  }
  
  // Mark app as ready when DOM is complete
  window.addEventListener('DOMContentLoaded', () => {
    markPerformance(PERF_MARKS.APP_READY);
    measurePerformance('app-initialization', PERF_MARKS.APP_INIT, PERF_MARKS.APP_READY, true);
  });
  
  // Report performance on page unload
  window.addEventListener('beforeunload', () => {
    // Get navigation timing data
    if (performance.getEntriesByType) {
      const navEntry = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      
      if (navEntry && window.gtag) {
        window.gtag('event', 'page_performance', {
          dom_interactive: navEntry.domInteractive,
          dom_complete: navEntry.domComplete,
          load_event_end: navEntry.loadEventEnd,
          dom_content_loaded: navEntry.domContentLoadedEventEnd,
          first_byte: navEntry.responseStart,
          response_end: navEntry.responseEnd
        });
      }
    }
  });
};

export const PERF_CONSTANTS = PERF_MARKS;
