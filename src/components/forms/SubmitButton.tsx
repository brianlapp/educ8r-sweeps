
import React from "react";
import { Button } from "@/components/ui/button";
import { useAnalytics } from "@/hooks/use-analytics";

interface SubmitButtonProps {
  isSubmitting: boolean;
  onClick?: () => void;
  className?: string;
}

export const SubmitButton = ({
  isSubmitting,
  onClick,
  className = "w-full text-white font-medium rounded-lg transition-colors duration-200 bg-green-500 hover:bg-green-400 text-2xl py-[28px]",
}: SubmitButtonProps) => {
  const analytics = useAnalytics();

  const handleClick = () => {
    if (!isSubmitting && onClick) {
      analytics.trackButtonClick('entry_submit_button');
      onClick();
    }
  };

  return (
    <Button
      type="submit"
      disabled={isSubmitting}
      className={className}
      onClick={handleClick}
    >
      {isSubmitting ? "Submitting..." : "Enter Now for FREE!"}
    </Button>
  );
};
