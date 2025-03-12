
export interface WhyShareItem {
  title: string;
  description: string;
}

export interface Campaign {
  id: string;
  title: string;
  slug: string;
  is_active: boolean;
  prize_name?: string;
  prize_amount?: string;
  target_audience?: string;
  thank_you_title?: string;
  thank_you_description?: string;
  email_template_id?: string;
  start_date?: string;
  end_date?: string;
  share_title?: string;
  share_description?: string;
  why_share_items?: WhyShareItem[];
  hero_image_url?: string;
}

export interface CampaignFormData extends Omit<Campaign, 'id'> {
  id?: string;
}
