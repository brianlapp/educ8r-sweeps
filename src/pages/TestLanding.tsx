
import { useEffect, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

const TestLanding = () => {
  const [searchParams] = useSearchParams();
  const referralCode = searchParams.get("ref");
  const AFFILIATE_ID = 2628;
  const impressionFired = useRef(false);
  const scriptLoaded = useRef(false);
  // Initialize transaction ID immediately on component mount
  const transactionId = useRef(Math.random().toString(36).substring(2));

  const loadEverflowScript = () => {
    return new Promise<void>((resolve, reject) => {
      if (scriptLoaded.current) {
        resolve();
        return;
      }

      console.log('Starting to load Everflow script...');
      const script = document.createElement('script');
      script.src = 'https://get.free.ca/scripts/sdk/everflow.js';
      script.async = true;
      
      script.onload = () => {
        console.log('Everflow script loaded successfully');
        scriptLoaded.current = true;
        resolve();
      };
      script.onerror = (error) => {
        console.error('Failed to load Everflow script:', error);
        reject(new Error('Failed to load Everflow script'));
      };

      document.body.appendChild(script);
      console.log('Script added to document');
    });
  };

  useEffect(() => {
    const initializeTracking = async () => {
      try {
        // Load script first
        await loadEverflowScript();
        console.log('Using transaction ID:', transactionId.current);

        // Only fire impression once
        if (!impressionFired.current && window.EF) {
          console.log('Preparing to fire impression...');
          const impressionData = {
            offer_id: window.EF.urlParameter('oid'),
            affiliate_id: AFFILIATE_ID,
            sub1: window.EF.urlParameter('sub1'),
            sub2: window.EF.urlParameter('sub2'),
            sub3: window.EF.urlParameter('sub3'),
            sub4: window.EF.urlParameter('sub4'),
            sub5: window.EF.urlParameter('sub5'),
            source_id: window.EF.urlParameter('source_id'),
            transaction_id: transactionId.current
          };
          console.log('Impression data:', impressionData);
          
          window.EF.impression(impressionData);
          impressionFired.current = true;
          console.log('Impression fired');
        }
      } catch (error) {
        console.error('Error in tracking setup:', error);
      }
    };

    initializeTracking();

    // Cleanup
    return () => {
      if (scriptLoaded.current) {
        const script = document.querySelector('script[src="https://get.free.ca/scripts/sdk/everflow.js"]');
        if (script) {
          document.body.removeChild(script);
          scriptLoaded.current = false;
        }
      }
    };
  }, []);

  const trackClick = async () => {
    console.log('Track click called');
    // Ensure script is loaded before tracking
    await loadEverflowScript();
    
    if (window.EF) {
      const clickData = {
        offer_id: window.EF.urlParameter('oid'),
        affiliate_id: AFFILIATE_ID,
        sub1: window.EF.urlParameter('sub1'),
        sub2: window.EF.urlParameter('sub2'),
        sub3: window.EF.urlParameter('sub3'),
        sub4: window.EF.urlParameter('sub4'),
        sub5: window.EF.urlParameter('sub5'),
        uid: window.EF.urlParameter('uid'),
        source_id: window.EF.urlParameter('source_id'),
        transaction_id: transactionId.current
      };
      console.log('Click data:', clickData);
      window.EF.click(clickData);
      console.log('Click tracked');
    } else {
      console.warn('Cannot track click - EF object not available');
    }
  };

  const trackConversion = async () => {
    console.log('Track conversion called');
    // Ensure script is loaded before tracking
    await loadEverflowScript();
    
    if (window.EF) {
      const conversionData = {
        offer_id: window.EF.urlParameter('oid'),
        affiliate_id: AFFILIATE_ID,
        transaction_id: transactionId.current,
        sub1: window.EF.urlParameter('sub1')
      };
      console.log('Conversion data:', conversionData);
      window.EF.conversion(conversionData);
      console.log('Conversion tracked');

      // After successful conversion, notify our backend
      supabase.functions.invoke('everflow-webhook', {
        body: {
          referral_code: window.EF.urlParameter('sub1'),
          transaction_id: transactionId.current
        }
      }).catch(error => {
        console.error('Error notifying backend of conversion:', error);
      });
    } else {
      console.warn('Cannot track conversion - EF object not available');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-4xl font-bold mb-6 text-center text-[#2C3E50]">
            Test Landing Page
          </h1>
          <div className="bg-white p-8 rounded-xl shadow-md">
            <h2 className="text-2xl font-semibold mb-4">Tracking Information</h2>
            <div className="space-y-4">
              <p className="text-gray-600">
                <strong>Offer ID:</strong> {window.EF?.urlParameter('oid') || 'None'}
              </p>
              <p className="text-gray-600">
                <strong>Affiliate ID:</strong> {AFFILIATE_ID}
              </p>
              <p className="text-gray-600">
                <strong>Referral Code:</strong> {referralCode || 'None'}
              </p>
              <p className="text-gray-600">
                <strong>Transaction ID:</strong> {transactionId.current}
              </p>
              <div className="pt-6 space-y-4">
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-600 mb-2">
                    ✓ Impression tracking fired automatically on page load
                  </p>
                  <div className="flex gap-4">
                    <Button onClick={trackClick} variant="outline">
                      Track Click
                    </Button>
                    <Button onClick={trackConversion}>
                      Track Conversion
                    </Button>
                  </div>
                </div>
                <p className="text-sm text-gray-500">
                  Check the browser console (F12) to see tracking events being fired.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TestLanding;
