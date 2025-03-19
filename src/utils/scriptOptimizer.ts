
/**
 * Script optimization utilities to reduce render-blocking scripts
 */

// Tracks scripts that have been queued for loading
const queuedScripts = new Set<string>();

// Priority levels for scripts
type ScriptPriority = 'critical' | 'high' | 'medium' | 'low';

interface DeferredScript {
  src: string;
  async?: boolean;
  defer?: boolean;
  priority: ScriptPriority;
  id?: string;
  callback?: () => void;
}

/**
 * Queue a script for deferred loading based on priority
 */
export const queueScript = (scriptConfig: DeferredScript): void => {
  if (queuedScripts.has(scriptConfig.src)) return;
  queuedScripts.add(scriptConfig.src);
  
  // For critical scripts, load immediately but with proper async/defer
  if (scriptConfig.priority === 'critical') {
    loadScript(scriptConfig);
    return;
  }
  
  // For all other scripts, defer loading based on priority
  if (document.readyState === 'complete') {
    scheduleScriptLoad(scriptConfig);
  } else {
    window.addEventListener('load', () => {
      scheduleScriptLoad(scriptConfig);
    });
  }
};

/**
 * Schedule script loading with appropriate delay based on priority
 */
const scheduleScriptLoad = (scriptConfig: DeferredScript): void => {
  const delays: Record<ScriptPriority, number> = {
    critical: 0,
    high: 100,
    medium: 500,
    low: 1000
  };
  
  const delay = delays[scriptConfig.priority];
  
  if (typeof window.requestIdleCallback === 'function') {
    window.requestIdleCallback(
      () => setTimeout(() => loadScript(scriptConfig), delay),
      { timeout: 2000 }
    );
  } else {
    setTimeout(() => loadScript(scriptConfig), delay);
  }
};

/**
 * Inject a script element into the DOM
 */
const loadScript = (scriptConfig: DeferredScript): void => {
  const { src, async = true, defer = true, id, callback } = scriptConfig;
  
  const script = document.createElement('script');
  script.src = src;
  script.async = async;
  script.defer = defer;
  
  if (id) script.id = id;
  
  if (callback) {
    script.onload = callback;
  }
  
  // Append to head or body depending on document state
  const target = document.head || document.body;
  target.appendChild(script);
};

/**
 * Move all analytics scripts to deferred loading
 */
export const optimizeAnalyticsScripts = (): void => {
  // Find all analytics scripts
  const analyticsScripts = Array.from(document.querySelectorAll('script'))
    .filter(script => {
      const src = script.src.toLowerCase();
      return src.includes('google') || 
             src.includes('analytics') || 
             src.includes('gtag') || 
             src.includes('gtm') ||
             src.includes('facebook') ||
             src.includes('pixel');
    });
  
  // Remove them from DOM and queue for deferred loading
  analyticsScripts.forEach(script => {
    if (script.src) {
      const scriptConfig: DeferredScript = {
        src: script.src,
        priority: 'low',
        id: script.id
      };
      
      queueScript(scriptConfig);
      
      // Remove the original script if it exists in DOM
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
    }
  });
};

export default {
  queueScript,
  optimizeAnalyticsScripts
};
