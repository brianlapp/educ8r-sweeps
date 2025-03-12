
import React, { createContext, useContext, useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Database } from '@/integrations/supabase/types';

type Campaign = Database['public']['Tables']['campaigns']['Row'];

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
        setError(null);
        
        console.log("Fetching campaign with slug:", slug || "default active campaign");
        
        let { data, error: supabaseError } = slug 
          ? await supabase.from('campaigns').select('*').eq('slug', slug).single()
          : await supabase.from('campaigns').select('*').eq('is_active', true).order('created_at', { ascending: false }).limit(1).single();
        
        if (supabaseError) {
          console.error("Supabase error:", supabaseError);
          throw new Error(supabaseError.message);
        }
        
        console.log("Campaign data received:", data);
        setCampaign(data);
      } catch (err) {
        console.error('Error fetching campaign:', err);
        setError(err as Error);
        // Even if there's an error, we should still exit loading state
      } finally {
        setIsLoading(false);
      }
    };

    fetchCampaign();
  }, [slug]);

  // Log the current state for debugging
  console.log("CampaignContext state:", { isLoading, campaign, error: error?.message });

  return (
    <CampaignContext.Provider value={{ campaign, isLoading, error }}>
      {children}
    </CampaignContext.Provider>
  );
};
