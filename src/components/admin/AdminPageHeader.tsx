
import React, { ReactNode } from "react";

interface AdminPageHeaderProps {
  title: string;
  description?: string;
  actions?: ReactNode;
}

export const AdminPageHeader = ({
  title,
  description,
  actions,
}: AdminPageHeaderProps) => {
  return (
    <div className="mb-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">{title}</h1>
        {actions}
      </div>
      {description && (
        <p className="mt-2 text-muted-foreground">{description}</p>
      )}
    </div>
  );
};
