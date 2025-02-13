
import { useState, useEffect } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { ArrowUpDown } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

type SortField = "created_at" | "referral_count" | "total_entries";
type SortOrder = "asc" | "desc";

interface Entry {
  email: string;
  first_name: string;
  last_name: string;
  entry_count: number;
  referral_count: number;
  total_entries: number;
  referral_code: string | null;
  created_at: string;
}

export default function Admin() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [sortField, setSortField] = useState<SortField>("created_at");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");
  const [isLoading, setIsLoading] = useState(true);
  const [isTestingWebhook, setIsTestingWebhook] = useState(false);
  const { toast } = useToast();

  const fetchEntries = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('entries')
        .select('*')
        .order(sortField, { ascending: sortOrder === 'asc' });

      if (error) {
        console.error('Error fetching entries:', error);
        throw error;
      }
      
      console.log('Fetched entries:', data);
      setEntries(data || []);
    } catch (error) {
      console.error('Error in fetchEntries:', error);
      toast({
        variant: "destructive",
        title: "Error fetching entries",
        description: error.message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchEntries();
  }, [sortField, sortOrder]);

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  const testWebhook = async () => {
    setIsTestingWebhook(true);
    try {
      // Instead of using fetch directly, use supabase.functions.invoke
      const { data, error } = await supabase.functions.invoke('test-webhook', {
        method: 'POST',
      });

      console.log('Webhook test response:', data);

      if (error) {
        throw error;
      }

      if (data.success) {
        toast({
          title: "Webhook Test Successful",
          description: "The test webhook was triggered successfully. Refreshing data...",
        });
        // Immediately refresh the entries to see the update
        await fetchEntries();
      } else {
        throw new Error(data.error || 'Unknown error occurred');
      }
    } catch (error) {
      console.error('Error testing webhook:', error);
      toast({
        variant: "destructive",
        title: "Webhook Test Failed",
        description: error.message || "There was an error testing the webhook.",
      });
    } finally {
      setIsTestingWebhook(false);
    }
  };

  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Admin Dashboard</h1>
        <Button 
          onClick={testWebhook} 
          disabled={isTestingWebhook}
        >
          {isTestingWebhook ? "Testing..." : "Test Referral Webhook"}
        </Button>
      </div>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Email</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Base Entry</TableHead>
              <TableHead>
                <Button
                  variant="ghost"
                  onClick={() => toggleSort('referral_count')}
                  className="hover:bg-transparent"
                >
                  Referrals
                  <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
              </TableHead>
              <TableHead>
                <Button
                  variant="ghost"
                  onClick={() => toggleSort('total_entries')}
                  className="hover:bg-transparent"
                >
                  Total Entries
                  <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
              </TableHead>
              <TableHead>Referral ID</TableHead>
              <TableHead>
                <Button
                  variant="ghost"
                  onClick={() => toggleSort('created_at')}
                  className="hover:bg-transparent"
                >
                  Joined
                  <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-4">
                  Loading...
                </TableCell>
              </TableRow>
            ) : entries.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-4">
                  No entries found
                </TableCell>
              </TableRow>
            ) : (
              entries.map((entry) => (
                <TableRow key={entry.email}>
                  <TableCell>{entry.email}</TableCell>
                  <TableCell>{`${entry.first_name} ${entry.last_name}`}</TableCell>
                  <TableCell>{entry.entry_count}</TableCell>
                  <TableCell>{entry.referral_count}</TableCell>
                  <TableCell>{entry.total_entries}</TableCell>
                  <TableCell>{entry.referral_code || 'N/A'}</TableCell>
                  <TableCell>
                    {format(new Date(entry.created_at), 'yyyy-MM-dd')}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
