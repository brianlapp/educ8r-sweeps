
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

export function SheetsSyncButton() {
  const [isSyncing, setIsSyncing] = useState(false);
  const { toast } = useToast();

  const handleSync = async () => {
    setIsSyncing(true);
    
    // Show loading toast
    const loadingToastId = toast.info(
      "Sync in Progress", 
      "Syncing entries to Google Sheets..."
    ).id;
    
    try {
      const { data, error } = await supabase.functions.invoke('manual-sync');
      
      // Dismiss loading toast - use optional chaining to prevent errors
      toast.dismiss?.(loadingToastId);
      
      if (error) {
        console.error("Error triggering sync:", error);
        throw error;
      }
      
      console.log("Sync response:", data);
      
      if (data.success) {
        toast.success(
          "Sync Successful",
          data.message || "Entries were successfully synced to Google Sheets"
        );
        
        // If sheet URL is provided, offer to open it
        if (data.sheet_url) {
          window.open(data.sheet_url, '_blank');
        }
      } else {
        throw new Error(data.error || "Unknown error occurred during sync");
      }
    } catch (error: any) {
      console.error("Sync error:", error);
      toast.error(
        "Sync Failed",
        error.message || "There was an error syncing entries to Google Sheets"
      );
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
