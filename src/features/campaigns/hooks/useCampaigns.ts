
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Campaign } from "../types";

export function useCampaigns() {
  return useQuery({
    queryKey: ['campaigns'],
    queryFn: async () => {
      console.log("[AdminCampaignsPage] Fetching campaigns from Supabase...");
      const { data, error } = await supabase
        .from('campaigns')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error("[AdminCampaignsPage] Error fetching campaigns:", error);
        throw error;
      }

      console.log(`[AdminCampaignsPage] Retrieved ${data?.length} campaigns from Supabase`);
      return data as Campaign[];
    },
    refetchOnMount: 'always'
  });
}
