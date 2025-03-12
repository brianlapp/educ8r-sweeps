
import React from 'react';
import { useCampaign } from '@/contexts/CampaignContext';
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

const ThankYou = () => {
  const { campaign, isLoading, error } = useCampaign();
  
  console.log("ThankYou page rendering with:", { isLoading, hasCampaign: !!campaign, error: error?.message });

  if (isLoading) {
    return (
      <div className="min-h-screen flex justify-center items-center bg-gray-50">
        <Card className="w-full max-w-2xl p-6 space-y-4">
          <Skeleton className="h-8 w-3/4 mx-auto" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-2/3" />
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex justify-center items-center bg-gray-50">
        <Card className="w-full max-w-2xl p-6">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-red-600 mb-2">Error Loading Campaign</h2>
            <p className="text-gray-600">{error.message}</p>
          </div>
        </Card>
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="min-h-screen flex justify-center items-center bg-gray-50">
        <Card className="w-full max-w-2xl p-6">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Campaign Not Found</h2>
            <p className="text-gray-600">
              The campaign you're looking for could not be found. It may have ended or doesn't exist.
            </p>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="container mx-auto px-4">
        <Card className="max-w-2xl mx-auto p-6">
          <h1 className="text-3xl font-bold text-center text-gray-900 mb-6">
            {campaign.thank_you_title || 'Thank You for Entering!'}
          </h1>
          <p className="text-center text-gray-600 mb-8">
            {campaign.thank_you_description || 'Share with friends to get more entries.'}
          </p>
          {/* Referral options and other content will go here */}
        </Card>
      </div>
    </div>
  );
};

export default ThankYou;
