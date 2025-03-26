
import React, { useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { toast } from '@/hooks/use-toast';
import { RefreshCw, Upload, FileUp, AlertCircle, Check, Bug } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { EmailMigrationJsonTest } from './EmailMigrationJsonTest';

export function EmailMigrationImport({ onImportComplete }: { onImportComplete: () => void }) {
  const [isUploading, setIsUploading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [progress, setProgress] = useState(0);
  const [parseError, setParseError] = useState<string | null>(null);
  const [directFileUrl, setDirectFileUrl] = useState('');
  const [isAccessChecking, setIsAccessChecking] = useState(false);
  const [accessStatus, setAccessStatus] = useState<'none' | 'success' | 'error'>('none');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const readFileAsText = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          resolve(event.target.result as string);
        } else {
          reject(new Error('Failed to read file'));
        }
      };
      reader.onerror = () => reject(new Error('File read error'));
      reader.readAsText(file);
    });
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    setParseError(null);
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      // Check if it's a CSV or JSON file
      if (!/\.(csv|json)$/i.test(selectedFile.name)) {
        toast({
          title: "Invalid File Type",
          description: "Please select a CSV or JSON file.",
          variant: "destructive"
        });
        return;
      }
      setFile(selectedFile);
    }
  };

  const processCSV = (csvText: string): Array<any> => {
    // Simple CSV parser for comma-separated values
    // This handles quoted values, commas within quoted values, and escaped quotes
    const rows = csvText.split(/\r?\n/);
    const headers = rows[0].split(',').map(header => 
      header.trim().replace(/^"|"$/g, '')
    );
    
    const data: Array<any> = [];
    
    for (let i = 1; i < rows.length; i++) {
      if (!rows[i].trim()) continue; // Skip empty rows
      
      // Split by commas but respect quoted values
      const values: string[] = [];
      let currentValue = '';
      let inQuotes = false;
      
      for (let j = 0; j < rows[i].length; j++) {
        const char = rows[i][j];
        
        if (char === '"') {
          // Handle quotes (toggle inQuotes flag)
          inQuotes = !inQuotes;
          currentValue += char;
        } else if (char === ',' && !inQuotes) {
          // Handle commas (only split if not inside quotes)
          values.push(currentValue.trim().replace(/^"|"$/g, ''));
          currentValue = '';
        } else {
          // Add character to current value
          currentValue += char;
        }
      }
      
      // Add the last value
      values.push(currentValue.trim().replace(/^"|"$/g, ''));
      
      // Create object from headers and values
      const obj: Record<string, string> = {};
      headers.forEach((header, index) => {
        if (index < values.length) {
          obj[header] = values[index];
        }
      });
      
      data.push(obj);
    }
    
    return data;
  };

  const processFile = async () => {
    if (!file) {
      toast({
        title: "No File Selected",
        description: "Please select a file to upload.",
        variant: "destructive"
      });
      return;
    }
    
    setIsProcessing(true);
    setIsUploading(true);
    setProgress(10);
    
    try {
      const fileContent = await readFileAsText(file);
      setProgress(30);
      
      let subscribers;
      
      if (file.name.endsWith('.json')) {
        // Parse JSON
        try {
          subscribers = JSON.parse(fileContent);
          
          // If data is not an array, check for common parent properties
          if (!Array.isArray(subscribers)) {
            // Try to find subscribers in common JSON structures
            if (subscribers.subscribers) {
              subscribers = subscribers.subscribers;
            } else if (subscribers.data) {
              subscribers = subscribers.data;
            } else if (subscribers.results) {
              subscribers = subscribers.results;
            } else {
              throw new Error('Could not find subscribers array in JSON');
            }
          }
        } catch (error) {
          setParseError('Invalid JSON format: ' + (error as Error).message);
          throw error;
        }
      } else {
        // Parse CSV
        try {
          subscribers = processCSV(fileContent);
        } catch (error) {
          setParseError('Invalid CSV format: ' + (error as Error).message);
          throw error;
        }
      }
      
      // Validate the subscribers array
      if (!Array.isArray(subscribers) || subscribers.length === 0) {
        setParseError('No subscribers found in file');
        throw new Error('No subscribers found in file');
      }
      
      // Log the first few entries for debugging
      console.log('First 3 subscriber entries:', subscribers.slice(0, 3));
      
      // Extract required fields
      const formattedSubscribers = subscribers.map((sub: any) => {
        // Try different field name variations
        const email = sub.email || sub.Email || sub.EMAIL;
        const firstName = sub.first_name || sub.firstName || sub.FirstName || sub['First Name'] || '';
        const lastName = sub.last_name || sub.lastName || sub.LastName || sub['Last Name'] || '';
        
        return { email, first_name: firstName, last_name: lastName };
      }).filter((sub: any) => sub.email); // Filter out entries with no email
      
      setProgress(50);
      
      // Submit to API - Important: Pass the array directly, do NOT stringify it
      console.log(`Importing ${formattedSubscribers.length} subscribers, first entry:`, formattedSubscribers[0]);
      
      const { data, error } = await supabase.functions.invoke('email-migration', {
        method: 'POST',
        body: { 
          action: 'import', 
          subscribers: formattedSubscribers,
          fileName: file.name
        }
      });

      if (error) {
        console.error('Import Error:', error);
        throw new Error(error.message);
      }
      
      setProgress(100);
      console.log('Import Response:', data);
      
      toast({
        title: "Import Successful",
        description: `Imported ${data.inserted} subscribers (${data.duplicates} duplicates, ${data.errors} errors).`,
        variant: "success"
      });
      
      // Reset form
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      
      // Refresh stats
      if (onImportComplete) onImportComplete();
      
    } catch (error: any) {
      console.error('Import Error:', error);
      toast({
        title: "Import Failed",
        description: error.message || "Failed to import subscribers.",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
      setIsUploading(false);
      setProgress(0);
    }
  };

  const checkFileAccess = async () => {
    if (!directFileUrl.trim()) {
      toast({
        title: "URL Required",
        description: "Please enter a file URL to check access.",
        variant: "destructive"
      });
      return;
    }
    
    setIsAccessChecking(true);
    setAccessStatus('none');
    
    try {
      const response = await fetch(directFileUrl);
      
      if (!response.ok) {
        throw new Error(`HTTP error ${response.status}: ${response.statusText}`);
      }
      
      // Try to read some of the file content
      const text = await response.text();
      console.log(`File access successful. First 200 characters: ${text.substring(0, 200)}`);
      
      setAccessStatus('success');
      toast({
        title: "File Access Successful",
        description: "The file is accessible and can be read.",
        variant: "success"
      });
    } catch (error: any) {
      console.error('File access error:', error);
      setAccessStatus('error');
      toast({
        title: "File Access Failed",
        description: error.message || "Failed to access the file.",
        variant: "destructive"
      });
    } finally {
      setIsAccessChecking(false);
    }
  };

  const importDirectFile = async () => {
    if (!directFileUrl.trim()) {
      toast({
        title: "URL Required",
        description: "Please enter a file URL to import.",
        variant: "destructive"
      });
      return;
    }
    
    setIsProcessing(true);
    setProgress(10);
    
    try {
      // First fetch the file content
      const response = await fetch(directFileUrl);
      
      if (!response.ok) {
        throw new Error(`HTTP error ${response.status}: ${response.statusText}`);
      }
      
      setProgress(30);
      
      // Try to determine file type based on URL
      const isJson = directFileUrl.toLowerCase().endsWith('.json');
      
      let content;
      if (isJson) {
        // Handle JSON file
        content = await response.json();
      } else {
        // Handle CSV file
        const text = await response.text();
        content = processCSV(text);
      }
      
      // Ensure content is an array
      if (!Array.isArray(content)) {
        // Try to extract array from common structures
        if (content.subscribers) {
          content = content.subscribers;
        } else if (content.data) {
          content = content.data;
        } else if (content.results) {
          content = content.results;
        } else {
          throw new Error('Could not find subscribers array in file');
        }
      }
      
      if (!Array.isArray(content) || content.length === 0) {
        throw new Error('No subscribers found in file');
      }
      
      console.log(`Found ${content.length} subscribers in direct file import`);
      
      // Extract required fields
      const formattedSubscribers = content.map((sub: any) => {
        const email = sub.email || sub.Email || sub.EMAIL;
        const firstName = sub.first_name || sub.firstName || sub.FirstName || sub['First Name'] || '';
        const lastName = sub.last_name || sub.lastName || sub.LastName || sub['Last Name'] || '';
        
        return { email, first_name: firstName, last_name: lastName };
      }).filter((sub: any) => sub.email);
      
      setProgress(50);
      
      console.log(`Importing ${formattedSubscribers.length} subscribers from direct file`);
      
      // Import the subscribers
      const { data, error } = await supabase.functions.invoke('email-migration', {
        method: 'POST',
        body: { 
          action: 'import', 
          subscribers: formattedSubscribers, 
          fileName: directFileUrl.split('/').pop() || 'direct-import'
        }
      });
      
      if (error) {
        console.error('Direct import error:', error);
        throw new Error(error.message);
      }
      
      setProgress(100);
      console.log('Direct import response:', data);
      
      toast({
        title: "Direct Import Successful",
        description: `Imported ${data.inserted} subscribers (${data.duplicates} duplicates, ${data.errors} errors).`,
        variant: "success"
      });
      
      // Refresh stats
      if (onImportComplete) onImportComplete();
    } catch (error: any) {
      console.error('Direct import error:', error);
      toast({
        title: "Direct Import Failed",
        description: error.message || "Failed to import subscribers.",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
      setProgress(0);
    }
  };

  return (
    <Card className="p-4 bg-white shadow-sm">
      <h3 className="text-lg font-semibold mb-4">Import Subscribers</h3>
      
      <Tabs defaultValue="file">
        <TabsList className="mb-4">
          <TabsTrigger value="file">Upload File</TabsTrigger>
          <TabsTrigger value="direct">Direct Import</TabsTrigger>
          <TabsTrigger value="test">JSONB Test</TabsTrigger>
        </TabsList>
        
        <TabsContent value="file" className="space-y-4">
          <Alert className="bg-blue-50 border-blue-200">
            <AlertDescription className="text-blue-800">
              Upload a CSV or JSON file containing subscribers to import from OnGage. 
              File should include email, first_name, and last_name fields.
            </AlertDescription>
          </Alert>
          
          <div className="flex flex-col space-y-4">
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileSelect}
                accept=".csv,.json"
                className="hidden"
                disabled={isProcessing}
              />
              
              {!file ? (
                <div className="space-y-2">
                  <div className="mx-auto w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center">
                    <FileUp className="h-6 w-6 text-blue-500" />
                  </div>
                  <div className="text-sm text-gray-600">
                    Click to select a CSV or JSON file
                  </div>
                  <Button 
                    variant="outline" 
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isProcessing}
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Choose File
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center justify-center space-x-2">
                    <div className="p-2 bg-blue-50 rounded">
                      <FileUp className="h-5 w-5 text-blue-500" />
                    </div>
                    <div className="text-sm font-medium truncate max-w-xs">
                      {file.name}
                    </div>
                  </div>
                  
                  <div className="flex space-x-2 justify-center">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => {
                        setFile(null);
                        if (fileInputRef.current) fileInputRef.current.value = '';
                        setParseError(null);
                      }}
                      disabled={isProcessing}
                    >
                      Remove
                    </Button>
                    <Button 
                      variant="default" 
                      size="sm"
                      onClick={processFile}
                      disabled={isProcessing}
                    >
                      {isProcessing ? (
                        <>
                          <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        'Import Subscribers'
                      )}
                    </Button>
                  </div>
                </div>
              )}
            </div>
            
            {parseError && (
              <div className="bg-red-50 border border-red-200 rounded-md p-3 text-sm text-red-700">
                <div className="flex items-start">
                  <AlertCircle className="h-4 w-4 mt-0.5 mr-2 text-red-500" />
                  <div>{parseError}</div>
                </div>
              </div>
            )}
            
            {isProcessing && (
              <div className="space-y-2">
                <div className="text-sm text-center">
                  {progress < 50 ? 'Processing file...' : 'Importing subscribers...'}
                </div>
                <Progress value={progress} className="h-2" />
              </div>
            )}
          </div>
        </TabsContent>
        
        <TabsContent value="direct" className="space-y-4">
          <Alert className="bg-blue-50 border-blue-200">
            <AlertDescription className="text-blue-800">
              Import subscribers directly from a URL. Enter the full URL to a CSV or JSON file.
            </AlertDescription>
          </Alert>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="file-url">File URL</Label>
              <Input
                id="file-url"
                value={directFileUrl}
                onChange={(e) => setDirectFileUrl(e.target.value)}
                placeholder="https://example.com/subscribers.json"
                disabled={isProcessing || isAccessChecking}
              />
            </div>
            
            <div className="flex space-x-2">
              <Button
                variant="outline"
                onClick={checkFileAccess}
                disabled={isProcessing || isAccessChecking || !directFileUrl}
                className="flex-1"
              >
                {isAccessChecking ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Checking...
                  </>
                ) : (
                  'Test File Access'
                )}
              </Button>
              
              <Button
                variant="default"
                onClick={importDirectFile}
                disabled={isProcessing || isAccessChecking || !directFileUrl}
                className="flex-1"
              >
                {isProcessing ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Importing...
                  </>
                ) : (
                  'Import File'
                )}
              </Button>
            </div>
            
            {accessStatus !== 'none' && (
              <div className={`p-3 rounded-md text-sm ${
                accessStatus === 'success' 
                  ? 'bg-green-50 border border-green-200 text-green-700' 
                  : 'bg-red-50 border border-red-200 text-red-700'
              }`}>
                <div className="flex items-center">
                  {accessStatus === 'success' ? (
                    <Check className="h-4 w-4 mr-2 text-green-500" />
                  ) : (
                    <AlertCircle className="h-4 w-4 mr-2 text-red-500" />
                  )}
                  <div>
                    {accessStatus === 'success' 
                      ? 'File is accessible and can be imported.' 
                      : 'Could not access file. Check the URL and try again.'}
                  </div>
                </div>
              </div>
            )}
            
            {isProcessing && (
              <div className="space-y-2">
                <div className="text-sm text-center">
                  {progress < 30 ? 'Accessing file...' : 
                   progress < 50 ? 'Processing data...' : 
                   'Importing subscribers...'}
                </div>
                <Progress value={progress} className="h-2" />
              </div>
            )}
          </div>
        </TabsContent>
        
        <TabsContent value="test">
          <EmailMigrationJsonTest />
        </TabsContent>
      </Tabs>
    </Card>
  );
}
