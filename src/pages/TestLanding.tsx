
import { useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

const TestLanding = () => {
  const [searchParams] = useSearchParams();
  const referralCode = searchParams.get("ref");
  const offerId = searchParams.get("oid");
  const affiliateId = searchParams.get("affid");
  const sub1 = searchParams.get("sub1"); // This will be our referral code
  const sub2 = searchParams.get("sub2");
  const sub3 = searchParams.get("sub3");
  const sub4 = searchParams.get("sub4");
  const sub5 = searchParams.get("sub5");
  const sourceId = searchParams.get("source_id");
  const uid = searchParams.get("uid");
  const transactionId = searchParams.get("_ef_transaction_id") || Math.random().toString(36).substring(2);

  useEffect(() => {
    // Load Everflow tracking script with error handling
    const loadScript = async () => {
      try {
        const script = document.createElement('script');
        script.src = 'https://get.free.ca/scripts/sdk/everflow.js';
        script.async = true;
        
        // Create a promise to handle script loading
        const scriptLoadPromise = new Promise((resolve, reject) => {
          script.onload = resolve;
          script.onerror = () => reject(new Error('Failed to load Everflow script'));
        });

        document.body.appendChild(script);
        
        // Wait for script to load
        await scriptLoadPromise;

        // Track impression after successful script load
        if (window.EF && offerId) {
          console.log('Tracking impression for offer:', offerId);
          window.EF.impression({
            offer_id: offerId,
            affiliate_id: affiliateId,
            sub1, // Pass referral code
            sub2,
            sub3,
            sub4,
            sub5,
            source_id: sourceId,
            transaction_id: transactionId // Use consistent transaction ID
          });
        }
      } catch (error) {
        console.error('Error loading Everflow script:', error);
      }
    };

    loadScript();

    // Cleanup
    return () => {
      const script = document.querySelector('script[src="https://get.free.ca/scripts/sdk/everflow.js"]');
      if (script) {
        document.body.removeChild(script);
      }
    };
  }, [offerId, affiliateId, sub1, sub2, sub3, sub4, sub5, sourceId, transactionId]);

  const trackClick = () => {
    if (window.EF && offerId) {
      console.log('Tracking click for offer:', offerId);
      window.EF.click({
        offer_id: offerId,
        affiliate_id: affiliateId,
        sub1, // Pass referral code
        sub2,
        sub3,
        sub4,
        sub5,
        uid,
        source_id: sourceId,
        transaction_id: transactionId // Use consistent transaction ID
      });
    } else {
      console.warn('EF not loaded or offer ID missing');
    }
  };

  const trackConversion = () => {
    if (window.EF && offerId) {
      console.log('Firing Everflow conversion for offer:', offerId);
      window.EF.conversion({
        offer_id: offerId,
        transaction_id: transactionId, // Use consistent transaction ID
        sub1 // Pass referral code
      });

      // After successful conversion, notify our backend
      supabase.functions.invoke('everflow-webhook', {
        body: {
          referral_code: sub1, // Use sub1 as referral code
          transaction_id: transactionId
        }
      }).catch(error => {
        console.error('Error notifying backend of conversion:', error);
      });
    } else {
      console.warn('EF not loaded or offer ID missing');
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
                <strong>Offer ID:</strong> {offerId || 'None'}
              </p>
              <p className="text-gray-600">
                <strong>Affiliate ID:</strong> {affiliateId || 'None'}
              </p>
              <p className="text-gray-600">
                <strong>Referral Code:</strong> {referralCode || 'None'}
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
