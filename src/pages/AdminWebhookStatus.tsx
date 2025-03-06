
import { Helmet } from 'react-helmet-async';
import { WebhookStatus } from "@/components/WebhookStatus";

const AdminWebhookStatus = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <Helmet>
        <title>Webhook Status | Educ8r Sweepstakes</title>
      </Helmet>
      <div className="container mx-auto py-12">
        <h1 className="text-3xl font-bold mb-6">Webhook Status Dashboard</h1>
        <p className="mb-6 text-muted-foreground">
          Monitor and troubleshoot webhook integrations for the referral system.
        </p>
        
        <WebhookStatus />
      </div>
    </div>
  );
};

export default AdminWebhookStatus;
