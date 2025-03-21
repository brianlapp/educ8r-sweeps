import React, { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { supabase, SUPABASE_URL } from '../integrations/supabase/client';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Progress } from '../components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { toast } from 'sonner';
import { AdminPageHeader } from '../components/admin/AdminPageHeader';
import { BackToAdminButton } from '../components/admin/BackToAdminButton';
import { Alert, AlertDescription } from '../components/ui/alert';
import { AlertCircle, PlayCircle, StopCircle } from 'lucide-react';
import { Switch } from '../components/ui/switch';

interface MigrationStats {
  stats: {
    id: string;
    total_subscribers: number;
    migrated_subscribers: number;
    failed_subscribers: number;
    last_batch_id: string | null;
    last_batch_date: string | null;
  };
  counts: {
    pending: number;
    in_progress: number;
    migrated: number;
    failed: number;
  };
  latest_batches: Array<{
    migration_batch: string;
    count: number;
  }>;
  automation?: {
    enabled: boolean;
    daily_total_target: number;
    start_hour: number;
    end_hour: number;
    min_batch_size: number;
    max_batch_size: number;
    last_automated_run: string | null;
    publication_id: string | null;
  };
}

const AdminEmailMigration = () => {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [batchSize, setBatchSize] = useState(100);
  const [processingBatch, setProcessingBatch] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [publicationId, setPublicationId] = useState('pub_7588ba6b-a268-4571-9135-47a68568ee64');
  
  const [automationEnabled, setAutomationEnabled] = useState(false);
  const [dailyTotalTarget, setDailyTotalTarget] = useState(1000);
  const [startHour, setStartHour] = useState(9);
  const [endHour, setEndHour] = useState(17);
  const [minBatchSize, setMinBatchSize] = useState(10);
  const [maxBatchSize, setMaxBatchSize] = useState(100);
  const [lastAutomatedRun, setLastAutomatedRun] = useState<string | null>(null);
  const [runningAutoBatch, setRunningAutoBatch] = useState(false);

  const { data: migrationStats, refetch: refetchStats, isLoading: statsLoading } = useQuery<MigrationStats>({
    queryKey: ['email-migration-stats'],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('email-migration', {
        method: 'GET',
        body: { action: 'stats' }
      });

      if (error) {
        throw new Error(`Failed to fetch migration stats: ${error.message}`);
      }
      
      return data;
    },
    refetchInterval: runningAutoBatch ? 3000 : false,
  });

  useEffect(() => {
    if (migrationStats?.automation) {
      setAutomationEnabled(migrationStats.automation.enabled);
      setDailyTotalTarget(migrationStats.automation.daily_total_target);
      setStartHour(migrationStats.automation.start_hour);
      setEndHour(migrationStats.automation.end_hour);
      setMinBatchSize(migrationStats.automation.min_batch_size);
      setMaxBatchSize(migrationStats.automation.max_batch_size);
      setLastAutomatedRun(migrationStats.automation.last_automated_run);
    }
  }, [migrationStats]);

  const migrateBatchMutation = useMutation({
    mutationFn: async () => {
      setProcessingBatch(true);
      
      const { data, error } = await supabase.functions.invoke('email-migration', {
        method: 'POST',
        body: { 
          action: 'migrate-batch',
          batchSize,
          publicationId
        }
      });
      
      if (error) {
        throw new Error(`Failed to process migration batch: ${error.message}`);
      }
      
      return data;
    },
    onSuccess: (data) => {
      toast.success(`Processed batch ${data.batchId}: ${data.results.success} succeeded, ${data.results.failed} failed`);
      refetchStats();
    },
    onError: (error) => {
      toast.error(`Error processing batch: ${error.message}`);
    },
    onSettled: () => {
      setProcessingBatch(false);
    }
  });

  const resetFailedMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('email-migration', {
        method: 'POST',
        body: { action: 'reset-failed' }
      });
      
      if (error) {
        throw new Error(`Failed to reset failed migrations: ${error.message}`);
      }
      
      return data;
    },
    onSuccess: (data) => {
      toast.success(data.message);
      refetchStats();
    },
    onError: (error) => {
      toast.error(`Error resetting failed migrations: ${error.message}`);
    }
  });

  const updateAutomationMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('email-migration', {
        method: 'POST',
        body: { 
          action: 'update-automation',
          settings: {
            enabled: automationEnabled,
            daily_total_target: dailyTotalTarget,
            start_hour: startHour,
            end_hour: endHour,
            min_batch_size: minBatchSize,
            max_batch_size: maxBatchSize,
            publication_id: publicationId
          }
        }
      });
      
      if (error) {
        throw new Error(`Failed to update automation settings: ${error.message}`);
      }
      
      return data;
    },
    onSuccess: (data) => {
      toast.success("Automation settings updated successfully");
      refetchStats();
    },
    onError: (error) => {
      toast.error(`Error updating automation settings: ${error.message}`);
    }
  });

  const runAutomatedBatchMutation = useMutation({
    mutationFn: async () => {
      setRunningAutoBatch(true);
      
      const { data, error } = await supabase.functions.invoke('email-migration', {
        method: 'POST',
        body: { 
          action: 'run-automated-batch',
          publicationId
        }
      });
      
      if (error) {
        throw new Error(`Failed to run automated batch: ${error.message}`);
      }
      
      return data;
    },
    onSuccess: (data) => {
      if (data.success) {
        toast.success(`Automated batch ${data.batchId}: ${data.results.success} succeeded, ${data.results.failed} failed`);
      } else {
        toast.info(data.message);
      }
      refetchStats();
    },
    onError: (error) => {
      toast.error(`Error running automated batch: ${error.message}`);
    },
    onSettled: () => {
      setTimeout(() => {
        setRunningAutoBatch(false);
      }, 5000);
    }
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0] || null;
    setFile(selectedFile);
    setFileError(null);
    
    if (selectedFile) {
      if (!selectedFile.name.toLowerCase().endsWith('.csv')) {
        setFileError('Please select a CSV file');
        return;
      }
      
      if (selectedFile.size > 20 * 1024 * 1024) {
        setFileError('File is too large (max 20MB)');
        return;
      }
    }
  };

  const handleFileUpload = async () => {
    if (!file) {
      toast.error('Please select a file to upload');
      return;
    }

    setUploading(true);
    setFileError(null);
    setUploadProgress(0);
    
    try {
      const text = await file.text();
      console.log("File content preview:", text.substring(0, 200) + "...");
      
      const rows = text.split('\n');
      
      if (rows.length < 2) {
        throw new Error('CSV file appears to be empty or malformed');
      }
      
      const headers = rows[0].split(',').map(h => h.trim().toLowerCase());
      console.log("CSV headers:", headers);
      
      const emailIndex = headers.findIndex(h => h.includes('email'));
      const firstNameIndex = headers.findIndex(h => 
        (h.includes('first') && h.includes('name')) || h === 'firstname'
      );
      const lastNameIndex = headers.findIndex(h => 
        (h.includes('last') && h.includes('name')) || h === 'lastname'
      );
      
      if (emailIndex === -1) {
        throw new Error('Could not find email column in CSV. Please ensure your CSV has an "email" column.');
      }
      
      const subscribers = [];
      const totalRows = rows.length - 1;
      
      for (let i = 1; i < rows.length; i++) {
        if (!rows[i].trim()) continue;
        
        if (i % 1000 === 0 || i === rows.length - 1) {
          setUploadProgress(Math.floor((i / totalRows) * 100));
        }
        
        let columns: string[] = [];
        let inQuote = false;
        let currentValue = '';
        
        for (let j = 0; j < rows[i].length; j++) {
          const char = rows[i][j];
          
          if (char === '"') {
            inQuote = !inQuote;
          } else if (char === ',' && !inQuote) {
            columns.push(currentValue);
            currentValue = '';
          } else {
            currentValue += char;
          }
        }
        
        columns.push(currentValue);
        
        if (columns.length <= emailIndex) continue;
        
        const email = columns[emailIndex].trim().replace(/^"|"$/g, '');
        if (!email) continue;
        
        const subscriber = {
          email,
          first_name: firstNameIndex >= 0 && columns.length > firstNameIndex 
            ? columns[firstNameIndex].trim().replace(/^"|"$/g, '') 
            : '',
          last_name: lastNameIndex >= 0 && columns.length > lastNameIndex 
            ? columns[lastNameIndex].trim().replace(/^"|"$/g, '') 
            : ''
        };
        
        subscribers.push(subscriber);
      }
      
      if (subscribers.length === 0) {
        throw new Error('No valid subscribers found in file');
      }
      
      console.log(`Parsed ${subscribers.length} subscribers from CSV file`);
      setUploadProgress(100);
      
      const { data, error } = await supabase.functions.invoke('email-migration', {
        method: 'POST',
        body: {
          action: 'import',
          subscribers
        }
      });
      
      if (error) {
        console.error("Import API error:", error);
        throw new Error(`Failed to import subscribers: ${error.message}`);
      }
      
      console.log("Import API success response:", data);
      
      toast.success(`Imported ${data.message || `${subscribers.length} subscribers`}`);
      setFile(null);
      refetchStats();
    } catch (error) {
      console.error("Error during file upload:", error);
      setFileError(error.message);
      toast.error(`Error uploading file: ${error.message}`);
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const calculateProgress = () => {
    if (!migrationStats || migrationStats.stats.total_subscribers === 0) return 0;
    
    return (migrationStats.stats.migrated_subscribers / migrationStats.stats.total_subscribers) * 100;
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Never';
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  return (
    <div className="container mx-auto py-6">
      <BackToAdminButton />
      <AdminPageHeader 
        title="Email Migration" 
        description="Migrate subscribers from OnGage to BeehiiV"
      />

      <Tabs defaultValue="dashboard" className="w-full mt-6">
        <TabsList>
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="import">Import Subscribers</TabsTrigger>
          <TabsTrigger value="migrate">Migrate Batch</TabsTrigger>
          <TabsTrigger value="automation">Automation</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="space-y-6">
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-2">Migration Progress</h3>
            {statsLoading ? (
              <div>Loading statistics...</div>
            ) : !migrationStats ? (
              <div>No migration data available</div>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                  <div className="bg-slate-100 p-4 rounded-lg">
                    <div className="text-sm text-slate-500">Total Subscribers</div>
                    <div className="text-2xl font-bold">{migrationStats.stats.total_subscribers}</div>
                  </div>
                  <div className="bg-slate-100 p-4 rounded-lg">
                    <div className="text-sm text-slate-500">Migrated</div>
                    <div className="text-2xl font-bold text-green-600">{migrationStats.stats.migrated_subscribers}</div>
                  </div>
                  <div className="bg-slate-100 p-4 rounded-lg">
                    <div className="text-sm text-slate-500">Failed</div>
                    <div className="text-2xl font-bold text-red-600">{migrationStats.stats.failed_subscribers}</div>
                  </div>
                  <div className="bg-slate-100 p-4 rounded-lg">
                    <div className="text-sm text-slate-500">Completion</div>
                    <div className="text-2xl font-bold">
                      {migrationStats.stats.total_subscribers === 0 
                        ? '0%' 
                        : `${Math.round((migrationStats.stats.migrated_subscribers / migrationStats.stats.total_subscribers) * 100)}%`}
                    </div>
                  </div>
                </div>

                <div className="mb-6">
                  <div className="flex justify-between mb-2">
                    <span>Migration Progress</span>
                    <span>{`${Math.round(calculateProgress())}%`}</span>
                  </div>
                  <Progress value={calculateProgress()} className="h-2" />
                </div>

                {migrationStats.automation && (
                  <div className="bg-slate-50 p-4 rounded-lg mb-6 flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">Automation Status</h4>
                      <p className="text-sm text-slate-600">
                        {migrationStats.automation.enabled 
                          ? `Active: ${migrationStats.automation.daily_total_target} subscribers per day` 
                          : 'Disabled'}
                      </p>
                      {migrationStats.automation.last_automated_run && (
                        <p className="text-xs text-slate-500">
                          Last run: {formatDate(migrationStats.automation.last_automated_run)}
                        </p>
                      )}
                      {runningAutoBatch && (
                        <p className="text-xs text-green-500 font-semibold animate-pulse mt-1">
                          Migration in progress...
                        </p>
                      )}
                    </div>
                    <div className="flex space-x-2">
                      <Button 
                        size="sm" 
                        variant={migrationStats.automation.enabled ? "default" : "outline"}
                        onClick={() => runAutomatedBatchMutation.mutate()}
                        disabled={runningAutoBatch}
                      >
                        <PlayCircle className="mr-1 h-4 w-4" /> 
                        {runningAutoBatch ? 'Running...' : 'Run Now'}
                      </Button>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-medium mb-2">Status Breakdown</h4>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Status</TableHead>
                          <TableHead>Count</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        <TableRow>
                          <TableCell>Pending</TableCell>
                          <TableCell>{migrationStats.counts.pending}</TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell>In Progress</TableCell>
                          <TableCell>{migrationStats.counts.in_progress}</TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell>Migrated</TableCell>
                          <TableCell>{migrationStats.counts.migrated}</TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell>Failed</TableCell>
                          <TableCell>{migrationStats.counts.failed}</TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </div>

                  <div>
                    <h4 className="font-medium mb-2">Recent Batches</h4>
                    {migrationStats.latest_batches.length === 0 ? (
                      <p>No batches processed yet</p>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Batch ID</TableHead>
                            <TableHead>Count</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {migrationStats.latest_batches.map((batch) => (
                            <TableRow key={batch.migration_batch}>
                              <TableCell>{batch.migration_batch}</TableCell>
                              <TableCell>{batch.count}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </div>
                </div>

                {migrationStats.stats.failed_subscribers > 0 && (
                  <div className="mt-6">
                    <Button 
                      variant="outline" 
                      onClick={() => resetFailedMutation.mutate()}
                      disabled={resetFailedMutation.isPending}
                    >
                      {resetFailedMutation.isPending ? 'Resetting...' : 'Reset Failed Migrations'}
                    </Button>
                  </div>
                )}
              </>
            )}
          </Card>

          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Migration Documentation</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Button variant="outline" onClick={() => window.open('/docs/EMAIL_MIGRATION_PLAN.md', '_blank')}>
                View Migration Plan
              </Button>
              <Button variant="outline" onClick={() => window.open('/docs/EMAIL_MIGRATION_PROGRESS.md', '_blank')}>
                View Progress Tracker
              </Button>
              <Button variant="outline" onClick={() => window.open('/docs/EMAIL_MIGRATION_DECISIONS.md', '_blank')}>
                View Technical Decisions
              </Button>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="import" className="space-y-6">
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Import Subscribers from CSV</h3>
            
            {fileError && (
              <Alert variant="destructive" className="mb-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{fileError}</AlertDescription>
              </Alert>
            )}
            
            <div className="space-y-4">
              <div>
                <label htmlFor="file-upload" className="block text-sm font-medium mb-2">
                  Select OnGage export file (CSV)
                </label>
                <input
                  id="file-upload"
                  type="file"
                  accept=".csv"
                  className="block w-full text-sm text-slate-500
                    file:mr-4 file:py-2 file:px-4
                    file:rounded-md file:border-0
                    file:text-sm file:font-semibold
                    file:bg-slate-50 file:text-slate-700
                    hover:file:bg-slate-100"
                  onChange={handleFileChange}
                  disabled={uploading}
                />
                <p className="mt-1 text-sm text-slate-500">
                  The CSV should have columns for email, first_name, and last_name
                </p>
              </div>
              
              {uploadProgress > 0 && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Parsing CSV</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <Progress value={uploadProgress} className="h-2" />
                </div>
              )}
              
              <Button 
                onClick={handleFileUpload} 
                disabled={!file || uploading || !!fileError}
              >
                {uploading ? 'Uploading...' : 'Upload & Import'}
              </Button>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="migrate" className="space-y-6">
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Migrate Batch to BeehiiV</h3>
            <div className="space-y-4">
              <div>
                <label htmlFor="batch-size" className="block text-sm font-medium mb-2">
                  Batch Size
                </label>
                <input
                  id="batch-size"
                  type="number"
                  min="10"
                  max="1000"
                  value={batchSize}
                  onChange={(e) => setBatchSize(parseInt(e.target.value) || 100)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"
                  disabled={processingBatch}
                />
              </div>
              <Button 
                onClick={() => migrateBatchMutation.mutate()}
                disabled={processingBatch || statsLoading || (migrationStats?.counts.pending === 0 && migrationStats?.counts.in_progress === 0)}
              >
                {processingBatch ? 'Processing...' : 'Process Batch'}
              </Button>
              <div className="text-sm text-slate-500 mt-2">
                {statsLoading ? 'Loading...' : (
                  migrationStats?.counts.pending === 0 
                    ? 'No subscribers pending migration' 
                    : `${migrationStats?.counts.pending} subscribers pending migration`
                )}
              </div>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="automation" className="space-y-6">
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Migration Automation</h3>
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium">Enable Automation</h4>
                  <p className="text-sm text-slate-500">
                    When enabled, subscribers will be automatically migrated according to your settings
                  </p>
                </div>
                <Switch 
                  checked={automationEnabled} 
                  onCheckedChange={setAutomationEnabled}
                />
              </div>

              <div className="border-t pt-4">
                <h4 className="font-medium mb-4">Time Window Settings</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="start-hour" className="block text-sm font-medium mb-2">
                      Start Hour (24h format)
                    </label>
                    <input
                      id="start-hour"
                      type="number"
                      min="0"
                      max="23"
                      value={startHour}
                      onChange={(e) => setStartHour(parseInt(e.target.value) || 0)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"
                    />
                    <p className="mt-1 text-xs text-slate-500">
                      Migrations will only occur after this hour (e.g., 9 for 9:00 AM)
                    </p>
                  </div>
                  <div>
                    <label htmlFor="end-hour" className="block text-sm font-medium mb-2">
                      End Hour (24h format)
                    </label>
                    <input
                      id="end-hour"
                      type="number"
                      min="0"
                      max="23"
                      value={endHour}
                      onChange={(e) => setEndHour(parseInt(e.target.value) || 0)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"
                    />
                    <p className="mt-1 text-xs text-slate-500">
                      Migrations will stop at this hour (e.g., 17 for 5:00 PM)
                    </p>
                  </div>
                </div>
              </div>

              <div className="border-t pt-4">
                <h4 className="font-medium mb-4">Volume Settings</h4>
                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <label htmlFor="daily-target" className="block text-sm font-medium mb-2">
                      Daily Migration Target
                    </label>
                    <input
                      id="daily-target"
                      type="number"
                      min="10"
                      max="10000"
                      value={dailyTotalTarget}
                      onChange={(e) => setDailyTotalTarget(parseInt(e.target.value) || 1000)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"
                    />
                    <p className="mt-1 text-xs text-slate-500">
                      Maximum number of subscribers to migrate per day
                    </p>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="min-batch" className="block text-sm font-medium mb-2">
                        Minimum Batch Size
                      </label>
                      <input
                        id="min-batch"
                        type="number"
                        min="1"
                        max="1000"
                        value={minBatchSize}
                        onChange={(e) => setMinBatchSize(parseInt(e.target.value) || 10)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"
                      />
                    </div>
                    <div>
                      <label htmlFor="max-batch" className="block text-sm font-medium mb-2">
                        Maximum Batch Size
                      </label>
                      <input
                        id="max-batch"
                        type="number"
                        min="1"
                        max="1000"
                        value={maxBatchSize}
                        onChange={(e) => setMaxBatchSize(parseInt(e.target.value) || 100)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"
                      />
                    </div>
                  </div>
                  <p className="text-xs text-slate-500">
                    Each automated run will process a random number of subscribers between the minimum and maximum batch size.
                    This creates a more natural-looking migration pattern.
                  </p>
                </div>
              </div>

              <div className="border-t pt-4 flex justify-between items-center">
                {lastAutomatedRun && (
                  <div className="text-sm text-slate-500">
                    Last automated run: {formatDate(lastAutomatedRun)}
                  </div>
                )}
                {runningAutoBatch && (
                  <div className="text-sm text-green-500 font-semibold animate-pulse">
                    Migration in progress...
                  </div>
                )}
                <div className="flex space-x-2">
                  <Button 
                    variant="outline" 
                    onClick={() => runAutomatedBatchMutation.mutate()}
                    disabled={runningAutoBatch}
                  >
                    <PlayCircle className="mr-1 h-4 w-4" />
                    {runningAutoBatch ? 'Running...' : 'Run Now'}
                  </Button>
                  <Button 
                    onClick={() => updateAutomationMutation.mutate()}
                    disabled={updateAutomationMutation.isPending}
                  >
                    {updateAutomationMutation.isPending ? 'Saving...' : 'Save Settings'}
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="space-y-6">
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Migration Settings</h3>
            <div className="space-y-4">
              <div>
                <label htmlFor="publication-id" className="block text-sm font-medium mb-2">
                  BeehiiV Publication ID
                </label>
                <input
                  id="publication-id"
                  type="text"
                  value={publicationId}
                  onChange={(e) => setPublicationId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"
                  placeholder="e.g. pub_7588ba6b-a268-4571-9135-47a68568ee64"
                />
                <p className="mt-1 text-sm text-slate-500">
                  The BeehiiV Publication ID is used to specify which publication subscribers should be migrated to.
                </p>
                <p className="mt-1 text-sm text-slate-500 font-medium">
                  Important: This is separate from the sweeps app BeehiiV publication.
                </p>
              </div>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminEmailMigration;
