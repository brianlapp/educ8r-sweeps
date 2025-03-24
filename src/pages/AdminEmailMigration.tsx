
import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { toast } from "@/components/ui/use-toast"
import { useToast } from "@/components/ui/use-toast"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Separator } from "@/components/ui/separator"
import { Loader2, RefreshCw, Trash, Copy, ExternalLink } from "lucide-react"
import { SUPABASE_URL } from "@/integrations/supabase/client";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { useQuery } from "@tanstack/react-query";

const ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVwZnpyYWVqcXVheHFyZm1rbXl4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzk0NzA2ODIsImV4cCI6MjA1NTA0NjY4Mn0.LY300ASTr6cn4vl2ZkCR0pV0rmah9YKLaUXVM5ISytM";

interface MigrationStats {
  id: string;
  total_subscribers: number;
  migrated_subscribers: number;
  failed_subscribers: number;
  last_batch_id: string | null;
  last_batch_date: string | null;
}

interface StatusCounts {
  pending: number;
  in_progress: number;
  migrated: number;
  failed: number;
}

interface SuccessfulSubscriber {
  email: string;
  first_name: string | null;
  last_name: string | null;
  migrated_at: string;
  subscriber_id?: string;
  status?: string;
}

const AdminEmailMigration = () => {
  const [migrationStats, setMigrationStats] = useState<MigrationStats | null>(null);
  const [statusCounts, setStatusCounts] = useState<StatusCounts | null>(null);
  const [latestBatches, setLatestBatches] = useState<any[]>([]);
  const [automationSettings, setAutomationSettings] = useState<any>(null);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [subscribersData, setSubscribersData] = useState('');
  const [isMigrating, setIsMigrating] = useState(false);
  const [resettingFailed, setResettingFailed] = useState(false);
  const [clearingQueue, setClearingQueue] = useState(false);
  const [latestBatchResults, setLatestBatchResults] = useState<any>(null);

  const { toast } = useToast();

  // Query for recent migrations
  const recentMigrationsQuery = useQuery({
    queryKey: ['recentMigrations'],
    queryFn: fetchRecentMigrations,
    refetchInterval: 60000, // Refresh every minute
  });

  async function fetchRecentMigrations(): Promise<SuccessfulSubscriber[]> {
    try {
      const response = await fetch(
        `${SUPABASE_URL}/functions/v1/email-migration?action=recent-migrations`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${ANON_KEY}`
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch recent migrations');
      }

      const data = await response.json();
      return data.migrations || [];
    } catch (error: any) {
      console.error("Error fetching recent migrations:", error);
      return [];
    }
  }

  useEffect(() => {
    refetchMigrationStats();
  }, []);

  const refetchMigrationStats = async () => {
    try {
      const response = await fetch(
        `${SUPABASE_URL}/functions/v1/email-migration?action=stats`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${ANON_KEY}`
          },
        }
      );
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch migration stats');
      }

      setMigrationStats(data.stats);
      setStatusCounts(data.counts);
      setLatestBatches(data.latest_batches);
      setAutomationSettings(data.automation);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      })
    }
  };

  const handleImportSubscribers = async () => {
    try {
      const subscribers = JSON.parse(subscribersData);

      if (!Array.isArray(subscribers)) {
        throw new Error("Invalid subscriber data format: expected an array");
      }

      const response = await fetch(
        `${SUPABASE_URL}/functions/v1/email-migration?action=import`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${ANON_KEY}`
          },
          body: JSON.stringify({ subscribers }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to import subscribers');
      }

      toast({
        title: "Success",
        description: result.message || 'Subscribers imported successfully',
      })
      setIsImportDialogOpen(false);
      setSubscribersData('');
      refetchMigrationStats();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      })
    }
  };

  const handleMigrateSubscribers = async () => {
    setIsMigrating(true);
    try {
      const response = await fetch(
        `${SUPABASE_URL}/functions/v1/email-migration`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${ANON_KEY}`
          },
          body: JSON.stringify({ action: 'migrate-batch' }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to migrate subscribers');
      }

      // Store the latest batch results
      setLatestBatchResults(result);

      toast({
        title: "Success",
        description: `Migration batch ${result.batchId} started. ${result.results.success} migrated, ${result.results.failed} failed.`,
      })
      
      refetchMigrationStats();
      // Also refresh recent migrations
      recentMigrationsQuery.refetch();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      })
    } finally {
      setIsMigrating(false);
    }
  };

  const handleResetFailed = async () => {
    if (!window.confirm("Are you sure you want to reset all failed migrations?")) {
      return;
    }

    setResettingFailed(true);
    try {
      const response = await fetch(
        `${SUPABASE_URL}/functions/v1/email-migration`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${ANON_KEY}`
          },
          body: JSON.stringify({ action: 'reset-failed' }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to reset failed migrations');
      }

      toast({
        title: "Success",
        description: result.message || 'Failed migrations reset successfully',
      })
      refetchMigrationStats();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      })
    } finally {
      setResettingFailed(false);
    }
  };

  // Add function to clear the migration queue
  const clearMigrationQueue = async () => {
    if (!window.confirm("Are you sure you want to clear all pending migrations from the queue? This action cannot be undone.")) {
      return;
    }
    
    setClearingQueue(true);
    try {
      const response = await fetch(
        `${SUPABASE_URL}/functions/v1/email-migration`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${ANON_KEY}`
          },
          body: JSON.stringify({ 
            action: 'clear-queue'
          })
        }
      );
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Unknown error occurred');
      }
      
      toast({
        title: "Success",
        description: result.message || 'Migration queue cleared successfully',
      });
      
      // Refresh stats and counts after clearing
      refetchMigrationStats();
    } catch (error: any) {
      toast({
        variant: "destructive", 
        title: "Error", 
        description: `Error clearing migration queue: ${error.message}`
      });
    } finally {
      setClearingQueue(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      toast({
        title: "Copied",
        description: "Text copied to clipboard",
      });
    });
  };

  return (
    <div className="container mx-auto py-8">
      <AdminPageHeader 
        title="Email Migration Tool" 
        description="Migrate subscribers from Ongage to BeehiiV"
      />
      
      <Tabs defaultValue="stats" className="w-full mt-6">
        <TabsList className="grid w-full grid-cols-4 mb-4">
          <TabsTrigger value="stats">Migration Stats</TabsTrigger>
          <TabsTrigger value="import">Import Subscribers</TabsTrigger>
          <TabsTrigger value="migrate">Migrate Subscribers</TabsTrigger>
          <TabsTrigger value="recent">Recent Migrations</TabsTrigger>
        </TabsList>
        
        <TabsContent value="stats">
          <Card>
            <CardHeader>
              <CardTitle>Migration Statistics</CardTitle>
              <CardDescription>
                Overview of the email migration process.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {migrationStats ? (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium">Total Subscribers:</p>
                    <p>{migrationStats.total_subscribers}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Migrated Subscribers:</p>
                    <p>{migrationStats.migrated_subscribers}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Failed Subscribers:</p>
                    <p>{migrationStats.failed_subscribers}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Last Batch ID:</p>
                    <p>{migrationStats.last_batch_id || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Last Batch Date:</p>
                    <p>{migrationStats.last_batch_date || 'N/A'}</p>
                  </div>
                </div>
              ) : (
                <p>Loading migration statistics...</p>
              )}
            </CardContent>
          </Card>

          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Status Counts</CardTitle>
              <CardDescription>
                Current counts of subscribers by status.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {statusCounts ? (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium">Pending:</p>
                    <p>{statusCounts.pending}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">In Progress:</p>
                    <p>{statusCounts.in_progress}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Migrated:</p>
                    <p>{statusCounts.migrated}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Failed:</p>
                    <p>{statusCounts.failed}</p>
                  </div>
                </div>
              ) : (
                <p>Loading status counts...</p>
              )}
            </CardContent>
          </Card>

          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Latest Batches</CardTitle>
              <CardDescription>
                The 5 most recent migration batches.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {latestBatches && latestBatches.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[100px]">Batch ID</TableHead>
                      <TableHead>Count</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {latestBatches.map((batch) => (
                      <TableRow key={batch.migration_batch}>
                        <TableCell className="font-medium">{batch.migration_batch}</TableCell>
                        <TableCell>{batch.count}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p>No recent batches found.</p>
              )}
            </CardContent>
          </Card>
          
          {/* Add Clear Queue button in the actions section */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Queue Management</CardTitle>
              <CardDescription>
                Manage the migration queue
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col space-y-4">
                <div>
                  <h3 className="text-lg font-medium">Clear Migration Queue</h3>
                  <p className="text-sm text-muted-foreground mb-2">
                    Remove all pending migrations from the queue. This is useful if you've uploaded the wrong data and want to start fresh.
                  </p>
                  <Button 
                    variant="destructive" 
                    onClick={clearMigrationQueue} 
                    disabled={clearingQueue || !statusCounts?.pending}
                  >
                    {clearingQueue ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Clearing...
                      </>
                    ) : (
                      <>
                        <Trash className="mr-2 h-4 w-4" />
                        Clear Migration Queue ({statusCounts?.pending || 0} pending)
                      </>
                    )}
                  </Button>
                </div>
                
                <Separator />
                
                <div>
                  <h3 className="text-lg font-medium">Reset Failed Migrations</h3>
                  <p className="text-sm text-muted-foreground mb-2">
                    Reset all failed migrations back to pending status to retry them.
                  </p>
                  <Button 
                    variant="secondary" 
                    onClick={handleResetFailed} 
                    disabled={resettingFailed || !statusCounts?.failed}
                  >
                    {resettingFailed ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Resetting...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="mr-2 h-4 w-4" />
                        Reset Failed Migrations ({statusCounts?.failed || 0})
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="import">
          <Card>
            <CardHeader>
              <CardTitle>Import Subscribers</CardTitle>
              <CardDescription>
                Import subscribers from a JSON file.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Dialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen}>
                <DialogTrigger asChild>
                  <Button>Import Subscribers</Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[425px]">
                  <DialogHeader>
                    <DialogTitle>Import Subscribers</DialogTitle>
                    <DialogDescription>
                      Enter the subscribers data in JSON format.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="subscribers">Subscribers Data</Label>
                      <Textarea
                        id="subscribers"
                        className="col-span-3"
                        value={subscribersData}
                        onChange={(e) => setSubscribersData(e.target.value)}
                      />
                    </div>
                  </div>
                  <Button onClick={handleImportSubscribers}>Import</Button>
                </DialogContent>
              </Dialog>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="migrate">
          <Card>
            <CardHeader>
              <CardTitle>Migrate Subscribers</CardTitle>
              <CardDescription>
                Migrate subscribers to Beehiiv.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={handleMigrateSubscribers} disabled={isMigrating}>
                {isMigrating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Migrating...
                  </>
                ) : (
                  "Migrate Subscribers"
                )}
              </Button>
              
              {latestBatchResults && (
                <div className="mt-6">
                  <h3 className="text-lg font-medium mb-2">Latest Migration Results</h3>
                  <div className="bg-muted p-4 rounded-md">
                    <p><strong>Batch ID:</strong> {latestBatchResults.batchId}</p>
                    <p><strong>Success:</strong> {latestBatchResults.results.success}</p>
                    <p><strong>Failed:</strong> {latestBatchResults.results.failed}</p>
                    
                    {latestBatchResults.results.successful_sample && latestBatchResults.results.successful_sample.length > 0 && (
                      <>
                        <h4 className="text-md font-medium mt-2 mb-1">Sample of Successful Migrations:</h4>
                        <ul className="list-disc pl-5">
                          {latestBatchResults.results.successful_sample.map((sub: any, index: number) => (
                            <li key={index}>
                              {sub.email} 
                              {sub.response?.data?.id && (
                                <span className="ml-2 text-xs">
                                  (ID: {sub.response.data.id}) 
                                  <Button variant="ghost" size="sm" className="h-5 w-5 p-0 ml-1" onClick={() => copyToClipboard(sub.response.data.id)}>
                                    <Copy className="h-3 w-3" />
                                  </Button>
                                </span>
                              )}
                            </li>
                          ))}
                        </ul>
                      </>
                    )}
                    
                    {latestBatchResults.results.errors && latestBatchResults.results.errors.length > 0 && (
                      <>
                        <h4 className="text-md font-medium mt-2 mb-1">Errors:</h4>
                        <ul className="list-disc pl-5">
                          {latestBatchResults.results.errors.map((error: any, index: number) => (
                            <li key={index}>{error.email}: {error.error}</li>
                          ))}
                        </ul>
                      </>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="recent">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Recent Migrations</CardTitle>
                  <CardDescription>
                    List of recently migrated subscribers.
                  </CardDescription>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => recentMigrationsQuery.refetch()}
                  disabled={recentMigrationsQuery.isFetching}
                >
                  {recentMigrationsQuery.isFetching ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {recentMigrationsQuery.isLoading ? (
                <div className="flex justify-center py-4">
                  <Loader2 className="h-8 w-8 animate-spin" />
                </div>
              ) : recentMigrationsQuery.isError ? (
                <div className="text-destructive">
                  Error loading recent migrations: {(recentMigrationsQuery.error as Error).message}
                </div>
              ) : recentMigrationsQuery.data.length === 0 ? (
                <p>No recent migrations found.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Email</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Migrated At</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recentMigrationsQuery.data.map((migration) => (
                      <TableRow key={migration.email}>
                        <TableCell className="font-medium">
                          {migration.email}
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0 ml-1"
                            onClick={() => copyToClipboard(migration.email)}
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                        </TableCell>
                        <TableCell>{[migration.first_name, migration.last_name].filter(Boolean).join(' ') || 'N/A'}</TableCell>
                        <TableCell>
                          {migration.migrated_at ? new Date(migration.migrated_at).toLocaleString() : 'N/A'}
                        </TableCell>
                        <TableCell className="text-right">
                          {migration.subscriber_id && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7"
                              onClick={() => copyToClipboard(migration.subscriber_id || '')}
                            >
                              <Copy className="h-3 w-3 mr-1" />
                              Copy ID
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminEmailMigration;
