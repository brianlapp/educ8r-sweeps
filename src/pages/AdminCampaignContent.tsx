import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { BackToAdminButton } from '@/components/admin/BackToAdminButton';

const AdminCampaignContent = () => {
  const [selectedCampaign, setSelectedCampaign] = useState<string | null>(null);

  return (
    <div className="min-h-screen bg-gray-50 pb-12">
      <div className="container mx-auto py-8 px-4">
        <BackToAdminButton />
        <AdminPageHeader 
          title="Campaign Content Management" 
          description="Edit your campaign landing and thank you pages"
        />
        
        <Card>
          <CardHeader>
            <CardTitle>Edit Campaign Content</CardTitle>
          </CardHeader>
          <CardContent>
            <p>Select a campaign to edit its content.</p>
            {/* Campaign selector and editor will go here */}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminCampaignContent;
