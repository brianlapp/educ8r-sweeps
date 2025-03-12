
import { Helmet } from 'react-helmet-async';
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useState } from "react";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { BackToAdminButton } from "@/components/admin/BackToAdminButton";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription } from "@/components/ui/alert-dialog";
import { CampaignList } from "@/features/campaigns/components/CampaignList";
import { CampaignForm } from "@/features/campaigns/components/CampaignForm";
import { useCampaigns } from "@/features/campaigns/hooks/useCampaigns";
import { useCampaignMutations } from "@/features/campaigns/hooks/useCampaignMutations";
import { Campaign } from "@/features/campaigns/types";

const AdminCampaigns = () => {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<Campaign | null>(null);
  
  const { data: campaigns = [], isLoading, refetch } = useCampaigns();
  const { createCampaign, updateCampaign, toggleCampaignVisibility } = useCampaignMutations();

  const handleSubmit = (formData: any) => {
    console.log("[AdminCampaigns] Form submitted with data:", formData);
    
    if (editingCampaign) {
      console.log("[AdminCampaigns] Updating existing campaign:", editingCampaign.id);
      const updatedCampaign = { 
        ...formData, 
        id: editingCampaign.id,
        // Preserve these fields from the original campaign if they exist
        created_at: editingCampaign.created_at,
        updated_at: editingCampaign.updated_at
      };
      
      console.log("[AdminCampaigns] Calling updateCampaign with:", updatedCampaign);
      updateCampaign.mutate(updatedCampaign);
    } else {
      console.log("[AdminCampaigns] Creating new campaign");
      createCampaign.mutate(formData);
    }
    
    resetForm();
    
    // Force a refetch to ensure the UI shows the latest data
    setTimeout(() => {
      console.log("[AdminCampaigns] Refetching campaign data");
      refetch();
    }, 1000); // Small delay to ensure the mutation has completed
  };

  const resetForm = () => {
    setIsFormOpen(false);
    setEditingCampaign(null);
  };

  const openEditForm = (campaign: Campaign) => {
    console.log("[AdminCampaigns] Opening edit form for campaign:", campaign);
    setEditingCampaign(campaign);
    setIsFormOpen(true);
  };

  const handleHideCampaign = (campaignId: string) => {
    toggleCampaignVisibility.mutate({ campaignId, visible: false });
    // Force a refetch to ensure the UI shows the latest data
    setTimeout(() => {
      refetch();
    }, 500);
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

        <AlertDialog open={isFormOpen} onOpenChange={setIsFormOpen}>
          <AlertDialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <AlertDialogHeader>
              <AlertDialogTitle>{editingCampaign ? 'Edit Campaign' : 'Create New Campaign'}</AlertDialogTitle>
              <AlertDialogDescription>
                Fill in the details below to {editingCampaign ? 'update the' : 'create a new'} campaign.
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
