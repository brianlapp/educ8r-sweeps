
/**
 * Critical path optimization to improve LCP and CLS scores
 */

/**
 * Detect and fix layout shift causes
 */
export const stabilizeLayout = (): void => {
  if (typeof document === 'undefined') return;

  // Force dimensions on images missing width/height
  const undimensionedImages = document.querySelectorAll('img:not([width]):not([height])');
  undimensionedImages.forEach((img: HTMLImageElement) => {
    // Preserve aspect ratio by setting dimensions based on natural size or reasonable defaults
    if (img.naturalWidth && img.naturalHeight) {
      img.width = img.naturalWidth;
      img.height = img.naturalHeight;
    } else if (img.src) {
      // For images that haven't loaded yet, set a default aspect ratio and update when loaded
      img.style.aspectRatio = '16 / 9'; // Default aspect ratio
      img.addEventListener('load', () => {
        if (img.naturalWidth && img.naturalHeight) {
          img.width = img.naturalWidth;
          img.height = img.naturalHeight;
          img.style.aspectRatio = `${img.naturalWidth} / ${img.naturalHeight}`;
        }
      });
    }
  });

  // Add height to elements that commonly cause layout shifts
  const shiftCausingSelectors = [
    '.hero-section', 
    'header', 
    '.banner',
    '.navigation',
    '.main-content'
  ];
  
  shiftCausingSelectors.forEach(selector => {
    const elements = document.querySelectorAll(selector);
    elements.forEach((el: HTMLElement) => {
      // Only set min-height if not already set
      if (!el.style.minHeight && !window.getComputedStyle(el).minHeight) {
        const height = el.offsetHeight;
        if (height > 0) {
          el.style.minHeight = `${height}px`;
        }
      }
    });
  });
};

/**
 * Inline critical CSS
 */
export const inlineCriticalCSS = (): void => {
  // Critical CSS for above-the-fold content
  const criticalCSS = `
    body { font-family: 'Poppins', sans-serif; }
    .hero-section { min-height: 30vh; position: relative; }
    header, .banner { min-height: 64px; }
    img { width: auto; height: auto; max-width: 100%; }
    [class*='fade-in'] { opacity: 0; }
    [class*='animate'] { opacity: 1; transition: opacity 0.5s; }
  `;
  
  // Add critical CSS inline to avoid render-blocking
  const style = document.createElement('style');
  style.textContent = criticalCSS;
  
  // Insert at the beginning of head to ensure it loads first
  const head = document.head || document.getElementsByTagName('head')[0];
  head.insertBefore(style, head.firstChild);
  
  // Defer non-critical CSS
  const stylesheets = document.querySelectorAll('link[rel="stylesheet"]');
  stylesheets.forEach((link: HTMLLinkElement) => {
    // Skip Google Fonts or already optimized links
    if (link.href.includes('fonts.googleapis.com') || 
        link.getAttribute('media') === 'print' ||
        link.getAttribute('fetchpriority') === 'high') {
      return;
    }
    
    // Mark as non-render blocking
    link.setAttribute('media', 'print');
    link.setAttribute('onload', "this.media='all'");
  });
};

/**
 * Add resource hints to speed up connections and resource loading
 */
export const addResourceHints = (): void => {
  // Add DNS prefetch for external domains
  const domains = [
    'fonts.googleapis.com',
    'fonts.gstatic.com',
    'www.google-analytics.com',
    'epfzraejquaxqrfmkmyx.supabase.co'
  ];
  
  domains.forEach(domain => {
    if (!document.querySelector(`link[rel="dns-prefetch"][href="${domain}"]`)) {
      const link = document.createElement('link');
      link.rel = 'dns-prefetch';
      link.href = `//${domain}`;
      document.head.appendChild(link);
    }
  });
  
  // Add preconnect for critical domains
  const preconnectDomains = [
    'https://fonts.googleapis.com',
    'https://fonts.gstatic.com',
    'https://epfzraejquaxqrfmkmyx.supabase.co'
  ];
  
  preconnectDomains.forEach(domain => {
    if (!document.querySelector(`link[rel="preconnect"][href="${domain}"]`)) {
      const link = document.createElement('link');
      link.rel = 'preconnect';
      link.href = domain;
      link.crossOrigin = 'anonymous';
      document.head.appendChild(link);
    }
  });
};

export default {
  stabilizeLayout,
  inlineCriticalCSS,
  addResourceHints
};
