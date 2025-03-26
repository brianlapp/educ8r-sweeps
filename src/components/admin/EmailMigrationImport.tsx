
import React, { useState, useRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { AlertTriangle, CheckCircle, Upload, FolderOpen, RefreshCw, FileText, Info } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

export const EmailMigrationImport = ({ onImportComplete }: { onImportComplete: () => void }) => {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [directFileName, setDirectFileName] = useState('chunk_ac.csv');
  const [directImportLoading, setDirectImportLoading] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [currentOperation, setCurrentOperation] = useState('');
  const [repositoryFiles, setRepositoryFiles] = useState<string[]>([]);
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [baseUrl, setBaseUrl] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  useEffect(() => {
    // Set base URL on component mount
    const url = window.location.origin;
    setBaseUrl(url);
    console.log('Base URL set to:', url);
    
    // Load available files when component mounts
    listRepositoryFiles();
  }, []);
  
  const listRepositoryFiles = async () => {
    setLoadingFiles(true);
    try {
      console.log('Listing repository files...');
      const { data, error } = await supabase.functions.invoke('email-migration', {
        method: 'POST',
        body: { 
          action: 'repository-files',
          baseUrl: baseUrl // Explicitly pass the baseUrl
        }
      });
      
      if (error) throw error;
      
      if (data?.files) {
        setRepositoryFiles(data.files);
        console.log(`Found ${data.files.length} files in repository:`, data.files);
      }
    } catch (err: any) {
      console.error('Error listing repository files:', err);
      toast.error(`Failed to load file list: ${err.message}`);
    } finally {
      setLoadingFiles(false);
    }
  };
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
    }
  };
  
  const uploadFile = async () => {
    if (!file) return;
    
    setLoading(true);
    setImportProgress(0);
    setCurrentOperation('Reading file...');
    
    try {
      const reader = new FileReader();
      
      reader.onload = async (e) => {
        if (e.target?.result) {
          try {
            setCurrentOperation('Processing file content...');
            const content = e.target.result as string;
            
            // Process file directly
            setCurrentOperation('Importing subscribers...');
            setImportProgress(50);
            
            console.log('Uploading file with size:', content.length);
            
            const { data, error } = await supabase.functions.invoke('email-migration', {
              method: 'POST',
              body: { 
                action: 'import', 
                fileName: file.name,
                fileContent: content
              }
            });
            
            if (error) {
              console.error('Error from import function:', error);
              throw error;
            }
            
            setImportProgress(100);
            setCurrentOperation('Import complete!');
            
            toast.success(`Import complete: ${data.inserted} imported, ${data.duplicates} duplicates, ${data.errors} errors`);
            if (onImportComplete) onImportComplete();
          } catch (err: any) {
            console.error('Error processing file:', err);
            toast.error(`Import failed: ${err.message}`);
          }
        }
        setLoading(false);
        setCurrentOperation('');
      };
      
      reader.onerror = () => {
        toast.error('Error reading file');
        setLoading(false);
        setCurrentOperation('');
      };
      
      reader.readAsText(file);
    } catch (err: any) {
      console.error('File upload error:', err);
      toast.error(`File upload failed: ${err.message}`);
      setLoading(false);
      setCurrentOperation('');
    }
  };

  const handleDirectFileImport = async () => {
    if (!directFileName) {
      toast.error('Please enter a file name');
      return;
    }
    
    setDirectImportLoading(true);
    setImportProgress(10);
    setCurrentOperation(`Loading file ${directFileName}...`);
    
    try {
      console.log(`[DIRECT IMPORT] Attempting to import file: ${directFileName}`);
      console.log(`[DIRECT IMPORT] Using base URL: ${baseUrl}`);
      
      // First, test if we can access the file directly to provide better error messages
      try {
        const testUrl = `${baseUrl}/emails/${directFileName}`;
        console.log(`[DIRECT IMPORT] Testing file access with: ${testUrl}`);
        
        const testResponse = await fetch(testUrl, { method: 'HEAD' });
        if (!testResponse.ok) {
          console.error(`[DIRECT IMPORT] File access test failed: ${testResponse.status} ${testResponse.statusText}`);
          throw new Error(`File not accessible (${testResponse.status}). Please check if "${directFileName}" exists in the /public/emails/ directory.`);
        }
        console.log(`[DIRECT IMPORT] File access test succeeded`);
      } catch (accessErr: any) {
        console.error(`[DIRECT IMPORT] File access error:`, accessErr);
        throw new Error(`Cannot access file: ${accessErr.message}`);
      }
      
      setImportProgress(20);
      setCurrentOperation(`File found, requesting import...`);
      
      // Call the edge function to import the repository file
      const { data, error } = await supabase.functions.invoke('email-migration', {
        method: 'POST',
        body: { 
          action: 'import-repository-file',
          fileName: directFileName,
          baseUrl: baseUrl // Explicitly pass the baseUrl
        }
      });
      
      console.log('[DIRECT IMPORT] Response:', data, error);
      
      if (error) {
        console.error(`[DIRECT IMPORT] API error:`, error);
        throw error;
      }
      
      setImportProgress(100);
      setCurrentOperation('Import complete!');
      
      toast.success(`File import successful: ${data.inserted} records imported, ${data.duplicates} duplicates, ${data.errors} errors`);
      
      if (onImportComplete) onImportComplete();
    } catch (err: any) {
      console.error('[DIRECT IMPORT] Error:', err);
      toast.error(`Import failed: ${err.message}`);
      
      // Show additional help information
      toast.info(
        'Import Troubleshooting',
        `Make sure the file exists in the /public/emails/ directory. Try the example import button as a test.`
      );
    } finally {
      setDirectImportLoading(false);
      setTimeout(() => {
        setCurrentOperation('');
        setImportProgress(0);
      }, 3000);
    }
  };

  // Direct load from hardcoded example
  const importExampleFile = async () => {
    setDirectImportLoading(true);
    setImportProgress(10);
    setCurrentOperation('Loading example subscribers...');
    
    try {
      console.log('Importing example subscribers directly');
      
      // This is a direct approach for importing a specific file
      const { data, error } = await supabase.functions.invoke('email-migration', {
        method: 'POST',
        body: { 
          action: 'import-direct',
          fileName: 'hardcoded-example'
        }
      });
      
      console.log('[DIRECT EXAMPLE] Response:', data, error);
      
      if (error) {
        console.error('Direct import error:', error);
        throw error;
      }
      
      setImportProgress(100);
      setCurrentOperation('Import complete!');
      
      toast.success(`Example import successful: ${data.inserted} records imported, ${data.duplicates} duplicates, ${data.errors} errors`);
      
      if (onImportComplete) onImportComplete();
    } catch (err: any) {
      console.error('Example import error:', err);
      toast.error(`Import failed: ${err.message}`);
    } finally {
      setDirectImportLoading(false);
      setTimeout(() => {
        setCurrentOperation('');
        setImportProgress(0);
      }, 3000);
    }
  };

  const testFileUrl = async () => {
    if (!directFileName) {
      toast.error('Please enter a file name');
      return;
    }
    
    try {
      const fileUrl = `${baseUrl}/emails/${directFileName}`;
      console.log(`Testing file access at: ${fileUrl}`);
      
      toast.info(
        'Testing file access',
        `Checking if file exists at: ${fileUrl}`
      );
      
      const response = await fetch(fileUrl, { method: 'HEAD' });
      
      if (response.ok) {
        toast.success(
          'File accessible',
          `The file "${directFileName}" is accessible and ready for import.`
        );
      } else {
        toast.error(
          'File not accessible',
          `Status: ${response.status} ${response.statusText}. Check if the file exists in the correct location.`
        );
      }
    } catch (err: any) {
      console.error('File test error:', err);
      toast.error(`File test failed: ${err.message}`);
    }
  };

  return (
    <Card className="p-4 bg-white shadow-sm">
      <h3 className="text-lg font-semibold mb-4">Import Subscribers</h3>
      
      {(loading || directImportLoading) && (
        <div className="mb-4">
          <div className="text-sm font-medium text-slate-700 mb-1">{currentOperation}</div>
          <Progress value={importProgress} className="h-2" />
        </div>
      )}
      
      <Tabs defaultValue="direct">
        <TabsList className="mb-4">
          <TabsTrigger value="direct">Direct Import</TabsTrigger>
          <TabsTrigger value="file">File Upload</TabsTrigger>
        </TabsList>
        
        <TabsContent value="direct" className="space-y-4">
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <div className="flex-1">
                <div className="flex flex-col space-y-2">
                  <div className="flex items-center space-x-2">
                    <Input
                      type="text"
                      value={directFileName}
                      onChange={(e) => setDirectFileName(e.target.value)}
                      placeholder="chunk_ac.csv"
                      className="flex-1"
                    />
                    <Button 
                      onClick={handleDirectFileImport} 
                      disabled={directImportLoading || !directFileName}
                      className="whitespace-nowrap bg-green-600 hover:bg-green-700"
                    >
                      <FolderOpen className="h-4 w-4 mr-2" />
                      {directImportLoading ? "Importing..." : "Import File"}
                    </Button>
                  </div>
                  <div className="flex justify-between">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={testFileUrl}
                      className="text-xs"
                      title="Test if the file is accessible"
                    >
                      <Info className="h-3 w-3 mr-1" />
                      Test File Access
                    </Button>
                    <div className="text-xs text-slate-500">
                      Base URL: {baseUrl}
                    </div>
                  </div>
                </div>
              </div>
              <Button
                variant="outline"
                size="icon"
                onClick={listRepositoryFiles}
                disabled={loadingFiles}
                title="Refresh file list"
              >
                <RefreshCw className={`h-4 w-4 ${loadingFiles ? 'animate-spin' : ''}`} />
              </Button>
            </div>
            
            <Button 
              onClick={importExampleFile}
              disabled={directImportLoading}
              variant="outline"
              className="w-full"
            >
              <FileText className="h-4 w-4 mr-2" />
              Import Example Subscribers Directly
            </Button>
            
            {repositoryFiles.length > 0 && (
              <div className="bg-slate-50 p-3 rounded border border-slate-200">
                <h4 className="font-medium mb-2 flex items-center">
                  <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                  Available Files ({repositoryFiles.length})
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                  {repositoryFiles.slice(0, 12).map((fileName) => (
                    <Button
                      key={fileName}
                      variant="outline"
                      size="sm"
                      className="text-xs h-auto py-1 justify-start overflow-hidden text-ellipsis"
                      onClick={() => setDirectFileName(fileName)}
                    >
                      {fileName}
                    </Button>
                  ))}
                  {repositoryFiles.length > 12 && (
                    <div className="text-xs text-slate-500 p-1">
                      and {repositoryFiles.length - 12} more...
                    </div>
                  )}
                </div>
              </div>
            )}
            
            <div className="text-sm text-slate-500 bg-green-50 p-3 rounded border border-green-100">
              <h4 className="font-medium flex items-center mb-2">
                <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                Direct File Import
              </h4>
              <ul className="list-disc list-inside space-y-1">
                <li>Enter the exact filename (e.g., "chunk_ac.csv")</li>
                <li>Files must be located in the <code>/public/emails/</code> directory</li>
                <li>System will automatically process and normalize email data</li>
                <li>Click one of the available files above to select it quickly</li>
                <li>Try the "Import Example Subscribers Directly" button for a quick test</li>
                <li>Use "Test File Access" to verify the file is accessible before import</li>
              </ul>
            </div>
          </div>
        </TabsContent>
        
        <TabsContent value="file" className="space-y-4">
          <div className="space-y-4">
            <div className="flex items-center space-x-4">
              <Input
                type="file"
                onChange={handleFileChange}
                accept=".csv,.json"
                ref={fileInputRef}
                className="flex-1"
              />
              <Button 
                onClick={uploadFile} 
                disabled={!file || loading}
                className="whitespace-nowrap"
              >
                {loading ? "Importing..." : "Import File"}
              </Button>
            </div>
            
            {file && (
              <div className="text-sm bg-slate-50 p-2 rounded flex items-center">
                <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                Selected file: <span className="font-medium ml-1">{file.name}</span> ({(file.size / 1024).toFixed(2)} KB)
              </div>
            )}
            
            <div className="text-sm text-slate-500 bg-blue-50 p-3 rounded border border-blue-100">
              <h4 className="font-medium flex items-center mb-2">
                <AlertTriangle className="h-4 w-4 text-amber-500 mr-2" />
                Import Instructions
              </h4>
              <ul className="list-disc list-inside space-y-1">
                <li>Upload a CSV or JSON file containing subscribers</li>
                <li>The file must have <code>email</code> field (required)</li>
                <li>Optional fields: <code>first_name</code>, <code>last_name</code></li>
                <li>Alternative field names like "Email", "FirstName" are supported</li>
                <li>Records without a valid email will be skipped</li>
              </ul>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </Card>
  );
};
