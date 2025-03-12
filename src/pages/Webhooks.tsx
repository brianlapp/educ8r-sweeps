
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { BackToAdminButton } from '@/components/admin/BackToAdminButton';

const Webhooks = () => {
  return (
    <div className="min-h-screen bg-gray-50 pb-12">
      <div className="container mx-auto py-8 px-4">
        <BackToAdminButton />
        <AdminPageHeader 
          title="Webhook Management" 
          description="Monitor and manage webhook integrations"
        />
        <Card>
          <CardHeader>
            <CardTitle>Webhook Status</CardTitle>
          </CardHeader>
          <CardContent>
            <p>Webhook configuration and status monitoring interface will be implemented here.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Webhooks;
