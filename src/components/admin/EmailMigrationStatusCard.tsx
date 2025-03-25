
import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';
import { RefreshCw, Loader, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface MigrationStats {
  stats: {
    total_subscribers: number;
    migrated_subscribers: number;
    failed_subscribers: number;
  };
  counts: {
    pending: number;
    in_progress: number;
    migrated: number;
    failed: number;
    already_exists: number;
  };
}

export function EmailMigrationStatusCard() {
  const [migrationStats, setMigrationStats] = useState<MigrationStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  // Fetch migration stats on component mount and every 15 seconds
  useEffect(() => {
    fetchMigrationStats();
    
    // Set up interval for refreshing stats
    const interval = setInterval(fetchMigrationStats, 15000);
    
    // Clean up interval on unmount
    return () => clearInterval(interval);
  }, [retryCount]);

  const fetchMigrationStats = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      console.log('Fetching migration stats...');
      const { data, error } = await supabase.functions.invoke('email-migration', {
        method: 'POST',
        body: { action: 'stats' }
      });

      if (error) {
        console.error('Error from Supabase function:', error);
        throw new Error(`Error from server: ${error.message}`);
      }
      
      if (!data) {
        throw new Error('No data returned from server');
      }
      
      console.log('Received migration stats:', data);
      
      // Validate the data structure
      if (!data.stats || !data.counts) {
        throw new Error('Invalid data structure received from server');
      }
      
      setMigrationStats(data);
    } catch (err: any) {
      console.error('Failed to load migration statistics:', err);
      setError(err.message || 'An unexpected error occurred');
      toast({
        title: "Stats Refresh Failed", 
        description: "Could not retrieve the latest migration statistics.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Format the number with commas for thousands
  const formatNumber = (num: number | undefined) => {
    if (num === undefined) return '0';
    return num.toLocaleString();
  };

  return (
    <Card className="p-4 bg-white shadow-sm">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">Current Email Migration Status</h3>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => {
            setRetryCount(prev => prev + 1);
            fetchMigrationStats();
          }} 
          disabled={isLoading}
          className="h-8"
        >
          {isLoading ? <Loader className="h-4 w-4 animate-spin mr-2" /> : <RefreshCw className="h-4 w-4 mr-2" />}
          {isLoading ? "Refreshing..." : "Refresh"}
        </Button>
      </div>
      
      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="h-4 w-4 mr-2" />
          <AlertDescription>
            {error}
            <Button 
              variant="link" 
              className="p-0 h-auto ml-2 text-destructive underline" 
              onClick={() => {
                setRetryCount(prev => prev + 1);
                fetchMigrationStats();
              }}
            >
              Try again
            </Button>
          </AlertDescription>
        </Alert>
      )}
      
      {isLoading && !migrationStats ? (
        <div className="flex justify-center items-center py-8">
          <Loader className="h-8 w-8 animate-spin text-muted-foreground" />
          <span className="ml-2 text-muted-foreground">Loading migration statistics...</span>
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
          <AlertCircle className="mx-auto mb-2 h-6 w-6 text-red-500" />
          <p>Failed to load migration statistics.</p>
          <Button 
            variant="link" 
            onClick={() => {
              setRetryCount(prev => prev + 1);
              fetchMigrationStats();
            }} 
            className="text-blue-500"
          >
            Try refreshing
          </Button>
        </div>
      )}
    </Card>
  );
}
