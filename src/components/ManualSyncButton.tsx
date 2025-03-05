
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { RefreshCw, CheckCircle, AlertCircle, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export const ManualSyncButton = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [sheetsApiError, setSheetsApiError] = useState<string | null>(null);
  const [sheetUrl, setSheetUrl] = useState<string | null>(null);
  const { toast } = useToast();

  const handleSync = async () => {
    setIsLoading(true);
    setSyncStatus('idle');
    setSheetsApiError(null);
    setSheetUrl(null);

    try {
      const { data, error } = await supabase.functions.invoke('sync-to-sheets');

      if (error) {
        console.error("Error triggering sync:", error);
        setSyncStatus('error');
        toast({
          title: "Sync Failed",
          description: error.message || "Failed to sync entries to Google Sheets",
          variant: "destructive",
        });
        return;
      }

      console.log("Sync response:", data);
      
      // Check for Google Sheets API disabled error
      if (data?.error && data.error.includes("Google Sheets API has not been used")) {
        setSyncStatus('error');
        setSheetsApiError("Google Sheets API is not enabled. Click below to activate it.");
        toast({
          title: "Google Sheets API Not Enabled",
          description: "You need to enable the Google Sheets API in your Google Cloud Console",
          variant: "destructive",
        });
        return;
      }
      
      if (data && data.success) {
        setSyncStatus('success');
        if (data.sheet_url) {
          setSheetUrl(data.sheet_url);
        }
        toast({
          title: "Sync Complete",
          description: data.message || "Successfully synced entries to Google Sheets",
        });
      } else {
        setSyncStatus('error');
        toast({
          title: "Sync Failed",
          description: (data && data.error) || "Failed to sync entries to Google Sheets",
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

  const extractProjectId = (errorMessage: string) => {
    const match = errorMessage.match(/project=(\d+)/);
    return match ? match[1] : "452914012806"; // Default to the ID from the error if not found
  };

  return (
    <div className="flex flex-col space-y-2">
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

      {sheetsApiError && (
        <a 
          href={`https://console.developers.google.com/apis/api/sheets.googleapis.com/overview?project=452914012806`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-blue-500 flex items-center gap-1 hover:underline"
        >
          <ExternalLink className="h-3 w-3" />
          Enable Google Sheets API
        </a>
      )}
      
      {sheetUrl && (
        <a 
          href={sheetUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-blue-500 flex items-center gap-1 hover:underline"
        >
          <ExternalLink className="h-3 w-3" />
          View Google Sheet
        </a>
      )}
    </div>
  );
};
