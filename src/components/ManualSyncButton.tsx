
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { RefreshCw, CheckCircle, AlertCircle, ExternalLink, Clock, Trash } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export const ManualSyncButton = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [sheetsApiError, setSheetsApiError] = useState<string | null>(null);
  const [sheetUrl, setSheetUrl] = useState<string | null>(null);
  const [lastSyncInfo, setLastSyncInfo] = useState<{
    time: string | null;
    entries: number | null;
    type: 'manual' | 'automated' | null;
  }>({ time: null, entries: null, type: null });
  const [showResetDialog, setShowResetDialog] = useState(false);
  const [resetInProgress, setResetInProgress] = useState(false);
  const { toast } = useToast();

  // Fetch last sync information on component mount
  useEffect(() => {
    fetchLastSyncInfo();
  }, []);

  const fetchLastSyncInfo = async () => {
    try {
      const { data, error } = await supabase
        .from('sheets_sync_metadata')
        .select('last_sync_time, entries_synced, last_sync_type')
        .eq('id', 'google_sheets_sync')
        .maybeSingle();

      if (error) {
        console.error("Error fetching sync info:", error);
        return;
      }

      if (data) {
        setLastSyncInfo({
          time: data.last_sync_time,
          entries: data.entries_synced,
          type: data.last_sync_type as 'manual' | 'automated' | null
        });
      }
    } catch (error) {
      console.error("Exception fetching sync info:", error);
    }
  };

  const handleSync = async () => {
    setIsLoading(true);
    setSyncStatus('idle');
    setSheetsApiError(null);
    setSheetUrl(null);

    try {
      // Show a loading toast that we can update later
      const loadingToastId = toast.info(
        "Sync in Progress", 
        "Starting sync to Google Sheets..."
      ).id;

      const { data, error } = await supabase.functions.invoke('manual-sync');

      // First, dismiss the loading toast
      toast.dismiss?.(loadingToastId);

      if (error) {
        console.error("Error triggering sync:", error);
        setSyncStatus('error');
        toast.error(
          "Sync Failed", 
          error.message || "Failed to sync entries to Google Sheets"
        );
        return;
      }

      console.log("Sync response:", data);
      
      // Check for Google Sheets API disabled error
      if (data?.error && data.error.includes("Google Sheets API has not been used")) {
        setSyncStatus('error');
        setSheetsApiError("Google Sheets API is not enabled. Click below to activate it.");
        toast.error(
          "Google Sheets API Not Enabled",
          "You need to enable the Google Sheets API in your Google Cloud Console"
        );
        return;
      }
      
      if (data && data.success) {
        setSyncStatus('success');
        if (data.sheet_url) {
          setSheetUrl(data.sheet_url);
        }
        toast.success(
          "Sync Complete",
          data.message || "Successfully synced entries to Google Sheets"
        );
        
        // Refresh sync info after successful sync
        fetchLastSyncInfo();
      } else {
        setSyncStatus('error');
        toast.error(
          "Sync Failed",
          (data && data.error) || "Failed to sync entries to Google Sheets"
        );
      }
    } catch (error: any) {
      console.error("Exception during sync:", error);
      setSyncStatus('error');
      toast.error(
        "Sync Failed",
        error.message || "An unexpected error occurred"
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetSyncMetadata = async () => {
    setResetInProgress(true);

    try {
      const loadingToastId = toast.info(
        "Reset in Progress", 
        "Resetting sync metadata..."
      ).id;

      // Reset the sync metadata by deleting and recreating it
      const { error } = await supabase
        .from('sheets_sync_metadata')
        .delete()
        .eq('id', 'google_sheets_sync');

      // Dismiss loading toast
      toast.dismiss?.(loadingToastId);

      if (error) {
        console.error("Error resetting sync metadata:", error);
        toast.error(
          "Reset Failed",
          "Failed to reset sync metadata: " + error.message
        );
        return;
      }

      // Create a new clean metadata record
      const { error: insertError } = await supabase
        .from('sheets_sync_metadata')
        .insert({
          id: 'google_sheets_sync',
          last_sync_time: new Date(0).toISOString(), // Set to epoch time to force full sync
          entries_synced: 0,
          total_entries_synced: 0,
          last_sync_type: 'manual'
        });

      if (insertError) {
        console.error("Error creating new sync metadata:", insertError);
        toast.error(
          "Reset Failed",
          "Failed to create new sync metadata: " + insertError.message
        );
        return;
      }

      toast.success(
        "Reset Complete",
        "Sync metadata has been reset. You can now perform a full sync."
      );

      // Refresh the sync info
      fetchLastSyncInfo();

    } catch (error: any) {
      console.error("Exception during reset:", error);
      toast.error(
        "Reset Failed",
        "An unexpected error occurred: " + error.message
      );
    } finally {
      setResetInProgress(false);
      setShowResetDialog(false);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Never';
    
    const date = new Date(dateString);
    // Check if date is close to epoch (indicating a reset or never synced)
    if (date.getFullYear() < 1971) return 'Never';
    
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  };

  const extractProjectId = (errorMessage: string) => {
    const match = errorMessage.match(/project=(\d+)/);
    return match ? match[1] : "452914012806"; // Default to the ID from the error if not found
  };

  // Determine compact display text for last sync
  const getSyncInfoDisplay = () => {
    const syncTime = formatDate(lastSyncInfo.time);
    const syncType = lastSyncInfo.type || '';
    const entriesText = lastSyncInfo.entries !== null ? `(${lastSyncInfo.entries})` : '';
    
    return (
      <div className="flex items-center text-sm text-gray-600">
        <div className="flex items-center gap-1.5">
          <Clock className="h-3.5 w-3.5 text-gray-400" />
          <span>Last {syncType} sync: <span className="font-medium">{syncTime}</span> {entriesText}</span>
        </div>
        <span className="mx-2 text-gray-300">•</span>
        <span className="text-gray-500">Auto-sync: midnight UTC</span>
      </div>
    );
  };

  return (
    <div className="flex items-center justify-between gap-4">
      {getSyncInfoDisplay()}
      
      <div className="flex gap-2">
        <Button 
          onClick={handleSync} 
          disabled={isLoading || resetInProgress}
          variant="outline"
          size="sm"
          className="gap-2 whitespace-nowrap"
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
        
        <Button
          onClick={() => setShowResetDialog(true)}
          disabled={isLoading || resetInProgress}
          variant="outline"
          size="icon"
          className="aspect-square h-8 w-8"
          title="Reset Sync Metadata"
        >
          <Trash className="h-4 w-4 text-red-500" />
        </Button>
      </div>

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
          View Sheet
        </a>
      )}

      <AlertDialog open={showResetDialog} onOpenChange={setShowResetDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reset Sync Metadata</AlertDialogTitle>
            <AlertDialogDescription>
              This will reset the sync metadata, forcing a full re-sync of all entries the next time you sync. 
              <br /><br />
              <strong>Important:</strong> You should manually delete all entries in the Google Sheet first, 
              then reset the metadata, and finally perform a new sync.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={resetInProgress}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={(e) => {
                e.preventDefault();
                handleResetSyncMetadata();
              }}
              disabled={resetInProgress}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {resetInProgress ? "Resetting..." : "Reset"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
