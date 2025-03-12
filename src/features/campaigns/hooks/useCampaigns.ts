
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Campaign, SupabaseCampaign } from "../types";

export function useCampaigns(includeHidden: boolean = false) {
  return useQuery({
    queryKey: ['campaigns', { includeHidden }],
    queryFn: async () => {
      console.log("[CAMPAIGNS-FETCH] Starting campaigns fetch, includeHidden:", includeHidden);
      
      let query = supabase
        .from('campaigns')
        .select('*');
        
      if (!includeHidden) {
        query = query.or('visible_in_admin.is.null,visible_in_admin.eq.true');
      }
      
      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) {
        console.error("[CAMPAIGNS-FETCH] Error fetching campaigns:", error);
        throw error;
      }

      console.log("[CAMPAIGNS-FETCH] Raw data from Supabase:", data);
      
      const campaigns: Campaign[] = (data as SupabaseCampaign[]).map(campaign => {
        console.log("[CAMPAIGNS-FETCH] Processing campaign:", campaign.title);
        
        return {
          ...campaign,
          why_share_items: campaign.why_share_items 
            ? (typeof campaign.why_share_items === 'string' 
                ? JSON.parse(campaign.why_share_items as string) 
                : campaign.why_share_items as unknown as any[])
            : undefined
        };
      });
      
      console.log("[CAMPAIGNS-FETCH] Transformed campaigns:", campaigns);
      return campaigns;
    },
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
    staleTime: 0,
    gcTime: 1000
  });
}
