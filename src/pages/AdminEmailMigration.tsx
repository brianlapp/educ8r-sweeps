
import React, { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { supabase } from '../integrations/supabase/client';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Progress } from '../components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { toast } from 'sonner';
import { AdminPageHeader } from '../components/admin/AdminPageHeader';
import { BackToAdminButton } from '../components/admin/BackToAdminButton';

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
}

const AdminEmailMigration = () => {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [batchSize, setBatchSize] = useState(100);
  const [processingBatch, setProcessingBatch] = useState(false);

  // Fetch migration stats
  const { data: migrationStats, refetch: refetchStats, isLoading: statsLoading } = useQuery<MigrationStats>({
    queryKey: ['email-migration-stats'],
    queryFn: async () => {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/email-migration/stats`);
      if (!response.ok) {
        throw new Error('Failed to fetch migration stats');
      }
      return response.json();
    }
  });

  // Batch migration mutation
  const migrateBatchMutation = useMutation({
    mutationFn: async () => {
      setProcessingBatch(true);
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/email-migration/migrate-batch`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          batchSize
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to process migration batch');
      }
      
      return response.json();
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

  // Reset failed migrations mutation
  const resetFailedMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/email-migration/reset-failed`, {
        method: 'POST'
      });
      
      if (!response.ok) {
        throw new Error('Failed to reset failed migrations');
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      toast.success(data.message);
      refetchStats();
    },
    onError: (error) => {
      toast.error(`Error resetting failed migrations: ${error.message}`);
    }
  });

  // Handle file upload
  const handleFileUpload = async () => {
    if (!file) {
      toast.error('Please select a file to upload');
      return;
    }

    setUploading(true);
    try {
      // Read the file
      const text = await file.text();
      
      // Parse CSV (simple implementation, could be enhanced)
      const rows = text.split('\n');
      const headers = rows[0].split(',');
      
      // Find the indexes of the columns we need
      const emailIndex = headers.findIndex(h => h.toLowerCase().includes('email'));
      const firstNameIndex = headers.findIndex(h => h.toLowerCase().includes('first') && h.toLowerCase().includes('name'));
      const lastNameIndex = headers.findIndex(h => h.toLowerCase().includes('last') && h.toLowerCase().includes('name'));
      
      if (emailIndex === -1) {
        toast.error('Could not find email column in CSV');
        setUploading(false);
        return;
      }
      
      // Parse subscribers
      const subscribers = [];
      
      for (let i = 1; i < rows.length; i++) {
        if (!rows[i].trim()) continue;
        
        const columns = rows[i].split(',');
        
        if (columns.length <= emailIndex) continue;
        
        const email = columns[emailIndex].trim();
        if (!email) continue;
        
        const subscriber = {
          email,
          first_name: firstNameIndex >= 0 && columns.length > firstNameIndex ? columns[firstNameIndex].trim() : '',
          last_name: lastNameIndex >= 0 && columns.length > lastNameIndex ? columns[lastNameIndex].trim() : ''
        };
        
        subscribers.push(subscriber);
      }
      
      if (subscribers.length === 0) {
        toast.error('No valid subscribers found in file');
        setUploading(false);
        return;
      }
      
      // Send to the import API
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/email-migration/import`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          subscribers
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to import subscribers');
      }
      
      const result = await response.json();
      toast.success(`Imported ${subscribers.length} subscribers successfully`);
      setFile(null);
      refetchStats();
    } catch (error) {
      toast.error(`Error uploading file: ${error.message}`);
    } finally {
      setUploading(false);
    }
  };

  // Calculate progress percentage
  const calculateProgress = () => {
    if (!migrationStats || migrationStats.stats.total_subscribers === 0) return 0;
    
    return (migrationStats.stats.migrated_subscribers / migrationStats.stats.total_subscribers) * 100;
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
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                  disabled={uploading}
                />
              </div>
              <Button 
                onClick={handleFileUpload} 
                disabled={!file || uploading}
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
      </Tabs>
    </div>
  );
};

export default AdminEmailMigration;
