
import React from "react";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";

const Documentation = () => {
  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-gray-50 to-white">
      <header className="w-full bg-[#f3f3f3] py-4 border-b border-gray-200">
        <div className="container mx-auto px-4">
          <div className="flex justify-center items-center">
            <img 
              src="/lovable-uploads/2b96223c-82ba-48db-9c96-5c37da48d93e.png" 
              alt="FPS Logo" 
              className="h-12 w-auto"
            />
          </div>
        </div>
      </header>

      <div className="flex-1 bg-white">
        <div className="container mx-auto px-4 py-8">
          <header className="mb-8 px-6">
            <h1 className="text-3xl font-bold text-gray-900">Partner Integration Guide</h1>
            <p className="mt-2 text-gray-600">Complete documentation for implementing the referral tracking system</p>
          </header>

          <ScrollArea className="h-[calc(100vh-300px)]">
            <div className="prose max-w-none px-6">
              <section id="overview">
                <h2 className="text-2xl font-semibold mb-4">Overview</h2>
                <p className="text-gray-700 mb-4">
                  This guide provides step-by-step instructions for implementing the referral tracking system using Everflow SDK in your landing pages and conversion points.
                </p>
              </section>

              <Separator className="my-8" />

              <section id="quick-start">
                <h2 className="text-2xl font-semibold mb-4">Quick Start</h2>
                <ol className="list-decimal pl-6 space-y-2">
                  <li>Include Everflow SDK in your landing page</li>
                  <li>Set up impression tracking</li>
                  <li>Implement click tracking</li>
                  <li>Configure conversion tracking</li>
                  <li>Test your implementation</li>
                </ol>
              </section>

              <Separator className="my-8" />

              <section id="implementation">
                <h2 className="text-2xl font-semibold mb-4">Detailed Implementation Steps</h2>
                
                <h3 className="text-xl font-semibold mt-6 mb-4">1. Including Everflow SDK</h3>
                <p className="mb-4">Add the following script to your HTML <code>&lt;head&gt;</code> section:</p>
                <pre className="bg-gray-50 p-4 rounded-lg overflow-x-auto">
                  <code>{`<script src="https://get.free.ca/scripts/sdk/everflow.js" async></script>`}</code>
                </pre>

                <h3 className="text-xl font-semibold mt-6 mb-4">2. Impression Tracking</h3>
                <p className="mb-4">Implement impression tracking when your landing page loads:</p>
                <pre className="bg-gray-50 p-4 rounded-lg overflow-x-auto">
                  <code>{`// Initialize tracking with these required parameters
const impressionData = {
  offer_id: '1987', // Educ8r Campaign ID
  affiliate_id: '2636', // Free Parent Search
  sub1: window.EF.urlParameter('sub1'), // This contains the referral code
  transaction_id: generateUniqueId(), // Generate a unique transaction ID
  // Optional parameters
  sub2: window.EF.urlParameter('sub2'),
  sub3: window.EF.urlParameter('sub3'),
  sub4: window.EF.urlParameter('sub4'),
  sub5: window.EF.urlParameter('sub5'),
  source_id: window.EF.urlParameter('source_id')
};

window.EF.impression(impressionData);`}</code>
                </pre>

                <h3 className="text-xl font-semibold mt-6 mb-4">3. Click Tracking</h3>
                <p className="mb-4">Implement click tracking when users interact with your offer:</p>
                <pre className="bg-gray-50 p-4 rounded-lg overflow-x-auto">
                  <code>{`const clickData = {
  offer_id: '1987',
  affiliate_id: '2636',
  sub1: window.EF.urlParameter('sub1'),
  transaction_id: YOUR_TRANSACTION_ID,
  uid: window.EF.urlParameter('uid'),
  source_id: window.EF.urlParameter('source_id')
};

window.EF.click(clickData);`}</code>
                </pre>

                <h3 className="text-xl font-semibold mt-6 mb-4">4. Conversion Tracking</h3>
                <p className="mb-4">Implement conversion tracking at your conversion point (e.g., after form submission):</p>
                <pre className="bg-gray-50 p-4 rounded-lg overflow-x-auto">
                  <code>{`const conversionData = {
  offer_id: '1987',
  affiliate_id: '2636',
  transaction_id: YOUR_TRANSACTION_ID,
  sub1: window.EF.urlParameter('sub1')
};

window.EF.conversion(conversionData);`}</code>
                </pre>

                <h3 className="text-xl font-semibold mt-6 mb-4">5. Required Parameters</h3>
                <ul className="list-disc pl-6 space-y-2">
                  <li><code>offer_id</code>: '1987' (Educ8r Campaign ID)</li>
                  <li><code>affiliate_id</code>: '2636' (Free Parent Search)</li>
                  <li><code>sub1</code>: Contains the referral code (CRITICAL for referral tracking)</li>
                  <li><code>transaction_id</code>: Must be unique per user session and consistent across all tracking calls</li>
                </ul>

                <h3 className="text-xl font-semibold mt-6 mb-4">6. Sample Implementation</h3>
                <p className="mb-4">Here's a complete example showing how to implement tracking:</p>
                <pre className="bg-gray-50 p-4 rounded-lg overflow-x-auto">
                  <code>{`// When your page loads
document.addEventListener('DOMContentLoaded', async () => {
  // Generate a unique transaction ID for this session
  const transactionId = Math.random().toString(36).substring(2);
  
  // Track impression
  const impressionData = {
    offer_id: '1987',
    affiliate_id: '2636',
    sub1: window.EF.urlParameter('sub1'),
    transaction_id: transactionId
  };
  
  window.EF.impression(impressionData);
  
  // Track click when user interacts with offer
  document.getElementById('offerButton').addEventListener('click', () => {
    const clickData = {
      offer_id: '1987',
      affiliate_id: '2636',
      sub1: window.EF.urlParameter('sub1'),
      transaction_id: transactionId
    };
    
    window.EF.click(clickData);
  });
  
  // Track conversion after successful form submission
  document.getElementById('offerForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    // Your form submission logic here
    
    // Track conversion
    const conversionData = {
      offer_id: '1987',
      affiliate_id: '2636',
      transaction_id: transactionId,
      sub1: window.EF.urlParameter('sub1')
    };
    
    window.EF.conversion(conversionData);
  });
});`}</code>
                </pre>

                <h3 className="text-xl font-semibold mt-6 mb-4">Testing Your Implementation</h3>
                <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-6">
                  <h4 className="font-semibold text-blue-700">Test Checklist</h4>
                  <ul className="mt-2 space-y-1">
                    <li>✓ Everflow SDK loads successfully</li>
                    <li>✓ Impression fires on page load</li>
                    <li>✓ Click tracking works on interaction</li>
                    <li>✓ Conversion tracking fires after form submission</li>
                    <li>✓ All tracking calls include the required parameters</li>
                    <li>✓ Transaction ID remains consistent across all tracking calls</li>
                    <li>✓ Referral code (sub1) is properly passed through all tracking calls</li>
                  </ul>
                </div>

                <h3 className="text-xl font-semibold mt-6 mb-4">Debugging Tips</h3>
                <ol className="list-decimal pl-6 space-y-2">
                  <li>Open your browser's developer tools (F12)</li>
                  <li>Check the Console tab for any errors</li>
                  <li>Network tab will show tracking requests to Everflow</li>
                  <li>Verify all required parameters are present in tracking calls</li>
                  <li>Ensure transaction_id is consistent across all three tracking events</li>
                </ol>

                <h3 className="text-xl font-semibold mt-6 mb-4">Common Issues and Solutions</h3>
                
                <h4 className="text-lg font-semibold mt-4 mb-2">SDK Not Loading</h4>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Verify the script tag is properly placed in the <code>&lt;head&gt;</code></li>
                  <li>Check for any Content Security Policy (CSP) blocking the script</li>
                  <li>Ensure the SDK URL is correct</li>
                </ul>

                <h4 className="text-lg font-semibold mt-4 mb-2">Missing Parameters</h4>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Always check that 'oid' and referral code ('sub1') are present in URL</li>
                  <li>Verify affiliate_id is correctly set</li>
                  <li>Ensure transaction_id is generated and stored properly</li>
                </ul>

                <h4 className="text-lg font-semibold mt-4 mb-2">Tracking Not Firing</h4>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Confirm SDK is fully loaded before making tracking calls</li>
                  <li>Check browser console for JavaScript errors</li>
                  <li>Verify event listeners are properly attached</li>
                </ul>

                <h3 className="text-xl font-semibold mt-6 mb-4">Support</h3>
                <p className="mb-4">If you encounter any issues during implementation:</p>
                <ol className="list-decimal pl-6 space-y-2">
                  <li>Review the debugging checklist above</li>
                  <li>Check browser console logs for errors</li>
                  <li>Verify all required parameters are present</li>
                  <li>Contact our support team with:
                    <ul className="list-disc pl-6 mt-2">
                      <li>Your implementation code</li>
                      <li>Browser console logs</li>
                      <li>Network request logs</li>
                      <li>URL parameters used for testing</li>
                    </ul>
                  </li>
                </ol>
              </section>
            </div>
          </ScrollArea>
        </div>
      </div>

      <footer className="w-full bg-[#f3f3f3] py-6 border-t border-gray-200">
        <div className="container mx-auto px-4">
          <div className="flex flex-col items-center gap-4">
            <img 
              src="/lovable-uploads/2b96223c-82ba-48db-9c96-5c37da48d93e.png" 
              alt="FPS Logo" 
              className="h-8 w-auto"
            />
            <p className="text-sm text-gray-600">© 2024 All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Documentation;
