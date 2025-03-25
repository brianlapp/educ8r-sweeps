
import React, { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';
import { RefreshCw, Play, Settings } from 'lucide-react';
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

export function EmailMigrationBatchControl({ onMigrationComplete }: { onMigrationComplete: () => void }) {
  const [isMigrating, setIsMigrating] = useState(false);
  const [batchSize, setBatchSize] = useState(10);
  const [publicationId, setPublicationId] = useState('');
  const [settingsDialogOpen, setSettingsDialogOpen] = useState(false);
  const [migrationResults, setMigrationResults] = useState<any>(null);

  const runMigrationBatch = async () => {
    if (!publicationId) {
      toast({
        title: "Publication ID Required",
        description: "Please enter a BeehiiV publication ID in settings to run a migration batch.",
        variant: "destructive"
      });
      setSettingsDialogOpen(true);
      return;
    }
    
    setIsMigrating(true);
    setMigrationResults(null);
    
    try {
      const { data, error } = await supabase.functions.invoke('email-migration', {
        method: 'POST',
        body: { 
          action: 'migrate-batch', 
          batchSize, 
          publicationId,
          fileName: `manual-batch-${new Date().toISOString()}`
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
    } catch (error: any) {
      console.error('Migration Error:', error);
      toast({
        title: "Migration Failed",
        description: error.message || "Failed to process migration batch.",
        variant: "destructive"
      });
    } finally {
      setIsMigrating(false);
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
  
  // Load settings from storage on first render
  React.useEffect(() => {
    const savedPublicationId = localStorage.getItem('beehiivPublicationId');
    if (savedPublicationId) {
      setPublicationId(savedPublicationId);
    }
  }, []);

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
          
          <Button
            variant="default" 
            onClick={runMigrationBatch}
            disabled={isMigrating || !publicationId}
          >
            {isMigrating ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Migrating...
              </>
            ) : (
              <>
                <Play className="h-4 w-4 mr-2" />
                Run Migration Batch
              </>
            )}
          </Button>
        </div>
        
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
