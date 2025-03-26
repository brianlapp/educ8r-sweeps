
import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';
import { Loader, AlertCircle, Play, Pause, Heart } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';

export function EmailMigrationAutomation() {
  const [loading, setLoading] = useState(false);
  const [automationEnabled, setAutomationEnabled] = useState(false);
  const [heartbeatStatus, setHeartbeatStatus] = useState<any>(null);
  const [lastHeartbeat, setLastHeartbeat] = useState<Date | null>(null);
  const [heartbeatAge, setHeartbeatAge] = useState<string>('Unknown');
  const [error, setError] = useState<string | null>(null);
  
  // Fetch automation status on component mount and periodically
  useEffect(() => {
    fetchAutomationStatus();
    
    // Refresh heartbeat status every 30 seconds
    const interval = setInterval(fetchHeartbeat, 30000);
    
    // Update heartbeat age every second
    const ageInterval = setInterval(updateHeartbeatAge, 1000);
    
    return () => {
      clearInterval(interval);
      clearInterval(ageInterval);
    };
  }, []);
  
  // Update relative time display for heartbeat
  const updateHeartbeatAge = () => {
    if (!lastHeartbeat) {
      setHeartbeatAge('Unknown');
      return;
    }
    
    const seconds = Math.floor((Date.now() - lastHeartbeat.getTime()) / 1000);
    
    if (seconds < 60) {
      setHeartbeatAge(`${seconds} second${seconds !== 1 ? 's' : ''} ago`);
    } else if (seconds < 3600) {
      const minutes = Math.floor(seconds / 60);
      setHeartbeatAge(`${minutes} minute${minutes !== 1 ? 's' : ''} ago`);
    } else {
      const hours = Math.floor(seconds / 3600);
      setHeartbeatAge(`${hours} hour${hours !== 1 ? 's' : ''} ago`);
    }
  };
  
  // Fetch automation settings
  const fetchAutomationStatus = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const { data, error } = await supabase.functions.invoke('email-migration', {
        method: 'POST',
        body: { action: 'stats' }
      });
      
      if (error) throw error;
      
      if (data?.automation) {
        setAutomationEnabled(data.automation.enabled);
      }
      
      // Fetch heartbeat separately
      await fetchHeartbeat();
    } catch (err: any) {
      console.error('Failed to load automation status:', err);
      setError(err.message || 'Failed to load automation status');
    } finally {
      setLoading(false);
    }
  };
  
  // Fetch heartbeat from the server-automation function
  const fetchHeartbeat = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('server-automation', {
        method: 'POST',
        body: { action: 'heartbeat' }
      });
      
      if (error) throw error;
      
      setHeartbeatStatus(data);
      
      if (data?.last_heartbeat) {
        setLastHeartbeat(new Date(data.last_heartbeat));
      }
      
      // Update enabled status if it changed
      if (data?.enabled !== undefined) {
        setAutomationEnabled(data.enabled);
      }
    } catch (err: any) {
      console.error('Failed to fetch heartbeat:', err);
      // Don't show an error for heartbeat failures to avoid too many alerts
    }
  };
  
  // Toggle automation
  const toggleAutomation = async (enabled: boolean) => {
    setLoading(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('email-migration', {
        method: 'POST',
        body: { 
          action: 'toggle-automation', 
          enabled 
        }
      });
      
      if (error) throw error;
      
      setAutomationEnabled(enabled);
      
      // If enabling automation, trigger the first run
      if (enabled) {
        await supabase.functions.invoke('server-automation', {
          method: 'POST',
          body: { action: 'run-automation' }
        });
        
        // Fetch heartbeat after enabling
        await fetchHeartbeat();
      }
      
      toast({
        title: `Automation ${enabled ? 'Enabled' : 'Disabled'}`,
        description: `Email migration automation has been ${enabled ? 'enabled' : 'disabled'}.`,
        variant: "default"
      });
    } catch (err: any) {
      console.error('Failed to toggle automation:', err);
      setError(err.message || 'Failed to toggle automation');
      toast({
        title: "Automation Error",
        description: err.message || 'Failed to toggle automation',
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };
  
  // Start a manual automation run
  const triggerAutomationRun = async () => {
    if (!automationEnabled) {
      toast({
        title: "Automation Disabled",
        description: "Please enable automation first.",
        variant: "destructive"
      });
      return;
    }
    
    setLoading(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('server-automation', {
        method: 'POST',
        body: { action: 'run-automation' }
      });
      
      if (error) throw error;
      
      // Fetch heartbeat after triggering run
      await fetchHeartbeat();
      
      toast({
        title: "Automation Triggered",
        description: data.message || "Server-side migration process has been started.",
        variant: "default"
      });
    } catch (err: any) {
      console.error('Failed to trigger automation run:', err);
      setError(err.message || 'Failed to trigger automation run');
      toast({
        title: "Automation Error",
        description: err.message || 'Failed to trigger automation run',
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };
  
  // Calculate heartbeat status color
  const getHeartbeatStatusColor = () => {
    if (!lastHeartbeat) return 'text-gray-400';
    
    const secondsAgo = Math.floor((Date.now() - lastHeartbeat.getTime()) / 1000);
    
    if (secondsAgo < 120) return 'text-green-500';
    if (secondsAgo < 300) return 'text-yellow-500';
    return 'text-red-500';
  };
  
  // Format timestamp to localized string
  const formatTimestamp = (timestamp: string | null) => {
    if (!timestamp) return 'Never';
    
    try {
      return new Date(timestamp).toLocaleString();
    } catch (e) {
      return timestamp;
    }
  };
  
  return (
    <Card className="p-4 bg-white shadow-sm">
      <h3 className="text-lg font-semibold mb-4">Server-Side Migration Automation</h3>
      
      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="h-4 w-4 mr-2" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      
      <div className="space-y-4">
        <p className="text-sm text-gray-600">
          Server-side automation runs continuously in the background, even when your browser is closed. 
          This ensures the migration process completes without requiring you to keep the admin panel open.
        </p>
        
        <div className="flex flex-col space-y-4 sm:flex-row sm:space-y-0 sm:space-x-4 sm:items-center">
          <div className="flex items-center space-x-2">
            <Switch 
              id="automation-toggle" 
              checked={automationEnabled}
              onCheckedChange={toggleAutomation}
              disabled={loading}
            />
            <Label htmlFor="automation-toggle" className="font-medium">
              {automationEnabled ? 'Automation Enabled' : 'Automation Disabled'}
            </Label>
          </div>
          
          <Button
            variant="outline"
            size="sm"
            onClick={triggerAutomationRun}
            disabled={loading || !automationEnabled}
            className="ml-2"
          >
            {loading ? <Loader className="h-4 w-4 animate-spin mr-2" /> : <Play className="h-4 w-4 mr-2" />}
            Run Now
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={fetchAutomationStatus}
            disabled={loading}
            className="ml-2"
          >
            {loading ? <Loader className="h-4 w-4 animate-spin mr-2" /> : <RefreshCw className="h-4 w-4 mr-2" />}
            Refresh Status
          </Button>
        </div>
        
        <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
          <div className="flex items-center mb-2">
            <Heart className={`h-5 w-5 mr-2 ${getHeartbeatStatusColor()} ${lastHeartbeat && automationEnabled ? 'animate-pulse' : ''}`} />
            <h4 className="text-md font-medium">Automation Heartbeat</h4>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
            <div>
              <div className="text-sm text-gray-500">Last Heartbeat</div>
              <div className="font-medium">{formatTimestamp(heartbeatStatus?.last_heartbeat)}</div>
              <div className="text-xs text-gray-500">{heartbeatAge}</div>
            </div>
            
            <div>
              <div className="text-sm text-gray-500">Current Status</div>
              <div className="font-medium">
                {heartbeatStatus?.status?.state ? (
                  <span className="capitalize">{heartbeatStatus.status.state}</span>
                ) : (
                  <span className="text-gray-400">No status available</span>
                )}
              </div>
              <div className="text-xs text-gray-500">
                {heartbeatStatus?.status?.message || ''}
              </div>
            </div>
          </div>
          
          {heartbeatStatus?.status?.state === 'processing' && (
            <div className="mt-3">
              <div className="text-sm text-gray-500 mb-1">Current Batch Progress</div>
              <Progress value={100} className="h-2 bg-blue-100">
                <div className="h-full bg-blue-500 animate-pulse"></div>
              </Progress>
              <div className="text-xs text-gray-500 mt-1 flex justify-between">
                <span>Batch ID: {heartbeatStatus?.status?.batch_id?.substring(0, 8) || 'Unknown'}</span>
                <span>Size: {heartbeatStatus?.status?.batch_size || '0'} subscribers</span>
              </div>
            </div>
          )}
        </div>
        
        <div className="text-sm text-gray-500 mt-2">
          <p>
            <strong>How it works:</strong> The automation process runs every 5 minutes on the server, 
            processing batches of subscribers according to your configured settings. It will continue running 
            until all subscribers are migrated or until you disable it.
          </p>
        </div>
      </div>
    </Card>
  );
}
