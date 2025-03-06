
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
import { ExternalLink, Clock, Users, Trash } from "lucide-react";
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

        <Card className="mb-8 overflow-hidden border border-gray-100">
          <CardHeader className="bg-white py-4 px-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
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
              
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Clock className="h-3.5 w-3.5 text-gray-400" />
                <span>Last sync: {new Date().toLocaleDateString()}</span>
              </div>
              
              <div className="flex items-center gap-3">
                <Link to="/admin/webhooks">
                  <Button variant="outline" size="sm" className="h-9 px-4 border-gray-200 hover:bg-gray-50 hover:text-gray-700 text-gray-600">
                    <ExternalLink size={15} className="mr-1.5" />
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
