
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Campaign, SupabaseCampaign } from "../types";

export function useCampaigns(includeHidden: boolean = false) {
  return useQuery({
    queryKey: ['campaigns', { includeHidden }],
    queryFn: async () => {
      console.log("[CAMPAIGNS-DEBUG] Fetching campaigns from Supabase...");
      
      // Get all campaigns by default
      let query = supabase
        .from('campaigns')
        .select('*');
        
      // Only apply visibility filter if includeHidden is false
      // This will get campaigns where visible_in_admin is either true or null (not set)
      if (!includeHidden) {
        query = query.or('visible_in_admin.is.null,visible_in_admin.eq.true');
      }
      
      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) {
        console.error("[CAMPAIGNS-DEBUG] Error fetching campaigns:", error);
        throw error;
      }

      console.log(`[CAMPAIGNS-DEBUG] Retrieved ${data?.length} campaigns from Supabase`);
      console.log(`[CAMPAIGNS-DEBUG] Raw campaign data:`, JSON.stringify(data, null, 2));
      
      // Transform data from Supabase format to our Campaign type
      const campaigns: Campaign[] = (data as SupabaseCampaign[]).map(campaign => {
        console.log(`[CAMPAIGNS-DEBUG] Processing campaign:`, campaign.title);
        
        return {
          ...campaign,
          // Parse why_share_items if it exists and is a string or JSON object
          why_share_items: campaign.why_share_items 
            ? (typeof campaign.why_share_items === 'string' 
                ? JSON.parse(campaign.why_share_items as string) 
                : campaign.why_share_items as unknown as any[])
            : undefined
        };
      });
      
      console.log(`[CAMPAIGNS-DEBUG] Transformed campaigns:`, JSON.stringify(campaigns, null, 2));
      return campaigns;
    },
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
    staleTime: 0, // Consider data immediately stale to ensure fresh fetches
    gcTime: 1000 // Change cacheTime to gcTime - Very short cache time to ensure fresh data
  });
}
