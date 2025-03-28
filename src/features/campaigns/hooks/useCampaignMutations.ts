
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
      
      // Validate email template fields - added validation for critical email fields
      const emailFields = [
        'email_subject', 'email_heading', 'email_referral_message', 
        'email_cta_text', 'email_footer_message'
      ];
      
      const missingEmailFields = emailFields.filter(field => 
        !campaign[field as keyof CampaignFormData] && field in campaign
      );
      
      if (missingEmailFields.length > 0) {
        console.warn("[CREATE-CAMPAIGN] Missing email template fields:", missingEmailFields);
        // Not throwing an error as these fields have defaults
      }
      
      // Convert WhyShareItem[] to Json for Supabase
      const campaignData = {
        ...campaign,
        why_share_items: campaign.why_share_items as unknown as Json,
        visible_in_admin: true,  // New campaigns are visible by default
        source_id: campaign.source_id || null  // Ensure source_id is included
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
      console.log("[UPDATE-CAMPAIGN] Starting update with campaign data:", JSON.stringify(campaign, null, 2));
      
      if (!campaign.id || !campaign.title || !campaign.slug) {
        console.error("[UPDATE-CAMPAIGN] Missing required fields:", { 
          id: campaign.id, 
          title: campaign.title, 
          slug: campaign.slug 
        });
        throw new Error("Missing required fields for campaign update");
      }
      
      // Log the meta image URL specifically to debug the issue
      console.log("[UPDATE-CAMPAIGN] Meta image URL in update payload:", campaign.meta_image);
      
      // Create a clean update payload that directly uses the values from the campaign object
      // without falling back to defaults using the nullish coalescing operator
      const updatePayload = {
        id: campaign.id,
        title: campaign.title,
        slug: campaign.slug,
        is_active: campaign.is_active,
        prize_name: campaign.prize_name,
        prize_amount: campaign.prize_amount,
        target_audience: campaign.target_audience,
        thank_you_title: campaign.thank_you_title,
        thank_you_description: campaign.thank_you_description,
        email_template_id: campaign.email_template_id,
        start_date: campaign.start_date,
        end_date: campaign.end_date,
        share_title: campaign.share_title, 
        share_description: campaign.share_description,
        hero_image_url: campaign.hero_image_url,
        subtitle: campaign.subtitle,
        promotional_text: campaign.promotional_text,
        // Email template fields
        email_subject: campaign.email_subject,
        email_heading: campaign.email_heading,
        email_referral_message: campaign.email_referral_message,
        email_cta_text: campaign.email_cta_text,
        email_footer_message: campaign.email_footer_message,
        // Campaign attribution
        source_id: campaign.source_id,
        // Mobile fields
        mobile_subtitle: campaign.mobile_subtitle,
        // Meta fields - REMOVED the nullish coalescing operator to fix the issue
        meta_title: campaign.meta_title,
        meta_description: campaign.meta_description,
        meta_image: campaign.meta_image, 
        meta_url: campaign.meta_url,
        // Convert WhyShareItem[] to Json for Supabase
        why_share_items: campaign.why_share_items as unknown as Json,
      };
      
      console.log("[UPDATE-CAMPAIGN] Clean update payload with meta fields:", JSON.stringify({
        meta_title: updatePayload.meta_title,
        meta_description: updatePayload.meta_description,
        meta_image: updatePayload.meta_image,
        meta_url: updatePayload.meta_url
      }, null, 2));
      
      const { data, error } = await supabase
        .from('campaigns')
        .update(updatePayload)
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
      return updatedCampaign;
    },
    onSuccess: (updatedCampaign) => {
      console.log("[UPDATE-CAMPAIGN] Update successful for campaign:", updatedCampaign.id);
      
      // Force a complete invalidation of the campaigns cache
      console.log("[UPDATE-CAMPAIGN] Forcing cache invalidation for campaigns");
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
      
      // Additionally, update the specific campaign in the cache to ensure immediate UI update
      queryClient.setQueryData(['campaign', updatedCampaign.id], updatedCampaign);
      
      toast.success("Campaign updated successfully!");
    },
    onError: (error) => {
      console.error("[UPDATE-CAMPAIGN] Update mutation error:", error);
      toast.error(`Failed to update campaign: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
