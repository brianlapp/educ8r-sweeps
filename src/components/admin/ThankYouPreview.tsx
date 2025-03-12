
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Tables } from '@/integrations/supabase/types';

interface ThankYouPreviewProps {
  campaign: Tables<'campaigns'> | null;
}

export const ThankYouPreview = ({ campaign }: ThankYouPreviewProps) => {
  if (!campaign) {
    return (
      <Card className="bg-gray-100 border border-gray-200">
        <CardContent className="p-6 text-center text-gray-500">
          No campaign selected
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden border border-gray-200">
      <CardContent className="p-0">
        <div className="bg-[#f3f3f3] py-4 border-b border-gray-200 text-center">
          <img 
            src="/lovable-uploads/2b96223c-82ba-48db-9c96-5c37da48d93e.png" 
            alt="Logo" 
            className="h-8 w-auto mx-auto" 
          />
        </div>
        
        <div className="p-6 bg-white">
          <div className="max-w-2xl mx-auto text-center space-y-4">
            <h2 className="text-2xl font-bold text-[#2C3E50]">
              {campaign.thank_you_title || "🎉 Thank You for Entering!"}
            </h2>
            
            <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 space-y-4">
              <h3 className="font-bold text-lg text-blue-500">
                Give Your Students' Parents a Free Gift!
              </h3>
              
              <p className="text-gray-600 text-sm">
                {campaign.thank_you_description || "Share your referral link with the parents of your students. When they sign up for a free trial, you'll earn an extra entry."}
              </p>
              
              <div className="bg-gray-50 p-3 rounded-lg">
                <p className="text-sm text-gray-500 mb-1">🔗 Your Referral Link:</p>
                <p className="text-primary font-medium break-all text-sm">
                  https://dmlearninglab.com/homesc/?utm_source=sweeps&oid=1987&sub1=SAMPLE123
                </p>
              </div>
              
              <button className="w-full py-2 px-4 bg-green-600 text-white rounded-md">
                Copy Referral Link
              </button>
              
              <div className="p-4 rounded-lg border-l-4 border-blue-500 bg-blue-50 text-left">
                <h3 className="font-bold text-lg mb-2 text-blue-500">📚 Why Share?</h3>
                <ul className="text-gray-700 space-y-2 text-sm">
                  <li className="flex items-start">
                    <span className="inline-block mr-2 text-blue-600">•</span>
                    <div>
                      <span className="font-medium">A Gift for {campaign.target_audience || "Parents"}:</span> Provide them with a valuable, no-cost resource to help their kids thrive in reading.
                    </div>
                  </li>
                  <li className="flex items-start">
                    <span className="inline-block mr-2 text-blue-600">•</span>
                    <div>
                      <span className="font-medium">A Team Effort:</span> Working together, we can support kids in building confidence and comprehension.
                    </div>
                  </li>
                  <li className="flex items-start">
                    <span className="inline-block mr-2 text-blue-600">•</span>
                    <div>
                      <span className="font-medium">Email Notifications:</span> You'll receive an email when someone uses your link.
                    </div>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
