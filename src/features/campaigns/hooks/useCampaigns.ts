
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Campaign, SupabaseCampaign } from "../types";

export function useCampaigns(includeHidden: boolean = false) {
  return useQuery({
    queryKey: ['campaigns', { includeHidden }],
    queryFn: async () => {
      console.log("[AdminCampaignsPage] Fetching campaigns from Supabase...");
      
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
        console.error("[AdminCampaignsPage] Error fetching campaigns:", error);
        throw error;
      }

      console.log(`[AdminCampaignsPage] Retrieved ${data?.length} campaigns from Supabase`);
      
      // Transform data from Supabase format to our Campaign type
      const campaigns: Campaign[] = (data as SupabaseCampaign[]).map(campaign => ({
        ...campaign,
        // Parse why_share_items if it exists and is a string or JSON object
        why_share_items: campaign.why_share_items 
          ? (typeof campaign.why_share_items === 'string' 
              ? JSON.parse(campaign.why_share_items as string) 
              : campaign.why_share_items as unknown as any[])
          : undefined
      }));
      
      return campaigns;
    },
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
    staleTime: 0 // Consider data immediately stale to ensure fresh fetches
  });
}
