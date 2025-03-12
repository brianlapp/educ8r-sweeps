
import { createContext, useContext, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

interface Campaign {
  id: string;
  title: string;
  slug: string;
  prize_name: string;
  prize_amount: string;
  target_audience: string;
  thank_you_title: string;
  thank_you_description: string;
  email_template_id: string;
  start_date: string;
  end_date: string;
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

export function CampaignProvider({ children }: { children: React.ReactNode }) {
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const { slug = 'classroom-supplies-2025' } = useParams();

  useEffect(() => {
    async function fetchCampaign() {
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
          setCampaign(data);
        }
      } catch (err) {
        console.error('Error fetching campaign:', err);
        setError(err instanceof Error ? err : new Error('Failed to fetch campaign'));
      } finally {
        setIsLoading(false);
      }
    }

    fetchCampaign();
  }, [slug]);

  return (
    <CampaignContext.Provider value={{ campaign, isLoading, error }}>
      {children}
    </CampaignContext.Provider>
  );
}

export function useCampaign() {
  const context = useContext(CampaignContext);
  if (!context) {
    throw new Error('useCampaign must be used within a CampaignProvider');
  }
  return context;
}
