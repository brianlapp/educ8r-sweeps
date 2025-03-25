
import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import ProtectedRoute from '@/components/ProtectedRoute';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { EmailMigrationStatusCard } from '@/components/admin/EmailMigrationStatusCard';
import { EmailMigrationControls } from '@/components/admin/EmailMigrationControls';

export default function AdminEmailMigration() {
  const [isSyncing, setIsSyncing] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleManualRefresh = () => {
    setRefreshKey(prev => prev + 1);
  };
  
  return (
    <ProtectedRoute>
      <div className="container mx-auto px-4 py-8">
        <AdminPageHeader 
          title="Email Migration" 
          description="Monitor and manage the OnGage to BeehiiV email migration" 
        />
        
        <div className="grid grid-cols-1 gap-6 mt-8">
          <EmailMigrationStatusCard key={refreshKey} />
          
          <EmailMigrationControls onRefresh={handleManualRefresh} />
          
          <div className="bg-white shadow-sm rounded-lg p-4">
            <h3 className="text-lg font-semibold mb-2">Documentation</h3>
            <div className="prose max-w-none">
              <p>
                The email migration system is completely isolated from the sweepstakes functionality to ensure there's no cross-impact.
                Please refer to the <code>docs/EMAIL_MIGRATION_PLAN.md</code>, <code>docs/EMAIL_MIGRATION_PROGRESS.md</code>, and <code>docs/RULES.md</code> files for detailed information.
              </p>
              
              <p>
                Current debugging efforts focus on resolving the stalled migration process where subscribers get stuck in the "in progress" state.
                Use the troubleshooting tools above to reset stuck subscribers and check individual subscriber status.
              </p>
            </div>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
