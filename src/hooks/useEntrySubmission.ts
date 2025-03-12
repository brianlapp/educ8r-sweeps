import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { useAnalytics } from "@/hooks/use-analytics";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

interface FormData {
  firstName: string;
  lastName: string;
  email: string;
}

interface SubmitEntryResponse {
  success: boolean;
  data: {
    referral_code: string;
    id: string;
    [key: string]: any;
  };
  isExisting: boolean;
  message: string;
}

export const useEntrySubmission = (referredBy: string | null, campaignId?: string) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();
  const analytics = useAnalytics();

  const submitEntry = async (formData: FormData, agreed: boolean) => {
    console.log("Starting entry submission process", { 
      hasReferral: !!referredBy, 
      campaignId 
    });
    
    // Track form submission attempt
    analytics.trackEvent('form_submission_attempt', {
      form: 'entry_form',
      has_referral: !!referredBy,
      campaign_id: campaignId || 'default'
    });
    
    if (!agreed) {
      analytics.trackEvent('form_validation_error', {
        form: 'entry_form',
        error_type: 'terms_not_accepted',
        campaign_id: campaignId || 'default'
      });
      
      toast({
        title: "Terms & Conditions",
        description: "Please agree to the terms and conditions to continue.",
        variant: "destructive"
      });
      return false;
    }
    
    setIsSubmitting(true);
    
    // Show immediate feedback toast
    toast({
      title: "Processing...",
      description: "Please wait while we process your entry.",
    });
    
    try {
      console.log("Calling submit-entry function with data:", {
        email: formData.email,
        firstName: formData.firstName,
        referredBy,
        campaignId
      });
      
      // Set processing state in localStorage
      localStorage.setItem('referralCode', 'PROCESSING');
      localStorage.setItem('isReturningUser', 'false');
      // Store the user's email for verification purposes
      localStorage.setItem('userEmail', formData.email);
      
      // Start the form submission
      const { data, error } = await supabase.functions.invoke<SubmitEntryResponse>('submit-entry', {
        body: {
          ...formData,
          referredBy,
          campaignId
        }
      });
      
      if (error) {
        analytics.trackFormSubmission('entry_form', false);
        throw error;
      }
      
      if (data && data.data && data.data.referral_code) {
        const referralCode = data.data.referral_code;
        console.log('Got referral code from response:', referralCode);
        
        // Save the referral code to localStorage
        localStorage.setItem('referralCode', referralCode);
        
        // Set flag for returning user status
        localStorage.setItem('isReturningUser', data.isExisting ? 'true' : 'false');
        
        // Track successful form submission
        analytics.trackFormSubmission('entry_form', true);
        analytics.trackEvent('sweepstakes_entry', {
          is_returning: data.isExisting,
          has_referral: !!referredBy,
          campaign_id: campaignId || 'default'
        });
        
        try {
          const notificationResponse = await supabase.functions.invoke('send-referral-notification', {
            body: {
              email: formData.email,
              firstName: formData.firstName,
              referralCode: referralCode,
              campaignId
            }
          });
          
          console.log('BeehiiV notification response:', notificationResponse);
        } catch (notificationError) {
          console.error('Failed to send BeehiiV notification:', notificationError);
          // Continue with the flow even if notification fails
        }
      } else {
        console.error('Missing referral code in response:', data);
        analytics.trackEvent('api_response_error', {
          error_type: 'missing_referral_code',
          campaign_id: campaignId || 'default'
        });
      }
      
      // Navigate to thank you page
      navigate('/thank-you');
      return true;
      
    } catch (error) {
      console.error('Detailed submission error:', {
        message: error.message,
        type: error.type,
        status: error.status
      });
      analytics.trackEvent('form_submission_error', {
        form: 'entry_form',
        error: String(error),
        campaign_id: campaignId || 'default'
      });
      
      toast({
        title: "Error",
        description: "There was an error submitting your entry. Please try again.",
        variant: "destructive"
      });
      setIsSubmitting(false);
      return false;
    }
  };

  return {
    isSubmitting,
    submitEntry
  };
};
