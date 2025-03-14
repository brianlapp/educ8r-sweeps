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
import { PartnershipBanner } from "@/components/PartnershipBanner";

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
          promotional_text: data.promotional_text || 'Enter for a chance to win $200 to spend on everything on your Anything from Amazon list - from backpacks and notebooks to markers and more! Get ready for a successful school year.',
          email_subject: data.email_subject || 'Congratulations! You earned a Sweepstakes entry!',
          email_heading: data.email_heading || 'You just earned an extra Sweepstakes entry!',
          email_referral_message: data.email_referral_message || 'Great news! One of your referrals just tried Comprendi™, and you now have {{totalEntries}} entries in the {{prize_amount}} {{prize_name}} Sweepstakes!',
          email_cta_text: data.email_cta_text || 'Visit Comprendi Reading',
          email_footer_message: data.email_footer_message || 'Remember, each parent who activates a free trial through your link gives you another entry in the sweepstakes!'
        };
        
        setCampaign(processedData as Campaign);
        setEditableContent({
          title: processedData.title,
          prize_name: processedData.prize_name,
          prize_amount: processedData.prize_amount,
          subtitle: processedData.subtitle,
          mobile_subtitle: processedData.mobile_subtitle,
          promotional_text: processedData.promotional_text,
          hero_image_url: processedData.hero_image_url || '',
          share_title: processedData.share_title,
          share_description: processedData.share_description,
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
        prize_amount: campaign.prize_amount,
        subtitle: campaign.subtitle,
        mobile_subtitle: campaign.mobile_subtitle,
        promotional_text: campaign.promotional_text,
        share_title: campaign.share_title,
        share_description: campaign.share_description,
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

  const getEmailPreviewHtml = () => {
    if (!campaign) return '';
    
    const source = isEditing ? editableContent : campaign;
    const firstName = "Sarah";
    const totalEntries = 3;
    const referralCode = "N7AMZV2N";
    
    const referralMessage = (source.email_referral_message || '')
      .replace('{{totalEntries}}', totalEntries.toString())
      .replace('{{prize_amount}}', source.prize_amount || '$1,000')
      .replace('{{prize_name}}', source.prize_name || 'Classroom Supplies');
    
    const referralLink = `https://dmlearninglab.com/homesc/?utm_source=sweeps&oid=1987&sub1=${referralCode}`;
    
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
        <div style="text-align: center; margin-bottom: 20px;">
          <img src="https://educ8r.freeparentsearch.com/lovable-uploads/2b96223c-82ba-48db-9c96-5c37da48d93e.png" alt="FPS Logo" style="max-width: 180px;">
        </div>
        
        <h1 style="color: #2C3E50; text-align: center; margin-bottom: 20px;">Congratulations, ${firstName}!</h1>
        
        <div style="background-color: #f8fafc; border-radius: 8px; padding: 20px; margin-bottom: 20px; border-left: 4px solid #3b82f6;">
          <h2 style="color: #3b82f6; margin-top: 0;">${source.email_heading}</h2>
          <p style="font-size: 16px; line-height: 1.5;">
            ${referralMessage}
          </p>
        </div>
        
        <p style="font-size: 16px; line-height: 1.5; margin-bottom: 20px;">
          Keep the momentum going! Share your referral link with more parents to increase your chances of winning:
        </p>
        
        <div style="background-color: #f0f9ff; border-radius: 8px; padding: 15px; margin-bottom: 25px; word-break: break-all; font-family: monospace; font-size: 14px;">
          ${referralLink}
        </div>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${referralLink}" style="display: inline-block; background-color: #16a34a; color: white; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: bold; font-size: 16px;">${source.email_cta_text}</a>
        </div>
        
        <p style="font-size: 16px; line-height: 1.5;">
          ${source.email_footer_message}
        </p>
        
        <p style="font-size: 16px; line-height: 1.5; margin-top: 30px;">
          Thank you for spreading the word about Comprendi™ and helping more students succeed!
        </p>
        
        <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e2e8f0; text-align: center; color: #64748b; font-size: 14px;">
          <p>© 2025 Free Parent Search. All rights reserved.</p>
        </div>
      </div>
    `;
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
                <div className="h-[600px] rounded-md border border-gray-200 overflow-hidden bg-white">
                  <iframe 
                    srcDoc={getEmailPreviewHtml()}
                    className="w-full h-full" 
                    title="Email Template Preview"
                  />
                </div>
                <div className="flex justify-between p-4">
                  <div className="text-sm text-gray-500">
                    <span className="font-medium">Template ID:</span> {campaign.email_template_id}
                  </div>
                  <div className="flex items-center text-sm text-blue-600">
                    <Mail className="h-4 w-4 mr-1" />
                    Email preview (with placeholder data)
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg font-medium">Email Template Configuration</CardTitle>
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
                      placeholder="e.g. Congratulations! You earned a Sweepstakes entry!"
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
                      placeholder="e.g. You just earned an extra Sweepstakes entry!"
                    />
                  ) : (
                    <p className="p-3 bg-gray-50 rounded border border-gray-100">
                      {campaign.email_heading || 'You just earned an extra Sweepstakes entry!'}
                    </p>
                  )}
                  <p className="text-xs text-gray-500 mt-1">The main heading in the email</p>
                </div>
                
                <div>
                  <h3 className="font-semibold mb-1">Referral Message</h3>
                  {isEditing ? (
                    <Textarea
                      name="email_referral_message"
                      value={editableContent.email_referral_message || ''}
                      onChange={handleInputChange}
                      className="w-full"
                      placeholder="Great news! One of your referrals just tried Comprendi™..."
                      rows={3}
                    />
                  ) : (
                    <p className="p-3 bg-gray-50 rounded border border-gray-100">
                      {campaign.email_referral_message || 'Great news! One of your referrals just tried Comprendi™, and you now have {{totalEntries}} entries in the {{prize_amount}} {{prize_name}} Sweepstakes!'}
                    </p>
                  )}
                  <p className="text-xs text-gray-500 mt-1">
                    Use <code>&#123;&#123;totalEntries&#125;&#125;</code>, <code>&#123;&#123;prize_amount&#125;&#125;</code>, and <code>&#123;&#123;prize_name&#125;&#125;</code> as placeholders
                  </p>
                </div>
                
                <div>
                  <h3 className="font-semibold mb-1">Call-to-Action Button Text</h3>
                  {isEditing ? (
                    <Input
                      name="email_cta_text"
                      value={editableContent.email_cta_text || ''}
                      onChange={handleInputChange}
                      className="w-full"
                      placeholder="e.g. Visit Comprendi Reading"
                    />
                  ) : (
                    <p className="p-3 bg-gray-50 rounded border border-gray-100">
                      {campaign.email_cta_text || 'Visit Comprendi Reading'}
                    </p>
                  )}
                </div>
                
                <div>
                  <h3 className="font-semibold mb-1">Footer Message</h3>
                  {isEditing ? (
                    <Textarea
                      name="email_footer_message"
                      value={editableContent.email_footer_message || ''}
                      onChange={handleInputChange}
                      className="w-full"
                      placeholder="Remember, each parent who activates a free trial..."
                      rows={2}
                    />
                  ) : (
                    <p className="p-3 bg-gray-50 rounded border border-gray-100">
                      {campaign.email_footer_message || 'Remember, each parent who activates a free trial through your link gives you another entry in the sweepstakes!'}
                    </p>
                  )}
                </div>
                
                <div className="bg-blue-50 border border-blue-100 rounded p-4">
                  <p className="text-sm text-blue-700">
                    <span className="font-medium">Note:</span> The email notification automatically includes the user's referral link and personalized information.
                    These templates will be used when sending notifications about new referrals.
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
