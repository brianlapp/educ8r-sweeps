
import { Helmet } from 'react-helmet-async';
import { useEffect } from "react";
import { Link } from 'react-router-dom';
import { ExternalLink } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { EntriesSummaryCard } from "@/components/admin/EntriesSummaryCard";
import { EntriesTable } from "@/components/admin/EntriesTable";
import { useEntriesData } from "@/hooks/useEntriesData";

const Admin = () => {
  const { entries, isLoading, error, isDeleting, handleDeleteEntry } = useEntriesData();
  const { toast } = useToast();

  useEffect(() => {
    if (error) {
      toast({
        title: "Error",
        description: "Failed to fetch entries. Please try again.",
        variant: "destructive",
      });
    }
  }, [error, toast]);

  if (isLoading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Helmet>
        <title>Admin Dashboard | Educ8r Sweepstakes</title>
      </Helmet>
      <div className="container mx-auto py-12">
        <AdminPageHeader 
          title="Admin Dashboard"
          actions={
            <Link to="/admin/webhooks" className="text-sm flex items-center text-blue-500 hover:text-blue-700">
              <ExternalLink size={14} className="mr-1.5" />
              Webhook Status
            </Link>
          }
        />

        <EntriesSummaryCard entriesCount={entries?.length || 0} />

        <EntriesTable 
          entries={entries || []}
          onDeleteEntry={handleDeleteEntry}
          isDeleting={isDeleting}
        />
      </div>
    </div>
  );
};

export default Admin;
