
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { RefreshCw, CheckCircle, AlertCircle, ExternalLink, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

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
      const { data, error } = await supabase.functions.invoke('manual-sync');

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
        
        // Refresh sync info after successful sync
        fetchLastSyncInfo();
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

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Never';
    const date = new Date(dateString);
    return `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`;
  };

  const extractProjectId = (errorMessage: string) => {
    const match = errorMessage.match(/project=(\d+)/);
    return match ? match[1] : "452914012806"; // Default to the ID from the error if not found
  };

  return (
    <div className="flex flex-col space-y-2">
      <div className="mb-2 text-sm text-gray-600">
        <div className="flex items-center gap-1">
          <Clock className="h-3 w-3" />
          <span>Last {lastSyncInfo.type || ''} sync: {formatDate(lastSyncInfo.time)}</span>
        </div>
        {lastSyncInfo.entries !== null && (
          <div className="ml-4 text-xs text-gray-500">
            {lastSyncInfo.entries} {lastSyncInfo.entries === 1 ? 'entry' : 'entries'} synced
          </div>
        )}
        <div className="ml-4 text-xs text-gray-500">
          Automated sync scheduled daily at midnight UTC
        </div>
      </div>
      
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
