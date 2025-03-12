
import React, { createContext, useContext, useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

interface Campaign {
  id: string;
  title: string;
  slug: string;
  prize_name: string;
  prize_amount: string;
  start_date: string;
  end_date: string;
  thank_you_title: string;
  thank_you_description: string;
  target_audience: string;
  is_active: boolean;
}

interface CampaignContextType {
  campaign: Campaign | null;
  isLoading: boolean;
  error: Error | null;
}

const CampaignContext = createContext<CampaignContextType>({
  campaign: null,
  isLoading: true,
  error: null,
});

export const useCampaign = () => useContext(CampaignContext);

export const CampaignProvider: React.FC<{children: React.ReactNode}> = ({ children }) => {
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const { slug } = useParams<{ slug: string }>();

  useEffect(() => {
    const fetchCampaign = async () => {
      try {
        setIsLoading(true);
        
        let query = supabase.from('campaigns').select('*');
        
        if (slug) {
          query = query.eq('slug', slug).single();
        } else {
          // Default to the first active campaign if no slug is provided
          query = query.eq('is_active', true).order('created_at', { ascending: false }).limit(1).single();
        }
        
        const { data, error: supabaseError } = await query;
        
        if (supabaseError) throw new Error(supabaseError.message);
        
        setCampaign(data);
      } catch (err) {
        setError(err as Error);
        console.error('Error fetching campaign:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCampaign();
  }, [slug]);

  return (
    <CampaignContext.Provider value={{ campaign, isLoading, error }}>
      {children}
    </CampaignContext.Provider>
  );
};
