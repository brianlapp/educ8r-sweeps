
import { Json } from "@/integrations/supabase/types";

export interface WhyShareItem {
  title: string;
  description: string;
}

export interface Campaign {
  id: string;
  title: string;
  slug: string;
  is_active: boolean;
  prize_name: string;
  prize_amount: string;
  target_audience: string;
  thank_you_title: string;
  thank_you_description: string;
  email_template_id: string;
  start_date: string;
  end_date: string;
  share_title?: string;
  share_description?: string;
  why_share_items?: WhyShareItem[];
  hero_image_url?: string;
  created_at?: string;
  updated_at?: string;
  visible_in_admin?: boolean;
  subtitle?: string;
  mobile_subtitle?: string;
  promotional_text?: string;
  meta_title?: string;
  meta_description?: string;
  meta_image?: string;
  meta_url?: string;
  // Email template fields
  email_subject?: string;
  email_heading?: string;
  email_referral_message?: string;
  email_cta_text?: string;
  email_footer_message?: string;
  // Sender name - Added here for tracking but managed at the edge function level
  email_sender_name?: string;
  // Campaign attribution
  source_id?: string;
}

export interface CampaignFormData {
  id?: string;
  title: string;
  slug: string;
  is_active: boolean;
  prize_name: string;
  prize_amount: string; 
  target_audience: string;
  thank_you_title: string;
  thank_you_description: string;
  email_template_id: string;
  start_date: string;
  end_date: string;
  share_title?: string;
  share_description?: string;
  why_share_items?: WhyShareItem[];
  hero_image_url?: string;
  visible_in_admin?: boolean;
  subtitle?: string;
  mobile_subtitle?: string;
  promotional_text?: string;
  meta_title?: string;
  meta_description?: string;
  meta_image?: string;
  meta_url?: string;
  // Email template fields
  email_subject?: string;
  email_heading?: string;
  email_referral_message?: string;
  email_cta_text?: string;
  email_footer_message?: string;
  // Sender name - Added here for tracking but managed at the edge function level
  email_sender_name?: string;
  // Campaign attribution
  source_id?: string;
}

export interface SupabaseCampaign {
  id: string;
  title: string;
  slug: string;
  is_active: boolean;
  prize_name: string;
  prize_amount: string;
  target_audience: string;
  thank_you_title: string;
  thank_you_description: string;
  email_template_id: string;
  start_date: string;
  end_date: string;
  share_title?: string;
  share_description?: string;
  why_share_items?: Json;
  hero_image_url?: string;
  created_at?: string;
  updated_at?: string;
  visible_in_admin?: boolean;
  subtitle?: string;
  mobile_subtitle?: string;
  promotional_text?: string;
  meta_title?: string;
  meta_description?: string;
  meta_image?: string;
  meta_url?: string;
  // Email template fields
  email_subject?: string;
  email_heading?: string;
  email_referral_message?: string;
  email_cta_text?: string;
  email_footer_message?: string;
  // Sender name - Added here for tracking but managed at the edge function level
  email_sender_name?: string;
  // Campaign attribution
  source_id?: string;
}
