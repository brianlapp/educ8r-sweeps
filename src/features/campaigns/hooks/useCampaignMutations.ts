import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Campaign, CampaignFormData, WhyShareItem } from "../types";
import { toast } from "sonner";
import { Json } from "@/integrations/supabase/types";

export function useCampaignMutations() {
  const queryClient = useQueryClient();

  const createCampaign = useMutation({
    mutationFn: async (campaign: CampaignFormData) => {
      console.log("[CREATE-CAMPAIGN] Starting campaign creation with data:", campaign);
      
      // Validate required fields
      const requiredFields = [
        'title', 'slug', 'email_template_id', 'prize_name', 
        'prize_amount', 'target_audience', 'thank_you_title', 
        'thank_you_description', 'start_date', 'end_date'
      ];
      
      const missingFields = requiredFields.filter(field => !campaign[field as keyof CampaignFormData]);
      
      if (missingFields.length > 0) {
        console.error("[CREATE-CAMPAIGN] Validation failed - missing fields:", missingFields);
        throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
      }
      
      // Convert WhyShareItem[] to Json for Supabase
      const campaignData = {
        ...campaign,
        why_share_items: campaign.why_share_items as unknown as Json,
        visible_in_admin: true  // New campaigns are visible by default
      };
      
      console.log("[CREATE-CAMPAIGN] Sending to Supabase:", campaignData);
      
      const { data, error } = await supabase
        .from('campaigns')
        .insert(campaignData)
        .select();

      if (error) {
        console.error("[CREATE-CAMPAIGN] Supabase error:", error);
        throw new Error(`Database error: ${error.message}`);
      }

      if (!data || data.length === 0) {
        console.error("[CREATE-CAMPAIGN] No data returned from Supabase after insert");
        throw new Error("Failed to create campaign - no data returned");
      }

      console.log("[CREATE-CAMPAIGN] Successfully created campaign:", data[0]);
      return data[0];
    },
    onSuccess: (data) => {
      console.log("[CREATE-CAMPAIGN] Success callback triggered with data:", data);
      // Force invalidate all campaign queries to ensure fresh data
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
      toast.success("Campaign created successfully!");
    },
    onError: (error: Error) => {
      console.error("[CREATE-CAMPAIGN] Mutation error:", error);
      toast.error(`Failed to create campaign: ${error.message}`);
    }
  });

  const updateCampaign = useMutation({
    mutationFn: async (campaign: Campaign) => {
      console.log("[UPDATE-CAMPAIGN] Starting update with full campaign data:", campaign);
      console.log("[UPDATE-CAMPAIGN] Checking subtitle value:", campaign.subtitle);
      
      if (!campaign.id || !campaign.title || !campaign.slug) {
        console.error("[UPDATE-CAMPAIGN] Missing required fields:", { 
          id: campaign.id, 
          title: campaign.title, 
          slug: campaign.slug 
        });
        throw new Error("Missing required fields for campaign update");
      }
      
      // Convert WhyShareItem[] to Json for Supabase
      const campaignData = {
        ...campaign,
        why_share_items: campaign.why_share_items as unknown as Json
      };
      
      console.log("[UPDATE-CAMPAIGN] Sending data to Supabase:", JSON.stringify(campaignData, null, 2));
      
      const { data, error } = await supabase
        .from('campaigns')
        .update(campaignData)
        .eq('id', campaign.id)
        .select('*')
        .single();

      if (error) {
        console.error("[UPDATE-CAMPAIGN] Supabase error details:", {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint
        });
        throw error;
      }
      
      console.log("[UPDATE-CAMPAIGN] Success - received data from Supabase:", data);
      
      // Transform the data back to Campaign type
      const updatedCampaign: Campaign = {
        ...data,
        why_share_items: data.why_share_items 
          ? (typeof data.why_share_items === 'string' 
              ? JSON.parse(data.why_share_items as string) 
              : data.why_share_items as unknown as WhyShareItem[])
          : undefined
      };
      
      console.log("[UPDATE-CAMPAIGN] Final transformed campaign:", JSON.stringify(updatedCampaign, null, 2));
      console.log("[UPDATE-CAMPAIGN] Final title value:", updatedCampaign.title);
      return updatedCampaign;
    },
    onSuccess: (updatedCampaign) => {
      console.log("[UPDATE-CAMPAIGN] Update successful for campaign:", updatedCampaign.id);
      console.log("[UPDATE-CAMPAIGN] Updated title:", updatedCampaign.title);
      
      // Force a complete invalidation of the campaigns cache
      console.log("[UPDATE-CAMPAIGN] Forcing cache invalidation for campaigns");
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
      
      // Additionally, update the specific campaign in the cache to ensure immediate UI update
      queryClient.setQueryData(['campaigns'], (oldData: Campaign[] | undefined) => {
        if (!oldData) return [updatedCampaign];
        
        console.log("[UPDATE-CAMPAIGN] Updating specific campaign in cache");
        const newData = oldData.map(campaign => 
          campaign.id === updatedCampaign.id ? updatedCampaign : campaign
        );
        
        return newData;
      });
    },
    onError: (error) => {
      console.error("[UPDATE-CAMPAIGN] Update mutation error:", error);
      toast.error("Failed to update campaign");
    }
  });

  const toggleCampaignVisibility = useMutation({
    mutationFn: async ({ campaignId, visible }: { campaignId: string; visible: boolean }) => {
      console.log(`[Mutations] ${visible ? 'Showing' : 'Hiding'} campaign:`, campaignId);
      
      const { data, error } = await supabase
        .from('campaigns')
        .update({ visible_in_admin: visible })
        .eq('id', campaignId)
        .select();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      console.log("[Mutations] Visibility toggle successful, invalidating cache");
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
    },
    onError: (error) => {
      console.error("[Mutations] Visibility toggle error:", error);
      toast.error("Failed to update campaign visibility");
    }
  });

  const deleteCampaign = useMutation({
    mutationFn: async (campaignId: string) => {
      console.log("[Mutations] Deleting campaign:", campaignId);
      
      // First check if campaign has any entries
      const { data: entries, error: checkError } = await supabase
        .from('entries')
        .select('id')
        .eq('campaign_id', campaignId)
        .limit(1);

      if (checkError) throw checkError;
      
      if (entries && entries.length > 0) {
        throw new Error("Cannot delete campaign that has entries. Please delete all entries first.");
      }

      const { error } = await supabase
        .from('campaigns')
        .delete()
        .eq('id', campaignId);

      if (error) throw error;
      return campaignId;
    },
    onSuccess: (campaignId) => {
      console.log("[Mutations] Campaign deleted successfully, invalidating cache");
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
    },
    onError: (error: Error) => {
      console.error("[Mutations] Delete error:", error);
      toast.error(error.message || "Failed to delete campaign");
    }
  });

  return { createCampaign, updateCampaign, toggleCampaignVisibility, deleteCampaign };
}
