
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Performance measurement for debugging
const startTime = performance.now();

// Initialize app
const root = createRoot(document.getElementById("root")!);
root.render(<App />);

// Log performance metric
if (process.env.NODE_ENV === 'development') {
  const renderTime = performance.now() - startTime;
  console.log(`App rendered in ${renderTime.toFixed(2)}ms`);
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
