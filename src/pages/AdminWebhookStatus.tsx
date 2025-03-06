
import { Helmet } from 'react-helmet-async';
import { WebhookStatus } from "@/components/WebhookStatus";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { BackToAdminButton } from "@/components/admin/BackToAdminButton";

/**
 * Admin Webhook Status Dashboard
 * 
 * This page allows administrators to monitor and troubleshoot
 * webhook integrations for the referral system.
 */
const AdminWebhookStatus = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <Helmet>
        <title>Webhook Status | Educ8r Sweepstakes</title>
      </Helmet>
      
      <div className="container mx-auto py-12">
        <div className="flex items-center gap-4 mb-6">
          <BackToAdminButton />
          <AdminPageHeader 
            title="Webhook Status Dashboard"
            description="Monitor and troubleshoot webhook integrations for the referral system."
          />
        </div>
        
        <WebhookStatus />
      </div>
    </div>
  );
};

export default AdminWebhookStatus;
