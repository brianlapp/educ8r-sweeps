
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Campaign, CampaignFormData, WhyShareItem } from "../types";
import { toast } from "sonner";
import { Json } from "@/integrations/supabase/types";

export function useCampaignMutations() {
  const queryClient = useQueryClient();

  const createCampaign = useMutation({
    mutationFn: async (campaign: CampaignFormData) => {
      console.log("[AdminCampaignsPage] Creating new campaign:", campaign);
      
      if (!campaign.title || !campaign.slug || !campaign.email_template_id || 
          !campaign.prize_name || !campaign.prize_amount || !campaign.target_audience ||
          !campaign.thank_you_title || !campaign.thank_you_description ||
          !campaign.start_date || !campaign.end_date) {
        throw new Error("Missing required fields for campaign creation");
      }
      
      // Convert WhyShareItem[] to Json for Supabase
      const campaignData = {
        ...campaign,
        why_share_items: campaign.why_share_items as unknown as Json,
        visible_in_admin: true  // New campaigns are visible by default
      };
      
      const { data, error } = await supabase
        .from('campaigns')
        .insert(campaignData)
        .select();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
      toast.success("Campaign created successfully!");
    },
    onError: (error) => {
      console.error("[AdminCampaignsPage] Mutation error:", error);
      toast.error("Failed to create campaign");
    }
  });

  const updateCampaign = useMutation({
    mutationFn: async (campaign: Campaign) => {
      console.log("[UPDATE-DEBUG] Starting update with campaign data:", campaign);
      console.log("[UPDATE-DEBUG] Title being updated to:", campaign.title);
      
      if (!campaign.id || !campaign.title || !campaign.slug) {
        console.error("[UPDATE-DEBUG] Missing required fields:", { 
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
      
      console.log("[UPDATE-DEBUG] Sending to Supabase:", campaignData);
      
      const { data, error } = await supabase
        .from('campaigns')
        .update(campaignData)
        .eq('id', campaign.id)
        .select()
        .single();

      if (error) {
        console.error("[UPDATE-DEBUG] Supabase update error:", error);
        throw error;
      }
      
      console.log("[UPDATE-DEBUG] Received from Supabase:", data);
      
      // Transform the data back to Campaign type
      const updatedCampaign: Campaign = {
        ...data,
        why_share_items: data.why_share_items 
          ? (Array.isArray(data.why_share_items) 
              ? data.why_share_items as unknown as WhyShareItem[]
              : typeof data.why_share_items === 'string'
                ? JSON.parse(data.why_share_items)
                : data.why_share_items as unknown as WhyShareItem[])
          : undefined
      };
      
      console.log("[UPDATE-DEBUG] Final transformed campaign:", updatedCampaign);
      console.log("[UPDATE-DEBUG] Final title value:", updatedCampaign.title);
      return updatedCampaign;
    },
    onSuccess: (updatedCampaign) => {
      console.log("[UPDATE-DEBUG] onSuccess called with:", updatedCampaign);
      
      // Log current cache state
      const currentCache = queryClient.getQueryData(['campaigns']);
      console.log("[UPDATE-DEBUG] Current cache state:", currentCache);
      
      // Update specific campaign in cache
      queryClient.setQueryData(['campaigns'], (oldData: Campaign[] | undefined) => {
        if (!oldData) {
          console.log("[UPDATE-DEBUG] No existing cache, setting new data");
          return [updatedCampaign];
        }
        
        console.log("[UPDATE-DEBUG] Updating cache with new campaign data");
        const newData = oldData.map(campaign => 
          campaign.id === updatedCampaign.id ? updatedCampaign : campaign
        );
        
        console.log("[UPDATE-DEBUG] New cache state:", newData);
        return newData;
      });
      
      // Invalidate queries to ensure fresh data
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
      toast.success("Campaign updated successfully!");
    },
    onError: (error) => {
      console.error("[UPDATE-DEBUG] Mutation error:", error);
      toast.error("Failed to update campaign");
    }
  });

  const toggleCampaignVisibility = useMutation({
    mutationFn: async ({ campaignId, visible }: { campaignId: string; visible: boolean }) => {
      console.log(`[AdminCampaignsPage] ${visible ? 'Showing' : 'Hiding'} campaign:`, campaignId);
      
      const { data, error } = await supabase
        .from('campaigns')
        .update({ visible_in_admin: visible })
        .eq('id', campaignId)
        .select();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
      toast.success(`Campaign ${variables.visible ? 'restored' : 'hidden'} successfully!`);
    },
    onError: (error) => {
      console.error("[AdminCampaignsPage] Visibility toggle error:", error);
      toast.error("Failed to update campaign visibility");
    }
  });

  // Keep the deleteCampaign mutation but it will now be unused
  const deleteCampaign = useMutation({
    mutationFn: async (campaignId: string) => {
      console.log("[AdminCampaignsPage] Deleting campaign:", campaignId);
      
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
      toast.success("Campaign deleted successfully!");
    },
    onError: (error: Error) => {
      console.error("[AdminCampaignsPage] Delete error:", error);
      toast.error(error.message || "Failed to delete campaign");
    }
  });

  return { createCampaign, updateCampaign, deleteCampaign, toggleCampaignVisibility };
}
