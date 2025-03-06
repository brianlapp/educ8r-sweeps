
import React from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

interface BackToAdminButtonProps {
  to?: string;
  label?: string;
}

export const BackToAdminButton = ({
  to = "/admin",
  label = "Back to Admin",
}: BackToAdminButtonProps) => {
  return (
    <Link to={to}>
      <Button variant="outline" size="sm" className="flex items-center gap-1">
        <ArrowLeft size={16} />
        {label}
      </Button>
    </Link>
  );
};
