
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2Icon, CheckCircleIcon, XCircleIcon } from "lucide-react";

interface WebhookStatus {
  jwt_status?: {
    enabled: boolean;
    bypass_active: boolean;
    message: string;
    source?: string;
    bypass_result?: any;
  };
  function_health?: string;
  status?: string;
  message?: string;
  timestamp?: string;
}

export const WebhookStatus = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [everflowStatus, setEverflowStatus] = useState<WebhookStatus | null>(null);
  const [emailStatus, setEmailStatus] = useState<WebhookStatus | null>(null);
  const [lastChecked, setLastChecked] = useState<string | null>(null);
  const { toast } = useToast();

  const checkStatuses = async () => {
    setIsLoading(true);
    try {
      // Check Everflow webhook status
      const everflowRes = await fetch("https://epfzraejquaxqrfmkmyx.supabase.co/functions/v1/everflow-webhook?jwt_check=true");
      const everflowData = await everflowRes.json();
      setEverflowStatus(everflowData);
      
      // Check email notification webhook status
      const emailRes = await fetch("https://epfzraejquaxqrfmkmyx.supabase.co/functions/v1/send-referral-notification?health_check=true");
      const emailData = await emailRes.json();
      setEmailStatus(emailData);
      
      setLastChecked(new Date().toLocaleTimeString());
      
      toast({
        title: "Status Check Complete",
        description: "Successfully retrieved webhook statuses",
      });
    } catch (error) {
      console.error("Error checking webhook statuses:", error);
      toast({
        title: "Error",
        description: "Failed to check webhook statuses",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const renderStatusBadge = (isEnabled: boolean | undefined) => {
    if (isEnabled === undefined) return <Badge variant="outline">Unknown</Badge>;
    return isEnabled ? 
      <Badge variant="destructive">Enabled</Badge> : 
      <Badge variant="success">Disabled</Badge>;
  };

  const renderHealthBadge = (status: string | undefined) => {
    if (!status) return <Badge variant="outline">Unknown</Badge>;
    return status === "ok" ? 
      <Badge variant="success">Healthy</Badge> : 
      <Badge variant="destructive">Unhealthy</Badge>;
  };

  return (
    <Card className="shadow-md">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          Webhook Status
          {lastChecked && <span className="text-sm font-normal text-muted-foreground">Last checked: {lastChecked}</span>}
        </CardTitle>
        <CardDescription>
          Check the status of the referral webhooks and their JWT verification settings
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="border rounded-lg p-4">
            <h3 className="font-medium mb-2">Everflow Webhook</h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">JWT Verification:</span> 
                {everflowStatus ? renderStatusBadge(everflowStatus.jwt_status?.enabled) : <Badge variant="outline">Unknown</Badge>}
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">JWT Bypass:</span>
                {everflowStatus ? renderStatusBadge(!everflowStatus.jwt_status?.bypass_active) : <Badge variant="outline">Unknown</Badge>}
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Function Health:</span>
                {everflowStatus ? renderHealthBadge(everflowStatus.function_health) : <Badge variant="outline">Unknown</Badge>}
              </div>
            </div>
            {everflowStatus?.jwt_status?.message && (
              <p className="text-xs mt-2 italic text-muted-foreground">{everflowStatus.jwt_status.message}</p>
            )}
          </div>
          
          <div className="border rounded-lg p-4">
            <h3 className="font-medium mb-2">Email Notification Service</h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">JWT Verification:</span>
                {emailStatus ? renderStatusBadge(emailStatus.jwt_status?.enabled) : <Badge variant="outline">Unknown</Badge>}
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">JWT Bypass:</span>
                {emailStatus ? renderStatusBadge(!emailStatus.jwt_status?.bypass_active) : <Badge variant="outline">Unknown</Badge>}
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Function Health:</span>
                {emailStatus ? renderHealthBadge(emailStatus.status) : <Badge variant="outline">Unknown</Badge>}
              </div>
            </div>
            {emailStatus?.message && (
              <p className="text-xs mt-2 italic text-muted-foreground">{emailStatus.message}</p>
            )}
          </div>
        </div>
        
        <Separator />
        
        <div className="bg-slate-50 p-3 rounded-md text-sm">
          <div className="flex items-start gap-2">
            {everflowStatus && emailStatus ? (
              <>
                {!everflowStatus.jwt_status?.enabled && !emailStatus.jwt_status?.enabled ? (
                  <CheckCircleIcon className="h-5 w-5 text-green-500 mt-0.5" />
                ) : (
                  <XCircleIcon className="h-5 w-5 text-red-500 mt-0.5" />
                )}
                <div>
                  <p className="font-medium">
                    {!everflowStatus.jwt_status?.enabled && !emailStatus.jwt_status?.enabled ? 
                      "JWT verification is correctly disabled" : 
                      "JWT verification issue detected"}
                  </p>
                  <p className="text-muted-foreground mt-1">
                    {!everflowStatus.jwt_status?.enabled && !emailStatus.jwt_status?.enabled ? 
                      "Both webhooks have JWT verification disabled, referrals should work correctly." : 
                      "One or both webhooks have JWT verification enabled, which may cause referrals to fail."}
                  </p>
                </div>
              </>
            ) : (
              <p className="text-muted-foreground">Check webhook status to see verification details</p>
            )}
          </div>
        </div>
      </CardContent>
      <CardFooter>
        <Button 
          onClick={checkStatuses} 
          disabled={isLoading} 
          className="w-full"
        >
          {isLoading ? (
            <>
              <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
              Checking...
            </>
          ) : (
            "Check Webhook Status"
          )}
        </Button>
      </CardFooter>
    </Card>
  );
};
