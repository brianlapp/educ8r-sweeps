
import React from "react";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";

const Documentation = () => {
  return (
    <div className="min-h-screen bg-white">
      <div className="container mx-auto px-4 py-8">
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Partner Integration Guide</h1>
          <p className="mt-2 text-gray-600">Complete documentation for implementing the referral tracking system</p>
        </header>

        {/* Main content */}
        <ScrollArea className="h-[calc(100vh-200px)]">
          <div className="prose max-w-none">
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
  offer_id: window.EF.urlParameter('oid'),
  affiliate_id: YOUR_AFFILIATE_ID, // Replace with your Affiliate ID
  sub1: window.EF.urlParameter('sub1'), // This contains the referral code
  transaction_id: generateUniqueId(), // Generate a unique transaction ID
};

window.EF.impression(impressionData);`}</code>
              </pre>

              <h3 className="text-xl font-semibold mt-6 mb-4">3. Click Tracking</h3>
              <p className="mb-4">Implement click tracking when users interact with your offer:</p>
              <pre className="bg-gray-50 p-4 rounded-lg overflow-x-auto">
                <code>{`const clickData = {
  offer_id: window.EF.urlParameter('oid'),
  affiliate_id: YOUR_AFFILIATE_ID,
  sub1: window.EF.urlParameter('sub1'),
  transaction_id: YOUR_TRANSACTION_ID,
};

window.EF.click(clickData);`}</code>
              </pre>

              <h3 className="text-xl font-semibold mt-6 mb-4">4. Testing Your Implementation</h3>
              <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-6">
                <h4 className="font-semibold text-blue-700">Test Checklist</h4>
                <ul className="mt-2 space-y-1">
                  <li>✓ Everflow SDK loads successfully</li>
                  <li>✓ Impression fires on page load</li>
                  <li>✓ Click tracking works on interaction</li>
                  <li>✓ All tracking calls include required parameters</li>
                </ul>
              </div>
            </section>
          </div>
        </ScrollArea>
      </div>
    </div>
  );
};

export default Documentation;
