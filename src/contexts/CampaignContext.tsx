
import React, { createContext, useContext, useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Campaign } from '@/features/campaigns/types';

interface CampaignContextType {
  campaign: Campaign | null;
  isLoading: boolean;
  error: Error | null;
  refreshCampaign: () => Promise<void>;
}

const CampaignContext = createContext<CampaignContextType | undefined>(undefined);

export const CampaignProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const { slug = 'classroom-supplies-2025' } = useParams();

  const fetchCampaign = async () => {
    try {
      console.log('Fetching campaign with slug:', slug);
      const { data, error: fetchError } = await supabase
        .from('campaigns')
        .select('*')
        .eq('slug', slug)
        .single();

      if (fetchError) {
        throw fetchError;
      }

      if (data) {
        console.log('Campaign data fetched:', data);
        // If why_share_items is a string, parse it to an object
        const processedData = {
          ...data,
          why_share_items: typeof data.why_share_items === 'string' 
            ? JSON.parse(data.why_share_items) 
            : data.why_share_items,
          // Ensure these optional fields have default values
          subtitle: data.subtitle || '',
          mobile_subtitle: data.mobile_subtitle || '',
          promotional_text: data.promotional_text || '',
          share_title: data.share_title || '',
          share_description: data.share_description || '',
          // Add email template fields with defaults
          email_subject: data.email_subject || 'Congratulations! You earned a Sweepstakes entry!',
          email_heading: data.email_heading || 'You just earned an extra Sweepstakes entry!',
          email_referral_message: data.email_referral_message || 'Great news! One of your referrals just tried Comprendi™, and you now have {{totalEntries}} entries in the {{prize_amount}} {{prize_name}} Sweepstakes!',
          email_cta_text: data.email_cta_text || 'Visit Comprendi Reading',
          email_footer_message: data.email_footer_message || 'Remember, each parent who activates a free trial through your link gives you another entry in the sweepstakes!'
        };
        setCampaign(processedData);
      }
    } catch (err) {
      console.error('Error fetching campaign:', err);
      setError(err instanceof Error ? err : new Error('Failed to fetch campaign'));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCampaign();
  }, [slug]);

  return (
    <CampaignContext.Provider value={{ campaign, isLoading, error, refreshCampaign: fetchCampaign }}>
      {children}
    </CampaignContext.Provider>
  );
};

export const useCampaign = (): CampaignContextType => {
  const context = useContext(CampaignContext);
  if (context === undefined) {
    throw new Error('useCampaign must be used within a CampaignProvider');
  }
  return context;
};
