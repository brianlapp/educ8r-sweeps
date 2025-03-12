import React from 'react';
import { useCampaign } from '@/contexts/CampaignContext';

const ThankYou = () => {
  const { campaign, isLoading, error } = useCampaign();

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (error) {
    return <div>Error: {error.message}</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-center mb-4">
          {campaign?.thank_you_title || 'Thank You for Entering!'}
        </h1>
        <p className="text-center mb-8">
          {campaign?.thank_you_description || 'Share with friends to get more entries.'}
        </p>
        {/* Referral options and other content will go here */}
      </div>
    </div>
  );
};

export default ThankYou;
