
/**
 * Custom hook for tracking analytics events
 */
type EventParams = Record<string, any>;

export function useAnalytics() {
  /**
   * Track custom events
   */
  const trackEvent = (eventName: string, params: EventParams = {}) => {
    if (typeof window !== 'undefined' && window.gtag) {
      // Add device type to all events
      const enhancedParams = {
        ...params,
        device_type: /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent) ? 'mobile' : 'desktop'
      };
      
      window.gtag('event', eventName, enhancedParams);
      console.log(`Analytics event tracked: ${eventName}`, enhancedParams);
    }
  };

  /**
   * Track form submissions
   */
  const trackFormSubmission = (formName: string, success: boolean = true) => {
    trackEvent('form_submission', {
      form_name: formName,
      success: success
    });
  };

  /**
   * Track button clicks
   */
  const trackButtonClick = (buttonName: string) => {
    trackEvent('button_click', {
      button_name: buttonName
    });
  };

  /**
   * Track page views (for manual triggering)
   */
  const trackPageView = (pageName?: string) => {
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', 'page_view', {
        page_title: pageName || document.title,
        page_location: window.location.href,
        page_path: window.location.pathname,
        device_type: /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent) ? 'mobile' : 'desktop'
      });
    }
  };

  return {
    trackEvent,
    trackFormSubmission,
    trackButtonClick,
    trackPageView
  };
}

// Add gtag to Window interface
declare global {
  interface Window {
    gtag: (command: string, action: string, params?: any) => void;
    dataLayer: any[];
  }
}
