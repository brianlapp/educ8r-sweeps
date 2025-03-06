
import { Helmet } from 'react-helmet-async';
import { WebhookStatus } from "@/components/WebhookStatus";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

const AdminWebhookStatus = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <Helmet>
        <title>Webhook Status | Educ8r Sweepstakes</title>
      </Helmet>
      <div className="container mx-auto py-12">
        <div className="flex items-center gap-4 mb-6">
          <Link to="/admin">
            <Button variant="outline" size="sm" className="flex items-center gap-1">
              <ArrowLeft size={16} />
              Back to Admin
            </Button>
          </Link>
          <h1 className="text-3xl font-bold">Webhook Status Dashboard</h1>
        </div>
        
        <p className="mb-6 text-muted-foreground">
          Monitor and troubleshoot webhook integrations for the referral system.
        </p>
        
        <WebhookStatus />
      </div>
    </div>
  );
};

export default AdminWebhookStatus;
