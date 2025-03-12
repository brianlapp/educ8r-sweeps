
import React from 'react';
import { useCampaign } from '@/contexts/CampaignContext';
import { useParams } from 'react-router-dom';

const ThankYou = () => {
  const { campaign, isLoading, error } = useCampaign();
  const { slug } = useParams();

  console.log("ThankYou page state:", { slug, isLoading, campaign, error: error?.message });

  if (isLoading) {
    return (
      <div className="min-h-screen flex justify-center items-center bg-gray-50">
        <div className="text-center">
          <div className="text-2xl font-semibold mb-2">Loading...</div>
          <div className="text-gray-500">Please wait while we load the page.</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex justify-center items-center bg-gray-50">
        <div className="text-center max-w-md mx-auto p-6 bg-white rounded-lg shadow-md">
          <div className="text-2xl font-semibold text-red-600 mb-2">Error</div>
          <div className="text-gray-700 mb-4">{error.message}</div>
          <div className="text-gray-500">Please try again later or contact support if the problem persists.</div>
        </div>
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="min-h-screen flex justify-center items-center bg-gray-50">
        <div className="text-center max-w-md mx-auto p-6 bg-white rounded-lg shadow-md">
          <div className="text-2xl font-semibold mb-2">Campaign Not Found</div>
          <div className="text-gray-500">
            The campaign you're looking for could not be found. It may have ended or doesn't exist.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-center mb-4">
          {campaign.thank_you_title || 'Thank You for Entering!'}
        </h1>
        <p className="text-center mb-8">
          {campaign.thank_you_description || 'Share with friends to get more entries.'}
        </p>
        {/* Referral options and other content will go here */}
      </div>
    </div>
  );
};

export default ThankYou;
