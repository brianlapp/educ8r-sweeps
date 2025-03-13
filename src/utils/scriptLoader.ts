
type ScriptAttributes = {
  async?: boolean;
  defer?: boolean;
  id?: string;
  crossOrigin?: string;
  integrity?: string;
  type?: string;
  noModule?: boolean;
  referrerPolicy?: string;
  fetchPriority?: 'high' | 'low' | 'auto';
};

type ScriptLoadOptions = {
  attributes?: ScriptAttributes;
  onLoad?: () => void;
  onError?: (error: Error) => void;
  timeout?: number;
};

/**
 * Loads a script with performance optimizations
 */
export const loadScript = (
  src: string,
  options: ScriptLoadOptions = {}
): Promise<HTMLScriptElement> => {
  return new Promise((resolve, reject) => {
    // Check if script already exists
    const existingScript = document.querySelector(`script[src="${src}"]`);
    if (existingScript) {
      resolve(existingScript as HTMLScriptElement);
      return;
    }

    const script = document.createElement('script');
    script.src = src;

    // Add attributes
    if (options.attributes) {
      Object.entries(options.attributes).forEach(([key, value]) => {
        if (typeof value === 'boolean') {
          if (value) script.setAttribute(key, '');
        } else if (value) {
          script.setAttribute(key, value.toString());
        }
      });
    }

    // Use requestIdleCallback for non-critical scripts
    const loadScript = () => {
      document.head.appendChild(script);
    };

    if (options.attributes?.defer || options.attributes?.async) {
      if (typeof window.requestIdleCallback === 'function') {
        window.requestIdleCallback(loadScript);
      } else {
        setTimeout(loadScript, 1);
      }
    } else {
      loadScript();
    }

    // Set up timeout
    let timeoutId: number | undefined;
    if (options.timeout) {
      timeoutId = window.setTimeout(() => {
        reject(new Error(`Script load timeout for ${src}`));
      }, options.timeout);
    }

    // Handle script events
    script.onload = () => {
      if (timeoutId) clearTimeout(timeoutId);
      options.onLoad?.();
      resolve(script);
    };

    script.onerror = (event) => {
      if (timeoutId) clearTimeout(timeoutId);
      const error = new Error(`Failed to load script: ${src}`);
      options.onError?.(error);
      reject(error);
    };
  });
};

/**
 * Preloads a script without executing it
 */
export const preloadScript = (src: string): void => {
  if (!document.querySelector(`link[rel="preload"][href="${src}"]`)) {
    const link = document.createElement('link');
    link.rel = 'preload';
    link.href = src;
    link.as = 'script';
    document.head.appendChild(link);
  }
};

export const preconnect = (url: string, crossOrigin = true): void => {
  if (!document.querySelector(`link[rel="preconnect"][href="${url}"]`)) {
    const link = document.createElement('link');
    link.rel = 'preconnect';
    link.href = url;
    if (crossOrigin) {
      link.crossOrigin = 'anonymous';
    }
    document.head.appendChild(link);
  }
};

// Helper to load scripts after window loads
export const loadScriptsAfterPageLoad = (
  scripts: Array<{ src: string; options?: ScriptLoadOptions }>
): void => {
  if (document.readyState === 'complete') {
    // Page already loaded, load scripts with delays to prevent blocking
    scripts.forEach((script, index) => {
      setTimeout(() => {
        loadScript(script.src, script.options);
      }, index * 100); // Stagger loading with 100ms intervals
    });
  } else {
    // Wait for page to load
    window.addEventListener('load', () => {
      // Use requestIdleCallback when available
      if (typeof window.requestIdleCallback === 'function') {
        // Schedule script loading during idle time
        window.requestIdleCallback(() => {
          scripts.forEach((script, index) => {
            setTimeout(() => {
              loadScript(script.src, script.options);
            }, index * 100);
          });
        });
      } else {
        // Fallback to setTimeout
        setTimeout(() => {
          scripts.forEach((script, index) => {
            setTimeout(() => {
              loadScript(script.src, script.options);
            }, index * 100);
          });
        }, 100);
      }
    });
  }
};
