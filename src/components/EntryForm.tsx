
import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { FormField } from "@/components/forms/FormField";
import { TermsCheckbox } from "@/components/forms/TermsCheckbox";
import { SubmitButton } from "@/components/forms/SubmitButton";
import { validateEmail } from "@/utils/formValidation";
import { useEntrySubmission } from "@/hooks/useEntrySubmission";

// Interface for the EntryForm props
interface EntryFormProps {
  campaignId?: string;
}

export const EntryForm = ({ campaignId }: EntryFormProps) => {
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: ""
  });
  const [emailError, setEmailError] = useState("");
  const [agreed, setAgreed] = useState(false);
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const referredBy = searchParams.get("ref");
  
  const { isSubmitting, submitEntry } = useEntrySubmission(referredBy, campaignId);

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const email = e.target.value;
    setFormData({ ...formData, email });
    
    // Only validate if there is some content (don't show errors while typing from scratch)
    if (email.length > 5) {
      const validation = validateEmail(email);
      setEmailError(validation.isValid ? "" : validation.errorMessage);
    } else {
      setEmailError("");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate email before submission
    const validation = validateEmail(formData.email);
    if (!validation.isValid) {
      setEmailError(validation.errorMessage);
      return;
    }
    
    await submitEntry(formData, agreed);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 w-full max-w-md mx-auto">
      <FormField
        type="text"
        placeholder="First Name"
        required
        value={formData.firstName}
        onChange={e => setFormData({ ...formData, firstName: e.target.value })}
        disabled={isSubmitting}
      />
      <FormField
        type="text"
        placeholder="Last Name"
        required
        value={formData.lastName}
        onChange={e => setFormData({ ...formData, lastName: e.target.value })}
        disabled={isSubmitting}
      />
      <FormField
        type="email"
        placeholder="Email Address"
        required
        value={formData.email}
        onChange={handleEmailChange}
        disabled={isSubmitting}
        error={emailError}
      />
      <TermsCheckbox
        checked={agreed}
        onCheckedChange={setAgreed}
        disabled={isSubmitting}
      />
      <SubmitButton isSubmitting={isSubmitting} />
    </form>
  );
};
