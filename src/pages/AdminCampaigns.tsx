
import { Helmet } from 'react-helmet-async';
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Link } from 'react-router-dom';
import { Eye, Plus, Edit, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { BackToAdminButton } from "@/components/admin/BackToAdminButton";
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";

// Campaign type definition
interface Campaign {
  id: string;
  title: string;
  slug: string;
  is_active: boolean;
  prize_name?: string;
  prize_amount?: string;
  target_audience?: string;
  thank_you_title?: string;
  thank_you_description?: string;
  email_template_id?: string;
  start_date?: string;
  end_date?: string;
  share_title?: string;
  share_description?: string;
  why_share_items?: Array<{title: string, description: string}>;
}

const AdminCampaigns = () => {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<Campaign | null>(null);
  const [formData, setFormData] = useState<Partial<Campaign>>({
    title: '',
    slug: '',
    is_active: true,
    prize_name: '',
    prize_amount: '',
    target_audience: '',
    thank_you_title: '',
    thank_you_description: '',
    email_template_id: '',
    start_date: new Date().toISOString().split('T')[0],
    end_date: new Date(new Date().setMonth(new Date().getMonth() + 3)).toISOString().split('T')[0],
    share_title: 'Give Your Students\' Parents a Free Gift!',
    share_description: 'Share your referral link with the parents of your students. When they sign up for a free trial of Comprendi™, you\'ll earn an extra entry for every parent who activates the trial.'
  });
  const [formError, setFormError] = useState<string | null>(null);
  
  const queryClient = useQueryClient();

  // Fetch campaigns
  const { isLoading: isLoadingCampaigns } = useQuery({
    queryKey: ['campaigns'],
    queryFn: async () => {
      console.log("[AdminCampaignsPage] Fetching campaigns from Supabase...");
      const { data, error } = await supabase
        .from('campaigns')
        .select('id, title, slug, is_active, prize_name, prize_amount, target_audience, thank_you_title, thank_you_description, email_template_id, start_date, end_date, share_title, share_description')
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

  // Create campaign mutation
  const createCampaign = useMutation({
    mutationFn: async (campaign: Partial<Campaign>) => {
      console.log("[AdminCampaignsPage] Creating new campaign:", campaign);
      
      // Fix: Ensure the campaign object has all required fields before inserting
      if (!campaign.title || !campaign.slug || !campaign.email_template_id || 
          !campaign.prize_name || !campaign.prize_amount || !campaign.target_audience ||
          !campaign.thank_you_title || !campaign.thank_you_description ||
          !campaign.start_date || !campaign.end_date) {
        throw new Error("Missing required fields for campaign creation");
      }
      
      // Use a type assertion to tell TypeScript that this object has all the required fields
      const { data, error } = await supabase
        .from('campaigns')
        .insert({
          title: campaign.title,
          slug: campaign.slug,
          is_active: campaign.is_active,
          prize_name: campaign.prize_name,
          prize_amount: campaign.prize_amount,
          target_audience: campaign.target_audience,
          thank_you_title: campaign.thank_you_title,
          thank_you_description: campaign.thank_you_description,
          email_template_id: campaign.email_template_id,
          start_date: campaign.start_date,
          end_date: campaign.end_date,
          share_title: campaign.share_title,
          share_description: campaign.share_description,
          why_share_items: campaign.why_share_items
        })
        .select();

      if (error) {
        console.error("[AdminCampaignsPage] Error creating campaign:", error);
        throw error;
      }

      console.log("[AdminCampaignsPage] Campaign created successfully:", data);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
      resetForm();
      toast.success("Campaign created successfully!");
    },
    onError: (error) => {
      console.error("[AdminCampaignsPage] Mutation error:", error);
      setFormError("Failed to create campaign. Please try again.");
      toast.error("Failed to create campaign");
    }
  });

  // Update campaign mutation
  const updateCampaign = useMutation({
    mutationFn: async (campaign: Partial<Campaign>) => {
      console.log("[AdminCampaignsPage] Updating campaign:", campaign);
      const { data, error } = await supabase
        .from('campaigns')
        .update(campaign)
        .eq('id', campaign.id)
        .select();

      if (error) {
        console.error("[AdminCampaignsPage] Error updating campaign:", error);
        throw error;
      }

      console.log("[AdminCampaignsPage] Campaign updated successfully:", data);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
      resetForm();
      toast.success("Campaign updated successfully!");
    },
    onError: (error) => {
      console.error("[AdminCampaignsPage] Mutation error:", error);
      setFormError("Failed to update campaign. Please try again.");
      toast.error("Failed to update campaign");
    }
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    // Basic validation
    if (!formData.title || !formData.slug || !formData.email_template_id || 
        !formData.prize_name || !formData.prize_amount || !formData.target_audience ||
        !formData.thank_you_title || !formData.thank_you_description ||
        !formData.start_date || !formData.end_date) {
      setFormError("Please fill in all required fields");
      return;
    }

    if (editingCampaign) {
      updateCampaign.mutate({ ...formData, id: editingCampaign.id });
    } else {
      createCampaign.mutate(formData);
    }
  };

  const resetForm = () => {
    setIsFormOpen(false);
    setEditingCampaign(null);
    setFormData({
      title: '',
      slug: '',
      is_active: true,
      prize_name: '',
      prize_amount: '',
      target_audience: '',
      thank_you_title: '',
      thank_you_description: '',
      email_template_id: '',
      start_date: new Date().toISOString().split('T')[0],
      end_date: new Date(new Date().setMonth(new Date().getMonth() + 3)).toISOString().split('T')[0],
      share_title: 'Give Your Students\' Parents a Free Gift!',
      share_description: 'Share your referral link with the parents of your students. When they sign up for a free trial of Comprendi™, you\'ll earn an extra entry for every parent who activates the trial.'
    });
    setFormError(null);
  };

  const openEditForm = (campaign: Campaign) => {
    setEditingCampaign(campaign);
    setFormData({
      title: campaign.title,
      slug: campaign.slug,
      is_active: campaign.is_active,
      prize_name: campaign.prize_name || '',
      prize_amount: campaign.prize_amount || '',
      target_audience: campaign.target_audience || '',
      thank_you_title: campaign.thank_you_title || '',
      thank_you_description: campaign.thank_you_description || '',
      email_template_id: campaign.email_template_id || '',
      start_date: campaign.start_date ? new Date(campaign.start_date).toISOString().split('T')[0] : '',
      end_date: campaign.end_date ? new Date(campaign.end_date).toISOString().split('T')[0] : '',
      share_title: campaign.share_title || 'Give Your Students\' Parents a Free Gift!',
      share_description: campaign.share_description || 'Share your referral link with the parents of your students. When they sign up for a free trial of Comprendi™, you\'ll earn an extra entry for every parent who activates the trial.'
    });
    setIsFormOpen(true);
  };

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
          actions={
            <div className="flex gap-2">
              <BackToAdminButton />
              <Button onClick={() => setIsFormOpen(true)} className="flex items-center gap-2">
                <Plus size={16} /> New Campaign
              </Button>
            </div>
          }
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
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="sm" className="h-8 w-8" onClick={() => openEditForm(campaign)}>
                            <Edit size={16} />
                          </Button>
                          <Link to={`/admin/campaign/${campaign.id}`}>
                            <Button variant="ghost" size="sm" className="h-8 w-8">
                              <Eye size={16} />
                            </Button>
                          </Link>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Campaign Form Modal */}
        <AlertDialog open={isFormOpen} onOpenChange={setIsFormOpen}>
          <AlertDialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <AlertDialogHeader>
              <AlertDialogTitle>{editingCampaign ? 'Edit Campaign' : 'Create New Campaign'}</AlertDialogTitle>
              <AlertDialogDescription>
                Fill in the details below to {editingCampaign ? 'update the' : 'create a new'} campaign.
              </AlertDialogDescription>
            </AlertDialogHeader>
            
            {formError && (
              <Alert variant="destructive" className="mb-4">
                <AlertDescription>{formError}</AlertDescription>
              </Alert>
            )}
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label htmlFor="title" className="text-sm font-medium">Campaign Title *</label>
                  <Input
                    id="title"
                    name="title"
                    value={formData.title}
                    onChange={handleInputChange}
                    placeholder="e.g. Classroom Supplies 2024"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="slug" className="text-sm font-medium">Campaign Slug *</label>
                  <Input
                    id="slug"
                    name="slug"
                    value={formData.slug}
                    onChange={handleInputChange}
                    placeholder="e.g. classroom-supplies-2024"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label htmlFor="prize_name" className="text-sm font-medium">Prize Name *</label>
                  <Input
                    id="prize_name"
                    name="prize_name"
                    value={formData.prize_name}
                    onChange={handleInputChange}
                    placeholder="e.g. Classroom Supplies"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="prize_amount" className="text-sm font-medium">Prize Amount *</label>
                  <Input
                    id="prize_amount"
                    name="prize_amount"
                    value={formData.prize_amount}
                    onChange={handleInputChange}
                    placeholder="e.g. $500"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label htmlFor="target_audience" className="text-sm font-medium">Target Audience *</label>
                <Input
                  id="target_audience"
                  name="target_audience"
                  value={formData.target_audience}
                  onChange={handleInputChange}
                  placeholder="e.g. Teachers"
                  required
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="email_template_id" className="text-sm font-medium">Email Template ID *</label>
                <Input
                  id="email_template_id"
                  name="email_template_id"
                  value={formData.email_template_id}
                  onChange={handleInputChange}
                  placeholder="e.g. template_123abc"
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label htmlFor="start_date" className="text-sm font-medium">Start Date *</label>
                  <Input
                    id="start_date"
                    name="start_date"
                    type="date"
                    value={formData.start_date}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="end_date" className="text-sm font-medium">End Date *</label>
                  <Input
                    id="end_date"
                    name="end_date"
                    type="date"
                    value={formData.end_date}
                    onChange={handleInputChange}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label htmlFor="thank_you_title" className="text-sm font-medium">Thank You Title *</label>
                <Input
                  id="thank_you_title"
                  name="thank_you_title"
                  value={formData.thank_you_title}
                  onChange={handleInputChange}
                  placeholder="e.g. Thanks for entering!"
                  required
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="thank_you_description" className="text-sm font-medium">Thank You Description *</label>
                <Input
                  id="thank_you_description"
                  name="thank_you_description"
                  value={formData.thank_you_description}
                  onChange={handleInputChange}
                  placeholder="e.g. You've been successfully entered in our sweepstakes."
                  required
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="share_title" className="text-sm font-medium">Share Title</label>
                <Input
                  id="share_title"
                  name="share_title"
                  value={formData.share_title}
                  onChange={handleInputChange}
                  placeholder="e.g. Give Your Students' Parents a Free Gift!"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="share_description" className="text-sm font-medium">Share Description</label>
                <Input
                  id="share_description"
                  name="share_description"
                  value={formData.share_description}
                  onChange={handleInputChange}
                  placeholder="Share description..."
                />
              </div>

              <div className="space-y-2">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    name="is_active"
                    checked={formData.is_active}
                    onChange={handleInputChange}
                  />
                  <span className="text-sm font-medium">Active Campaign</span>
                </label>
              </div>

              <AlertDialogFooter>
                <AlertDialogCancel onClick={resetForm}>Cancel</AlertDialogCancel>
                <AlertDialogAction type="submit">
                  {editingCampaign ? 'Update Campaign' : 'Create Campaign'}
                </AlertDialogAction>
              </AlertDialogFooter>
            </form>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
};

export default AdminCampaigns;
