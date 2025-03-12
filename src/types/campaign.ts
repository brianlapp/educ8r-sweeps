
import { Tables } from "@/integrations/supabase/types";

// Define the Campaign type extending from the database type
export type Campaign = Tables<'campaigns'> & {
  // Add any additional properties we might need in the frontend
  fullUrl?: string;
};

// Define the CampaignContextType
export interface CampaignContextType {
  currentCampaign: Campaign | null;
  isLoading: boolean;
  error: Error | null;
  setCampaignBySlug: (slug: string) => Promise<void>;
  getDefaultCampaign: () => Promise<Campaign | null>;
}
