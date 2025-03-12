
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Tables } from "@/integrations/supabase/types";

export const useEntriesData = () => {
  const [entries, setEntries] = useState<Tables<'entries'>[]>([]);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { isLoading, error, refetch } = useQuery({
    queryKey: ['entries'],
    queryFn: async () => {
      console.log("[AdminPage] Fetching entries from Supabase...");
      const { data, error } = await supabase
        .from('entries')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error("[AdminPage] Error fetching entries:", error);
        throw error;
      }

      if (data) {
        console.log(`[AdminPage] Retrieved ${data.length} entries from Supabase`);
        setEntries(data);
      }
      
      return data;
    },
    // Force a refetch on component mount to ensure we have the latest data
    refetchOnMount: 'always'
  });

  const handleDeleteEntry = async (id: string) => {
    try {
      console.log("[AdminPage] Starting delete process for entry ID:", id);
      setIsDeleting(id);
      
      // First, double-check that the entry exists
      const { data: checkData, error: checkError } = await supabase
        .from('entries')
        .select('id')
        .eq('id', id)
        .single();
        
      if (checkError) {
        console.error("[AdminPage] Error verifying entry exists:", checkError);
        throw new Error("Could not verify entry exists");
      }
      
      if (!checkData) {
        console.warn("[AdminPage] Entry already deleted or doesn't exist:", id);
        // Update local state
        setEntries(prev => prev.filter(entry => entry.id !== id));
        return;
      }
      
      console.log("[AdminPage] Confirmed entry exists, proceeding with deletion");
      
      // Clear React Query cache for this entry first
      queryClient.removeQueries({queryKey: ['entries', id]});
      
      // Update UI optimistically
      setEntries(prev => prev.filter(entry => entry.id !== id));
      
      // Call the secure-delete-entry Edge Function directly instead of using RPC
      const response = await supabase.functions.invoke('secure-delete-entry', {
        body: { id }
      });
      
      if (response.error) {
        console.error("[AdminPage] Edge function delete error:", response.error);
        throw new Error(response.error.message || "Error deleting entry");
      }
      
      console.log("[AdminPage] Entry successfully deleted from database, ID:", id);
      
      // Update the cache to reflect the deletion
      await queryClient.invalidateQueries({queryKey: ['entries']});
      
      toast({
        title: "Entry deleted",
        description: "The entry has been successfully deleted from the database.",
      });
      
      // Manually refetch to verify deletion
      const { data: verifyData } = await supabase
        .from('entries')
        .select('id')
        .eq('id', id);
        
      if (verifyData && verifyData.length > 0) {
        console.error("[AdminPage] Entry still exists after deletion:", id);
        throw new Error("Entry still exists after deletion");
      } else {
        console.log("[AdminPage] Verified entry no longer exists in database");
      }
      
    } catch (error) {
      console.error("[AdminPage] Error in delete process:", error);
      
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

  return {
    entries,
    isLoading,
    error,
    refetch,
    isDeleting,
    handleDeleteEntry
  };
};
