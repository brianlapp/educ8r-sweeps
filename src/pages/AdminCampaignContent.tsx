
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import { Tables } from "@/integrations/supabase/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BackToAdminButton } from "@/components/admin/BackToAdminButton";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { ThankYouPreview } from "@/components/admin/ThankYouPreview";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Save } from "lucide-react";

const AdminCampaignContent = () => {
  const [campaigns, setCampaigns] = useState<Tables<'campaigns'>[]>([]);
  const [selectedCampaign, setSelectedCampaign] = useState<Tables<'campaigns'> | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    thank_you_title: "",
    thank_you_description: "",
    target_audience: ""
  });
  const { toast } = useToast();

  useEffect(() => {
    const fetchCampaigns = async () => {
      try {
        setIsLoading(true);
        const { data, error } = await supabase
          .from('campaigns')
          .select('*')
          .order('title', { ascending: true });

        if (error) {
          throw error;
        }

        if (data && data.length > 0) {
          setCampaigns(data);
          setSelectedCampaign(data[0]);
          setFormData({
            thank_you_title: data[0].thank_you_title || "",
            thank_you_description: data[0].thank_you_description || "",
            target_audience: data[0].target_audience || ""
          });
        }
      } catch (error) {
        console.error("Error fetching campaigns:", error);
        toast({
          title: "Error",
          description: "Failed to load campaigns",
          variant: "destructive"
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchCampaigns();
  }, [toast]);

  const handleCampaignChange = (id: string) => {
    const campaign = campaigns.find(c => c.id === id) || null;
    setSelectedCampaign(campaign);
    if (campaign) {
      setFormData({
        thank_you_title: campaign.thank_you_title || "",
        thank_you_description: campaign.thank_you_description || "",
        target_audience: campaign.target_audience || ""
      });
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCampaign) return;

    try {
      setIsSaving(true);
      
      const { error } = await supabase
        .from('campaigns')
        .update({
          thank_you_title: formData.thank_you_title,
          thank_you_description: formData.thank_you_description,
          target_audience: formData.target_audience
        })
        .eq('id', selectedCampaign.id);

      if (error) throw error;

      // Update local state
      setCampaigns(prev => 
        prev.map(campaign => 
          campaign.id === selectedCampaign.id 
            ? { ...campaign, ...formData } 
            : campaign
        )
      );
      
      setSelectedCampaign(prev => prev ? { ...prev, ...formData } : null);

      toast({
        title: "Success",
        description: "Campaign content updated successfully",
      });
    } catch (error) {
      console.error("Error updating campaign:", error);
      toast({
        title: "Error",
        description: "Failed to update campaign content",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  // For preview purposes
  const previewCampaign = {
    ...selectedCampaign,
    ...formData
  } as Tables<'campaigns'>;

  return (
    <div className="min-h-screen bg-gray-50 pb-12">
      <Helmet>
        <title>Campaign Content Management | Admin</title>
      </Helmet>
      
      <div className="container mx-auto py-8 px-4">
        <div className="flex items-center mb-6">
          <BackToAdminButton />
        </div>
        
        <AdminPageHeader 
          title="Campaign Content Management" 
          description="Customize thank you page content for each campaign"
        />

        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        ) : campaigns.length === 0 ? (
          <Card>
            <CardContent className="p-6">
              <p className="text-center text-gray-500">No campaigns found</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div>
              <Card>
                <CardHeader>
                  <CardTitle>Edit Thank You Page Content</CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSubmit}>
                    <div className="space-y-6">
                      <div className="space-y-2">
                        <Label htmlFor="campaign">Campaign</Label>
                        <Select 
                          value={selectedCampaign?.id} 
                          onValueChange={handleCampaignChange}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select a campaign" />
                          </SelectTrigger>
                          <SelectContent>
                            {campaigns.map(campaign => (
                              <SelectItem key={campaign.id} value={campaign.id}>
                                {campaign.title}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="thank_you_title">Thank You Title</Label>
                        <Input
                          id="thank_you_title"
                          name="thank_you_title"
                          value={formData.thank_you_title}
                          onChange={handleInputChange}
                          placeholder="e.g., Thank You for Entering!"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="thank_you_description">Thank You Description</Label>
                        <Textarea
                          id="thank_you_description"
                          name="thank_you_description"
                          value={formData.thank_you_description}
                          onChange={handleInputChange}
                          placeholder="Describe the benefits of sharing..."
                          rows={4}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="target_audience">Target Audience</Label>
                        <Input
                          id="target_audience"
                          name="target_audience"
                          value={formData.target_audience}
                          onChange={handleInputChange}
                          placeholder="e.g., Teachers, Parents, Students"
                        />
                      </div>

                      <Button type="submit" disabled={isSaving} className="w-full">
                        {isSaving ? (
                          <>
                            <div className="animate-spin mr-2 h-4 w-4 border-t-2 border-b-2 border-white rounded-full"></div>
                            Saving...
                          </>
                        ) : (
                          <>
                            <Save className="mr-2 h-4 w-4" />
                            Save Changes
                          </>
                        )}
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            </div>
            
            <div>
              <Tabs defaultValue="preview">
                <TabsList className="mb-4">
                  <TabsTrigger value="preview">Preview</TabsTrigger>
                  <TabsTrigger value="json">JSON</TabsTrigger>
                </TabsList>
                
                <TabsContent value="preview" className="mt-0">
                  <ThankYouPreview campaign={previewCampaign} />
                </TabsContent>
                
                <TabsContent value="json" className="mt-0">
                  <Card>
                    <CardContent className="p-4">
                      <pre className="bg-gray-100 p-4 rounded-md text-xs overflow-auto max-h-[500px]">
                        {JSON.stringify(previewCampaign, null, 2)}
                      </pre>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminCampaignContent;
