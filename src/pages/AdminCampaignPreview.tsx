
import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { BackToAdminButton } from "@/components/admin/BackToAdminButton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, CheckCircle2, Calendar, Award } from "lucide-react";

interface WhyShareItem {
  title: string;
  description: string;
}

interface Campaign {
  id: string;
  slug: string;
  title: string;
  prize_name: string;
  prize_amount: string;
  target_audience: string;
  thank_you_title: string;
  thank_you_description: string;
  start_date: string;
  end_date: string;
  is_active: boolean;
  share_title: string;
  share_description: string;
  why_share_items: WhyShareItem[];
}

const AdminCampaignPreview = () => {
  const { id } = useParams<{ id: string }>();
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchCampaign = async () => {
      try {
        if (!id) return;
        
        const { data, error } = await supabase
          .from("campaigns")
          .select("*")
          .eq("id", id)
          .single();
          
        if (error) throw error;
        
        // Ensure why_share_items is properly parsed
        const processedData = {
          ...data,
          why_share_items: typeof data.why_share_items === 'string' 
            ? JSON.parse(data.why_share_items) 
            : data.why_share_items
        };
        
        setCampaign(processedData as Campaign);
      } catch (error) {
        console.error("Error fetching campaign:", error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchCampaign();
  }, [id]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse space-y-2">
          <div className="h-4 w-32 bg-gray-200 rounded"></div>
          <div className="h-4 w-40 bg-gray-200 rounded"></div>
          <div className="h-4 w-36 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="min-h-screen container mx-auto py-12">
        <AdminPageHeader title="Campaign Not Found" />
        <div className="text-center py-12">
          <p className="text-gray-500 mb-4">The requested campaign could not be found.</p>
          <BackToAdminButton />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Helmet>
        <title>Campaign Preview | Admin Dashboard</title>
      </Helmet>
      
      <div className="container mx-auto py-12">
        <AdminPageHeader 
          title="Campaign Preview" 
          description="Preview how the thank you page appears for this campaign"
          actions={<BackToAdminButton />}
        />
        
        <Card className="mb-6">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xl font-bold">{campaign.title}</CardTitle>
            <Badge variant={campaign.is_active ? "default" : "outline"}>
              {campaign.is_active ? "Active" : "Inactive"}
            </Badge>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
              <div className="flex items-center space-x-2">
                <Award className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">
                  <span className="font-medium">Prize:</span> {campaign.prize_amount} {campaign.prize_name}
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">
                  <span className="font-medium">Runs:</span> {new Date(campaign.start_date).toLocaleDateString()} - {new Date(campaign.end_date).toLocaleDateString()}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Tabs defaultValue="preview" className="space-y-4">
          <TabsList>
            <TabsTrigger value="preview">Thank You Page Preview</TabsTrigger>
            <TabsTrigger value="content">Content Details</TabsTrigger>
          </TabsList>
          
          <TabsContent value="preview" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg font-medium">Live Preview</CardTitle>
              </CardHeader>
              <CardContent className="p-0 overflow-hidden">
                <div className="h-[600px] rounded-md border border-gray-200 overflow-hidden bg-white">
                  <iframe 
                    src={`/${campaign.slug}/thank-you`} 
                    className="w-full h-full" 
                    title="Thank You Page Preview"
                  />
                </div>
                <div className="flex justify-end p-4">
                  <Link 
                    to={`/${campaign.slug}/thank-you`} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center text-sm text-blue-600 hover:text-blue-800"
                  >
                    <ExternalLink className="h-4 w-4 mr-1" />
                    Open in new tab
                  </Link>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="content" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg font-medium">Thank You Page Content</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <h3 className="font-semibold mb-1">Share Title</h3>
                  <p className="p-3 bg-gray-50 rounded border border-gray-100">
                    {campaign.share_title}
                  </p>
                </div>
                
                <div>
                  <h3 className="font-semibold mb-1">Share Description</h3>
                  <p className="p-3 bg-gray-50 rounded border border-gray-100">
                    {campaign.share_description}
                  </p>
                </div>
                
                <div>
                  <h3 className="font-semibold mb-2">Why Share Items</h3>
                  <div className="space-y-3">
                    {campaign.why_share_items.map((item, index) => (
                      <div key={index} className="p-3 bg-gray-50 rounded border border-gray-100">
                        <p className="font-medium mb-1">{item.title}</p>
                        <p className="text-sm text-gray-700">{item.description}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default AdminCampaignPreview;
