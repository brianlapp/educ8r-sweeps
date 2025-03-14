
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
          // Transform JSON fields
          why_share_items: campaign.why_share_items 
            ? (typeof campaign.why_share_items === 'string' 
                ? JSON.parse(campaign.why_share_items as string) 
                : campaign.why_share_items as unknown as any[])
            : undefined,
          // Ensure email template fields are present
          email_subject: campaign.email_subject || 'Congratulations! You earned a Sweepstakes entry!',
          email_heading: campaign.email_heading || 'You just earned an extra Sweepstakes entry!',
          email_referral_message: campaign.email_referral_message || 
            `Great news! One of your referrals just tried Comprendi™, and you now have {{totalEntries}} entries in the {{prize_amount}} {{prize_name}} Sweepstakes!`,
          email_cta_text: campaign.email_cta_text || 'Visit Comprendi Reading',
          email_footer_message: campaign.email_footer_message || 
            'Remember, each parent who activates a free trial through your link gives you another entry in the sweepstakes!',
          // Ensure source_id is always defined (even if null or empty)
          source_id: campaign.source_id || ''
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
