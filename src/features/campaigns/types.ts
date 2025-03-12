
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
}
