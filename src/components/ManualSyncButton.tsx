
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { RefreshCw, CheckCircle, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export const ManualSyncButton = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const { toast } = useToast();

  const handleSync = async () => {
    setIsLoading(true);
    setSyncStatus('idle');

    try {
      const { data, error } = await supabase.functions.invoke('manual-sync');

      if (error) {
        console.error("Error triggering manual sync:", error);
        setSyncStatus('error');
        toast({
          title: "Sync Failed",
          description: error.message || "Failed to sync entries to Google Sheets",
          variant: "destructive",
        });
        return;
      }

      console.log("Sync response:", data);
      
      if (data.success) {
        setSyncStatus('success');
        toast({
          title: "Sync Complete",
          description: data.message || "Successfully synced entries to Google Sheets",
        });
      } else {
        setSyncStatus('error');
        toast({
          title: "Sync Failed",
          description: data.error || "Failed to sync entries to Google Sheets",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Exception during sync:", error);
      setSyncStatus('error');
      toast({
        title: "Sync Failed",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button 
      onClick={handleSync} 
      disabled={isLoading}
      variant="outline"
      className="gap-2"
    >
      {isLoading ? (
        <>
          <RefreshCw className="h-4 w-4 animate-spin" />
          Syncing...
        </>
      ) : syncStatus === 'success' ? (
        <>
          <CheckCircle className="h-4 w-4 text-green-500" />
          Sync to Sheets
        </>
      ) : syncStatus === 'error' ? (
        <>
          <AlertCircle className="h-4 w-4 text-red-500" />
          Sync to Sheets
        </>
      ) : (
        <>
          <RefreshCw className="h-4 w-4" />
          Sync to Sheets
        </>
      )}
    </Button>
  );
};
