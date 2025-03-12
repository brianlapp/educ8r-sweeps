
import { Helmet } from 'react-helmet-async';
import { useQuery } from "@tanstack/react-query";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Link } from 'react-router-dom';
import { Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { BackToAdminButton } from "@/components/admin/BackToAdminButton";

// Campaign type definition
interface Campaign {
  id: string;
  title: string;
  slug: string;
  is_active: boolean;
}

const AdminCampaigns = () => {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);

  // Fetch campaigns
  const { isLoading: isLoadingCampaigns } = useQuery({
    queryKey: ['campaigns'],
    queryFn: async () => {
      console.log("[AdminCampaignsPage] Fetching campaigns from Supabase...");
      const { data, error } = await supabase
        .from('campaigns')
        .select('id, title, slug, is_active')
        .order('created_at', { ascending: false });

      if (error) {
        console.error("[AdminCampaignsPage] Error fetching campaigns:", error);
        throw error;
      }

      if (data) {
        console.log(`[AdminCampaignsPage] Retrieved ${data.length} campaigns from Supabase`);
        setCampaigns(data);
      }
      
      return data;
    },
    refetchOnMount: 'always'
  });

  if (isLoadingCampaigns) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Helmet>
        <title>Campaigns | Admin Dashboard</title>
      </Helmet>
      <div className="container mx-auto py-12">
        <AdminPageHeader 
          title="Campaigns" 
          description="View and manage your sweepstakes campaigns"
          actions={<BackToAdminButton />}
        />
        
        <Card className="overflow-hidden border border-gray-100">
          <CardHeader className="bg-white py-4 px-6">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-xl font-semibold">All Campaigns</CardTitle>
                <CardDescription className="text-gray-500">
                  {campaigns.length} total campaigns
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Campaign</TableHead>
                    <TableHead>Slug</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {campaigns.map((campaign) => (
                    <TableRow key={campaign.id}>
                      <TableCell className="font-medium">{campaign.title}</TableCell>
                      <TableCell>{campaign.slug}</TableCell>
                      <TableCell>
                        <span className={`px-2 py-1 rounded-full text-xs ${campaign.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                          {campaign.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <Link to={`/admin/campaign/${campaign.id}`}>
                          <Button variant="ghost" size="sm" className="h-8 w-8">
                            <Eye size={16} />
                          </Button>
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminCampaigns;
