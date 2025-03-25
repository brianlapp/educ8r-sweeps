
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Loader } from "lucide-react";

export function SheetsSyncButton() {
  const [isSyncing, setIsSyncing] = useState(false);
  const [migrationStats, setMigrationStats] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  // Fetch migration stats on component mount and every 10 seconds
  useEffect(() => {
    fetchMigrationStats();
    
    // Set up interval for refreshing stats
    const interval = setInterval(fetchMigrationStats, 10000);
    
    // Clean up interval on unmount
    return () => clearInterval(interval);
  }, []);

  const fetchMigrationStats = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('email-migration', {
        method: 'POST',
        body: { action: 'stats' }
      });

      if (error) {
        console.error('Error fetching migration stats:', error);
        throw error;
      }
      
      setMigrationStats(data);
    } catch (err) {
      console.error('Failed to load migration statistics:', err);
    } finally {
      setIsLoading(false);
    }
  };

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

        // Refresh stats after successful sync
        fetchMigrationStats();
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

  // Format the number with commas for thousands
  const formatNumber = (num: number | undefined) => {
    if (num === undefined) return '0';
    return num.toLocaleString();
  };

  return (
    <div className="space-y-4">
      <Card className="p-4 bg-white shadow-sm">
        <div className="flex justify-between items-center mb-2">
          <h3 className="text-lg font-semibold">Current Email Migration Status</h3>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={fetchMigrationStats} 
            disabled={isLoading}
            className="h-8"
          >
            {isLoading ? <Loader className="h-4 w-4 animate-spin" /> : "Refresh"}
          </Button>
        </div>
        
        {isLoading && !migrationStats ? (
          <div className="flex justify-center items-center py-8">
            <Loader className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : migrationStats ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
            <div className="bg-blue-50 p-3 rounded-lg border border-blue-100">
              <div className="text-sm text-blue-600 mb-1">Pending</div>
              <div className="text-2xl font-bold">
                {formatNumber(migrationStats.counts.pending)} <span className="text-sm font-normal text-slate-500">subscribers</span>
              </div>
              <div className="text-xs text-slate-500 mt-1">waiting to be processed</div>
            </div>
            
            <div className="bg-amber-50 p-3 rounded-lg border border-amber-100">
              <div className="text-sm text-amber-600 mb-1">In Progress</div>
              <div className="text-2xl font-bold">
                {formatNumber(migrationStats.counts.in_progress)} <span className="text-sm font-normal text-slate-500">subscribers</span>
              </div>
              <div className="text-xs text-slate-500 mt-1">currently being processed</div>
            </div>
            
            <div className="bg-green-50 p-3 rounded-lg border border-green-100">
              <div className="text-sm text-green-600 mb-1">Migrated</div>
              <div className="text-2xl font-bold">
                {formatNumber(migrationStats.counts.migrated)} <span className="text-sm font-normal text-slate-500">subscribers</span>
              </div>
              <div className="text-xs text-slate-500 mt-1">successfully migrated to BeehiiV</div>
            </div>
            
            <div className="bg-red-50 p-3 rounded-lg border border-red-100">
              <div className="text-sm text-red-600 mb-1">Failed</div>
              <div className="text-2xl font-bold">
                {formatNumber(migrationStats.counts.failed)} <span className="text-sm font-normal text-slate-500">subscribers</span>
              </div>
              <div className="text-xs text-slate-500 mt-1">failed migration attempts</div>
            </div>
            
            <div className="bg-purple-50 p-3 rounded-lg border border-purple-100">
              <div className="text-sm text-purple-600 mb-1">Already in BeehiiV</div>
              <div className="text-2xl font-bold">
                {formatNumber(migrationStats.counts.already_exists)} <span className="text-sm font-normal text-slate-500">subscribers</span>
              </div>
              <div className="text-xs text-slate-500 mt-1">existing subscribers</div>
            </div>
            
            <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
              <div className="text-sm text-slate-600 mb-1">Total</div>
              <div className="text-2xl font-bold">
                {formatNumber(migrationStats.stats.total_subscribers)} <span className="text-sm font-normal text-slate-500">subscribers</span>
              </div>
              <div className="text-xs text-slate-500 mt-1">in the system</div>
            </div>
          </div>
        ) : (
          <div className="py-6 text-center text-slate-500">
            Failed to load migration statistics. Please try refreshing.
          </div>
        )}
      </Card>
      
      <Button 
        onClick={handleSync} 
        disabled={isSyncing}
        className="bg-green-600 hover:bg-green-700"
      >
        {isSyncing ? "Syncing..." : "Sync to Google Sheets"}
      </Button>
    </div>
  );
}
