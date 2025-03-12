
import React from 'react';
import { useCampaign } from '@/contexts/CampaignContext';
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

const LandingPage = () => {
  const { campaign, isLoading, error } = useCampaign();
  
  console.log("LandingPage rendering with:", { isLoading, hasCampaign: !!campaign, error });

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
            <h2 className="text-2xl font-bold text-gray-800 mb-2">No Active Campaign</h2>
            <p className="text-gray-600">There is currently no active campaign available.</p>
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
            {campaign.title}
          </h1>
          <div className="space-y-4">
            <div className="text-center">
              <h2 className="text-xl font-semibold text-gray-800">Prize: {campaign.prize_name}</h2>
              <p className="text-2xl font-bold text-emerald-600">{campaign.prize_amount}</p>
            </div>
            <p className="text-gray-600 text-center">
              For {campaign.target_audience}
            </p>
          </div>
          {/* Entry form will be added here later */}
        </Card>
      </div>
    </div>
  );
};

export default LandingPage;
