
import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { BackToAdminButton } from "@/components/admin/BackToAdminButton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, CheckCircle2, Calendar, Award, Eye, Pencil, Save, X, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { useCampaignMutations } from "@/features/campaigns/hooks/useCampaignMutations";
import { useAnalytics } from "@/hooks/use-analytics";

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
  email_template_id: string;
  hero_image_url?: string;
  subtitle?: string;
  mobile_subtitle?: string;
  promotional_text?: string;
}

const AdminCampaignPreview = () => {
  const { id } = useParams<{ id: string }>();
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editableContent, setEditableContent] = useState<Partial<Campaign>>({});
  const [whyShareItems, setWhyShareItems] = useState<WhyShareItem[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const navigate = useNavigate();
  const { trackEvent } = useAnalytics();
  const { updateCampaign } = useCampaignMutations();

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
        
        const processedData = {
          ...data,
          why_share_items: typeof data.why_share_items === 'string' 
            ? JSON.parse(data.why_share_items) 
            : data.why_share_items,
          subtitle: data.subtitle || '',
          mobile_subtitle: data.mobile_subtitle || '',
          promotional_text: data.promotional_text || 'Enter for a chance to win $200 to spend on everything on your Anything from Amazon list - from backpacks and notebooks to markers and more! Get ready for a successful school year.'
        };
        
        setCampaign(processedData as Campaign);
        setEditableContent({
          title: processedData.title,
          prize_name: processedData.prize_name,
          subtitle: processedData.subtitle,
          mobile_subtitle: processedData.mobile_subtitle,
          promotional_text: processedData.promotional_text,
          hero_image_url: processedData.hero_image_url || ''
        });
        setWhyShareItems(processedData.why_share_items || []);
      } catch (error) {
        console.error("Error fetching campaign:", error);
        toast.error("Failed to load campaign details");
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchCampaign();
  }, [id]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setEditableContent({
      ...editableContent,
      [name]: value
    });
  };

  const handleWhyShareItemChange = (index: number, field: keyof WhyShareItem, value: string) => {
    const updatedItems = [...whyShareItems];
    updatedItems[index] = {
      ...updatedItems[index],
      [field]: value
    };
    setWhyShareItems(updatedItems);
  };

  const handleAddWhyShareItem = () => {
    setWhyShareItems([
      ...whyShareItems,
      { title: "", description: "" }
    ]);
  };

  const handleRemoveWhyShareItem = (index: number) => {
    const updatedItems = [...whyShareItems];
    updatedItems.splice(index, 1);
    setWhyShareItems(updatedItems);
  };

  const handleSaveChanges = () => {
    if (!campaign) return;
    
    setIsSaving(true);
    trackEvent('admin_update_campaign_content', { campaignId: campaign.id });
    
    const updatedCampaign = {
      ...campaign,
      ...editableContent,
      why_share_items: whyShareItems
    };
    
    console.log("Saving updated campaign with data:", updatedCampaign);
    
    updateCampaign.mutate(updatedCampaign, {
      onSuccess: () => {
        toast.success("Campaign content updated successfully!");
        setCampaign(updatedCampaign);
        setIsEditing(false);
        setIsSaving(false);
      },
      onError: (error) => {
        console.error("Update failed with error:", error);
        toast.error(`Failed to update campaign: ${error instanceof Error ? error.message : 'Unknown error'}`);
        setIsSaving(false);
      }
    });
  };

  const cancelEditing = () => {
    if (campaign) {
      setEditableContent({
        title: campaign.title,
        prize_name: campaign.prize_name,
        subtitle: campaign.subtitle,
        promotional_text: campaign.promotional_text
      });
      setWhyShareItems(campaign.why_share_items || []);
    }
    setIsEditing(false);
  };

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
          description="Preview and edit dynamic content for this campaign"
          actions={
            <div className="flex gap-2">
              <BackToAdminButton />
              {!isEditing && (
                <Button onClick={() => setIsEditing(true)} variant="outline" className="flex items-center gap-2">
                  <Pencil size={16} /> Edit Content
                </Button>
              )}
              {isEditing && (
                <>
                  <Button onClick={cancelEditing} variant="outline" className="flex items-center gap-2">
                    <X size={16} /> Cancel
                  </Button>
                  <Button 
                    onClick={handleSaveChanges} 
                    disabled={isSaving}
                    className="flex items-center gap-2"
                  >
                    <Save size={16} /> {isSaving ? 'Saving...' : 'Save Changes'}
                  </Button>
                </>
              )}
            </div>
          }
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
        
        <Tabs defaultValue="landing" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="landing">Landing Page</TabsTrigger>
            <TabsTrigger value="thank-you">Thank You Page</TabsTrigger>
            <TabsTrigger value="email">Email Template</TabsTrigger>
          </TabsList>
          
          <TabsContent value="landing" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg font-medium">Landing Page Preview</CardTitle>
              </CardHeader>
              <CardContent className="p-0 overflow-hidden">
                <div className="h-[600px] rounded-md border border-gray-200 overflow-hidden bg-white">
                  <iframe 
                    src={`/${campaign.slug}`} 
                    className="w-full h-full" 
                    title="Landing Page Preview"
                  />
                </div>
                <div className="flex justify-end p-4">
                  <Link 
                    to={`/${campaign.slug}`} 
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

            <Card>
              <CardHeader>
                <CardTitle className="text-lg font-medium">Landing Page Content</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h3 className="font-semibold mb-1">Form Title</h3>
                  {isEditing ? (
                    <Input
                      name="title"
                      value={editableContent.title || ''}
                      onChange={handleInputChange}
                      className="w-full"
                      placeholder="Enter form title"
                    />
                  ) : (
                    <p className="p-3 bg-gray-50 rounded border border-gray-100">
                      {campaign?.title}
                    </p>
                  )}
                </div>
                
                <div>
                  <h3 className="font-semibold mb-1">Form Subtitle (Desktop)</h3>
                  {isEditing ? (
                    <Input
                      name="subtitle"
                      value={editableContent.subtitle || ''}
                      onChange={handleInputChange}
                      className="w-full"
                      placeholder="Support Your Students and Stock Up on Classroom Supplies"
                    />
                  ) : (
                    <p className="p-3 bg-gray-50 rounded border border-gray-100">
                      {campaign?.subtitle || 'No subtitle set'}
                    </p>
                  )}
                  <p className="text-xs text-gray-500 mt-1">
                    This text appears below the main form title on desktop devices
                  </p>
                </div>
                
                <div>
                  <h3 className="font-semibold mb-1">Form Subtitle (Mobile)</h3>
                  {isEditing ? (
                    <Input
                      name="mobile_subtitle"
                      value={editableContent.mobile_subtitle || ''}
                      onChange={handleInputChange}
                      className="w-full"
                      placeholder="Support Your Students"
                    />
                  ) : (
                    <p className="p-3 bg-gray-50 rounded border border-gray-100">
                      {campaign?.mobile_subtitle || 'No mobile subtitle set'}
                    </p>
                  )}
                  <p className="text-xs text-gray-500 mt-1">
                    A shorter subtitle that appears on mobile devices
                  </p>
                </div>
                
                <div>
                  <h3 className="font-semibold mb-1">Hero Image URL</h3>
                  {isEditing ? (
                    <Input
                      name="hero_image_url"
                      value={editableContent.hero_image_url || ''}
                      onChange={handleInputChange}
                      className="w-full"
                      placeholder="https://example.com/hero-image.jpg"
                    />
                  ) : (
                    <p className="p-3 bg-gray-50 rounded border border-gray-100">
                      {campaign?.hero_image_url || 'No hero image URL set'}
                    </p>
                  )}
                  <p className="text-xs text-gray-500 mt-1">
                    This is the URL for the hero image displayed on the landing page
                  </p>
                </div>
                
                <div>
                  <h3 className="font-semibold mb-1">Promotional Description</h3>
                  {isEditing ? (
                    <Textarea
                      name="promotional_text"
                      value={editableContent.promotional_text || ''}
                      onChange={handleInputChange}
                      className="w-full"
                      placeholder="Enter for a chance to win $200 to spend on everything..."
                      rows={3}
                    />
                  ) : (
                    <p className="p-3 bg-gray-50 rounded border border-gray-100">
                      {campaign?.promotional_text || 'No promotional text set'}
                    </p>
                  )}
                  <p className="text-xs text-gray-500 mt-1">
                    This is the main promotional text that describes the campaign offer
                  </p>
                </div>
                
                <div>
                  <h3 className="font-semibold mb-1">Prize Usage Description</h3>
                  {isEditing ? (
                    <Input
                      name="prize_name"
                      value={editableContent.prize_name || ''}
                      onChange={handleInputChange}
                      className="w-full"
                      placeholder="What can they spend the prize on?"
                    />
                  ) : (
                    <p className="p-3 bg-gray-50 rounded border border-gray-100">
                      {campaign?.prize_name}
                    </p>
                  )}
                  <p className="text-xs text-gray-500 mt-1">
                    This text appears below the prize value (e.g., "For your classroom supplies")
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="thank-you" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg font-medium">Thank You Page Preview</CardTitle>
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
            
            <Card>
              <CardHeader>
                <CardTitle className="text-lg font-medium">Thank You Page Content</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <h3 className="font-semibold mb-1">Share Title</h3>
                  {isEditing ? (
                    <Input
                      name="share_title"
                      value={editableContent.share_title || ''}
                      onChange={handleInputChange}
                      className="w-full"
                    />
                  ) : (
                    <p className="p-3 bg-gray-50 rounded border border-gray-100">
                      {campaign.share_title}
                    </p>
                  )}
                </div>
                
                <div>
                  <h3 className="font-semibold mb-1">Share Description</h3>
                  {isEditing ? (
                    <Textarea
                      name="share_description"
                      value={editableContent.share_description || ''}
                      onChange={handleInputChange}
                      className="w-full"
                      rows={3}
                    />
                  ) : (
                    <p className="p-3 bg-gray-50 rounded border border-gray-100">
                      {campaign.share_description}
                    </p>
                  )}
                </div>
                
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold">Why Share Items</h3>
                    {isEditing && (
                      <Button 
                        onClick={handleAddWhyShareItem} 
                        variant="outline" 
                        size="sm"
                        className="text-xs"
                      >
                        Add Item
                      </Button>
                    )}
                  </div>
                  
                  <div className="space-y-3">
                    {whyShareItems.map((item, index) => (
                      <div key={index} className={`p-3 rounded border ${isEditing ? 'border-blue-200 bg-blue-50' : 'border-gray-100 bg-gray-50'}`}>
                        {isEditing ? (
                          <div className="space-y-2">
                            <div className="flex justify-between items-center">
                              <label className="text-sm font-medium">Title</label>
                              <Button 
                                onClick={() => handleRemoveWhyShareItem(index)} 
                                variant="ghost" 
                                size="sm"
                                className="h-6 w-6 p-0 text-red-500 hover:text-red-700"
                              >
                                <X size={16} />
                              </Button>
                            </div>
                            <Input
                              value={item.title}
                              onChange={(e) => handleWhyShareItemChange(index, 'title', e.target.value)}
                              className="w-full mb-2"
                            />
                            <label className="text-sm font-medium">Description</label>
                            <Textarea
                              value={item.description}
                              onChange={(e) => handleWhyShareItemChange(index, 'description', e.target.value)}
                              className="w-full"
                              rows={2}
                            />
                          </div>
                        ) : (
                          <>
                            <p className="font-medium mb-1">{item.title}</p>
                            <p className="text-sm text-gray-700">{item.description}</p>
                          </>
                        )}
                      </div>
                    ))}
                    
                    {whyShareItems.length === 0 && (
                      <p className="text-gray-500 italic text-center py-4">
                        No share items defined yet.
                        {isEditing && " Use the 'Add Item' button to create one."}
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="email" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg font-medium">Email Template Preview</CardTitle>
              </CardHeader>
              <CardContent className="p-0 overflow-hidden">
                <div className="h-[600px] rounded-md border border-gray-200 overflow-hidden bg-white p-4">
                  <iframe 
                    src="/email-template-preview.html" 
                    className="w-full h-full" 
                    title="Email Template Preview"
                  />
                </div>
                <div className="flex justify-between p-4">
                  <div className="text-sm text-gray-500">
                    <span className="font-medium">Template ID:</span> {campaign.email_template_id}
                  </div>
                  <Link 
                    to="/email-template-preview.html" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center text-sm text-blue-600 hover:text-blue-800"
                  >
                    <ExternalLink className="h-4 w-4 mr-1" />
                    Open editor in new tab
                  </Link>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg font-medium">Email Template Configuration</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h3 className="font-semibold mb-1">Email Template ID</h3>
                  {isEditing ? (
                    <Input
                      name="email_template_id"
                      value={editableContent.email_template_id || ''}
                      onChange={handleInputChange}
                      className="w-full"
                    />
                  ) : (
                    <p className="p-3 bg-gray-50 rounded border border-gray-100">
                      {campaign.email_template_id}
                    </p>
                  )}
                  <p className="text-xs text-gray-500 mt-1">Use "default" if you don't have a specific template ID</p>
                </div>
                
                <div className="bg-blue-50 border border-blue-100 rounded p-4">
                  <p className="text-sm text-blue-700">
                    <span className="font-medium">Note:</span> Email templates are managed through the email template editor. 
                    You can customize the email content that will be sent to users when they share or refer others.
                  </p>
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
