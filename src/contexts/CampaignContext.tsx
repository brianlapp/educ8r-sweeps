
import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Campaign, CampaignContextType } from "@/types/campaign";
import { useToast } from "@/hooks/use-toast";

// Create context with default values
const CampaignContext = createContext<CampaignContextType>({
  currentCampaign: null,
  isLoading: false,
  error: null,
  setCampaignBySlug: async () => {},
  getDefaultCampaign: async () => null,
});

// Hook for using the campaign context
export const useCampaign = () => useContext(CampaignContext);

interface CampaignProviderProps {
  children: ReactNode;
}

export const CampaignProvider: React.FC<CampaignProviderProps> = ({ children }) => {
  const [currentCampaign, setCurrentCampaign] = useState<Campaign | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);
  const { toast } = useToast();

  // Function to fetch campaign by slug
  const setCampaignBySlug = async (slug: string) => {
    try {
      setIsLoading(true);
      setError(null);
      
      console.log(`[CampaignContext] Fetching campaign with slug: ${slug}`);
      
      const { data, error: fetchError } = await supabase
        .from('campaigns')
        .select('*')
        .eq('slug', slug)
        .eq('is_active', true)
        .single();
      
      if (fetchError) {
        console.error("[CampaignContext] Error fetching campaign:", fetchError);
        setError(new Error(fetchError.message));
        toast({
          variant: "destructive",
          title: "Campaign Error",
          description: `Could not load campaign: ${fetchError.message}`,
        });
        return;
      }
      
      if (data) {
        console.log("[CampaignContext] Campaign found:", data);
        // Add the full URL for convenience
        const campaignWithUrl = {
          ...data,
          fullUrl: `${window.location.origin}/${data.slug}`
        };
        setCurrentCampaign(campaignWithUrl);
      } else {
        console.warn("[CampaignContext] No active campaign found with slug:", slug);
        setError(new Error(`No active campaign found with slug: ${slug}`));
        
        // Fall back to default campaign if specific one not found
        const defaultCampaign = await getDefaultCampaign();
        if (defaultCampaign) {
          setCurrentCampaign(defaultCampaign);
        }
      }
    } catch (err) {
      console.error("[CampaignContext] Unexpected error:", err);
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setIsLoading(false);
    }
  };

  // Function to get the default campaign (for backward compatibility)
  const getDefaultCampaign = async (): Promise<Campaign | null> => {
    try {
      const { data, error: fetchError } = await supabase
        .from('campaigns')
        .select('*')
        .eq('slug', 'classroom-1000')
        .single();
      
      if (fetchError) {
        console.error("[CampaignContext] Error fetching default campaign:", fetchError);
        return null;
      }
      
      if (data) {
        // Add the full URL for convenience
        const campaignWithUrl = {
          ...data,
          fullUrl: `${window.location.origin}/${data.slug}`
        };
        return campaignWithUrl;
      }
      
      return null;
    } catch (err) {
      console.error("[CampaignContext] Error in getDefaultCampaign:", err);
      return null;
    }
  };

  return (
    <CampaignContext.Provider
      value={{
        currentCampaign,
        isLoading,
        error,
        setCampaignBySlug,
        getDefaultCampaign,
      }}
    >
      {children}
    </CampaignContext.Provider>
  );
};
