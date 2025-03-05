
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

export function SheetsSyncButton() {
  const [isSyncing, setIsSyncing] = useState(false);
  const { toast } = useToast();

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke('manual-sync');
      
      if (error) throw error;
      
      if (data.success) {
        toast({
          title: "Sync Successful",
          description: data.message || "Entries were successfully synced to Google Sheets",
        });
        
        // If sheet URL is provided, offer to open it
        if (data.sheet_url) {
          window.open(data.sheet_url, '_blank');
        }
      } else {
        throw new Error(data.error || "Unknown error occurred during sync");
      }
    } catch (error) {
      console.error("Sync error:", error);
      toast({
        title: "Sync Failed",
        description: error.message || "There was an error syncing entries to Google Sheets",
        variant: "destructive"
      });
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <Button 
      onClick={handleSync} 
      disabled={isSyncing}
      className="bg-green-600 hover:bg-green-700"
    >
      {isSyncing ? "Syncing..." : "Sync to Google Sheets"}
    </Button>
  );
}
