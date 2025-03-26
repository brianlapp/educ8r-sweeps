import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import ProtectedRoute from '@/components/ProtectedRoute';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { EmailMigrationStatusCard } from '@/components/admin/EmailMigrationStatusCard';
import { EmailMigrationControls } from '@/components/admin/EmailMigrationControls';
import { EmailMigrationBatchControl } from '@/components/admin/EmailMigrationBatchControl';
import { EmailMigrationImport } from '@/components/admin/EmailMigrationImport';
import { EmailMigrationAutomation } from '@/components/admin/EmailMigrationAutomation';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Card } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { RefreshCw } from 'lucide-react';

export default function AdminEmailMigration() {
  const [refreshKey, setRefreshKey] = useState(0);
  const [automationEnabled, setAutomationEnabled] = useState(false);
  const [migrationStats, setMigrationStats] = useState<any>(null);
  
  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1);
  };
  
  useEffect(() => {
    const fetchAutomationSettings = async () => {
      try {
        const { data, error } = await supabase.functions.invoke('email-migration', {
          method: 'POST',
          body: { action: 'stats' }
        });
        
        if (error) throw error;
        
        if (data?.automation) {
          setAutomationEnabled(data.automation.enabled);
          setMigrationStats(data);
        }
      } catch (err) {
        console.error('Failed to load automation settings:', err);
      }
    };
    
    fetchAutomationSettings();
  }, [refreshKey]);
  
  const toggleAutomation = async (enabled: boolean) => {
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
      handleRefresh();
    } catch (err) {
      console.error('Failed to toggle automation:', err);
    }
  };
  
  const calculateProgress = () => {
    if (!migrationStats) return 0;
    
    const { counts } = migrationStats;
    const total = counts?.pending + counts?.in_progress + counts?.migrated + counts?.failed + counts?.already_exists || 0;
    const done = counts?.migrated + counts?.already_exists || 0;
    
    return total > 0 ? Math.round((done / total) * 100) : 0;
  };
  
  return (
    <ProtectedRoute>
      <div className="container mx-auto px-4 py-8">
        <AdminPageHeader 
          title="Email Migration" 
          description="Monitor and manage the OnGage to BeehiiV email migration" 
        />
        
        <EmailMigrationStatusCard key={refreshKey} />
        
        {migrationStats && (
          <Card className="p-4 mt-4 bg-white shadow-sm">
            <div className="mb-2 flex justify-between items-center">
              <h3 className="text-md font-semibold">Overall Progress</h3>
              <div className="flex items-center gap-2">
                <Switch 
                  id="automation" 
                  checked={automationEnabled}
                  onCheckedChange={toggleAutomation}
                />
                <Label htmlFor="automation">Automation {automationEnabled ? 'Enabled' : 'Disabled'}</Label>
              </div>
            </div>
            <Progress value={calculateProgress()} className="h-3 mb-1" />
            <div className="text-sm text-gray-600 text-right">{calculateProgress()}% Complete</div>
          </Card>
        )}
        
        <div className="mt-4">
          <Tabs defaultValue="import" className="w-full">
            <TabsList className="mb-4">
              <TabsTrigger value="import">Import</TabsTrigger>
              <TabsTrigger value="migration">Run Migration</TabsTrigger>
              <TabsTrigger value="troubleshooting">Troubleshooting</TabsTrigger>
              <TabsTrigger value="automation">Automation</TabsTrigger>
              <TabsTrigger value="docs">Documentation</TabsTrigger>
            </TabsList>
            
            <TabsContent value="import" className="space-y-4">
              <EmailMigrationImport onImportComplete={handleRefresh} />
            </TabsContent>
            
            <TabsContent value="migration" className="space-y-4">
              <EmailMigrationBatchControl onMigrationComplete={handleRefresh} />
            </TabsContent>
            
            <TabsContent value="troubleshooting" className="space-y-4">
              <EmailMigrationControls onRefresh={handleRefresh} />
            </TabsContent>
            
            <TabsContent value="automation" className="space-y-4">
              <EmailMigrationAutomation />
              
              <Card className="p-4 bg-white shadow-sm mt-4">
                <h3 className="text-lg font-semibold mb-4">Client-Side Migration Automation</h3>
                <div className="space-y-4">
                  <p className="text-sm text-gray-600">
                    This is the legacy automation that only runs while the browser window is open.
                    We recommend using the server-side automation above instead.
                  </p>
                  
                  <div className="flex items-center space-x-2">
                    <Switch 
                      id="automation-toggle" 
                      checked={automationEnabled}
                      onCheckedChange={toggleAutomation}
                    />
                    <Label htmlFor="automation-toggle">Enable Client-Side Automation</Label>
                  </div>
                  
                  {automationEnabled && migrationStats?.automation && (
                    <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-blue-50 p-3 rounded-lg border border-blue-100">
                        <div className="text-sm text-blue-600 mb-1">Daily Target</div>
                        <div className="text-xl font-bold">{migrationStats.automation.daily_total_target}</div>
                        <div className="text-xs text-slate-500 mt-1">subscribers per day</div>
                      </div>
                      
                      <div className="bg-green-50 p-3 rounded-lg border border-green-100">
                        <div className="text-sm text-green-600 mb-1">Batch Size Range</div>
                        <div className="text-xl font-bold">
                          {migrationStats.automation.min_batch_size} - {migrationStats.automation.max_batch_size}
                        </div>
                        <div className="text-xs text-slate-500 mt-1">subscribers per batch</div>
                      </div>
                      
                      <div className="bg-amber-50 p-3 rounded-lg border border-amber-100">
                        <div className="text-sm text-amber-600 mb-1">Operating Hours</div>
                        <div className="text-xl font-bold">
                          {migrationStats.automation.start_hour}:00 - {migrationStats.automation.end_hour}:00
                        </div>
                        <div className="text-xs text-slate-500 mt-1">automation active time (24h format)</div>
                      </div>
                      
                      <div className="bg-purple-50 p-3 rounded-lg border border-purple-100">
                        <div className="text-sm text-purple-600 mb-1">Publication</div>
                        <div className="text-xl font-bold">
                          {migrationStats.automation.publication_id || 'Not Set'}
                        </div>
                        <div className="text-xs text-slate-500 mt-1">BeehiiV publication ID</div>
                      </div>
                    </div>
                  )}
                </div>
              </Card>
            </TabsContent>
            
            <TabsContent value="docs" className="space-y-4">
              <div className="bg-white shadow-sm rounded-lg p-4">
                <h3 className="text-lg font-semibold mb-2">Documentation</h3>
                <div className="prose max-w-none">
                  <p>
                    The email migration system is completely isolated from the sweepstakes functionality to ensure there's no cross-impact.
                    Please refer to the <code>docs/EMAIL_MIGRATION_PLAN.md</code>, <code>docs/EMAIL_MIGRATION_PROGRESS.md</code>, and <code>docs/RULES.md</code> files for detailed information.
                  </p>
                  
                  <h4 className="text-md font-medium mt-4">Migration Process</h4>
                  <ol className="list-decimal pl-5 space-y-2">
                    <li>Import subscriber data from OnGage CSV or JSON export</li>
                    <li>Process migration in small batches to avoid API rate limits</li>
                    <li>Monitor progress in the status panel</li>
                    <li>Use troubleshooting tools to address any issues</li>
                  </ol>
                  
                  <h4 className="text-md font-medium mt-4">Enhanced Server-Side Automation</h4>
                  <p>
                    The system now includes server-side processing that runs continuously even 
                    when your browser is closed. This ensures the migration completes without requiring 
                    the admin panel to stay open.
                  </p>
                  <ul className="list-disc pl-5 space-y-2">
                    <li>Automatic stalled record detection and recovery</li>
                    <li>Smart rate limit handling with exponential backoff</li>
                    <li>Heartbeat monitoring to verify the automation is running</li>
                    <li>Scheduled processing to respect configured operating hours</li>
                  </ul>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </ProtectedRoute>
  );
}
