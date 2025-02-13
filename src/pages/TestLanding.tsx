
import { useEffect } from "react";
import { useSearchParams } from "react-router-dom";

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

    // If we have a referral code, fire the conversion
    if (referralCode) {
      script.onload = () => {
        if (window.EF) {
          console.log('Firing Everflow conversion with code:', referralCode);
          window.EF.conversion({
            aid: '471', // Everflow Network ID
            oid: offerId, // Offer ID from URL
            amount: 1,
            transaction_id: Math.random().toString(36).substring(2),
            affiliate_info: referralCode,
            coupon_code: referralCode
          });
        }
      };
    }

    // Cleanup
    return () => {
      document.body.removeChild(script);
    };
  }, [referralCode, offerId]);

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
              <p className="text-gray-600">
                This is a test page to simulate the partner's landing page and verify tracking functionality.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TestLanding;
