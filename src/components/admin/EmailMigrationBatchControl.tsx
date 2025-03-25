
import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';
import { RefreshCw, Play, Settings, Clock, CheckCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Progress } from '@/components/ui/progress';
import { Switch } from '@/components/ui/switch';

export function EmailMigrationBatchControl({ onMigrationComplete }: { onMigrationComplete: () => void }) {
  const [isMigrating, setIsMigrating] = useState(false);
  const [isRunningAutomation, setIsRunningAutomation] = useState(false);
  const [batchSize, setBatchSize] = useState(10);
  const [publicationId, setPublicationId] = useState('');
  const [settingsDialogOpen, setSettingsDialogOpen] = useState(false);
  const [migrationResults, setMigrationResults] = useState<any>(null);
  const [automationEnabled, setAutomationEnabled] = useState(false);
  const [migrationProgress, setMigrationProgress] = useState(0);
  const [continuousMode, setContinuousMode] = useState(false);
  const [continuousBatchesRun, setContinuousBatchesRun] = useState(0);

  const runMigrationBatch = async (autoMode = false) => {
    if (!publicationId) {
      toast({
        title: "Publication ID Required",
        description: "Please enter a BeehiiV publication ID in settings to run a migration batch.",
        variant: "destructive"
      });
      setSettingsDialogOpen(true);
      return;
    }
    
    if (autoMode) {
      setIsRunningAutomation(true);
    } else {
      setIsMigrating(true);
    }
    
    setMigrationResults(null);
    
    try {
      const { data, error } = await supabase.functions.invoke('email-migration', {
        method: 'POST',
        body: { 
          action: autoMode ? 'run-automation' : 'migrate-batch', 
          batchSize, 
          publicationId,
          fileName: `${autoMode ? 'auto' : 'manual'}-batch-${new Date().toISOString()}`
        }
      });

      if (error) {
        console.error('Migration Error:', error);
        throw error;
      }
      
      console.log('Migration Response:', data);
      
      if (data.results) {
        setMigrationResults(data.results);
      }
      
      toast({
        title: "Migration Batch Completed",
        description: `Processed ${data.results?.total || 0} subscribers with ${data.results?.success || 0} successful migrations.`,
        variant: "default"
      });
      
      // Refresh stats
      if (onMigrationComplete) onMigrationComplete();
      
      // Check if we should continue with another batch
      if (continuousMode && !autoMode && data.results?.total > 0) {
        // Only continue if there were subscribers to process and no rate limiting occurred
        const noRateLimiting = !data.results?.errors?.some((e: any) => e.error?.includes('Rate limited'));
        
        if (noRateLimiting) {
          setContinuousBatchesRun(prev => prev + 1);
          // Add a short delay between batches
          setTimeout(() => {
            runMigrationBatch(false);
          }, 2000);
          return;
        } else {
          toast({
            title: "Continuous Mode Paused",
            description: "Rate limiting detected. Pausing continuous migration to avoid API limits.",
            variant: "warning"
          });
        }
      }
      
      // Reset continuous batches counter when stopped
      if (!continuousMode || data.results?.total === 0) {
        setContinuousBatchesRun(0);
      }
    } catch (error: any) {
      console.error('Migration Error:', error);
      toast({
        title: "Migration Failed",
        description: error.message || "Failed to process migration batch.",
        variant: "destructive"
      });
      setContinuousBatchesRun(0);
    } finally {
      if (autoMode) {
        setIsRunningAutomation(false);
      } else {
        setIsMigrating(false);
      }
    }
  };
  
  const saveSettings = () => {
    if (!publicationId) {
      toast({
        title: "Publication ID Required",
        description: "Please enter a BeehiiV publication ID to continue.",
        variant: "destructive"
      });
      return;
    }
    
    // Save to local storage for persistence
    localStorage.setItem('beehiivPublicationId', publicationId);
    
    toast({
      title: "Settings Saved",
      description: "Migration settings have been saved.",
      variant: "default"
    });
    
    setSettingsDialogOpen(false);
  };
  
  const toggleAutomation = async (enabled: boolean) => {
    try {
      const { data, error } = await supabase.functions.invoke('email-migration', {
        method: 'POST',
        body: { 
          action: 'toggle-automation', 
          enabled
        }
      });

      if (error) {
        console.error('Automation Toggle Error:', error);
        throw error;
      }
      
      setAutomationEnabled(enabled);
      
      toast({
        title: enabled ? "Automation Enabled" : "Automation Disabled",
        description: enabled 
          ? "Email migration automation is now running." 
          : "Email migration automation has been stopped.",
        variant: "default"
      });
      
      // Refresh stats
      if (onMigrationComplete) onMigrationComplete();
    } catch (error: any) {
      console.error('Automation Toggle Error:', error);
      toast({
        title: "Automation Toggle Failed",
        description: error.message || "Failed to toggle automation.",
        variant: "destructive"
      });
    }
  };
  
  // Load settings from storage on first render
  useEffect(() => {
    const savedPublicationId = localStorage.getItem('beehiivPublicationId');
    if (savedPublicationId) {
      setPublicationId(savedPublicationId);
    }
    
    // Progress simulation for ongoing operations
    if (isMigrating || isRunningAutomation) {
      const interval = setInterval(() => {
        setMigrationProgress(prev => {
          if (prev >= 95) return prev;
          return prev + Math.random() * 5;
        });
      }, 500);
      
      return () => clearInterval(interval);
    } else {
      setMigrationProgress(0);
    }
  }, [isMigrating, isRunningAutomation]);
  
  // Reset progress when starting a new migration
  useEffect(() => {
    if (isMigrating || isRunningAutomation) {
      setMigrationProgress(0);
    }
  }, [isMigrating, isRunningAutomation]);

  return (
    <Card className="p-4 bg-white shadow-sm">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">Migration Control</h3>
        <Button 
          variant="outline" 
          size="sm"
          onClick={() => setSettingsDialogOpen(true)}
        >
          <Settings className="h-4 w-4 mr-2" />
          Settings
        </Button>
      </div>
      
      <div className="space-y-4">
        <Alert className="bg-blue-50 border-blue-200">
          <AlertDescription className="text-blue-800">
            Run a migration batch to process pending subscribers. Start with small batch sizes (5-10) to test.
            {continuousMode && (
              <span className="block mt-1 font-medium">
                Continuous mode is enabled! Migration will run in batches until all subscribers are processed.
              </span>
            )}
          </AlertDescription>
        </Alert>
        
        <div className="flex flex-wrap gap-4 items-center">
          <div className="flex items-center space-x-2">
            <Label htmlFor="batchSize" className="whitespace-nowrap">Batch Size:</Label>
            <Input 
              id="batchSize"
              type="number" 
              value={batchSize} 
              onChange={(e) => setBatchSize(parseInt(e.target.value))} 
              min="1" 
              max="100"
              className="w-20"
            />
          </div>
          
          <div className="flex items-center space-x-2">
            <Switch
              id="continuousMode"
              checked={continuousMode}
              onCheckedChange={setContinuousMode}
            />
            <Label htmlFor="continuousMode">Continuous Mode</Label>
          </div>
          
          <Button
            variant="default" 
            onClick={() => runMigrationBatch(false)}
            disabled={isMigrating || !publicationId || isRunningAutomation}
          >
            {isMigrating ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                {continuousMode 
                  ? `Migrating... (Batch ${continuousBatchesRun + 1})` 
                  : 'Migrating...'}
              </>
            ) : (
              <>
                <Play className="h-4 w-4 mr-2" />
                Run Migration Batch
              </>
            )}
          </Button>
          
          <Button
            variant="outline" 
            onClick={() => runMigrationBatch(true)}
            disabled={isMigrating || !publicationId || isRunningAutomation}
          >
            {isRunningAutomation ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Running Automation...
              </>
            ) : (
              <>
                <Clock className="h-4 w-4 mr-2" />
                Run Automation Once
              </>
            )}
          </Button>
        </div>
        
        {(isMigrating || isRunningAutomation) && (
          <div className="mt-4">
            <div className="text-sm text-gray-600 mb-1">
              {isRunningAutomation ? 'Running automated migration...' : 'Processing subscribers...'}
            </div>
            <Progress value={migrationProgress} className="h-2" />
          </div>
        )}
        
        {migrationResults && (
          <div className="mt-4 p-4 border rounded-md bg-gray-50">
            <h4 className="font-medium mb-2">Migration Results</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="bg-green-50 p-2 rounded-md border border-green-100">
                <div className="text-xs text-green-600">Success</div>
                <div className="text-lg font-bold">{migrationResults.success}</div>
              </div>
              <div className="bg-purple-50 p-2 rounded-md border border-purple-100">
                <div className="text-xs text-purple-600">Duplicates</div>
                <div className="text-lg font-bold">{migrationResults.duplicates}</div>
              </div>
              <div className="bg-red-50 p-2 rounded-md border border-red-100">
                <div className="text-xs text-red-600">Failed</div>
                <div className="text-lg font-bold">{migrationResults.failed}</div>
              </div>
              <div className="bg-gray-50 p-2 rounded-md border border-gray-200">
                <div className="text-xs text-gray-600">Total</div>
                <div className="text-lg font-bold">{migrationResults.total}</div>
              </div>
            </div>
            
            {migrationResults.errors && migrationResults.errors.length > 0 && (
              <div className="mt-2">
                <h5 className="text-sm font-medium text-red-600 mb-1">Errors</h5>
                <div className="max-h-40 overflow-y-auto text-xs">
                  {migrationResults.errors.map((error: any, index: number) => (
                    <div key={index} className="p-1 mb-1 bg-red-50 rounded">
                      <span className="font-medium">{error.email}:</span> {error.error}
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {continuousMode && migrationResults.total > 0 && !isMigrating && (
              <div className="mt-2 text-center">
                <p className="text-sm text-blue-600">
                  Continuous mode completed {continuousBatchesRun} batches.
                  {migrationResults.total === 0 ? ' No more subscribers to process.' : ''}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
      
      {/* Settings Dialog */}
      <Dialog open={settingsDialogOpen} onOpenChange={setSettingsDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Migration Settings</DialogTitle>
            <DialogDescription>
              Configure settings for the email migration process.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="publicationId">BeehiiV Publication ID</Label>
              <Input
                id="publicationId"
                value={publicationId}
                onChange={(e) => setPublicationId(e.target.value)}
                placeholder="e.g. pub_1234567890"
              />
              <p className="text-xs text-gray-500">
                Found in your BeehiiV dashboard under Publication Settings.
              </p>
            </div>
            
            <div className="mt-4 pt-4 border-t">
              <h4 className="text-sm font-medium mb-2">Automation Settings</h4>
              
              <div className="flex items-center space-x-2 mb-4">
                <Switch
                  id="automationToggle"
                  checked={automationEnabled}
                  onCheckedChange={toggleAutomation}
                />
                <Label htmlFor="automationToggle">
                  Enable Automated Migration
                </Label>
              </div>
              
              <p className="text-xs text-gray-500">
                When enabled, the system will automatically process subscribers in batches, 
                respecting rate limits and operational hours.
              </p>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setSettingsDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={saveSettings}>
              Save Settings
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
