
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";

export const EntryForm = () => {
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
  });
  const [agreed, setAgreed] = useState(false);
  const { toast } = useToast();

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

    // TODO: Implement form submission
    console.log("Form submitted:", formData);

    // Redirect to thank you page
    window.location.href = "/thank-you";
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
      />
      <Input
        type="text"
        placeholder="Last Name"
        required
        value={formData.lastName}
        onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
        className="w-full"
      />
      <Input
        type="email"
        placeholder="Email Address"
        required
        value={formData.email}
        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
        className="w-full"
      />
      <div className="flex items-start space-x-2">
        <Checkbox
          id="terms"
          checked={agreed}
          onCheckedChange={(checked) => setAgreed(checked as boolean)}
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
      >
        Enter to Win! →
      </Button>
    </form>
  );
};
