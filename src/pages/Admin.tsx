
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
import { ExternalLink } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

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
        <h1 className="text-3xl font-bold mb-6">Admin Dashboard</h1>

        <Card className="mb-8">
          <CardHeader className="pb-2">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
              <div>
                <CardTitle className="text-xl">User Entries</CardTitle>
                <CardDescription>
                  Total entries: {entries.length}
                </CardDescription>
              </div>
              <div className="flex flex-col sm:flex-row gap-3">
                <Link to="/admin/webhooks">
                  <Button variant="outline" className="w-full sm:w-auto flex items-center gap-2">
                    <ExternalLink size={16} />
                    Webhook Status
                  </Button>
                </Link>
                <ManualSyncButton />
              </div>
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
