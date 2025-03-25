
import React, { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { toast } from '@/hooks/use-toast';
import {
  AlertCircle,
  CheckCircle,
  RefreshCw,
  Search
} from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { Label } from '@/components/ui/label';

export function EmailMigrationControls({ onRefresh }: { onRefresh: () => void }) {
  const [isResetting, setIsResetting] = useState(false);
  const [isResettingFailed, setIsResettingFailed] = useState(false);
  const [searchEmail, setSearchEmail] = useState('');
  const [searchResult, setSearchResult] = useState<any>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [stuckSubscribers, setStuckSubscribers] = useState<any[]>([]);
  const [isLoadingStuck, setIsLoadingStuck] = useState(false);
  const [stuckDetailsOpen, setStuckDetailsOpen] = useState(false);
  const [detailedAnalysisLoading, setDetailedAnalysisLoading] = useState(false);
  const [detailedAnalysisResults, setDetailedAnalysisResults] = useState<any>(null);
  
  const resetInProgressSubscribers = async () => {
    setIsResetting(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('email-migration', {
        method: 'POST',
        body: { action: 'reset-in-progress' }
      });
      
      if (error) throw error;
      
      toast({
        title: "Reset Successful",
        description: data.message,
        variant: "default"
      });
      
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
    setIsResettingFailed(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('email-migration', {
        method: 'POST',
        body: { action: 'reset-failed' }
      });
      
      if (error) throw error;
      
      toast({
        title: "Reset Successful",
        description: data.message,
        variant: "default"
      });
      
      if (onRefresh) onRefresh();
    } catch (error: any) {
      console.error('Reset Error:', error);
      toast({
        title: "Reset Failed",
        description: error.message || "Failed to reset failed subscribers.",
        variant: "destructive"
      });
    } finally {
      setIsResettingFailed(false);
    }
  };
  
  const searchSubscriber = async () => {
    if (!searchEmail) {
      toast({
        title: "Email Required",
        description: "Please enter an email address to search for.",
        variant: "destructive"
      });
      return;
    }
    
    setIsSearching(true);
    setSearchResult(null);
    
    try {
      const { data, error } = await supabase.functions.invoke('email-migration', {
        method: 'POST',
        body: { 
          action: 'check-subscriber',
          email: searchEmail
        }
      });
      
      if (error) throw error;
      
      setSearchResult(data);
      
      if (!data.found) {
        toast({
          title: "Subscriber Not Found",
          description: `No subscriber found with email: ${searchEmail}`,
          variant: "default"
        });
      }
    } catch (error: any) {
      console.error('Search Error:', error);
      toast({
        title: "Search Failed",
        description: error.message || "Failed to search for subscriber.",
        variant: "destructive"
      });
    } finally {
      setIsSearching(false);
    }
  };
  
  // New function to load subscribers stuck in the "in_progress" state
  const loadStuckSubscribers = async () => {
    setIsLoadingStuck(true);
    setStuckSubscribers([]);
    
    try {
      const { data, error } = await supabase.functions.invoke('email-migration', {
        method: 'POST',
        body: { action: 'get-stuck-subscribers' }
      });
      
      if (error) throw error;
      
      if (data && data.subscribers) {
        setStuckSubscribers(data.subscribers);
        
        if (data.subscribers.length === 0) {
          toast({
            title: "No Stuck Subscribers",
            description: "No subscribers are currently stuck in the 'in_progress' state.",
            variant: "default"
          });
        } else {
          setStuckDetailsOpen(true);
        }
      }
    } catch (error: any) {
      console.error('Error loading stuck subscribers:', error);
      toast({
        title: "Loading Failed",
        description: error.message || "Failed to load stuck subscribers.",
        variant: "destructive"
      });
    } finally {
      setIsLoadingStuck(false);
    }
  };
  
  // Run a detailed analysis on stuck subscribers to determine why they're stuck
  const runDetailedAnalysis = async () => {
    setDetailedAnalysisLoading(true);
    setDetailedAnalysisResults(null);
    
    try {
      const { data, error } = await supabase.functions.invoke('email-migration', {
        method: 'POST',
        body: { action: 'analyze-stuck-subscribers' }
      });
      
      if (error) throw error;
      
      setDetailedAnalysisResults(data);
      
      if (data && data.analysis && data.analysis.potential_issues && data.analysis.potential_issues.length > 0) {
        toast({
          title: "Analysis Complete",
          description: `Found ${data.analysis.potential_issues.length} potential issues with stuck subscribers.`,
          variant: "default"
        });
      } else {
        toast({
          title: "Analysis Complete",
          description: "No specific issues identified with stuck subscribers.",
          variant: "default"
        });
      }
    } catch (error: any) {
      console.error('Analysis Error:', error);
      toast({
        title: "Analysis Failed",
        description: error.message || "Failed to analyze stuck subscribers.",
        variant: "destructive"
      });
    } finally {
      setDetailedAnalysisLoading(false);
    }
  };
  
  return (
    <div className="space-y-4">
      <Card className="p-4 bg-white shadow-sm">
        <h3 className="text-lg font-semibold mb-4">Troubleshooting Controls</h3>
        
        <div className="space-y-4">
          <Alert className="bg-amber-50 border-amber-200">
            <AlertCircle className="h-4 w-4 text-amber-800" />
            <AlertDescription className="text-amber-800">
              These controls are intended for troubleshooting migration issues. Use with caution.
            </AlertDescription>
          </Alert>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h4 className="text-sm font-medium mb-2">Reset Controls</h4>
              <div className="space-y-2">
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={resetInProgressSubscribers}
                  disabled={isResetting}
                >
                  {isResetting ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Resetting...
                    </>
                  ) : (
                    <>
                      <AlertCircle className="h-4 w-4 mr-2 text-amber-600" />
                      Reset In-Progress Subscribers
                    </>
                  )}
                </Button>
                
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={resetFailedSubscribers}
                  disabled={isResettingFailed}
                >
                  {isResettingFailed ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Resetting...
                    </>
                  ) : (
                    <>
                      <AlertCircle className="h-4 w-4 mr-2 text-red-600" />
                      Reset Failed Subscribers
                    </>
                  )}
                </Button>
              </div>
            </div>
            
            <div>
              <h4 className="text-sm font-medium mb-2">Subscriber Lookup</h4>
              <div className="flex space-x-2">
                <Input
                  placeholder="Email address"
                  value={searchEmail}
                  onChange={(e) => setSearchEmail(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && searchSubscriber()}
                />
                <Button 
                  variant="outline" 
                  onClick={searchSubscriber}
                  disabled={isSearching}
                >
                  {isSearching ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <Search className="h-4 w-4" />
                  )}
                </Button>
              </div>
              
              {searchResult && searchResult.found && (
                <div className="mt-2 p-2 text-xs bg-gray-50 border rounded">
                  <div className="flex justify-between">
                    <span className="font-medium">Email:</span>
                    <span>{searchResult.subscriber.email}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium">Status:</span>
                    <span>
                      {searchResult.subscriber.status === 'pending' && <span className="text-amber-600">Pending</span>}
                      {searchResult.subscriber.status === 'in_progress' && <span className="text-blue-600">In Progress</span>}
                      {searchResult.subscriber.status === 'migrated' && <span className="text-green-600">Migrated</span>}
                      {searchResult.subscriber.status === 'failed' && <span className="text-red-600">Failed</span>}
                      {searchResult.subscriber.status === 'already_exists' && <span className="text-purple-600">Already Exists</span>}
                    </span>
                  </div>
                  {searchResult.subscriber.error_message && (
                    <div className="flex justify-between">
                      <span className="font-medium">Error:</span>
                      <span className="text-red-600">{searchResult.subscriber.error_message}</span>
                    </div>
                  )}
                  {searchResult.subscriber.migration_batch && (
                    <div className="flex justify-between">
                      <span className="font-medium">Batch:</span>
                      <span>{searchResult.subscriber.migration_batch}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
          
          <Separator />
          
          <div>
            <h4 className="text-sm font-medium mb-2">Advanced Troubleshooting</h4>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                onClick={loadStuckSubscribers}
                disabled={isLoadingStuck}
                className="text-amber-700 border-amber-300 hover:bg-amber-50"
              >
                {isLoadingStuck ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Loading...
                  </>
                ) : (
                  <>
                    <AlertCircle className="h-4 w-4 mr-2" />
                    Find Stuck Subscribers
                  </>
                )}
              </Button>
              
              <Button
                variant="outline"
                onClick={() => {
                  toast({
                    title: "Version Check",
                    description: "Checking deployed function version...",
                  });
                  
                  supabase.functions.invoke('email-migration', {
                    method: 'POST',
                    body: { action: 'version-check' }
                  }).then(({ data, error }) => {
                    console.info('Version Check Response:', data);
                    
                    if (error) {
                      toast({
                        title: "Version Check Failed",
                        description: error.message,
                        variant: "destructive"
                      });
                      return;
                    }
                    
                    toast({
                      title: "Function Version",
                      description: `Deployed: ${data.version}, Format: ${data.customFieldsFormat || 'Unknown'}`,
                    });
                  });
                }}
              >
                <CheckCircle className="h-4 w-4 mr-2 text-green-600" />
                Check Function Version
              </Button>
              
              <Button
                variant="outline"
                onClick={runDetailedAnalysis}
                disabled={detailedAnalysisLoading}
                className="text-blue-700 border-blue-300 hover:bg-blue-50"
              >
                {detailedAnalysisLoading ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Search className="h-4 w-4 mr-2" />
                    Run Detailed Analysis
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </Card>
      
      {/* Stuck Subscribers Dialog */}
      <Dialog open={stuckDetailsOpen} onOpenChange={setStuckDetailsOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Stuck Subscribers</DialogTitle>
            <DialogDescription>
              These subscribers are stuck in the "in_progress" state.
            </DialogDescription>
          </DialogHeader>
          
          <div className="max-h-[400px] overflow-y-auto">
            {stuckSubscribers.length === 0 ? (
              <p className="text-center py-4 text-gray-500">No stuck subscribers found.</p>
            ) : (
              <div className="space-y-2">
                <div className="grid grid-cols-4 gap-2 font-medium text-sm p-2 bg-gray-100 rounded">
                  <div>Email</div>
                  <div>Name</div>
                  <div>Batch ID</div>
                  <div>Updated At</div>
                </div>
                
                {stuckSubscribers.map((subscriber) => (
                  <div key={subscriber.id} className="grid grid-cols-4 gap-2 text-xs p-2 border rounded hover:bg-gray-50">
                    <div className="truncate">{subscriber.email}</div>
                    <div className="truncate">{`${subscriber.first_name || ''} ${subscriber.last_name || ''}`}</div>
                    <div className="truncate">{subscriber.migration_batch || 'N/A'}</div>
                    <div>{new Date(subscriber.updated_at).toLocaleString()}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          <div className="p-2 border rounded bg-gray-50">
            <div className="font-medium mb-2">Quick Actions</div>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={resetInProgressSubscribers}
                disabled={isResetting}
              >
                {isResetting ? 'Resetting...' : 'Reset All In-Progress'}
              </Button>
              
              <Button
                size="sm"
                variant="outline"
                onClick={runDetailedAnalysis}
                disabled={detailedAnalysisLoading}
                className="text-blue-700 border-blue-300 hover:bg-blue-50"
              >
                {detailedAnalysisLoading ? 'Analyzing...' : 'Run Analysis'}
              </Button>
            </div>
          </div>
          
          {detailedAnalysisResults && (
            <div className="p-3 border rounded mt-2 bg-blue-50">
              <h4 className="font-medium mb-2">Analysis Results</h4>
              
              <div className="space-y-2 text-sm">
                <div className="p-2 bg-white rounded">
                  <span className="font-medium">Total Analyzed:</span> {detailedAnalysisResults.count} subscribers
                </div>
                
                {detailedAnalysisResults.analysis && (
                  <>
                    {detailedAnalysisResults.analysis.oldest_batch && (
                      <div className="p-2 bg-white rounded">
                        <span className="font-medium">Oldest Batch:</span> {detailedAnalysisResults.analysis.oldest_batch.id} 
                        <span className="text-gray-500 ml-2">
                          ({new Date(detailedAnalysisResults.analysis.oldest_batch.updated_at).toLocaleString()})
                        </span>
                      </div>
                    )}
                    
                    {detailedAnalysisResults.analysis.potential_issues && 
                     detailedAnalysisResults.analysis.potential_issues.length > 0 && (
                      <div className="p-2 bg-white rounded">
                        <div className="font-medium mb-1">Potential Issues:</div>
                        <ul className="list-disc list-inside space-y-1">
                          {detailedAnalysisResults.analysis.potential_issues.map((issue: string, idx: number) => (
                            <li key={idx} className="text-sm">{issue}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    
                    {detailedAnalysisResults.analysis.recommendations && 
                     detailedAnalysisResults.analysis.recommendations.length > 0 && (
                      <div className="p-2 bg-white rounded text-blue-800">
                        <div className="font-medium mb-1">Recommendations:</div>
                        <ul className="list-disc list-inside space-y-1">
                          {detailedAnalysisResults.analysis.recommendations.map((rec: string, idx: number) => (
                            <li key={idx} className="text-sm">{rec}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button variant="secondary" onClick={() => setStuckDetailsOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
