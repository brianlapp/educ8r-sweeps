
import { Helmet } from 'react-helmet-async';
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useState, useEffect } from "react";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { BackToAdminButton } from "@/components/admin/BackToAdminButton";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription } from "@/components/ui/alert-dialog";
import { CampaignList } from "@/features/campaigns/components/CampaignList";
import { CampaignForm } from "@/features/campaigns/components/CampaignForm";
import { useCampaigns } from "@/features/campaigns/hooks/useCampaigns";
import { useCampaignMutations } from "@/features/campaigns/hooks/useCampaignMutations";
import { Campaign } from "@/features/campaigns/types";
import { toast } from "sonner";
import { useAnalytics } from "@/hooks/use-analytics";

const AdminCampaigns = () => {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<Campaign | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { trackEvent } = useAnalytics();
  
  const { data: campaigns = [], isLoading, refetch } = useCampaigns();
  const { createCampaign, updateCampaign, toggleCampaignVisibility, deleteCampaign } = useCampaignMutations();

  useEffect(() => {
    console.log("[AdminCampaigns] Component mounted, triggering refetch");
    refetch();
  }, [refetch]);

  const handleSubmit = (formData: any) => {
    console.log("[AdminCampaigns] Form submitted with data:", JSON.stringify(formData, null, 2));
    setIsSubmitting(true);
    
    if (editingCampaign) {
      console.log("[AdminCampaigns] Updating existing campaign:", editingCampaign.id);
      
      const updatedCampaign = { 
        ...formData, 
        id: editingCampaign.id,
        created_at: editingCampaign.created_at,
        updated_at: editingCampaign.updated_at
      };
      
      trackEvent('admin_update_campaign', { campaignId: editingCampaign.id });
      
      updateCampaign.mutate(updatedCampaign, {
        onSuccess: () => {
          console.log("[AdminCampaigns] Update successful - closing form and refreshing");
          toast.success("Campaign updated successfully!");
          resetForm();
          setTimeout(() => refetch(), 500);
        },
        onError: (error) => {
          console.error("[AdminCampaigns] Update failed:", error);
          toast.error(`Failed to update campaign: ${error instanceof Error ? error.message : 'Unknown error'}`);
          setIsSubmitting(false);
        }
      });
    } else {
      console.log("[AdminCampaigns] Creating new campaign");
      trackEvent('admin_create_campaign');
      
      createCampaign.mutate(formData, {
        onSuccess: () => {
          console.log("[AdminCampaigns] Create successful - closing form and refreshing");
          toast.success("Campaign created successfully!");
          resetForm();
          setTimeout(() => refetch(), 500);
        },
        onError: (error: Error) => {
          console.error("[AdminCampaigns] Create failed:", error);
          toast.error(`Failed to create campaign: ${error.message}`);
          setIsSubmitting(false);
        }
      });
    }
  };

  const resetForm = () => {
    setIsFormOpen(false);
    setEditingCampaign(null);
    setIsSubmitting(false);
  };

  const openEditForm = (campaign: Campaign) => {
    console.log("[AdminCampaigns] Opening edit form for campaign:", campaign.id);
    setEditingCampaign(campaign);
    setIsFormOpen(true);
  };

  const handleHideCampaign = (campaignId: string) => {
    console.log("[AdminCampaigns] Hiding campaign:", campaignId);
    trackEvent('admin_hide_campaign', { campaignId });
    toggleCampaignVisibility.mutate({ campaignId, visible: false }, {
      onSuccess: () => {
        toast.success("Campaign hidden successfully!");
        setTimeout(() => refetch(), 500);
      },
      onError: (error) => {
        toast.error(`Failed to hide campaign: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    });
  };

  if (isLoading) {
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
              <CampaignList 
                campaigns={campaigns} 
                onEdit={openEditForm}
                onHide={handleHideCampaign}
              />
            </div>
          </CardContent>
        </Card>

        <AlertDialog open={isFormOpen} onOpenChange={(open) => !isSubmitting && setIsFormOpen(open)}>
          <AlertDialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <AlertDialogHeader>
              <AlertDialogTitle>{editingCampaign ? 'Edit Campaign' : 'Create New Campaign'}</AlertDialogTitle>
              <AlertDialogDescription>
                Fill in the details below to {editingCampaign ? 'update the' : 'create a new'} campaign.
                Fields marked with * are required.
              </AlertDialogDescription>
            </AlertDialogHeader>
            
            <CampaignForm
              initialData={editingCampaign || undefined}
              onSubmit={handleSubmit}
              onCancel={resetForm}
            />
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}

export default AdminCampaigns;
