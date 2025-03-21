import { Helmet } from 'react-helmet-async';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from 'react-router-dom';
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { Users, ListChecks, Webhook, BarChart3, UploadIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

const Admin = () => {
  const adminModules = [
    {
      title: "Campaigns",
      description: "Manage sweepstakes campaigns",
      icon: <ListChecks className="h-5 w-5 text-blue-500" />,
      link: "/admin/campaigns",
      count: "All campaigns"
    },
    {
      title: "User Entries",
      description: "View and manage sweepstakes entries",
      icon: <Users className="h-5 w-5 text-green-500" />,
      link: "/admin/entries",
      count: "All entries"
    },
    {
      title: "Webhook Status",
      description: "Monitor webhook delivery status",
      icon: <Webhook className="h-5 w-5 text-purple-500" />,
      link: "/admin/webhooks",
      count: "System status"
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <Helmet>
        <title>Admin Dashboard | Educ8r Sweepstakes</title>
      </Helmet>
      <div className="container mx-auto py-12">
        <AdminPageHeader 
          title="Admin Dashboard" 
          description="Manage your sweepstakes platform"
        />
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
          {adminModules.map((module, index) => (
            <Link key={index} to={module.link} className="block">
              <Card className="h-full hover:shadow-md transition-shadow border border-gray-100">
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-2">
                    <div className="bg-blue-50 p-2 rounded-full">
                      {module.icon}
                    </div>
                    <div>
                      <CardTitle className="text-lg font-semibold">{module.title}</CardTitle>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-gray-500 mb-2">{module.description}</CardDescription>
                  <div className="text-sm text-gray-600">{module.count}</div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
        
        <Link to="/admin/email-migration">
          <Button className="w-full md:w-auto">
            <UploadIcon className="mr-2 w-4 h-4" />
            Email Migration
          </Button>
        </Link>

        <Card className="mt-8">
          <CardHeader>
            <CardTitle className="text-lg">System Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center p-6">
              <div className="flex items-center gap-2 text-gray-500">
                <BarChart3 className="h-5 w-5" />
                <span>Analytics dashboard coming soon</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Admin;
