
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

const AdminCampaigns = () => {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<Campaign | null>(null);
  
  const { data: campaigns = [], isLoading, refetch } = useCampaigns();
  const { createCampaign, updateCampaign, toggleCampaignVisibility } = useCampaignMutations();

  // Add this effect to ensure proper refetching after form operations
  useEffect(() => {
    // This will run when the component mounts and should trigger a fresh fetch
    refetch();
  }, [refetch]);

  const handleSubmit = (formData: any) => {
    console.log("[FORM-DEBUG] Form submitted with data:", JSON.stringify(formData, null, 2));
    
    if (editingCampaign) {
      console.log("[FORM-DEBUG] Updating existing campaign:", editingCampaign.id);
      console.log("[FORM-DEBUG] New title value:", formData.title);
      console.log("[FORM-DEBUG] Old title value:", editingCampaign.title);
      
      const updatedCampaign = { 
        ...formData, 
        id: editingCampaign.id,
        created_at: editingCampaign.created_at,
        updated_at: editingCampaign.updated_at
      };
      
      console.log("[FORM-DEBUG] Calling updateCampaign with:", JSON.stringify(updatedCampaign, null, 2));
      
      try {
        updateCampaign.mutate(updatedCampaign, {
          onSuccess: () => {
            console.log("[FORM-DEBUG] Update mutation successful - forcing refetch");
            // Force a refetch to ensure the UI shows the latest data
            setTimeout(() => {
              refetch().then(result => {
                console.log("[FORM-DEBUG] Refetch completed with result:", result);
                if (result.data) {
                  console.log("[FORM-DEBUG] Updated campaign list:", JSON.stringify(result.data, null, 2));
                }
              });
            }, 500);
          },
          onError: (error) => {
            console.error("[FORM-DEBUG] Update mutation failed:", error);
            toast.error("Failed to update campaign. Please try again.");
          }
        });
      } catch (err) {
        console.error("[FORM-DEBUG] Exception in updateCampaign.mutate:", err);
        toast.error("An error occurred while updating the campaign");
      }
    } else {
      console.log("[AdminCampaigns] Creating new campaign");
      createCampaign.mutate(formData);
    }
    
    resetForm();
  };

  const resetForm = () => {
    setIsFormOpen(false);
    setEditingCampaign(null);
  };

  const openEditForm = (campaign: Campaign) => {
    console.log("[AdminCampaigns] Opening edit form for campaign:", JSON.stringify(campaign, null, 2));
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
