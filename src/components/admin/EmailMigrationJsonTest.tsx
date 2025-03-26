
import React, { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from '@/hooks/use-toast';
import { AlertCircle, Loader } from 'lucide-react';

export function EmailMigrationJsonTest() {
  const [jsonInput, setJsonInput] = useState(JSON.stringify([
    {
      "email": "test@example.com",
      "first_name": "Test",
      "last_name": "User"
    }
  ], null, 2));
  const [isLoading, setIsLoading] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const testJsonHandling = async () => {
    setIsLoading(true);
    setError(null);
    setTestResult(null);
    
    try {
      // Parse the JSON input
      let data;
      try {
        data = JSON.parse(jsonInput);
      } catch (parseError) {
        setError(`Invalid JSON: ${parseError.message}`);
        return;
      }
      
      // Test with the edge function
      const { data: result, error: apiError } = await supabase.functions.invoke('email-migration', {
        method: 'POST',
        body: { 
          action: 'test-jsonb',
          data: data
        }
      });
      
      if (apiError) {
        throw new Error(`API Error: ${apiError.message}`);
      }
      
      setTestResult(result);
      
      // Check for successful results
      if (result.directResult?.success || result.stringifiedResult?.success) {
        toast({
          title: "Test Successful",
          description: "At least one test passed successfully.",
          variant: "success"
        });
      } else {
        toast({
          title: "Test Failed",
          description: "Both tests failed. See details for more information.",
          variant: "destructive"
        });
      }
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred');
      toast({
        title: "Test Failed",
        description: err.message || 'An error occurred while testing JSON handling',
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="p-4 bg-white shadow-sm">
      <h3 className="text-lg font-semibold mb-4">Test JSONB Array Handling</h3>
      
      <div className="space-y-4">
        <Alert className="bg-blue-50 border-blue-200">
          <AlertDescription className="text-blue-800">
            Use this tool to test how the database handles different JSON formats.
            This will help diagnose issues with the import process.
          </AlertDescription>
        </Alert>
        
        <div className="space-y-2">
          <Label htmlFor="json-input" className="font-medium">JSON Data</Label>
          <Textarea
            id="json-input"
            value={jsonInput}
            onChange={(e) => setJsonInput(e.target.value)}
            rows={8}
            className="font-mono text-sm"
            placeholder='[{"email": "test@example.com", "first_name": "Test", "last_name": "User"}]'
          />
        </div>
        
        <Button 
          onClick={testJsonHandling} 
          disabled={isLoading}
          className="w-full"
        >
          {isLoading ? (
            <>
              <Loader className="h-4 w-4 mr-2 animate-spin" />
              Testing...
            </>
          ) : (
            'Test JSON Handling'
          )}
        </Button>
        
        {error && (
          <Alert variant="destructive" className="mt-4">
            <AlertCircle className="h-4 w-4 mr-2" />
            <AlertDescription>
              {error}
            </AlertDescription>
          </Alert>
        )}
        
        {testResult && (
          <div className="mt-4 space-y-4">
            <h4 className="text-md font-medium">Test Results</h4>
            
            <div className="bg-gray-50 p-3 rounded border border-gray-200">
              <h5 className="text-sm font-medium mb-2">Direct JSONB Test</h5>
              <div className={`text-sm ${testResult.directResult?.success ? 'text-green-600' : 'text-red-600'}`}>
                {testResult.directResult?.success ? 'Success' : 'Failed'}
              </div>
              {testResult.directResult?.error && (
                <div className="mt-1 text-xs text-red-500">
                  Error: {JSON.stringify(testResult.directResult.error)}
                </div>
              )}
              {testResult.directResult?.data && (
                <div className="mt-1 text-xs">
                  Result: {JSON.stringify(testResult.directResult.data)}
                </div>
              )}
            </div>
            
            <div className="bg-gray-50 p-3 rounded border border-gray-200">
              <h5 className="text-sm font-medium mb-2">Stringified JSONB Test</h5>
              <div className={`text-sm ${testResult.stringifiedResult?.success ? 'text-green-600' : 'text-red-600'}`}>
                {testResult.stringifiedResult?.success ? 'Success' : 'Failed'}
              </div>
              {testResult.stringifiedResult?.error && (
                <div className="mt-1 text-xs text-red-500">
                  Error: {JSON.stringify(testResult.stringifiedResult.error)}
                </div>
              )}
              {testResult.stringifiedResult?.data && (
                <div className="mt-1 text-xs">
                  Result: {JSON.stringify(testResult.stringifiedResult.data)}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}
