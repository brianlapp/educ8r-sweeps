
import React from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Link } from "react-router-dom";

interface TermsCheckboxProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
}

export const TermsCheckbox = ({
  checked,
  onCheckedChange,
  disabled = false,
}: TermsCheckboxProps) => {
  return (
    <div className="flex items-start space-x-2">
      <Checkbox
        id="terms"
        checked={checked}
        onCheckedChange={(checked) => onCheckedChange(checked as boolean)}
        disabled={disabled}
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
        <Link to="/rules" className="text-primary hover:underline">
          Rules and Regulations
        </Link>
        . Unsubscribe at any time.
      </label>
    </div>
  );
};
