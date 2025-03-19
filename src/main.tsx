
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Detect if browser supports scheduling APIs
const hasIdleCallback = typeof window.requestIdleCallback === 'function';
const hasScheduling = typeof window.requestAnimationFrame === 'function';

// Performance measurement for debugging
const startTime = performance.now();

// Initialize app with optimal timing strategy
if (hasScheduling) {
  // Use requestAnimationFrame for smoother visual updates
  window.requestAnimationFrame(() => {
    const root = createRoot(document.getElementById("root")!);
    root.render(<App />);
    
    // Log performance metric
    if (process.env.NODE_ENV === 'development') {
      const renderTime = performance.now() - startTime;
      console.log(`App rendered in ${renderTime.toFixed(2)}ms`);
    }
  });
} else {
  // Fallback to synchronous rendering
  const root = createRoot(document.getElementById("root")!);
  root.render(<App />);
}

// Add instrumentation to detect long tasks
if (process.env.NODE_ENV === 'development' && typeof PerformanceObserver === 'function') {
  try {
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        // Log long tasks (taking more than 50ms)
        if (entry.duration > 50) {
          console.warn('Long task detected:', entry.duration.toFixed(2) + 'ms', entry);
        }
      }
    });
    
    observer.observe({ entryTypes: ['longtask'] });
  } catch (e) {
    console.error('PerformanceObserver error:', e);
  }
}

// Defer non-critical initialization
if (hasIdleCallback) {
  window.requestIdleCallback(() => {
    // Register service worker (if needed in the future)
    // Initialize analytics tracking consent (if needed in the future)
    
    // Example of deferred work:
    const prefetchLinks = [
      '/thank-you',
      '/rules'
    ];
    
    prefetchLinks.forEach(href => {
      const link = document.createElement('link');
      link.rel = 'prefetch';
      link.href = href;
      document.head.appendChild(link);
    });
  }, { timeout: 5000 });
}

// Additional browser optimizations
// Fix for the 'fetchPriority' error
try {
  Object.defineProperty(HTMLImageElement.prototype, 'fetchPriority', {
    configurable: true,
    enumerable: true,
    get: function() {
      return this.getAttribute('fetchpriority');
    },
    set: function(val) {
      this.setAttribute('fetchpriority', val);
    }
  });
} catch (e) {
  console.error('Failed to patch fetchPriority:', e);
}
