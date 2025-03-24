import React, { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { supabase } from '../integrations/supabase/client';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Progress } from '../components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { toast } from '../components/ui/use-toast';
import { AdminPageHeader } from '../components/admin/AdminPageHeader';
import { BackToAdminButton } from '../components/admin/BackToAdminButton';
import { Alert, AlertDescription } from '../components/ui/alert';
import { AlertCircle, PlayCircle, Clipboard, Check, RefreshCw, Trash2 } from 'lucide-react';

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
    already_exists: number;
  };
  latest_batches: Array<{
    migration_batch: string;
    count: number;
  }>;
}

interface SuccessfulSubscriber {
  email: string;
  first_name?: string;
  last_name?: string;
  status?: string;
  subscriber_id?: string;
  migrated_at?: string;
}

const AdminEmailMigration = () => {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [batchSize, setBatchSize] = useState(500); // Default to 500 for BeehiiV API
  const [processingBatch, setProcessingBatch] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [publicationId, setPublicationId] = useState('pub_7588ba6b-a268-4571-9135-47a68568ee64');
  const [recentMigrations, setRecentMigrations] = useState<SuccessfulSubscriber[]>([]);
  const [copiedEmail, setCopiedEmail] = useState<string | null>(null);
  const [loadingRecent, setLoadingRecent] = useState(false);
  const [migrationSummary, setMigrationSummary] = useState<any>(null);
  const [clearingQueue, setClearingQueue] = useState(false);

  const handleError = (error: any, message: string) => {
    console.error(message, error);
    toast.error(`${message}: ${error.message}`);
  };

  // Fetch migration stats - FIXED to use POST method for the API call
  const { data: migrationStats, refetch: refetchStats, isLoading: statsLoading } = useQuery({
    queryKey: ['email-migration-stats'],
    queryFn: async () => {
      try {
        const { data, error } = await supabase.functions.invoke('email-migration', {
          method: 'POST', // Changed from GET to POST
          body: { action: 'stats' }
        });

        if (error) {
          console.error('Stats fetch error:', error);
          handleError(error, 'Error fetching migration stats');
          throw new Error(`Failed to fetch migration stats: ${error.message}`);
        }
        
        return data;
      } catch (err: any) {
        console.error('Error in stats query:', err);
        handleError(err, 'Failed to load migration statistics');
        throw err;
      }
    }
  });

  // Migrate a batch of subscribers
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
      toast.success(`Processed batch: ${data.results.success} migrated, ${data.results.duplicates} duplicates, ${data.results.failed} failed`);
      setMigrationSummary(data);
      setTimeout(() => {
        refetchStats(); // Refresh stats after successful batch with a slight delay
      }, 500);
    },
    onError: (error: any) => {
      toast.error(`Error processing batch: ${error.message}`);
    },
    onSettled: () => {
      setProcessingBatch(false);
    }
  });

  // Clear subscribers from the queue
  const clearQueueMutation = useMutation({
    mutationFn: async (status: string) => {
      setClearingQueue(true);
      
      const { data, error } = await supabase.functions.invoke('email-migration', {
        method: 'POST',
        body: { 
          action: 'clear-queue',
          status
        }
      });
      
      if (error) {
        throw new Error(`Failed to clear ${status} subscribers: ${error.message}`);
      }
      
      return data;
    },
    onSuccess: (data) => {
      toast.success(data.message);
      refetchStats();
    },
    onError: (error: any) => {
      toast.error(`Error clearing queue: ${error.message}`);
    },
    onSettled: () => {
      setClearingQueue(false);
    }
  });

  // Reset failed subscribers to pending
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
    onError: (error: any) => {
      toast.error(`Error resetting failed migrations: ${error.message}`);
    }
  });

  useEffect(() => {
    refetchStats();
  }, []);

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
      
      // First, let's automatically clear any in_progress subscribers to avoid confusion
      await clearQueueMutation.mutateAsync('in_progress');
      
      // Then import the new subscribers
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
      refetchStats(); // Refresh stats after successful import
    } catch (error: any) {
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

  const fetchRecentMigrations = async () => {
    setLoadingRecent(true);
    try {
      const { data, error } = await supabase
        .from('email_migration')
        .select('email, first_name, last_name, migrated_at')
        .eq('status', 'migrated')
        .order('migrated_at', { ascending: false })
        .limit(10);
        
      if (error) {
        throw new Error(`Failed to fetch recent migrations: ${error.message}`);
      }
      
      setRecentMigrations(data.map(item => ({
        email: item.email,
        first_name: item.first_name,
        last_name: item.last_name,
        migrated_at: item.migrated_at
      })));
      
      return data;
    } catch (error: any) {
      toast.error(`Error fetching recent migrations: ${error.message}`);
      return [];
    } finally {
      setLoadingRecent(false);
    }
  };

  useEffect(() => {
    if (migrationStats) {
      fetchRecentMigrations();
    }
  }, [migrationStats]);

  const copyToClipboard = (email: string) => {
    navigator.clipboard.writeText(email)
      .then(() => {
        setCopiedEmail(email);
        toast.success('Email copied to clipboard');
        
        setTimeout(() => {
          setCopiedEmail(null);
        }, 2000);
      })
      .catch(err => {
        toast.error(`Failed to copy: ${err.message}`);
      });
  };

  return (
    <div className="container mx-auto py-6">
      <BackToAdminButton />
      <AdminPageHeader 
        title="Email Migration" 
        description="Migrate subscribers from OnGage to BeehiiV"
      />

      <Tabs defaultValue="workflow" className="w-full mt-6">
        <TabsList>
          <TabsTrigger value="workflow">Migration Workflow</TabsTrigger>
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="workflow" className="space-y-6">
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Step 1: Upload Subscribers</h3>
            
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
              
              <div className="flex space-x-2">
                <Button 
                  onClick={handleFileUpload} 
                  disabled={!file || uploading || !!fileError}
                >
                  {uploading ? 'Uploading...' : 'Upload & Queue'}
                </Button>
                
                <Button 
                  variant="outline" 
                  onClick={() => clearQueueMutation.mutate('pending')} 
                  disabled={clearingQueue || !migrationStats || migrationStats.counts.pending === 0}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Clear Queue
                </Button>
              </div>
              
              {migrationStats && (
                <div className="mt-4 p-4 bg-slate-50 rounded-lg">
                  <div className="text-sm">
                    <p>
                      <span className="font-medium">Pending in queue:</span> {migrationStats.counts.pending} subscribers
                    </p>
                    {migrationStats.counts.in_progress > 0 && (
                      <p>
                        <span className="font-medium">In progress:</span> {migrationStats.counts.in_progress} subscribers
                        <Button 
                          variant="link" 
                          size="sm"
                          className="text-xs p-0 h-auto ml-2"
                          onClick={() => clearQueueMutation.mutate('in_progress')}
                          disabled={clearingQueue}
                        >
                          Clear
                        </Button>
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Step 2: Process Migration Batch</h3>
            <div className="space-y-4">
              <div>
                <label htmlFor="batch-size" className="block text-sm font-medium mb-2">
                  Batch Size (Max 500 recommended for BeehiiV API)
                </label>
                <input
                  id="batch-size"
                  type="number"
                  min="10"
                  max="1000"
                  value={batchSize}
                  onChange={(e) => setBatchSize(parseInt(e.target.value) || 500)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"
                  disabled={processingBatch}
                />
              </div>
              
              <div className="flex space-x-2">
                <Button 
                  onClick={() => migrateBatchMutation.mutate()}
                  disabled={processingBatch || statsLoading || (migrationStats?.counts.pending === 0)}
                >
                  <PlayCircle className="mr-2 h-4 w-4" />
                  {processingBatch ? 'Processing...' : 'Migrate Batch'}
                </Button>
                
                {migrationStats?.counts.failed > 0 && (
                  <Button 
                    variant="outline" 
                    onClick={() => resetFailedMutation.mutate()}
                    disabled={resetFailedMutation.isPending}
                  >
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Reset Failed ({migrationStats.counts.failed})
                  </Button>
                )}
              </div>
              
              <div className="text-sm text-slate-500 mt-2">
                {statsLoading ? 'Loading...' : (
                  migrationStats?.counts.pending === 0 
                    ? 'No subscribers pending migration' 
                    : `${migrationStats?.counts.pending} subscribers pending migration`
                )}
              </div>
              
              {migrationSummary && (
                <div className="mt-4 p-4 bg-slate-50 rounded-lg">
                  <h4 className="font-medium mb-2">Latest Batch Results</h4>
                  <div className="text-sm space-y-1">
                    <p>
                      <span className="font-medium">Batch ID:</span> {migrationSummary.batchId}
                    </p>
                    <p>
                      <span className="font-medium">Processed:</span> {migrationSummary.results.total} subscribers
                    </p>
                    <p>
                      <span className="font-medium">Successfully migrated:</span> {migrationSummary.results.success} subscribers
                    </p>
                    <p>
                      <span className="font-medium">Duplicates found:</span> {migrationSummary.results.duplicates} subscribers
                    </p>
                    <p>
                      <span className="font-medium">Failed:</span> {migrationSummary.results.failed} subscribers
                    </p>
                  </div>
                  
                  {migrationSummary.results.failed > 0 && (
                    <div className="mt-2">
                      <p className="text-sm font-medium">Errors:</p>
                      <div className="mt-1 max-h-40 overflow-auto text-xs bg-slate-100 p-2 rounded">
                        {migrationSummary.results.errors.map((error: any, index: number) => (
                          <div key={index} className="mb-1">
                            <span className="font-mono">{error.email}</span>: {error.error}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </Card>
          
          <Card className="p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Recently Migrated Subscribers</h3>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={fetchRecentMigrations} 
                disabled={loadingRecent}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${loadingRecent ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
            
            {loadingRecent ? (
              <div className="py-8 text-center text-slate-500">Loading recent migrations...</div>
            ) : recentMigrations.length === 0 ? (
              <div className="py-8 text-center text-slate-500">No recently migrated subscribers found</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Email</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Migrated At</TableHead>
                    <TableHead className="w-[100px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentMigrations.map((subscriber) => (
                    <TableRow key={subscriber.email}>
                      <TableCell className="font-medium">{subscriber.email}</TableCell>
                      <TableCell>
                        {subscriber.first_name || ''} {subscriber.last_name || ''}
                      </TableCell>
                      <TableCell>
                        {subscriber.migrated_at ? new Date(subscriber.migrated_at).toLocaleString() : 'Unknown'}
                      </TableCell>
                      <TableCell>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => copyToClipboard(subscriber.email)}
                          title="Copy email to clipboard"
                        >
                          {copiedEmail === subscriber.email ? (
                            <Check className="h-4 w-4 text-green-500" />
                          ) : (
                            <Clipboard className="h-4 w-4" />
                          )}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="dashboard" className="space-y-6">
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-2">Migration Progress</h3>
            {statsLoading ? (
              <div>Loading statistics...</div>
            ) : !migrationStats ? (
              <div>No migration data available</div>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-4">
                  <div className="bg-slate-100 p-4 rounded-lg">
                    <div className="text-sm text-slate-500">Total Subscribers</div>
                    <div className="text-2xl font-bold">{migrationStats.stats.total_subscribers}</div>
                  </div>
                  <div className="bg-slate-100 p-4 rounded-lg">
                    <div className="text-sm text-slate-500">Migrated</div>
                    <div className="text-2xl font-bold text-green-600">{migrationStats.stats.migrated_subscribers}</div>
                  </div>
                  <div className="bg-slate-100 p-4 rounded-lg">
                    <div className="text-sm text-slate-500">Already in BeehiiV</div>
                    <div className="text-2xl font-bold text-blue-600">{migrationStats.counts.already_exists || 0}</div>
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
                          <TableCell>Already in BeehiiV</TableCell>
                          <TableCell>{migrationStats.counts.already_exists || 0}</TableCell>
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
                    {!migrationStats.latest_batches || migrationStats.latest_batches.length === 0 ? (
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
              </>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="reports" className="space-y-6">
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Migration Summary</h3>
            {statsLoading ? (
              <div>Loading statistics...</div>
            ) : !migrationStats ? (
              <div>No migration data available</div>
            ) : (
              <div className="space-y-4">
                <div className="bg-slate-50 p-4 rounded-lg">
                  <h4 className="font-medium mb-2">Overview</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p><span className="font-medium">Total Subscribers:</span> {migrationStats.stats.total_subscribers}</p>
                      <p><span className="font-medium">Successfully Migrated:</span> {migrationStats.stats.migrated_subscribers}</p>
                      <p><span className="font-medium">Already in BeehiiV:</span> {migrationStats.counts.already_exists || 0}</p>
                      <p><span className="font-medium">Failed Migrations:</span> {migrationStats.stats.failed_subscribers}</p>
                      <p><span className="font-medium">Pending Migration:</span> {migrationStats.counts.pending}</p>
                      <p><span className="font-medium">In Progress:</span> {migrationStats.counts.in_progress}</p>
                    </div>
                    <div>
                      <p><span className="font-medium">Last Batch ID:</span> {migrationStats.stats.last_batch_id || 'None'}</p>
                      <p><span className="font-medium">Last Batch Date:</span> {formatDate(migrationStats.stats.last_batch_date)}</p>
                      <p><span className="font-medium">Completion Percentage:</span> {migrationStats.stats.total_subscribers === 0 
                        ? '0%' 
                        : `${Math.round((migrationStats.stats.migrated_subscribers / migrationStats.stats.total_subscribers) * 100)}%`}
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="flex justify-end space-x-2">
                  <Button 
                    variant="outline" 
                    onClick={() => window.print()} 
                    className="print:hidden"
                  >
                    Print Report
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(migrationStats, null, 2));
                      const downloadAnchorNode = document.createElement('a');
                      downloadAnchorNode.setAttribute("href", dataStr);
                      downloadAnchorNode.setAttribute("download", `beehiiv-migration-report-${new Date().toISOString().split('T')[0]}.json`);
                      document.body.appendChild(downloadAnchorNode);
                      downloadAnchorNode.click();
                      downloadAnchorNode.remove();
                    }}
                    className="print:hidden"
                  >
                    Export JSON
                  </Button>
                </div>
              </div>
            )}
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
                  The BeehiiV Publication ID is used to specify which publication subscribers should be migrated to
                </p>
              </div>
              
              <div className="border-t pt-4">
                <h4 className="font-medium mb-2">Queue Management</h4>
                <div className="space-y-2">
                  <Button 
                    variant="outline" 
                    onClick={() => clearQueueMutation.mutate('pending')}
                    disabled={clearingQueue || !migrationStats || migrationStats.counts.pending === 0}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Clear Pending Queue ({migrationStats?.counts.pending || 0})
                  </Button>
                  
                  <Button 
                    variant="outline" 
                    onClick={() => clearQueueMutation.mutate('in_progress')}
                    disabled={clearingQueue || !migrationStats || migrationStats.counts.in_progress === 0}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Clear In Progress ({migrationStats?.counts.in_progress || 0})
                  </Button>
                  
                  <Button 
                    variant="outline" 
                    onClick={() => resetFailedMutation.mutate()}
                    disabled={resetFailedMutation.isPending || !migrationStats || migrationStats.counts.failed === 0}
                  >
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Reset Failed ({migrationStats?.counts.failed || 0})
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminEmailMigration;

