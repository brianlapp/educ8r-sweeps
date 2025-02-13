
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useSearchParams, useNavigate } from "react-router-dom";

export const EntryForm = () => {
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
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
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const { data, error } = await supabase.functions.invoke('submit-entry', {
        body: {
          ...formData,
          referredBy
        }
      });

      if (error) throw error;

      if (data.isExisting) {
        // If the email already exists, we still have their referral code
        console.log('Using existing referral code:', data.referral_code);
        localStorage.setItem('referralCode', data.referral_code);
        
        toast({
          title: "Welcome Back!",
          description: "You've already entered the sweepstakes. We'll take you to your referral page.",
        });
      } else {
        // New entry
        console.log('Saving new referral code:', data.referral_code);
        localStorage.setItem('referralCode', data.referral_code);
        
        toast({
          title: "Success!",
          description: "Your entry has been submitted successfully.",
        });
      }

      // Redirect to thank you page in both cases
      navigate('/thank-you');

    } catch (error) {
      console.error('Error submitting entry:', error);
      toast({
        title: "Error",
        description: "There was an error submitting your entry. Please try again.",
        variant: "destructive",
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
        onChange={(e) =>
          setFormData({ ...formData, firstName: e.target.value })
        }
        className="w-full"
        disabled={isSubmitting}
      />
      <Input
        type="text"
        placeholder="Last Name"
        required
        value={formData.lastName}
        onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
        className="w-full"
        disabled={isSubmitting}
      />
      <Input
        type="email"
        placeholder="Email Address"
        required
        value={formData.email}
        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
        className="w-full"
        disabled={isSubmitting}
      />
      <div className="flex items-start space-x-2">
        <Checkbox
          id="terms"
          checked={agreed}
          onCheckedChange={(checked) => setAgreed(checked as boolean)}
          disabled={isSubmitting}
        />
        <label
          htmlFor="terms"
          className="text-sm text-gray-600 leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
        >
          By entering your information and clicking Enter to Win, you agree to our{" "}
          <a href="#" className="text-primary hover:underline">
            Privacy Policy
          </a>
          ,{" "}
          <a href="#" className="text-primary hover:underline">
            Terms and Conditions
          </a>{" "}
          and understand that we will be sending you our newsletters by email.
          Unsubscribe at any time.
        </label>
      </div>
      <Button
        type="submit"
        className="w-full bg-primary hover:bg-primary-hover text-white font-medium py-3 rounded-lg transition-colors duration-200"
        disabled={isSubmitting}
      >
        {isSubmitting ? "Submitting..." : "Enter to Win! →"}
      </Button>
    </form>
  );
};
