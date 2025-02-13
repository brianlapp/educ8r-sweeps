
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

type SortField = "created_at" | "referral_count";
type SortOrder = "asc" | "desc";

interface Entry {
  email: string;
  first_name: string;
  last_name: string;
  entry_count: number;
  referral_count: number;
  referral_code: string | null;
  created_at: string;
}

export default function Admin() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [sortField, setSortField] = useState<SortField>("created_at");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");
  const [isLoading, setIsLoading] = useState(true);

  const fetchEntries = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('entry_stats')
        .select('*')
        .order(sortField, { ascending: sortOrder === 'asc' });

      if (error) {
        console.error('Error fetching entries:', error);
        throw error;
      }
      
      console.log('Fetched entries:', data); // Debug log
      setEntries(data || []);
    } catch (error) {
      console.error('Error in fetchEntries:', error);
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

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-2xl font-bold mb-6">Admin Dashboard</h1>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Email</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Entries</TableHead>
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
                <TableCell colSpan={6} className="text-center py-4">
                  Loading...
                </TableCell>
              </TableRow>
            ) : entries.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-4">
                  No entries found
                </TableCell>
              </TableRow>
            ) : (
              entries.map((entry) => (
                <TableRow key={entry.email}>
                  <TableCell>{entry.email}</TableCell>
                  <TableCell>{`${entry.first_name} ${entry.last_name}`}</TableCell>
                  <TableCell>{entry.entry_count || 1}</TableCell>
                  <TableCell>{entry.referral_count || 0}</TableCell>
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
