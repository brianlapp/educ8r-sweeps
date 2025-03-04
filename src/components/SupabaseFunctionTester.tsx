
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';

export function SupabaseFunctionTester() {
  const [results, setResults] = useState<Record<string, any>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const testUrls = [
    {
      name: "Simple Test Direct",
      url: "https://epfzraejquaxqrfmkmyx.supabase.co/functions/v1/simple-test"
    },
    {
      name: "Public Test Direct",
      url: "https://epfzraejquaxqrfmkmyx.supabase.co/functions/v1/public-test"
    },
    {
      name: "Connection Test Direct",
      url: "https://epfzraejquaxqrfmkmyx.supabase.co/functions/v1/connection-test"
    },
    {
      name: "Everflow Debug",
      url: "https://epfzraejquaxqrfmkmyx.supabase.co/functions/v1/everflow-webhook/debug?test_only=true"
    },
    {
      name: "Simple Test via SDK",
      type: "sdk",
      fn: "simple-test"
    },
    {
      name: "Public Test via SDK",
      type: "sdk", 
      fn: "public-test"
    },
    {
      name: "Connection Test via SDK",
      type: "sdk", 
      fn: "connection-test"
    },
    {
      name: "Everflow Test via SDK",
      type: "sdk",
      fn: "everflow-webhook",
      params: { test_only: true }
    }
  ];

  const testFunction = async (test: any) => {
    setIsLoading(true);
    setError(null);
    
    try {
      let response;
      
      if (test.type === "sdk") {
        // Test using the Supabase SDK
        console.log(`Testing function ${test.fn} via SDK`, test.params || {});
        response = await supabase.functions.invoke(test.fn, {
          body: test.params || {}
        });
        setResults(prev => ({ ...prev, [test.name]: response }));
      } else {
        // Test using direct fetch
        console.log(`Testing function via direct URL: ${test.url}`);
        const fetchResponse = await fetch(test.url, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          }
        });
        
        const data = await fetchResponse.json().catch(() => ({ error: "Failed to parse JSON" }));
        
        response = {
          status: fetchResponse.status,
          statusText: fetchResponse.statusText,
          data,
          headers: Object.fromEntries([...fetchResponse.headers.entries()])
        };
        
        setResults(prev => ({ ...prev, [test.name]: response }));
      }
    } catch (err) {
      console.error(`Error testing ${test.name}:`, err);
      setError(`${test.name}: ${err instanceof Error ? err.message : String(err)}`);
      setResults(prev => ({ ...prev, [test.name]: { error: String(err) } }));
    } finally {
      setIsLoading(false);
    }
  };

  const testAll = async () => {
    setResults({});
    setError(null);
    
    for (const test of testUrls) {
      await testFunction(test);
    }
  };

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle>Supabase Function Tester</CardTitle>
        <CardDescription>Test access to Supabase Edge Functions</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Button onClick={testAll} disabled={isLoading}>
              {isLoading ? "Testing..." : "Test All Functions"}
            </Button>
            
            {testUrls.map((test) => (
              <Button 
                key={test.name} 
                variant="outline" 
                onClick={() => testFunction(test)} 
                disabled={isLoading}
              >
                Test {test.name}
              </Button>
            ))}
          </div>
          
          {error && (
            <div className="p-4 border border-red-200 bg-red-50 text-red-800 rounded-md">
              {error}
            </div>
          )}
          
          {Object.keys(results).length > 0 && (
            <div className="mt-4 space-y-4">
              {Object.entries(results).map(([name, result]) => (
                <div key={name} className="border p-4 rounded-md">
                  <h3 className="font-medium text-lg mb-2">{name}</h3>
                  <pre className="bg-gray-100 p-3 rounded-md overflow-auto text-sm max-h-64">
                    {JSON.stringify(result, null, 2)}
                  </pre>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
      <CardFooter className="flex justify-between">
        <p className="text-sm text-gray-500">
          Check browser console for additional logs
        </p>
      </CardFooter>
    </Card>
  );
}
