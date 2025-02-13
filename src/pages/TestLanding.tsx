
import { useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";

const TestLanding = () => {
  const [searchParams] = useSearchParams();
  const referralCode = searchParams.get("ref");
  const offerId = searchParams.get("oid");

  useEffect(() => {
    // Load Everflow tracking script
    const script = document.createElement('script');
    script.src = 'https://js.everflow.io/ef.min.js';
    script.async = true;
    document.body.appendChild(script);

    // Track impression when script loads
    script.onload = () => {
      if (window.EF && referralCode) {
        console.log('Tracking impression for:', referralCode);
        window.EF.impression({
          aid: '471',
          oid: offerId,
          affiliate_info: referralCode
        });
      }
    };

    // Cleanup
    return () => {
      document.body.removeChild(script);
    };
  }, [referralCode, offerId]);

  const trackClick = () => {
    if (window.EF && referralCode) {
      console.log('Tracking click for:', referralCode);
      window.EF.click({
        aid: '471',
        oid: offerId,
        affiliate_info: referralCode,
        type: 'click'
      });
    }
  };

  const trackConversion = () => {
    if (window.EF && referralCode) {
      console.log('Firing Everflow conversion with code:', referralCode);
      window.EF.conversion({
        aid: '471',
        oid: offerId,
        amount: 1,
        transaction_id: Math.random().toString(36).substring(2),
        affiliate_info: referralCode,
        coupon_code: referralCode
      });
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
                <strong>Referral Code:</strong> {referralCode || 'None'}
              </p>
              <p className="text-gray-600">
                <strong>Offer ID:</strong> {offerId || 'None'}
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
