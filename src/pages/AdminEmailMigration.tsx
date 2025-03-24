import { useState, useEffect, useCallback } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { format } from 'date-fns';

// Add the new import for CSVFileUpload
import { CSVFileUpload } from "@/features/email-migration/components/CSVFileUpload";

interface MigrationStats {
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

interface LatestBatch {
  migration_batch: string;
  count: number;
}

interface AutomationSettings {
  enabled: boolean;
  daily_total_target: number;
  start_hour: number;
  end_hour: number;
  min_batch_size: number;
  max_batch_size: number;
  last_automated_run: string | null;
}

interface RecentMigration {
  email: string;
  first_name: string | null;
  last_name: string | null;
  migrated_at: string;
  error: string | null;
}

const AdminEmailMigration = () => {
  const [activeTab, setActiveTab] = useState("import");
  const [jsonInput, setJsonInput] = useState("");
  const [isImporting, setIsImporting] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // State for automation settings
  const [automationEnabled, setAutomationEnabled] = useState(false);
  const [dailyTarget, setDailyTarget] = useState(1000);
  const [startHour, setStartHour] = useState(9);
  const [endHour, setEndHour] = useState(17);
  const [minBatchSize, setMinBatchSize] = useState(10);
  const [maxBatchSize, setMaxBatchSize] = useState(100);

  // State for recent migrations
  const [recentMigrations, setRecentMigrations] = useState<RecentMigration[]>([]);

  // Fetch migration stats
  const { data: stats, isLoading: isStatsLoading } = useQuery(
    ["emailMigrationStats"],
    async () => {
      const { data, error } = await supabase.functions.invoke("email-migration", {
        method: "GET",
        queryParams: { action: "stats" },
      });

      if (error) {
        console.error("Error fetching migration stats:", error);
        throw new Error(error.message);
      }

      return data;
    }
  );

  // Mutation to reset failed migrations
  const resetFailedMutation = useMutation(
    async () => {
      const { data, error } = await supabase.functions.invoke("email-migration", {
        method: "POST",
        queryParams: { action: "reset-failed" },
      });

      if (error) {
        console.error("Error resetting failed migrations:", error);
        throw new Error(error.message);
      }

      return data;
    },
    {
      onSuccess: () => {
        toast({
          title: "Failed migrations reset",
          description: "All failed migrations have been reset to pending.",
        });
        queryClient.invalidateQueries(["emailMigrationStats"]);
      },
      onError: (error: any) => {
        toast({
          title: "Error resetting failed migrations",
          description: error.message,
          variant: "destructive",
        });
      },
    }
  );

  // Mutation to clear the migration queue
  const clearQueueMutation = useMutation(
    async () => {
      const { data, error } = await supabase.functions.invoke("email-migration", {
        method: "POST",
        queryParams: { action: "clear-queue" },
      });

      if (error) {
        console.error("Error clearing migration queue:", error);
        throw new Error(error.message);
      }

      return data;
    },
    {
      onSuccess: () => {
        toast({
          title: "Migration queue cleared",
          description: "All pending migrations have been removed from the queue.",
        });
        queryClient.invalidateQueries(["emailMigrationStats"]);
      },
      onError: (error: any) => {
        toast({
          title: "Error clearing migration queue",
          description: error.message,
          variant: "destructive",
        });
      },
    }
  );

  // Mutation to update automation settings
  const updateAutomationMutation = useMutation(
    async (settings: Partial<AutomationSettings>) => {
      const { data, error } = await supabase.functions.invoke("email-migration", {
        method: "POST",
        queryParams: { action: "update-automation" },
        body: { settings },
      });

      if (error) {
        console.error("Error updating automation settings:", error);
        throw new Error(error.message);
      }

      return data;
    },
    {
      onSuccess: () => {
        toast({
          title: "Automation settings updated",
          description: "Automation settings have been updated successfully.",
        });
        queryClient.invalidateQueries(["emailMigrationStats"]);
      },
      onError: (error: any) => {
        toast({
          title: "Error updating automation settings",
          description: error.message,
          variant: "destructive",
        });
      },
    }
  );

  // Function to refresh stats
  const refreshStats = useCallback(() => {
    queryClient.invalidateQueries(["emailMigrationStats"]);
  }, [queryClient]);

  // Handle JSON import
  const handleJsonImport = async () => {
    setIsImporting(true);
    try {
      const subscribers = JSON.parse(jsonInput);

      if (!Array.isArray(subscribers)) {
        toast({
          title: "Invalid JSON",
          description: "The input must be a JSON array of subscribers.",
          variant: "destructive",
        });
        return;
      }

      const { data, error } = await supabase.functions.invoke("email-migration", {
        method: "POST",
        queryParams: { action: "import" },
        body: { subscribers },
      });

      if (error) {
        console.error("Error importing subscribers:", error);
        toast({
          title: "Import failed",
          description: error.message,
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Subscribers imported",
        description: `Successfully imported ${data.total} subscribers. Inserted: ${data.success}, Duplicates: ${data.duplicates}`,
      });
      setJsonInput("");
      refreshStats();
    } catch (error: any) {
      console.error("Error importing subscribers:", error);
      toast({
        title: "Import failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsImporting(false);
    }
  };

  // Handle automation settings save
  const handleAutomationSave = async () => {
    await updateAutomationMutation.mutateAsync({
      enabled: automationEnabled,
      daily_total_target: dailyTarget,
      start_hour: startHour,
      end_hour: endHour,
      min_batch_size: minBatchSize,
      max_batch_size: maxBatchSize,
    });
  };

  // Fetch recent migrations
  useEffect(() => {
    const fetchRecentMigrations = async () => {
      const { data, error } = await supabase.functions.invoke("email-migration", {
        method: "GET",
        queryParams: { action: "recent-migrations" },
      });

      if (error) {
        console.error("Error fetching recent migrations:", error);
        toast({
          title: "Error fetching recent migrations",
          description: error.message,
          variant: "destructive",
        });
        return;
      }

      setRecentMigrations(data.migrations);
    };

    fetchRecentMigrations();
  }, [toast]);

  // In the Import tab content, update to include the CSVFileUpload component:
  const ImportTab = () => {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>CSV File Import</CardTitle>
            <CardDescription>
              Upload a CSV file with subscriber data to import to BeehiiV
            </CardDescription>
          </CardHeader>
          <CardContent>
            <CSVFileUpload onSuccess={refreshStats} />
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>JSON Import</CardTitle>
            <CardDescription>
              Import subscribers from a JSON array
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Textarea
                placeholder="Paste JSON array of subscribers here..."
                className="min-h-[200px] font-mono text-sm"
                value={jsonInput}
                onChange={(e) => setJsonInput(e.target.value)}
              />
              <Button onClick={handleJsonImport} disabled={isImporting}>
                {isImporting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Importing...
                  </>
                ) : (
                  "Import Subscribers"
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  const StatsTab = () => {
    if (isStatsLoading || !stats) {
      return <p>Loading stats...</p>;
    }

    const { counts, latest_batches, automation } = stats;

    // Set initial automation state from fetched data
    useEffect(() => {
      if (automation) {
        setAutomationEnabled(automation.enabled);
        setDailyTarget(automation.daily_total_target);
        setStartHour(automation.start_hour);
        setEndHour(automation.end_hour);
        setMinBatchSize(automation.min_batch_size);
        setMaxBatchSize(automation.max_batch_size);
      }
    }, [automation]);

    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Migration Statistics</CardTitle>
            <CardDescription>
              Overview of the email migration process.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle>Total Subscribers</CardTitle>
                </CardHeader>
                <CardContent>{stats.stats.total_subscribers}</CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Migrated Subscribers</CardTitle>
                </CardHeader>
                <CardContent>{stats.stats.migrated_subscribers}</CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Failed Subscribers</CardTitle>
                </CardHeader>
                <CardContent>{stats.stats.failed_subscribers}</CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Pending Subscribers</CardTitle>
                </CardHeader>
                <CardContent>{counts.pending}</CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>In Progress</CardTitle>
                </CardHeader>
                <CardContent>{counts.in_progress}</CardContent>
              </Card>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Latest Batches</CardTitle>
            <CardDescription>
              Recent migration batches.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Batch ID</TableHead>
                  <TableHead>Subscribers</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {latest_batches.map((batch: LatestBatch) => (
                  <TableRow key={batch.migration_batch}>
                    <TableCell>{batch.migration_batch}</TableCell>
                    <TableCell>{batch.count}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Automation Settings</CardTitle>
            <CardDescription>
              Configure automated email migrations.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="automation-enabled">Automation Enabled</Label>
              <Switch
                id="automation-enabled"
                checked={automationEnabled}
                onCheckedChange={(checked) => setAutomationEnabled(checked)}
              />
            </div>
            <div>
              <Label htmlFor="daily-target">Daily Total Target</Label>
              <Input
                type="number"
                id="daily-target"
                value={dailyTarget}
                onChange={(e) => setDailyTarget(Number(e.target.value))}
              />
            </div>
            <div>
              <Label>Allowed Time Window</Label>
              <div className="flex items-center space-x-2">
                <Input
                  type="number"
                  value={startHour}
                  onChange={(e) => setStartHour(Number(e.target.value))}
                />
                <span>-</span>
                <Input
                  type="number"
                  value={endHour}
                  onChange={(e) => setEndHour(Number(e.target.value))}
                />
              </div>
            </div>
            <div>
              <Label>Batch Size Range</Label>
              <div className="flex items-center space-x-2">
                <Input
                  type="number"
                  value={minBatchSize}
                  onChange={(e) => setMinBatchSize(Number(e.target.value))}
                />
                <span>-</span>
                <Input
                  type="number"
                  value={maxBatchSize}
                  onChange={(e) => setMaxBatchSize(Number(e.target.value))}
                />
              </div>
            </div>
            <Button onClick={handleAutomationSave}>Save Automation Settings</Button>
            {automation && automation.last_automated_run && (
              <p>
                Last automated run:{" "}
                {format(new Date(automation.last_automated_run), 'yyyy-MM-dd HH:mm:ss')}
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Actions</CardTitle>
            <CardDescription>
              Perform actions on the email migration process.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button
              variant="destructive"
              onClick={() => resetFailedMutation.mutate()}
              disabled={resetFailedMutation.isLoading}
            >
              {resetFailedMutation.isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Resetting...
                </>
              ) : (
                "Reset Failed Migrations"
              )}
            </Button>
            <Button
              variant="destructive"
              onClick={() => clearQueueMutation.mutate()}
              disabled={clearQueueMutation.isLoading}
            >
              {clearQueueMutation.isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Clearing...
                </>
              ) : (
                "Clear Migration Queue"
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  };

  const RecentTab = () => {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recent Migrations</CardTitle>
          <CardDescription>
            The 10 most recent successful migrations.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead>First Name</TableHead>
                <TableHead>Last Name</TableHead>
                <TableHead>Migrated At</TableHead>
                <TableHead>Error</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recentMigrations.map((migration) => (
                <TableRow key={migration.email}>
                  <TableCell>{migration.email}</TableCell>
                  <TableCell>{migration.first_name}</TableCell>
                  <TableCell>{migration.last_name}</TableCell>
                  <TableCell>
                    {format(new Date(migration.migrated_at), 'yyyy-MM-dd HH:mm:ss')}
                  </TableCell>
                  <TableCell>{migration.error}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="container mx-auto py-10">
      <h1 className="text-3xl font-bold mb-6">Email Migration Admin</h1>

      <div className="flex space-x-4 mb-6">
        <Button
          variant={activeTab === "import" ? "default" : "outline"}
          onClick={() => setActiveTab("import")}
        >
          Import
        </Button>
        <Button
          variant={activeTab === "stats" ? "default" : "outline"}
          onClick={() => setActiveTab("stats")}
        >
          Stats & Automation
        </Button>
        <Button
          variant={activeTab === "recent" ? "default" : "outline"}
          onClick={() => setActiveTab("recent")}
        >
          Recent Migrations
        </Button>
      </div>

      {activeTab === "import" && <ImportTab />}
      {activeTab === "stats" && <StatsTab />}
      {activeTab === "recent" && <RecentTab />}
    </div>
  );
};

export default AdminEmailMigration;
