
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useSearchParams, useNavigate, Link } from "react-router-dom";

export const EntryForm = () => {
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: ""
  });
  const [agreed, setAgreed] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const referredBy = searchParams.get("ref");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agreed) {
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
      
      // Start the form submission
      const submissionPromise = supabase.functions.invoke('submit-entry', {
        body: {
          ...formData,
          referredBy
        }
      });
      
      // Set a timeout for waiting
      const timeoutPromise = new Promise((resolve) => {
        setTimeout(() => resolve({ timedOut: true }), 3000);
      });
      
      // Race between API response and timeout
      const result = await Promise.race([
        submissionPromise,
        timeoutPromise
      ]);
      
      // If we got a real response (not timeout)
      if ('data' in result && !('timedOut' in result)) {
        const response = result.data;
        
        if (response && response.data && response.data.referral_code) {
          const referralCode = response.data.referral_code;
          console.log('Got referral code from response:', referralCode);
          
          // Save the referral code to localStorage
          localStorage.setItem('referralCode', referralCode);
          
          // Set flag for returning user status
          localStorage.setItem('isReturningUser', response.isExisting ? 'true' : 'false');
        } else {
          console.error('Missing referral code in response:', response);
        }
      }
      
      // Navigate to thank you page (after max 3s or when we get the response)
      navigate('/thank-you');
      
      // If we redirected before getting response, still finish processing in background
      if (!('data' in result) || ('timedOut' in result)) {
        submissionPromise.then(({ data: response, error }) => {
          if (error) throw error;
          
          if (response && response.data && response.data.referral_code) {
            const referralCode = response.data.referral_code;
            console.log('Got referral code from response (after redirect):', referralCode);
            
            // Update the referral code in localStorage
            localStorage.setItem('referralCode', referralCode);
            localStorage.setItem('isReturningUser', response.isExisting ? 'true' : 'false');
          }
        }).catch(err => {
          console.error('Error processing submission in background:', err);
        });
      }
    } catch (error) {
      console.error('Error submitting entry:', error);
      toast({
        title: "Error",
        description: "There was an error submitting your entry. Please try again.",
        variant: "destructive"
      });
      setIsSubmitting(false);
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
      <Input
        type="email"
        placeholder="Email Address"
        required
        value={formData.email}
        onChange={e => setFormData({ ...formData, email: e.target.value })}
        disabled={isSubmitting}
        className="w-full bg-slate-50"
      />
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
      >
        {isSubmitting ? "Submitting..." : "Enter Now for FREE!"}
      </Button>
    </form>
  );
};
