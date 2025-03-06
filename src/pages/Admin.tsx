
import { Helmet } from 'react-helmet-async';
import { useQuery } from "@tanstack/react-query";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import { Tables } from "@/integrations/supabase/types";
import { ManualSyncButton } from "@/components/ManualSyncButton";
import { Link } from 'react-router-dom';

const Admin = () => {
  const [entries, setEntries] = useState<Tables<'entries'>[]>([]);
  const { toast } = useToast();

  const { isLoading, error } = useQuery({
    queryKey: ['entries'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('entries')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error("Error fetching entries:", error);
        throw error;
      }

      if (data) {
        setEntries(data);
      }
      
      return data;
    }
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

  if (isLoading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  const columns = [
    {
      header: "First Name",
      accessorKey: "first_name",
    },
    {
      header: "Last Name",
      accessorKey: "last_name",
    },
    {
      header: "Email",
      accessorKey: "email",
    },
    {
      header: "Referral Code",
      accessorKey: "referral_code",
    },
    {
      header: "Referral Count",
      accessorKey: "referral_count",
    },
    {
      header: "Entry Count",
      accessorKey: "entry_count",
    },
    {
      header: "Total Entries",
      accessorKey: "total_entries",
    },
    {
      header: "Created At",
      accessorKey: "created_at",
      cell: ({ row }) => {
        const date = new Date(row.getValue("created_at"));
        return date.toLocaleDateString() + " " + date.toLocaleTimeString();
      },
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <Helmet>
        <title>Admin Dashboard | Educ8r Sweepstakes</title>
      </Helmet>
      <div className="container mx-auto py-12">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">Admin Dashboard</h1>
          <div className="space-x-4 flex">
            <Link to="/admin/webhooks">
              <Button variant="outline">Webhook Status</Button>
            </Link>
            <ManualSyncButton />
          </div>
        </div>

        <div className="mb-8">
          <div className="bg-white p-4 rounded-md shadow">
            <h2 className="text-xl font-semibold mb-2">User Entries</h2>
            <p className="text-muted-foreground mb-4">
              Total entries: {entries.length}
            </p>
          </div>
        </div>

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
                        {column.cell
                          ? column.cell({ row: { getValue: () => entry[column.accessorKey] } })
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

export default Admin;
