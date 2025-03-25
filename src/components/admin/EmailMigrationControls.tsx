
import React, { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { toast } from '@/hooks/use-toast';
import { RefreshCw, AlertTriangle, CheckCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export function EmailMigrationControls({ onRefresh }: { onRefresh: () => void }) {
  const [isResetting, setIsResetting] = useState(false);
  const [isCheckingSubscriber, setIsCheckingSubscriber] = useState(false);
  const [email, setEmail] = useState('');
  const [subscriberStatus, setSubscriberStatus] = useState<any>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const resetInProgressSubscribers = async () => {
    setIsResetting(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('email-migration', {
        method: 'POST',
        body: { action: 'reset-in-progress' }
      });

      if (error) {
        console.error('Reset Error:', error);
        throw error;
      }
      
      console.log('Reset Response:', data);
      
      toast({
        title: "Reset Successful",
        description: `${data.count || 0} in-progress subscribers were reset back to pending.`,
        variant: "default"
      });
      
      // Refresh stats
      if (onRefresh) onRefresh();
    } catch (error: any) {
      console.error('Reset Error:', error);
      toast({
        title: "Reset Failed",
        description: error.message || "Failed to reset in-progress subscribers.",
        variant: "destructive"
      });
    } finally {
      setIsResetting(false);
    }
  };

  const resetFailedSubscribers = async () => {
    setIsResetting(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('email-migration', {
        method: 'POST',
        body: { action: 'reset-failed' }
      });

      if (error) {
        console.error('Reset Failed Error:', error);
        throw error;
      }
      
      console.log('Reset Failed Response:', data);
      
      toast({
        title: "Reset Successful",
        description: `${data.count || 0} failed subscribers were reset back to pending.`,
        variant: "default"
      });
      
      // Refresh stats
      if (onRefresh) onRefresh();
    } catch (error: any) {
      console.error('Reset Failed Error:', error);
      toast({
        title: "Reset Failed",
        description: error.message || "Failed to reset failed subscribers.",
        variant: "destructive"
      });
    } finally {
      setIsResetting(false);
    }
  };

  const checkSubscriber = async () => {
    if (!email) {
      toast({
        title: "Email Required",
        description: "Please enter an email address to check.",
        variant: "destructive"
      });
      return;
    }
    
    setIsCheckingSubscriber(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('email-migration', {
        method: 'POST',
        body: { action: 'check-subscriber', email }
      });

      if (error) {
        console.error('Check Subscriber Error:', error);
        throw error;
      }
      
      console.log('Check Subscriber Response:', data);
      setSubscriberStatus(data);
      
      if (!data.found) {
        toast({
          title: "Subscriber Not Found",
          description: `No subscriber found with email: ${email}`,
          variant: "default"
        });
      }
    } catch (error: any) {
      console.error('Check Subscriber Error:', error);
      toast({
        title: "Check Failed",
        description: error.message || "Failed to check subscriber status.",
        variant: "destructive"
      });
      setSubscriberStatus(null);
    } finally {
      setIsCheckingSubscriber(false);
    }
  };

  return (
    <Card className="p-4 bg-white shadow-sm">
      <h3 className="text-lg font-semibold mb-4">Troubleshooting Tools</h3>
      
      <div className="space-y-4">
        <Alert className="bg-amber-50 border-amber-200">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-amber-800">
            These tools help debug migration issues. Use caution when resetting subscribers.
          </AlertDescription>
        </Alert>
        
        <div className="flex flex-wrap gap-3">
          <Button
            variant="outline" 
            className="border-amber-500 text-amber-700 hover:bg-amber-50"
            onClick={resetInProgressSubscribers}
            disabled={isResetting}
          >
            {isResetting ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <AlertTriangle className="h-4 w-4 mr-2" />}
            Reset "In Progress" Subscribers
          </Button>
          
          <Button
            variant="outline" 
            className="border-red-500 text-red-700 hover:bg-red-50"
            onClick={resetFailedSubscribers}
            disabled={isResetting}
          >
            {isResetting ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <AlertTriangle className="h-4 w-4 mr-2" />}
            Reset "Failed" Subscribers
          </Button>
          
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="border-blue-500 text-blue-700 hover:bg-blue-50">
                Check Subscriber Status
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Check Subscriber Status</DialogTitle>
                <DialogDescription>
                  Look up the migration status of a specific subscriber by email address.
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <div className="flex space-x-2">
                    <Input
                      id="email"
                      placeholder="user@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                    <Button 
                      onClick={checkSubscriber} 
                      disabled={isCheckingSubscriber || !email}
                      className="whitespace-nowrap"
                    >
                      {isCheckingSubscriber ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : "Check"}
                    </Button>
                  </div>
                </div>
                
                {subscriberStatus && (
                  <div className="mt-4 border rounded-md p-3 bg-gray-50">
                    {subscriberStatus.found ? (
                      <>
                        <div className="flex items-center gap-2 mb-2">
                          <div className={`w-3 h-3 rounded-full ${
                            subscriberStatus.subscriber.status === 'migrated' ? 'bg-green-500' :
                            subscriberStatus.subscriber.status === 'in_progress' ? 'bg-amber-500' :
                            subscriberStatus.subscriber.status === 'failed' ? 'bg-red-500' :
                            subscriberStatus.subscriber.status === 'already_exists' ? 'bg-purple-500' :
                            'bg-blue-500'
                          }`}></div>
                          <span className="text-sm font-medium capitalize">{subscriberStatus.subscriber.status}</span>
                        </div>
                        
                        <div className="space-y-1 text-xs">
                          <div className="flex justify-between">
                            <span className="text-gray-500">Email:</span>
                            <span className="font-medium">{subscriberStatus.subscriber.email}</span>
                          </div>
                          {subscriberStatus.subscriber.first_name && (
                            <div className="flex justify-between">
                              <span className="text-gray-500">Name:</span>
                              <span className="font-medium">
                                {subscriberStatus.subscriber.first_name} {subscriberStatus.subscriber.last_name}
                              </span>
                            </div>
                          )}
                          {subscriberStatus.subscriber.error_message && (
                            <div className="flex justify-between">
                              <span className="text-gray-500">Error:</span>
                              <span className="font-medium text-red-600">{subscriberStatus.subscriber.error_message}</span>
                            </div>
                          )}
                          {subscriberStatus.subscriber.migration_batch && (
                            <div className="flex justify-between">
                              <span className="text-gray-500">Batch:</span>
                              <span className="font-medium">{subscriberStatus.subscriber.migration_batch}</span>
                            </div>
                          )}
                          {subscriberStatus.subscriber.migrated_at && (
                            <div className="flex justify-between">
                              <span className="text-gray-500">Migrated:</span>
                              <span className="font-medium">
                                {new Date(subscriberStatus.subscriber.migrated_at).toLocaleString()}
                              </span>
                            </div>
                          )}
                        </div>
                      </>
                    ) : (
                      <div className="text-center py-2">
                        <AlertTriangle className="h-5 w-5 text-amber-500 mx-auto mb-2" />
                        <p className="text-gray-600">No subscriber found with this email.</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
              
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Close
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </Card>
  );
}
