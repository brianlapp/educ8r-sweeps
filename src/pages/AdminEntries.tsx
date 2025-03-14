
import { Helmet } from 'react-helmet-async';
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import { Tables } from "@/integrations/supabase/types";
import { ManualSyncButton } from "@/components/ManualSyncButton";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Trash2, Users, AlertCircle, Loader2 } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { BackToAdminButton } from "@/components/admin/BackToAdminButton";

const AdminEntries = () => {
  const [entries, setEntries] = useState<Tables<'entries'>[]>([]);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { isLoading, error, refetch } = useQuery({
    queryKey: ['entries'],
    queryFn: async () => {
      console.log("[AdminEntriesPage] Fetching entries from Supabase...");
      const { data, error } = await supabase
        .from('entries')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error("[AdminEntriesPage] Error fetching entries:", error);
        throw error;
      }

      if (data) {
        console.log(`[AdminEntriesPage] Retrieved ${data.length} entries from Supabase`);
        setEntries(data);
      }
      
      return data;
    },
    refetchOnMount: 'always'
  });

  useEffect(() => {
    if (error) {
      toast({
        title: "Error",
        description: "Failed to fetch entries. Please try again.",
        variant: "destructive",
      });
    }
  }, [error, toast]);

  const handleDeleteEntry = async (id: string) => {
    try {
      console.log("[AdminEntriesPage] Starting delete process for entry ID:", id);
      setIsDeleting(id);
      setDeleteError(null);
      
      // First, double-check that the entry exists
      const { data: checkData, error: checkError } = await supabase
        .from('entries')
        .select('id')
        .eq('id', id)
        .single();
        
      if (checkError) {
        console.error("[AdminEntriesPage] Error verifying entry exists:", checkError);
        throw new Error("Could not verify entry exists");
      }
      
      if (!checkData) {
        console.warn("[AdminEntriesPage] Entry already deleted or doesn't exist:", id);
        // Update local state
        setEntries(prev => prev.filter(entry => entry.id !== id));
        return;
      }
      
      console.log("[AdminEntriesPage] Confirmed entry exists, proceeding with deletion");
      
      // Clear React Query cache for this entry first
      queryClient.removeQueries({queryKey: ['entries', id]});
      
      // Update UI optimistically
      setEntries(prev => prev.filter(entry => entry.id !== id));
      
      // Call the secure-delete-entry Edge Function directly instead of using RPC
      const response = await supabase.functions.invoke('secure-delete-entry', {
        body: { id }
      });
      
      if (response.error) {
        console.error("[AdminEntriesPage] Edge function delete error:", response.error);
        throw new Error(response.error.message || "Error deleting entry");
      }
      
      if (!response.data.success) {
        console.error("[AdminEntriesPage] Delete operation reported failure:", response.data);
        throw new Error(response.data.error || "Server reported delete failure");
      }
      
      console.log("[AdminEntriesPage] Entry successfully deleted from database, ID:", id);
      
      // Update the cache to reflect the deletion
      await queryClient.invalidateQueries({queryKey: ['entries']});
      
      toast({
        title: "Entry deleted",
        description: "The entry has been successfully deleted from the database.",
      });
      
    } catch (error) {
      console.error("[AdminEntriesPage] Error in delete process:", error);
      
      // Set error state
      setDeleteError(error.message || "Failed to delete entry");
      
      // Revert optimistic UI update and refresh data from server
      await refetch();
      
      toast({
        title: "Error",
        description: "Failed to delete entry. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500 mr-2" />
        <span>Loading entries...</span>
      </div>
    );
  }

  const columns = [
    { header: "First Name", accessorKey: "first_name" },
    { header: "Last Name", accessorKey: "last_name" },
    { header: "Email", accessorKey: "email" },
    { header: "Referral Code", accessorKey: "referral_code" },
    { header: "Referral Count", accessorKey: "referral_count" },
    { header: "Entry Count", accessorKey: "entry_count" },
    { header: "Total Entries", accessorKey: "total_entries" },
    {
      header: "Created At",
      accessorKey: "created_at",
      cell: ({ row }) => {
        const date = new Date(row.getValue("created_at"));
        return date.toLocaleDateString() + " " + date.toLocaleTimeString();
      },
    },
    {
      header: "Actions",
      accessorKey: "actions",
      cell: ({ row }) => (
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50"
              disabled={isDeleting === row.original.id}
            >
              {isDeleting === row.original.id ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Trash2 size={16} />
              )}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Entry</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete this entry? This action cannot be undone.
                {row.original.referral_count > 0 && (
                  <div className="mt-2 p-2 bg-amber-50 text-amber-800 rounded-md">
                    <span className="font-medium">Warning:</span> This entry has {row.original.referral_count} referrals. 
                    Those entries will remain, but their referral attribution will be removed.
                  </div>
                )}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction 
                onClick={() => handleDeleteEntry(row.original.id)}
                className="bg-red-500 hover:bg-red-600"
                disabled={isDeleting === row.original.id}
              >
                {isDeleting === row.original.id ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  "Delete"
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      ),
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <Helmet>
        <title>User Entries | Admin Dashboard</title>
      </Helmet>
      <div className="container mx-auto py-12">
        <AdminPageHeader 
          title="User Entries" 
          description="View and manage all sweepstakes entries"
          actions={<BackToAdminButton />}
        />

        {deleteError && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>
              {deleteError}
            </AlertDescription>
          </Alert>
        )}

        <Card className="mb-8 overflow-hidden border border-gray-100">
          <CardHeader className="bg-white py-4 px-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="bg-blue-50 p-2 rounded-full">
                  <Users className="h-5 w-5 text-blue-500" />
                </div>
                <div>
                  <CardTitle className="text-xl font-semibold">User Entries</CardTitle>
                  <CardDescription className="text-gray-500">
                    Total entries: {entries.length}
                  </CardDescription>
                </div>
              </div>
              
              <ManualSyncButton />
            </div>
          </CardHeader>
        </Card>

        {entries && entries.length > 0 ? (
          <div className="rounded-md border bg-white shadow">
            <Table>
              <TableHeader>
                <TableRow>
                  {columns.map((column) => (
                    <TableHead key={column.accessorKey}>
                      {column.header}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {entries.map((entry) => (
                  <TableRow key={entry.id}>
                    {columns.map((column) => (
                      <TableCell key={`${entry.id}-${column.accessorKey}`}>
                        {column.cell && column.accessorKey !== "actions"
                          ? column.cell({ row: { getValue: () => entry[column.accessorKey], original: entry } })
                          : column.accessorKey === "actions"
                          ? column.cell({ row: { original: entry } })
                          : entry[column.accessorKey]}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="text-center bg-white p-8 rounded-md shadow">No entries found.</div>
        )}
      </div>
    </div>
  );
};

export default AdminEntries;
