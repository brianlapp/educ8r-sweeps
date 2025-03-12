
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

  console.log("CampaignProvider mounted with slug:", slug);

  useEffect(() => {
    const fetchCampaign = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        console.log("Starting fetchCampaign with slug:", slug);
        console.log("Executing Supabase query for:", slug ? `slug: ${slug}` : "active campaign");
        
        // Fixed query construction to maintain proper types
        let { data, error: supabaseError } = slug 
          ? await supabase.from('campaigns').select('*').eq('slug', slug).maybeSingle()
          : await supabase.from('campaigns').select('*').eq('is_active', true).order('created_at', { ascending: false }).limit(1).maybeSingle();
        
        if (supabaseError) {
          console.error("Supabase error:", supabaseError);
          throw new Error(supabaseError.message);
        }
        
        console.log("Campaign data received:", data);
        setCampaign(data);
      } catch (err) {
        console.error('Error in fetchCampaign:', err);
        setError(err instanceof Error ? err : new Error('Unknown error occurred'));
      } finally {
        console.log("Setting isLoading to false");
        setIsLoading(false);
      }
    };

    fetchCampaign();
  }, [slug]);

  console.log("CampaignContext rendering with state:", { 
    isLoading, 
    hasCampaign: !!campaign, 
    campaignId: campaign?.id,
    error: error?.message,
    slug 
  });

  return (
    <CampaignContext.Provider value={{ campaign, isLoading, error }}>
      {children}
    </CampaignContext.Provider>
  );
};
