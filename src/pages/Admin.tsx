
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';

const Admin = () => {
  return (
    <div className="min-h-screen bg-gray-50 pb-12">
      <div className="container mx-auto py-8 px-4">
        <AdminPageHeader 
          title="Admin Dashboard" 
          description="Manage your sweepstakes campaign"
        />
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Webhooks</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="mb-4">Configure and monitor integration webhooks.</p>
              <Button asChild>
                <Link to="/admin/webhooks">Manage Webhooks</Link>
              </Button>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Campaign Content</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="mb-4">Edit landing and thank you page content.</p>
              <Button asChild>
                <Link to="/admin/campaign-content">Edit Content</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Admin;
