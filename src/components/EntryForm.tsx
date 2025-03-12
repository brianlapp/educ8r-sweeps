import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useAnalytics } from "@/hooks/use-analytics";

// Define an interface for the API response structure
interface SubmitEntryResponse {
  success: boolean;
  data: {
    referral_code: string;
    id: string;
    [key: string]: any; // For other properties that might be present
  };
  isExisting: boolean;
  message: string;
}

// Interface for the EntryForm props
interface EntryFormProps {
  campaignId?: string;
}

// Common disposable email domains
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

export const EntryForm = ({ campaignId }: EntryFormProps) => {
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: ""
  });
  const [emailError, setEmailError] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const referredBy = searchParams.get("ref");
  const analytics = useAnalytics();

  const validateEmail = (email: string): boolean => {
    // Basic regex check for email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setEmailError("Please enter a valid email address");
      return false;
    }

    // Check for disposable email domains
    const domain = email.split('@')[1].toLowerCase();
    if (DISPOSABLE_EMAIL_DOMAINS.includes(domain)) {
      setEmailError("Please use a non-disposable email address");
      return false;
    }

    // Clear error if validation passes
    setEmailError("");
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Track form submission attempt
    analytics.trackEvent('form_submission_attempt', {
      form: 'entry_form',
      has_referral: !!referredBy,
      campaign_id: campaignId || 'default'
    });
    
    // Validate email before submission
    if (!validateEmail(formData.email)) {
      analytics.trackEvent('form_validation_error', {
        form: 'entry_form',
        error_type: 'invalid_email',
        campaign_id: campaignId || 'default'
      });
      return;
    }
    
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
      return;
    }
    
    setIsSubmitting(true);
    
    // Show immediate feedback toast
    toast({
      title: "Processing...",
      description: "Please wait while we process your entry.",
    });
    
    try {
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
          campaignId // Pass the campaign ID to the edge function
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
      } else {
        console.error('Missing referral code in response:', data);
        analytics.trackEvent('api_response_error', {
          error_type: 'missing_referral_code',
          campaign_id: campaignId || 'default'
        });
      }
      
      // Navigate to thank you page
      navigate('/thank-you');
      
    } catch (error) {
      console.error('Error submitting entry:', error);
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
    }
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const email = e.target.value;
    setFormData({ ...formData, email });
    
    // Only validate if there is some content (don't show errors while typing from scratch)
    if (email.length > 5) {
      validateEmail(email);
    } else {
      setEmailError("");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 w-full max-w-md mx-auto">
      <Input
        type="text"
        placeholder="First Name"
        required
        value={formData.firstName}
        onChange={e => setFormData({ ...formData, firstName: e.target.value })}
        disabled={isSubmitting}
        className="w-full bg-slate-50"
      />
      <Input
        type="text"
        placeholder="Last Name"
        required
        value={formData.lastName}
        onChange={e => setFormData({ ...formData, lastName: e.target.value })}
        disabled={isSubmitting}
        className="w-full bg-slate-50"
      />
      <div className="space-y-2">
        <Input
          type="email"
          placeholder="Email Address"
          required
          value={formData.email}
          onChange={handleEmailChange}
          disabled={isSubmitting}
          className={`w-full bg-slate-50 ${emailError ? "border-red-500" : ""}`}
        />
        {emailError && (
          <Alert variant="destructive" className="py-2 text-sm">
            <AlertDescription>{emailError}</AlertDescription>
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
          className="text-sm text-gray-600 leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
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
        className="w-full text-white font-medium rounded-lg transition-colors duration-200 bg-green-500 hover:bg-green-400 text-2xl py-[28px]"
        onClick={() => {
          if (!isSubmitting) {
            analytics.trackButtonClick('entry_submit_button');
          }
        }}
      >
        {isSubmitting ? "Submitting..." : "Enter Now for FREE!"}
      </Button>
    </form>
  );
};
