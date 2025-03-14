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
import { Campaign, WhyShareItem } from "@/features/campaigns/types";
import { EmailTemplatePreview } from "@/features/campaigns/components/EmailTemplatePreview";
import { generateReferralLink } from "@/features/campaigns/utils/referralLinks";

const AdminCampaignPreview = () => {
  const { id } = useParams<{ id: string }>();
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editableContent, setEditableContent] = useState<Partial<Campaign>>({});
  const [whyShareItems, setWhyShareItems] = useState<WhyShareItem[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [previewData, setPreviewData] = useState({
    firstName: 'John',
    totalEntries: 3,
    referralCode: 'ABC123XY'
  });
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
          promotional_text: data.promotional_text || 'Enter for a chance to win $200 to spend on everything on your Anything from Amazon list - from backpacks and notebooks to markers and more! Get ready for a successful school year.',
          // Email template fields with defaults
          email_subject: data.email_subject || 'Congratulations! You earned a Sweepstakes entry!',
          email_heading: data.email_heading || 'You just earned an extra Sweepstakes entry!',
          email_referral_message: data.email_referral_message || `Great news! One of your referrals just tried Comprendi™, and you now have {{totalEntries}} entries in the ${data.prize_amount} ${data.prize_name} Sweepstakes!`,
          email_cta_text: data.email_cta_text || 'Visit Comprendi Reading',
          email_footer_message: data.email_footer_message || 'Remember, each parent who activates a free trial through your link gives you another entry in the sweepstakes!',
          source_id: data.source_id || ''
        };
        
        setCampaign(processedData as Campaign);
        setEditableContent({
          title: processedData.title,
          prize_name: processedData.prize_name,
          subtitle: processedData.subtitle,
          mobile_subtitle: processedData.mobile_subtitle,
          promotional_text: processedData.promotional_text,
          hero_image_url: processedData.hero_image_url || '',
          source_id: processedData.source_id || '',
          // Set email template fields in editable content
          email_subject: processedData.email_subject,
          email_heading: processedData.email_heading,
          email_referral_message: processedData.email_referral_message,
          email_cta_text: processedData.email_cta_text,
          email_footer_message: processedData.email_footer_message
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
    
    console.log("Saving updated campaign with data:", JSON.stringify(updatedCampaign, null, 2));
    
    updateCampaign.mutate(updatedCampaign, {
      onSuccess: (result) => {
        console.log("Update successful, received result:", result);
        toast.success("Campaign content updated successfully!");
        setCampaign(result);
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
        promotional_text: campaign.promotional_text,
        mobile_subtitle: campaign.mobile_subtitle,
        hero_image_url: campaign.hero_image_url,
        source_id: campaign.source_id,
        // Reset email template fields
        email_subject: campaign.email_subject,
        email_heading: campaign.email_heading,
        email_referral_message: campaign.email_referral_message,
        email_cta_text: campaign.email_cta_text,
        email_footer_message: campaign.email_footer_message
      });
      setWhyShareItems(campaign.why_share_items || []);
    }
    setIsEditing(false);
  };

  const getPreviewCampaign = (): Campaign => {
    if (!campaign) return {} as Campaign;
    
    return {
      ...campaign,
      ...editableContent
    };
  };

  const handlePreviewDataChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setPreviewData(prev => ({
      ...prev,
      [name]: name === 'totalEntries' ? parseInt(value, 10) : value
    }));
  };

  const getExampleReferralLink = () => {
    const demoCode = "ABC123XY";
    return generateReferralLink(demoCode, editableContent.source_id);
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
                  <h3 className="font-semibold mb-1">Campaign Attribution (Source ID)</h3>
                  {isEditing ? (
                    <>
                      <Input
                        name="source_id"
                        value={editableContent.source_id || ''}
                        onChange={handleInputChange}
                        className="w-full mb-2"
                        placeholder="e.g. facebook, email-sept, influencer1"
                      />
                      <div className="mt-2">
                        <p className="text-xs text-gray-500 mb-1">Example referral link with this source_id:</p>
                        <p className="p-2 bg-gray-50 rounded border border-gray-200 text-xs font-mono overflow-auto">
                          {getExampleReferralLink()}
                        </p>
                      </div>
                    </>
                  ) : (
                    <>
                      <p className="p-3 bg-gray-50 rounded border border-gray-100">
                        {campaign.source_id || 'No source ID set'}
                      </p>
                      {campaign.source_id && (
                        <div className="mt-2">
                          <p className="text-xs text-gray-500 mb-1">Referral links will include:</p>
                          <p className="p-2 bg-gray-50 rounded border border-gray-200 text-xs font-mono">
                            &source_id={campaign.source_id}
                          </p>
                        </div>
                      )}
                    </>
                  )}
                  <p className="text-xs text-gray-500 mt-1">
                    This ID will be appended to all referral links to track campaign performance
                  </p>
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
              <CardContent className="p-0">
                {isEditing && (
                  <div className="bg-blue-50 p-4 mb-4 rounded-md">
                    <h3 className="text-sm font-medium mb-2">Preview Settings</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label htmlFor="firstName" className="text-xs text-gray-500 mb-1 block">Recipient Name</label>
                        <Input 
                          id="firstName" 
                          name="firstName" 
                          value={previewData.firstName} 
                          onChange={handlePreviewDataChange} 
                          placeholder="John" 
                          className="text-sm"
                        />
                      </div>
                      <div>
                        <label htmlFor="totalEntries" className="text-xs text-gray-500 mb-1 block">Total Entries</label>
                        <Input 
                          id="totalEntries" 
                          name="totalEntries" 
                          type="number" 
                          min="1" 
                          value={previewData.totalEntries} 
                          onChange={handlePreviewDataChange} 
                          className="text-sm"
                        />
                      </div>
                      <div>
                        <label htmlFor="referralCode" className="text-xs text-gray-500 mb-1 block">Referral Code</label>
                        <Input 
                          id="referralCode" 
                          name="referralCode" 
                          value={previewData.referralCode} 
                          onChange={handlePreviewDataChange} 
                          placeholder="ABC123XY" 
                          className="text-sm"
                        />
                      </div>
                    </div>
                    <div className="mt-2 text-xs text-gray-500">
                      <p>Available template variables: <code>{'{{firstName}}'}</code>, <code>{'{{totalEntries}}'}</code>, <code>{'{{prize_amount}}'}</code>, <code>{'{{prize_name}}'}</code>, <code>{'{{referralCode}}'}</code></p>
                    </div>
                  </div>
                )}
                
                <EmailTemplatePreview campaign={getPreviewCampaign()} previewData={previewData} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg font-medium">Email Template Content</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h3 className="font-semibold mb-1">Email Subject</h3>
                  {isEditing ? (
                    <Input
                      name="email_subject"
                      value={editableContent.email_subject || ''}
                      onChange={handleInputChange}
                      className="w-full"
                      placeholder="Congratulations! You earned a Sweepstakes entry!"
                    />
                  ) : (
                    <p className="p-3 bg-gray-50 rounded border border-gray-100">
                      {campaign.email_subject || 'Congratulations! You earned a Sweepstakes entry!'}
                    </p>
                  )}
                  <p className="text-xs text-gray-500 mt-1">The subject line of the notification email</p>
                </div>
                
                <div>
                  <h3 className="font-semibold mb-1">Email Heading</h3>
                  {isEditing ? (
                    <Input
                      name="email_heading"
                      value={editableContent.email_heading || ''}
                      onChange={handleInputChange}
                      className="w-full"
                      placeholder="You just earned an extra Sweepstakes entry!"
                    />
                  ) : (
                    <p className="p-3 bg-gray-50 rounded border border-gray-100">
                      {campaign.email_heading || 'You just earned an extra Sweepstakes entry!'}
                    </p>
                  )}
                  <p className="text-xs text-gray-500 mt-1">The main heading in the email notification</p>
                </div>
                
                <div>
                  <h3 className="font-semibold mb-1">Referral Message</h3>
                  {isEditing ? (
                    <Textarea
                      name="email_referral_message"
                      value={editableContent.email_referral_message || ''}
                      onChange={handleInputChange}
                      className="w-full"
                      placeholder={`Great news! One of your referrals just tried Comprendi™, and you now have {{totalEntries}} entries in the ${campaign.prize_amount} ${campaign.prize_name} Sweepstakes!`}
                      rows={3}
                    />
                  ) : (
                    <p className="p-3 bg-gray-50 rounded border border-gray-100">
                      {campaign.email_referral_message || `Great news! One of your referrals just tried Comprendi™, and you now have {{totalEntries}} entries in the ${campaign.prize_amount} ${campaign.prize_name} Sweepstakes!`}
                    </p>
                  )}
                  <p className="text-xs text-gray-500 mt-1">Message about the referral conversion (supports template variables)</p>
                </div>
                
                <div>
                  <h3 className="font-semibold mb-1">CTA Button Text</h3>
                  {isEditing ? (
                    <Input
                      name="email_cta_text"
                      value={editableContent.email_cta_text || ''}
                      onChange={handleInputChange}
                      className="w-full"
                      placeholder="Visit Comprendi Reading"
                    />
                  ) : (
                    <p className="p-3 bg-gray-50 rounded border border-gray-100">
                      {campaign.email_cta_text || 'Visit Comprendi Reading'}
                    </p>
                  )}
                  <p className="text-xs text-gray-500 mt-1">Text for the call-to-action button</p>
                </div>
                
                <div>
                  <h3 className="font-semibold mb-1">Footer Message</h3>
                  {isEditing ? (
                    <Textarea
                      name="email_footer_message"
                      value={editableContent.email_footer_message || ''}
                      onChange={handleInputChange}
                      className="w-full"
                      placeholder="Remember, each parent who activates a free trial through your link gives you another entry in the sweepstakes!"
                      rows={3}
                    />
                  ) : (
                    <p className="p-3 bg-gray-50 rounded border border-gray-100">
                      {campaign.email_footer_message || 'Remember, each parent who activates a free trial through your link gives you another entry in the sweepstakes!'}
                    </p>
                  )}
                  <p className="text-xs text-gray-500 mt-1">Message that appears at the bottom of the email</p>
                </div>
                
                <div className="bg-blue-50 border border-blue-100 rounded p-4 mt-4">
                  <div className="flex gap-2 items-start">
                    <Mail className="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm text-blue-700">
                        <span className="font-medium">Template Variables:</span> You can use the following variables in your email content:
                      </p>
                      <ul className="text-xs text-blue-700 mt-2 list-disc list-inside space-y-1">
                        <li><code>{'{{firstName}}'}</code> - Recipient's first name</li>
                        <li><code>{'{{totalEntries}}'}</code> - Total number of entries the person has</li>
                        <li><code>{'{{prize_amount}}'}</code> - Prize amount from campaign settings</li>
                        <li><code>{'{{prize_name}}'}</code> - Prize name from campaign settings</li>
                        <li><code>{'{{referralCode}}'}</code> - The user's unique referral code</li>
                      </ul>
                    </div>
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

