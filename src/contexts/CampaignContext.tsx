
import React, { createContext, useContext, useState, useEffect } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Campaign } from '@/features/campaigns/types';
import { useToast } from '@/hooks/use-toast';

interface CampaignContextType {
  campaign: Campaign | null;
  isLoading: boolean;
  error: Error | null;
  refreshCampaign: () => Promise<void>;
  campaignId: string | null;
}

const CampaignContext = createContext<CampaignContextType | undefined>(undefined);

export const CampaignProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const { slug = 'classroom-supplies-2025' } = useParams();
  const [campaignId, setCampaignId] = useState<string | null>(null);
  const location = useLocation();
  const { toast } = useToast();
  
  // Determine if we're in a static context or dynamic React app
  const isStaticPage = document.head.innerHTML.includes('Static page generated for campaign');
  const currentCampaignSlug = isStaticPage && document.head.innerHTML.match(/Static page generated for campaign: ([a-z0-9-_]+)/)?.[1];
  
  // If this is a static page and the URL doesn't match the HTML campaign slug, prefer the one from the HTML
  const campaignSlug = isStaticPage && currentCampaignSlug ? currentCampaignSlug : slug;
  
  useEffect(() => {
    if (isStaticPage) {
      console.log(`This is a static page for campaign: ${currentCampaignSlug}`);
      if (currentCampaignSlug && currentCampaignSlug !== slug) {
        console.warn(`URL slug (${slug}) doesn't match HTML campaign slug (${currentCampaignSlug})`);
      }
    }
  }, [isStaticPage, currentCampaignSlug, slug]);
  
  const fetchCampaign = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      console.log('Fetching campaign with slug:', campaignSlug);
      console.log('Current path:', location.pathname);
      
      if (isStaticPage) {
        console.log('This is a statically generated page, initializing campaign data');
      }
      
      // Add a small delay for static pages to ensure other resources are loaded first
      if (isStaticPage) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      const { data, error: fetchError } = await supabase
        .from('campaigns')
        .select('*')
        .eq('slug', campaignSlug)
        .single();

      if (fetchError) {
        console.error('Error fetching campaign data:', fetchError);
        
        // Try fetching default campaign as fallback
        if (campaignSlug !== 'classroom-supplies-2025') {
          console.log('Trying to fetch default campaign as fallback');
          
          const { data: defaultData, error: defaultError } = await supabase
            .from('campaigns')
            .select('*')
            .eq('slug', 'classroom-supplies-2025')
            .single();
            
          if (!defaultError && defaultData) {
            console.log('Using default campaign data as fallback');
            setCampaignId(defaultData.id);
            setCampaign({
              ...defaultData,
              why_share_items: typeof defaultData.why_share_items === 'string' 
                ? JSON.parse(defaultData.why_share_items) 
                : defaultData.why_share_items
            } as Campaign);
            
            // Notify user about campaign not found
            toast({
              title: "Campaign Not Found",
              description: `Using default campaign instead. The "${campaignSlug}" campaign may not exist.`,
              variant: "destructive"
            });
            
            return;
          }
        }
        
        throw new Error(`Failed to fetch campaign: ${fetchError.message}`);
      }

      if (data) {
        console.log('Campaign data fetched successfully:', data.id);
        setCampaignId(data.id);
        // If why_share_items is a string, parse it to an object
        const processedData: Campaign = {
          ...data,
          why_share_items: typeof data.why_share_items === 'string' 
            ? JSON.parse(data.why_share_items) 
            : data.why_share_items,
          // Ensure these optional fields have default values
          subtitle: data.subtitle || '',
          mobile_subtitle: data.mobile_subtitle || '',
          promotional_text: data.promotional_text || '',
          share_title: data.share_title || '',
          share_description: data.share_description || '',
          // Email template fields with defaults
          email_subject: data.email_subject || 'Congratulations! You earned a Sweepstakes entry!',
          email_heading: data.email_heading || 'You just earned an extra Sweepstakes entry!',
          email_referral_message: data.email_referral_message || 'Great news! One of your referrals just tried Comprendi™, and you now have {{totalEntries}} entries in the {{prize_amount}} {{prize_name}} Sweepstakes!',
          email_cta_text: data.email_cta_text || 'Visit Comprendi Reading',
          email_footer_message: data.email_footer_message || 'Remember, each parent who activates a free trial through your link gives you another entry in the sweepstakes!',
          // Ensure source_id is always defined
          source_id: data.source_id || ''
        };
        setCampaign(processedData);
      } else {
        console.error('No campaign data returned, but no error either');
        throw new Error('Campaign not found');
      }
    } catch (err) {
      console.error('Error in CampaignContext:', err);
      setError(err instanceof Error ? err : new Error('Failed to fetch campaign'));
      
      // Show a toast notification for the error
      toast({
        title: "Error Loading Campaign",
        description: err instanceof Error ? err.message : 'Failed to load campaign data',
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    console.log('CampaignContext mounted, fetching data for slug:', campaignSlug);
    fetchCampaign();
    
    // Log the current environment for debugging
    console.log('Environment:', {
      isProduction: process.env.NODE_ENV === 'production',
      isStaticPage,
      pathname: location.pathname,
      currentCampaignSlug
    });
  }, [campaignSlug, location.pathname]);

  return (
    <CampaignContext.Provider value={{ campaign, isLoading, error, refreshCampaign: fetchCampaign, campaignId }}>
      {children}
    </CampaignContext.Provider>
  );
};

export const useCampaign = (): CampaignContextType => {
  const context = useContext(CampaignContext);
  if (context === undefined) {
    throw new Error('useCampaign must be used within a CampaignProvider');
  }
  return context;
};
