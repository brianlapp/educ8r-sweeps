
import React, { createContext, useContext, useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

export interface Campaign {
  id: string;
  title: string;
  slug: string;
  is_active: boolean;
  prize_name: string;
  prize_amount: string;
  target_audience: string;
  thank_you_title: string;
  thank_you_description: string;
  start_date: string;
  end_date: string;
  share_title?: string;
  share_description?: string;
  why_share_items?: any;
  hero_image_url?: string;
  email_template_id?: string;
  subtitle?: string;
  promotional_text?: string;
}

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
            : data.why_share_items
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
