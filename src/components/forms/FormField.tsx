
import React from "react";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface FormFieldProps {
  type: string;
  placeholder: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  disabled?: boolean;
  required?: boolean;
  error?: string;
  className?: string;
}

export const FormField = ({
  type,
  placeholder,
  value,
  onChange,
  disabled = false,
  required = false,
  error,
  className = "w-full bg-slate-50",
}: FormFieldProps) => {
  return (
    <div className="space-y-2">
      <Input
        type={type}
        placeholder={placeholder}
        required={required}
        value={value}
        onChange={onChange}
        disabled={disabled}
        className={`${className} ${error ? "border-red-500" : ""}`}
      />
      {error && (
        <Alert variant="destructive" className="py-2 text-sm">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
    </div>
  );
};
