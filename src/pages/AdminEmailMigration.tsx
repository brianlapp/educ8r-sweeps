
import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import ProtectedRoute from '@/components/ProtectedRoute';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { EmailMigrationStatusCard } from '@/components/admin/EmailMigrationStatusCard';
import { EmailMigrationControls } from '@/components/admin/EmailMigrationControls';
import { EmailMigrationBatchControl } from '@/components/admin/EmailMigrationBatchControl';
import { EmailMigrationImport } from '@/components/admin/EmailMigrationImport';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function AdminEmailMigration() {
  const [refreshKey, setRefreshKey] = useState(0);

  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1);
  };
  
  return (
    <ProtectedRoute>
      <div className="container mx-auto px-4 py-8">
        <AdminPageHeader 
          title="Email Migration" 
          description="Monitor and manage the OnGage to BeehiiV email migration" 
        />
        
        <EmailMigrationStatusCard key={refreshKey} />
        
        <div className="mt-8">
          <Tabs defaultValue="import" className="w-full">
            <TabsList className="mb-4">
              <TabsTrigger value="import">Import</TabsTrigger>
              <TabsTrigger value="migration">Run Migration</TabsTrigger>
              <TabsTrigger value="troubleshooting">Troubleshooting</TabsTrigger>
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
                  
                  <p className="mt-4">
                    Current debugging efforts focus on resolving the stalled migration process where subscribers get stuck in the "in progress" state.
                    Use the troubleshooting tools to reset stuck subscribers and check individual subscriber status.
                  </p>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </ProtectedRoute>
  );
}
