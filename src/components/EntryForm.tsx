
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
    try {
      const { data: response, error } = await supabase.functions.invoke('submit-entry', {
        body: {
          ...formData,
          referredBy,
          forceUpdate: true // Add this flag to force update for existing users
        }
      });
      
      if (error) throw error;

      // Always use the referral code from the response
      if (response && response.data && response.data.referral_code) {
        const referralCode = response.data.referral_code;
        console.log('Got referral code from response:', referralCode);
        
        // Save the referral code to localStorage
        localStorage.setItem('referralCode', referralCode);
        
        // Set flag for returning user status
        localStorage.setItem('isReturningUser', response.isExisting ? 'true' : 'false');
        
        // Show appropriate toast based on whether the user is new or existing
        if (response.isExisting) {
          toast({
            title: "Welcome Back!",
            description: "You've been re-entered in the sweepstakes! Check your email for confirmation."
          });
        } else {
          toast({
            title: "Success!",
            description: response.message || "Your entry has been submitted successfully."
          });
        }

        navigate('/thank-you');
      } else {
        console.error('Missing referral code in response:', response);
        throw new Error('Missing referral code in response');
      }
    } catch (error) {
      console.error('Error submitting entry:', error);
      toast({
        title: "Error",
        description: "There was an error submitting your entry. Please try again.",
        variant: "destructive"
      });
    } finally {
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
