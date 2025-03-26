
import React, { useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { AlertTriangle, CheckCircle, Upload, Globe, FolderOpen, RefreshCw } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

export const EmailMigrationImport = ({ onImportComplete }: { onImportComplete: () => void }) => {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [urlImportLoading, setUrlImportLoading] = useState(false);
  const [manualUrl, setManualUrl] = useState('');
  const [repositoryFiles, setRepositoryFiles] = useState<string[]>([]);
  const [loadingRepositoryFiles, setLoadingRepositoryFiles] = useState(false);
  const [selectedRepositoryFile, setSelectedRepositoryFile] = useState('');
  const [repositoryImportLoading, setRepositoryImportLoading] = useState(false);
  const [directFileName, setDirectFileName] = useState('');
  const [directImportLoading, setDirectImportLoading] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [currentOperation, setCurrentOperation] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
    }
  };
  
  const processFileContent = (content: string) => {
    try {
      console.log('Processing file content...');
      let subscribers = [];
      
      if (content.trim().startsWith('{') || content.trim().startsWith('[')) {
        console.log('Parsing JSON file...');
        const parsed = JSON.parse(content);
        
        if (Array.isArray(parsed)) {
          subscribers = parsed;
        } else if (parsed.subscribers) {
          subscribers = parsed.subscribers;
        } else if (parsed.data) {
          subscribers = parsed.data;
        } else {
          throw new Error('Could not find subscriber data in JSON file');
        }
      } else {
        console.log('Parsing CSV file...');
        const lines = content.split('\n');
        const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
        
        for (let i = 1; i < lines.length; i++) {
          if (!lines[i].trim()) continue;
          
          const values = lines[i].split(',').map(v => v.trim().replace(/^"|"$/g, ''));
          const subscriber: Record<string, string> = {};
          
          headers.forEach((header, index) => {
            if (index < values.length) {
              subscriber[header] = values[index];
            }
          });
          
          subscribers.push(subscriber);
        }
      }
      
      console.log(`Found ${subscribers.length} subscribers`);
      
      if (subscribers.length === 0) {
        throw new Error('No subscribers found in the file');
      }
      
      subscribers = subscribers.map(sub => {
        return {
          email: sub.email || sub.Email || sub.EMAIL || '',
          first_name: sub.first_name || sub.firstName || sub.FirstName || sub['First Name'] || '',
          last_name: sub.last_name || sub.lastName || sub.LastName || sub['Last Name'] || ''
        };
      }).filter(sub => sub.email && sub.email.includes('@'));
      
      console.log(`Normalized to ${subscribers.length} valid subscribers`);
      return subscribers;
    } catch (err) {
      console.error('Error processing file:', err);
      throw err;
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
            const subscribers = processFileContent(content);
            
            console.log(`Importing ${subscribers.length} subscribers`);
            
            const CHUNK_SIZE = 50;
            let successCount = 0;
            let errorCount = 0;
            let duplicateCount = 0;
            const totalChunks = Math.ceil(subscribers.length / CHUNK_SIZE);
            
            console.log(`Importing ${subscribers.length} subscribers using chunked upload (${totalChunks} chunks)`);
            
            for (let i = 0; i < subscribers.length; i += CHUNK_SIZE) {
              const chunkNumber = Math.floor(i / CHUNK_SIZE) + 1;
              setCurrentOperation(`Importing chunk ${chunkNumber}/${totalChunks}...`);
              setImportProgress(Math.floor((chunkNumber / totalChunks) * 100));
              
              const chunk = subscribers.slice(i, i + CHUNK_SIZE);
              try {
                const { data, error } = await supabase.functions.invoke('email-migration', {
                  method: 'POST',
                  body: { 
                    action: 'import', 
                    params: {
                      subscribers: chunk,
                      fileName: file.name
                    }
                  }
                });
                
                if (error) {
                  console.error('Error from import function:', error);
                  throw error;
                }
                
                successCount += data.inserted || 0;
                duplicateCount += data.duplicates || 0;
                errorCount += data.errors || 0;
                
                console.log(`Chunk ${chunkNumber}/${totalChunks} completed: ${data.inserted} inserted, ${data.duplicates} duplicates, ${data.errors} errors`);
              } catch (err) {
                console.error(`Error importing chunk ${chunkNumber}/${totalChunks}:`, err);
                errorCount += chunk.length;
              }
            }
            
            setImportProgress(100);
            setCurrentOperation('Import complete!');
            
            toast.success(`Import complete: ${successCount} imported, ${duplicateCount} duplicates, ${errorCount} errors`);
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

  const handleManualUrlImport = async () => {
    if (!manualUrl) {
      toast.error('Please enter a URL');
      return;
    }
    
    setUrlImportLoading(true);
    setImportProgress(0);
    setCurrentOperation('Connecting to URL...');
    
    console.info(`----- STARTING MANUAL URL IMPORT [${new Date().toISOString()}] -----`);
    console.info(`Starting import of file from URL: ${manualUrl}`);
    
    try {
      const response = await fetch(manualUrl);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch file: ${response.status} ${response.statusText}`);
      }
      
      setCurrentOperation('Reading file content...');
      setImportProgress(20);
      
      const content = await response.text();
      console.info(`Successfully fetched file (${content.length} bytes)`);
      
      const urlParts = manualUrl.split('/');
      const fileName = urlParts[urlParts.length - 1];
      console.info(`Extracted filename: ${fileName}`);
      
      let fileType = 'unknown';
      if (fileName.endsWith('.csv')) {
        fileType = 'CSV';
      } else if (fileName.endsWith('.json')) {
        fileType = 'JSON';
      }
      
      setCurrentOperation(`Parsing ${fileType} file...`);
      setImportProgress(40);
      
      console.info(`Parsing ${fileType} file...`);
      const subscribers = processFileContent(content);
      
      console.info(`${fileType} processing successful. Found ${subscribers.length} records with headers: ${Object.keys(subscribers[0]).join(', ')}`);
      console.info(`Formatted ${subscribers.length} subscribers for import.`);
      console.info(`First subscriber: ${JSON.stringify(subscribers[0])}`);
      
      const CHUNK_SIZE = 50;
      const totalChunks = Math.ceil(subscribers.length / CHUNK_SIZE);
      console.info(`Splitting ${subscribers.length} subscribers into ${totalChunks} chunks of ${CHUNK_SIZE}`);
      
      let successCount = 0;
      let errorCount = 0;
      let duplicateCount = 0;
      
      for (let i = 0; i < subscribers.length; i += CHUNK_SIZE) {
        const chunk = subscribers.slice(i, i + CHUNK_SIZE);
        const chunkNumber = Math.floor(i / CHUNK_SIZE) + 1;
        
        setCurrentOperation(`Importing chunk ${chunkNumber}/${totalChunks}...`);
        setImportProgress(40 + Math.floor(60 * (chunkNumber / totalChunks)));
        
        console.info(`Processing chunk ${chunkNumber}/${totalChunks} with ${chunk.length} subscribers`);
        console.info(`Sample record: ${JSON.stringify(chunk[0])}`);
        
        let success = false;
        let attempts = 0;
        const MAX_ATTEMPTS = 3;
        
        while (!success && attempts < MAX_ATTEMPTS) {
          attempts++;
          try {
            const { data, error } = await supabase.functions.invoke('email-migration', {
              method: 'POST',
              body: { 
                action: 'import',
                params: {
                  subscribers: chunk,
                  fileName: fileName 
                }
              }
            });
            
            if (error) {
              console.info(`Chunk ${chunkNumber} Attempt ${attempts} ERROR: ${error.message}`);
              if (attempts < MAX_ATTEMPTS) {
                console.info(`Retrying in 1 second... (Attempt ${attempts + 1}/${MAX_ATTEMPTS})`);
                await new Promise(resolve => setTimeout(resolve, 1000));
              }
              continue;
            }
            
            successCount += data.inserted || 0;
            duplicateCount += data.duplicates || 0;
            errorCount += data.errors || 0;
            console.info(`Chunk ${chunkNumber} SUCCESS: ${data.inserted} inserted, ${data.duplicates} duplicates, ${data.errors} errors`);
            success = true;
          } catch (err: any) {
            console.info(`Chunk ${chunkNumber} Attempt ${attempts} ERROR: ${err.message}`);
            if (attempts < MAX_ATTEMPTS) {
              console.info(`Retrying in 1 second... (Attempt ${attempts + 1}/${MAX_ATTEMPTS})`);
              await new Promise(resolve => setTimeout(resolve, 1000));
            }
          }
        }
        
        if (!success) {
          console.info(`Error processing chunk ${chunkNumber}: All ${MAX_ATTEMPTS} attempts failed`);
          errorCount += chunk.length;
        }
      }
      
      setImportProgress(100);
      setCurrentOperation('Import complete!');
      
      const resultMessage = `Import complete: ${successCount} imported, ${duplicateCount} duplicates, ${errorCount} errors`;
      console.info(`----- MANUAL URL IMPORT COMPLETE: ${resultMessage} -----`);
      
      toast.success(resultMessage);
      if (onImportComplete) onImportComplete();
    } catch (err: any) {
      console.error('Manual file URL import error:', err);
      toast.error(`Import failed: ${err.message}`);
    } finally {
      setUrlImportLoading(false);
      setTimeout(() => {
        setCurrentOperation('');
        setImportProgress(0);
      }, 3000);
    }
  };
  
  const fetchRepositoryFiles = async () => {
    setLoadingRepositoryFiles(true);
    try {
      toast.info('Searching for files in the /emails/ directory...');
      
      const { data, error } = await supabase.functions.invoke('email-migration', {
        method: 'POST',
        body: { action: 'repository-files' }
      });
      
      if (error) throw error;
      
      if (data.success && data.files && data.files.length > 0) {
        setRepositoryFiles(data.files);
        setSelectedRepositoryFile(data.files[0]);
        toast.success(`Found ${data.files.length} file(s) in repository`);
      } else {
        toast.error('No import files found in repository');
        setRepositoryFiles([]);
      }
    } catch (err: any) {
      console.error('Failed to fetch repository files:', err);
      toast.error(`Failed to fetch import files: ${err.message}`);
    } finally {
      setLoadingRepositoryFiles(false);
    }
  };
  
  const importRepositoryFile = async () => {
    if (!selectedRepositoryFile) {
      toast.error('Please select a file to import');
      return;
    }
    
    setRepositoryImportLoading(true);
    setImportProgress(0);
    setCurrentOperation(`Importing ${selectedRepositoryFile}...`);
    
    try {
      toast.info(`Starting import of ${selectedRepositoryFile}`);
      
      const { data, error } = await supabase.functions.invoke('email-migration', {
        method: 'POST',
        body: { 
          action: 'import-repository-file',
          fileName: selectedRepositoryFile 
        }
      });
      
      if (error) throw error;
      
      if (data.success) {
        setImportProgress(100);
        setCurrentOperation('Import complete!');
        
        toast.success(`Import complete: ${data.inserted} imported, ${data.duplicates} duplicates, ${data.errors} errors`);
        if (onImportComplete) onImportComplete();
        fetchRepositoryFiles(); // Refresh the list
      } else {
        toast.error(`Import failed: ${data.error}`);
      }
    } catch (err: any) {
      console.error('Repository file import error:', err);
      toast.error(`Import failed: ${err.message}`);
    } finally {
      setRepositoryImportLoading(false);
      setTimeout(() => {
        setCurrentOperation('');
        setImportProgress(0);
      }, 3000);
    }
  };

  const handleDirectFileImport = async () => {
    if (!directFileName) {
      toast.error('Please enter a file name');
      return;
    }
    
    setDirectImportLoading(true);
    setImportProgress(0);
    setCurrentOperation(`Preparing direct import of ${directFileName}...`);
    
    try {
      const baseUrl = window.location.origin;
      const fileUrl = `${baseUrl}/emails/${directFileName}`;
      
      toast.info(`Attempting to import file from: ${fileUrl}`);
      setImportProgress(10);
      
      console.log(`[DIRECT IMPORT] Starting import of ${directFileName} from ${fileUrl}`);
      
      // First check if the file exists
      try {
        const checkResponse = await fetch(fileUrl, { method: 'HEAD' });
        if (!checkResponse.ok) {
          throw new Error(`File not found: ${checkResponse.status} ${checkResponse.statusText}`);
        }
        
        setImportProgress(20);
        setCurrentOperation(`File ${directFileName} found. Starting import...`);
        console.log(`[DIRECT IMPORT] File exists: ${fileUrl}`);
      } catch (err) {
        console.error(`[DIRECT IMPORT] File check failed:`, err);
        throw new Error(`Could not find file "${directFileName}" in the /emails/ directory. Make sure the file exists and is accessible.`);
      }
      
      // File exists, proceed with import
      setCurrentOperation(`Importing ${directFileName}...`);
      setImportProgress(30);
      
      const { data, error } = await supabase.functions.invoke('email-migration', {
        method: 'POST',
        body: { 
          action: 'import-repository-file',
          fileName: directFileName 
        }
      });
      
      if (error) {
        console.error(`[DIRECT IMPORT] API error:`, error);
        throw error;
      }
      
      if (!data) {
        throw new Error("No data returned from import function");
      }
      
      if (data.error) {
        throw new Error(data.error);
      }
      
      setImportProgress(100);
      setCurrentOperation('Import complete!');
      
      console.log(`[DIRECT IMPORT] Success:`, data);
      
      if (data.inserted !== undefined) {
        toast.success(`Import complete: ${data.inserted} imported, ${data.duplicates || 0} duplicates, ${data.errors || 0} errors`);
      } else {
        toast.success(`Import completed successfully`);
      }
      
      if (onImportComplete) onImportComplete();
    } catch (err: any) {
      console.error('[DIRECT IMPORT] Error:', err);
      toast.error(`Import failed: ${err.message}`);
    } finally {
      setDirectImportLoading(false);
      setTimeout(() => {
        setCurrentOperation('');
        setImportProgress(0);
      }, 3000);
    }
  };

  return (
    <Card className="p-4 bg-white shadow-sm">
      <h3 className="text-lg font-semibold mb-4">Import Subscribers</h3>
      
      {(loading || urlImportLoading || repositoryImportLoading || directImportLoading) && (
        <div className="mb-4">
          <div className="text-sm font-medium text-slate-700 mb-1">{currentOperation}</div>
          <Progress value={importProgress} className="h-2" />
        </div>
      )}
      
      <Tabs defaultValue="direct">
        <TabsList className="mb-4">
          <TabsTrigger value="file">File Upload</TabsTrigger>
          <TabsTrigger value="url">URL Import</TabsTrigger>
          <TabsTrigger value="repository" onClick={fetchRepositoryFiles}>Repository Files</TabsTrigger>
          <TabsTrigger value="direct">Direct Import</TabsTrigger>
        </TabsList>
        
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
        
        <TabsContent value="url" className="space-y-4">
          <div className="space-y-4">
            <div className="flex items-center space-x-4">
              <Input
                type="url"
                value={manualUrl}
                onChange={(e) => setManualUrl(e.target.value)}
                placeholder="https://example.com/subscribers.csv"
                className="flex-1"
              />
              <Button 
                onClick={handleManualUrlImport} 
                disabled={!manualUrl || urlImportLoading}
                className="whitespace-nowrap"
              >
                <Globe className="h-4 w-4 mr-2" />
                {urlImportLoading ? "Importing..." : "Import from URL"}
              </Button>
            </div>
            
            <div className="text-sm text-slate-500 bg-blue-50 p-3 rounded border border-blue-100">
              <h4 className="font-medium flex items-center mb-2">
                <AlertTriangle className="h-4 w-4 text-amber-500 mr-2" />
                URL Import Instructions
              </h4>
              <ul className="list-disc list-inside space-y-1">
                <li>Enter the full URL to a publicly accessible CSV or JSON file</li>
                <li>The file must be downloadable without authentication</li>
                <li>File format requirements are the same as file upload</li>
                <li>Large files may take some time to process</li>
              </ul>
            </div>
          </div>
        </TabsContent>
        
        <TabsContent value="repository" className="space-y-4">
          <div className="space-y-4">
            {loadingRepositoryFiles ? (
              <div className="text-center py-4">
                <div className="animate-spin h-6 w-6 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-2"></div>
                <p className="text-sm text-slate-500">Loading repository files...</p>
              </div>
            ) : repositoryFiles.length > 0 ? (
              <>
                <div className="grid gap-4">
                  <div className="text-sm text-slate-700 mb-2 flex justify-between items-center">
                    <span>Select a file to import from the repository:</span>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={fetchRepositoryFiles}
                      disabled={loadingRepositoryFiles}
                    >
                      <RefreshCw className="h-4 w-4 mr-1" />
                      Refresh
                    </Button>
                  </div>
                  
                  <select
                    value={selectedRepositoryFile}
                    onChange={(e) => setSelectedRepositoryFile(e.target.value)}
                    className="w-full border border-slate-300 rounded-md p-2"
                  >
                    {repositoryFiles.map((file) => (
                      <option key={file} value={file}>
                        {file}
                      </option>
                    ))}
                  </select>
                  
                  <Button 
                    onClick={importRepositoryFile} 
                    disabled={!selectedRepositoryFile || repositoryImportLoading}
                    className="w-full"
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    {repositoryImportLoading ? "Importing..." : `Import ${selectedRepositoryFile}`}
                  </Button>
                </div>
                
                <div className="text-sm text-slate-500 bg-blue-50 p-3 rounded border border-blue-100">
                  <h4 className="font-medium mb-2">About Repository Files</h4>
                  <p>
                    These files are stored in the app's repository in the <code>/public/emails/</code> directory.
                    When imported, they'll be moved to <code>/public/emails/completed/</code>.
                  </p>
                </div>
              </>
            ) : (
              <div className="text-center py-6 border border-dashed border-slate-300 rounded-md">
                <p className="text-slate-500 mb-2">No import files found in repository</p>
                <p className="text-sm text-slate-400">
                  Add CSV or JSON files to the <code>/public/emails/</code> directory
                </p>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={fetchRepositoryFiles}
                  className="mt-4"
                  disabled={loadingRepositoryFiles}
                >
                  <RefreshCw className="h-4 w-4 mr-1" />
                  Retry Detection
                </Button>
              </div>
            )}
          </div>
        </TabsContent>
        
        <TabsContent value="direct" className="space-y-4">
          <div className="space-y-4">
            <div className="flex items-center space-x-4">
              <Input
                type="text"
                value={directFileName}
                onChange={(e) => setDirectFileName(e.target.value)}
                placeholder="chunk_ac.csv"
                className="flex-1"
              />
              <Button 
                onClick={handleDirectFileImport} 
                disabled={!directFileName || directImportLoading}
                className="whitespace-nowrap"
              >
                <FolderOpen className="h-4 w-4 mr-2" />
                {directImportLoading ? "Importing..." : "Direct Import"}
              </Button>
            </div>
            
            <div className="text-sm text-slate-500 bg-blue-50 p-3 rounded border border-blue-100">
              <h4 className="font-medium flex items-center mb-2">
                <AlertTriangle className="h-4 w-4 text-amber-500 mr-2" />
                Direct Import Instructions
              </h4>
              <ul className="list-disc list-inside space-y-1">
                <li>Enter just the filename (e.g., "chunk_ac.csv") without any path</li>
                <li>The file must exist in the <code>/public/emails/</code> directory</li>
                <li>This is useful when the repository file list isn't working properly</li>
                <li>File must follow the same format requirements as regular imports</li>
              </ul>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </Card>
  );
};
