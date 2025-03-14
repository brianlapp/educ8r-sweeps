
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useAnalytics } from "@/hooks/use-analytics";
import { useCampaign } from "@/contexts/CampaignContext";

interface SubmitEntryResponse {
  success: boolean;
  data?: {
    referral_code: string;
    id: string;
    [key: string]: any;
  };
  isExisting?: boolean;
  message?: string;
  error?: string;
  details?: any;
}

const DISPOSABLE_EMAIL_DOMAINS = [
  'mailinator.com',
  'tempmail.com',
  'temp-mail.org',
  'guerrillamail.com',
  'sharklasers.com',
  'yopmail.com',
  'trashmail.com',
  'throwawaymail.com',
  'fakeinbox.com',
  'mailnesia.com',
  'getnada.com',
  'tempinbox.com',
  'dispostable.com',
  '10minutemail.com',
  'grr.la',
  'maildrop.cc',
  '33mail.com',
  'spamgourmet.com',
  'emailondeck.com',
  'mailforspam.com'
];

export const EntryForm = () => {
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: ""
  });
  const [emailError, setEmailError] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const referredBy = searchParams.get("ref");
  const analytics = useAnalytics();
  const { campaign, isLoading: campaignLoading } = useCampaign();

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setEmailError("Please enter a valid email address");
      return false;
    }

    const domain = email.split('@')[1].toLowerCase();
    if (DISPOSABLE_EMAIL_DOMAINS.includes(domain)) {
      setEmailError("Please use a non-disposable email address");
      return false;
    }

    setEmailError("");
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    
    analytics.trackEvent('form_submission_attempt', {
      form: 'entry_form',
      has_referral: !!referredBy,
      campaign_slug: campaign?.slug
    });
    
    if (!validateEmail(formData.email)) {
      analytics.trackEvent('form_validation_error', {
        form: 'entry_form',
        error_type: 'invalid_email'
      });
      return;
    }
    
    if (!agreed) {
      analytics.trackEvent('form_validation_error', {
        form: 'entry_form',
        error_type: 'terms_not_accepted'
      });
      
      toast({
        title: "Terms & Conditions",
        description: "Please agree to the terms and conditions to continue.",
        variant: "destructive"
      });
      return;
    }
    
    setIsSubmitting(true);
    
    toast({
      title: "Processing...",
      description: "Please wait while we process your entry.",
    });
    
    try {
      console.log("Submitting form with data:", {
        ...formData,
        referredBy,
        campaignId: campaign?.id
      });
      
      localStorage.setItem('referralCode', 'PROCESSING');
      localStorage.setItem('isReturningUser', 'false');
      localStorage.setItem('userEmail', formData.email);
      
      const response = await supabase.functions.invoke<SubmitEntryResponse>('submit-entry', {
        body: {
          ...formData,
          referredBy,
          campaignId: campaign?.id
        }
      });
      
      console.log("Edge function response:", response);
      
      if (response.error) {
        analytics.trackFormSubmission('entry_form', false);
        console.error("Supabase function error:", response.error);
        throw new Error(`Function error: ${response.error.message}`);
      }
      
      const data = response.data;
      
      if (!data || !data.success) {
        analytics.trackFormSubmission('entry_form', false);
        throw new Error(data?.error || 'Unknown error occurred');
      }
      
      if (data.data && data.data.referral_code) {
        const referralCode = data.data.referral_code;
        console.log('Got referral code from response:', referralCode);
        
        localStorage.setItem('referralCode', referralCode);
        localStorage.setItem('isReturningUser', data.isExisting ? 'true' : 'false');
        
        analytics.trackFormSubmission('entry_form', true);
        analytics.trackEvent('sweepstakes_entry', {
          is_returning: data.isExisting,
          has_referral: !!referredBy,
          campaign_slug: campaign?.slug
        });
        
        if (campaign) {
          navigate(`/${campaign.slug}/thank-you`);
        } else {
          navigate('/thank-you');
        }
      } else {
        console.error('Missing referral code in response:', data);
        analytics.trackEvent('api_response_error', {
          error_type: 'missing_referral_code'
        });
        throw new Error('Missing referral code in response');
      }
      
    } catch (error) {
      console.error('Error submitting entry:', error);
      analytics.trackEvent('form_submission_error', {
        form: 'entry_form',
        error: String(error)
      });
      
      setFormError(error instanceof Error ? error.message : String(error));
      
      toast({
        title: "Error",
        description: "There was an error submitting your entry. Please try again.",
        variant: "destructive"
      });
      setIsSubmitting(false);
    }
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const email = e.target.value;
    setFormData({ ...formData, email });
    
    if (email.length > 5) {
      validateEmail(email);
    } else {
      setEmailError("");
    }
  };

  const formTitle = campaign ? `Win ${campaign.prize_amount} for ${campaign.prize_name}!` : "Enter the Sweepstakes!";
  const buttonText = isSubmitting ? "Submitting..." : "Enter Now for FREE!";

  return (
    <form onSubmit={handleSubmit} className="space-y-4 w-full max-w-md mx-auto">
      {campaignLoading ? (
        <div className="text-center py-2">Loading campaign...</div>
      ) : (
        <>
          <h2 className="text-2xl md:text-3xl lg:text-4xl mb-3 text-center text-[#2C3E50] font-bold font-poppins line-clamp-2 min-h-[64px]">
            {campaign?.title}
          </h2>
          {campaign?.subtitle && (
            <p className="text-lg md:text-xl mb-6 text-center text-gray-600 font-poppins line-clamp-2">
              {campaign.subtitle}
            </p>
          )}
          
          {formError && (
            <Alert variant="destructive" className="mb-4">
              <AlertDescription className="font-poppins">{formError}</AlertDescription>
            </Alert>
          )}
          
          <Input
            type="text"
            placeholder="First Name"
            required
            value={formData.firstName}
            onChange={e => setFormData({ ...formData, firstName: e.target.value })}
            disabled={isSubmitting}
            className="w-full bg-slate-50 font-poppins"
          />
          <Input
            type="text"
            placeholder="Last Name"
            required
            value={formData.lastName}
            onChange={e => setFormData({ ...formData, lastName: e.target.value })}
            disabled={isSubmitting}
            className="w-full bg-slate-50 font-poppins"
          />
          <div className="space-y-2">
            <Input
              type="email"
              placeholder="Email Address"
              required
              value={formData.email}
              onChange={handleEmailChange}
              disabled={isSubmitting}
              className={`w-full bg-slate-50 font-poppins ${emailError ? "border-red-500" : ""}`}
            />
            {emailError && (
              <Alert variant="destructive" className="py-2 text-sm">
                <AlertDescription className="font-poppins">{emailError}</AlertDescription>
              </Alert>
            )}
          </div>
          <div className="flex items-start space-x-2">
            <Checkbox
              id="terms"
              checked={agreed}
              onCheckedChange={checked => setAgreed(checked as boolean)}
              disabled={isSubmitting}
            />
            <label
              htmlFor="terms"
              className="text-sm text-gray-600 leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 font-poppins"
            >
              By entering your information and clicking Enter to Win, you agree to our{" "}
              <a
                href="https://freeparentsearch.com/privacy"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                Privacy Policy
              </a>
              ,{" "}
              <a
                href="https://freeparentsearch.com/terms"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                Terms and Conditions
              </a>{" "}
              and our{" "}
              <Link
                to="/rules"
                className="text-primary hover:underline"
              >
                Rules and Regulations
              </Link>
              .
              Unsubscribe at any time.
            </label>
          </div>
          <Button
            type="submit"
            disabled={isSubmitting}
            className="w-full text-white font-medium rounded-lg transition-colors duration-200 bg-green-500 hover:bg-green-400 text-2xl py-[28px] font-poppins"
            onClick={() => {
              if (!isSubmitting) {
                analytics.trackButtonClick('entry_submit_button');
              }
            }}
          >
            {buttonText}
          </Button>
        </>
      )}
    </form>
  );
};
