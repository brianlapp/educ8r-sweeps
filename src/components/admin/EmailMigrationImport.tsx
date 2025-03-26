import React, { useState, useRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { toast } from '@/hooks/use-toast';
import { RefreshCw, Upload, FileUp, AlertCircle, CheckCircle2, Info, FileText } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export function EmailMigrationImport({ onImportComplete }: { onImportComplete: () => void }) {
  const [isUploading, setIsUploading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [progress, setProgress] = useState(0);
  const [parseError, setParseError] = useState<string | null>(null);
  const [importResults, setImportResults] = useState<any>(null);
  const [diagnosticMode, setDiagnosticMode] = useState(false);
  const [diagnosticInfo, setDiagnosticInfo] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Repository import state
  const [repositoryFiles, setRepositoryFiles] = useState<string[]>([]);
  const [selectedRepoFile, setSelectedRepoFile] = useState<string>('');
  const [isLoadingRepoFiles, setIsLoadingRepoFiles] = useState(false);

  // Fetch repository files on component mount
  useEffect(() => {
    fetchRepositoryFiles();
  }, []);

  const fetchRepositoryFiles = async () => {
    setIsLoadingRepoFiles(true);
    try {
      const { data, error } = await supabase.functions.invoke('email-migration', {
        method: 'POST',
        body: { action: 'list-repository-files' }
      });

      if (error) {
        throw error;
      }

      if (data?.files) {
        setRepositoryFiles(data.files);
      }
    } catch (err) {
      console.error('Failed to load repository files:', err);
    } finally {
      setIsLoadingRepoFiles(false);
    }
  };

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
    setImportResults(null);
    setDiagnosticInfo('');
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
    try {
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

      // Let's add some diagnostic info
      setDiagnosticInfo(prev => prev + `CSV processing successful. Found ${data.length} records with headers: ${headers.join(', ')}\n`);
      
      return data;
    } catch (error) {
      setDiagnosticInfo(prev => prev + `CSV processing error: ${(error as Error).message}\n`);
      throw error;
    }
  };

  // New function to chunk subscribers into smaller batches
  const chunkArray = <T extends any>(array: T[], size: number): T[][] => {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  };

  // New function to handle uploading subscribers in chunks
  const uploadSubscribersInChunks = async (subscribers: any[], fileName: string) => {
    // Use smaller chunks for more reliability
    const CHUNK_SIZE = 50; // Reduced from 250 to 50 for better reliability
    const chunks = chunkArray(subscribers, CHUNK_SIZE);
    
    let totalProcessed = 0;
    let totalInserted = 0;
    let totalDuplicates = 0;
    let totalErrors = 0;
    let hasFailure = false;
    
    setDiagnosticInfo(prev => prev + `Splitting ${subscribers.length} subscribers into ${chunks.length} chunks of ${CHUNK_SIZE}\n`);
    
    for (let i = 0; i < chunks.length; i++) {
      try {
        setProgress(Math.round((i / chunks.length) * 100));
        
        setDiagnosticInfo(prev => prev + `Processing chunk ${i+1}/${chunks.length} with ${chunks[i].length} subscribers\n`);
        
        // Check the first record for diagnostic info
        if (i === 0 && chunks[i].length > 0) {
          setDiagnosticInfo(prev => prev + `Sample record: ${JSON.stringify(chunks[i][0])}\n`);
        }
        
        const { data, error } = await supabase.functions.invoke('email-migration', {
          method: 'POST',
          body: { 
            action: 'import', 
            subscribers: chunks[i],
            fileName: `${fileName}.chunk-${i+1}-of-${chunks.length}`
          }
        });

        if (error) {
          setDiagnosticInfo(prev => prev + `Chunk ${i+1} ERROR: ${error.message}\n`);
          hasFailure = true;
          toast({
            title: `Chunk ${i+1} Failed`,
            description: error.message || "Import error occurred",
            variant: "destructive"
          });
          // Continue with next chunk despite error
          totalErrors += chunks[i].length;
        } else {
          setDiagnosticInfo(prev => prev + `Chunk ${i+1} processed: ${JSON.stringify(data)}\n`);
          
          // Update totals
          totalProcessed += chunks[i].length;
          totalInserted += data.inserted || 0;
          totalDuplicates += data.duplicates || 0;
          totalErrors += data.errors || 0;
        }
        
        // Add a short delay between chunks to prevent overwhelming the server
        await new Promise(resolve => setTimeout(resolve, 500)); // Increased from 200ms to 500ms
      } catch (err) {
        setDiagnosticInfo(prev => prev + `Error processing chunk ${i+1}: ${(err as Error).message}\n`);
        hasFailure = true;
        totalErrors += chunks[i].length;
        toast({
          title: `Chunk ${i+1} Failed`,
          description: (err as Error).message || "Unexpected error during import",
          variant: "destructive"
        });
        // Continue with next chunk even if this one failed
      }
    }
    
    setProgress(100);
    
    return {
      success: !hasFailure || totalInserted > 0,
      totalProcessed,
      inserted: totalInserted,
      duplicates: totalDuplicates,
      errors: totalErrors
    };
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
    setImportResults(null);
    setDiagnosticInfo('');
    
    try {
      setDiagnosticInfo(`Starting import of ${file.name} (${Math.round(file.size / 1024)} KB)\n`);
      const fileContent = await readFileAsText(file);
      setProgress(30);
      
      let subscribers;
      
      if (file.name.endsWith('.json')) {
        // Parse JSON
        try {
          setDiagnosticInfo(prev => prev + `Parsing JSON file...\n`);
          subscribers = JSON.parse(fileContent);
          
          // If data is not an array, check for common parent properties
          if (!Array.isArray(subscribers)) {
            setDiagnosticInfo(prev => prev + `JSON is not an array, trying to find subscribers property...\n`);
            // Try to find subscribers in common JSON structures
            if (subscribers.subscribers) {
              subscribers = subscribers.subscribers;
              setDiagnosticInfo(prev => prev + `Found subscribers in 'subscribers' property.\n`);
            } else if (subscribers.data) {
              subscribers = subscribers.data;
              setDiagnosticInfo(prev => prev + `Found subscribers in 'data' property.\n`);
            } else if (subscribers.results) {
              subscribers = subscribers.results;
              setDiagnosticInfo(prev => prev + `Found subscribers in 'results' property.\n`);
            } else {
              throw new Error('Could not find subscribers array in JSON');
            }
          }
          
          setDiagnosticInfo(prev => prev + `JSON parsed successfully. Found ${subscribers.length} records.\n`);
          setDiagnosticInfo(prev => prev + `Sample record: ${JSON.stringify(subscribers[0])}\n`);
        } catch (error) {
          setParseError('Invalid JSON format: ' + (error as Error).message);
          setDiagnosticInfo(prev => prev + `JSON parse error: ${(error as Error).message}\n`);
          throw error;
        }
      } else {
        // Parse CSV
        try {
          setDiagnosticInfo(prev => prev + `Parsing CSV file...\n`);
          subscribers = processCSV(fileContent);
        } catch (error) {
          setParseError('Invalid CSV format: ' + (error as Error).message);
          setDiagnosticInfo(prev => prev + `CSV parse error: ${(error as Error).message}\n`);
          throw error;
        }
      }
      
      // Validate the subscribers array
      if (!Array.isArray(subscribers) || subscribers.length === 0) {
        setParseError('No subscribers found in file');
        setDiagnosticInfo(prev => prev + `No subscribers found in file or not an array.\n`);
        throw new Error('No subscribers found in file');
      }
      
      // Extract required fields
      const formattedSubscribers = subscribers.map((sub: any) => {
        // Try different field name variations
        const email = sub.email || sub.Email || sub.EMAIL;
        const firstName = sub.first_name || sub.firstName || sub.FirstName || sub['First Name'] || '';
        const lastName = sub.last_name || sub.lastName || sub.LastName || sub['Last Name'] || '';
        
        return { email, first_name: firstName, last_name: lastName };
      }).filter((sub: any) => sub.email); // Filter out entries with no email
      
      if (formattedSubscribers.length === 0) {
        setParseError('No valid email addresses found in file');
        setDiagnosticInfo(prev => prev + `No valid email addresses found after mapping fields.\n`);
        throw new Error('No valid email addresses found in file');
      }
      
      setDiagnosticInfo(prev => prev + `Formatted ${formattedSubscribers.length} subscribers for import.\n`);
      setDiagnosticInfo(prev => prev + `First subscriber: ${JSON.stringify(formattedSubscribers[0])}\n`);

      console.log(`Importing ${formattedSubscribers.length} subscribers using chunked upload`);
      setProgress(40);
      
      // Submit to API in chunks
      const result = await uploadSubscribersInChunks(formattedSubscribers, file.name);
      
      console.log('Import completed:', result);
      setImportResults(result);
      
      if (result.success) {
        toast({
          title: "Import Successful",
          description: `Imported ${result.inserted} subscribers (${result.duplicates} duplicates, ${result.errors} errors).`,
          variant: "default"
        });
      } else {
        toast({
          title: "Import Partially Completed",
          description: `Partially imported ${result.inserted} subscribers with some errors. Please check logs.`,
          variant: "destructive"
        });
      }
      
      // Reset form
      if (fileInputRef.current) fileInputRef.current.value = '';
      setFile(null);
      
      // Force refresh stats immediately and multiple times afterward
      if (onImportComplete) {
        onImportComplete();
        
        // Schedule additional refreshes to catch any delayed processing
        setTimeout(onImportComplete, 1000);
        setTimeout(onImportComplete, 3000);
        setTimeout(onImportComplete, 6000);
      }
      
    } catch (error: any) {
      console.error('Import Error:', error);
      setDiagnosticInfo(prev => prev + `FATAL ERROR: ${error.message}\n`);
      setImportResults({
        success: false,
        error: error.message || "Failed to import subscribers"
      });
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

  const processRepositoryFile = async () => {
    if (!selectedRepoFile) {
      toast({
        title: "No File Selected",
        description: "Please select a repository file to import.",
        variant: "destructive"
      });
      return;
    }
    
    setIsProcessing(true);
    setProgress(10);
    setImportResults(null);
    setDiagnosticInfo(`Starting import of repository file: ${selectedRepoFile}\n`);
    
    try {
      // Invoke the server function to process the file
      const { data, error } = await supabase.functions.invoke('email-migration', {
        method: 'POST',
        body: { 
          action: 'import-repository-file', 
          fileName: selectedRepoFile
        }
      });

      if (error) {
        throw error;
      }

      setDiagnosticInfo(prev => prev + `Repository file processed: ${JSON.stringify(data)}\n`);
      setProgress(100);
      
      // Update the results
      setImportResults({
        success: data.success,
        totalProcessed: data.total || 0,
        inserted: data.inserted || 0,
        duplicates: data.duplicates || 0,
        errors: data.errors || 0
      });
      
      if (data.success) {
        toast({
          title: "Import Successful",
          description: `Imported ${data.inserted} subscribers (${data.duplicates} duplicates, ${data.errors} errors).`,
          variant: "default"
        });
      } else {
        toast({
          title: "Import Failed",
          description: data.error || "Failed to import subscribers from repository file.",
          variant: "destructive"
        });
      }
      
      // Force refresh stats
      if (onImportComplete) {
        onImportComplete();
        setTimeout(onImportComplete, 1000);
        setTimeout(onImportComplete, 3000);
      }
    } catch (error: any) {
      console.error('Repository import error:', error);
      setDiagnosticInfo(prev => prev + `REPOSITORY IMPORT ERROR: ${error.message}\n`);
      setImportResults({
        success: false,
        error: error.message || "Failed to import subscribers from repository"
      });
      toast({
        title: "Repository Import Failed",
        description: error.message || "Failed to import subscribers from repository.",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
      setProgress(0);
    }
  };

  const resetImport = () => {
    setFile(null);
    setSelectedRepoFile('');
    setParseError(null);
    setImportResults(null);
    setDiagnosticInfo('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Manually refresh repository files and stats
  const refreshData = () => {
    fetchRepositoryFiles();
    if (onImportComplete) {
      onImportComplete();
    }
  };

  return (
    <Card className="p-4 bg-white shadow-sm">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">Import Subscribers</h3>
        <div className="flex space-x-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setDiagnosticMode(!diagnosticMode)}
          >
            <Info className="h-4 w-4 mr-2" />
            {diagnosticMode ? 'Hide Diagnostics' : 'Show Diagnostics'}
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={refreshData}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh Data
          </Button>
        </div>
      </div>
      
      <Tabs defaultValue="file">
        <TabsList className="mb-4">
          <TabsTrigger value="file">File Upload</TabsTrigger>
          <TabsTrigger value="repository">Repository Import</TabsTrigger>
        </TabsList>
        
        <TabsContent value="file" className="space-y-4">
          <Alert className="bg-blue-50 border-blue-200">
            <AlertDescription className="text-blue-800">
              Upload a CSV or JSON file containing subscribers to import from OnGage. 
              Large files will be automatically processed in smaller chunks for reliability.
              The import process uses smaller batch sizes (50 subscribers per chunk) for improved reliability.
            </AlertDescription>
          </Alert>
          
          <div className="flex flex-col space-y-4">
            {importResults ? (
              <div className="space-y-4">
                <div className={`p-4 rounded-lg ${importResults.success ? 'bg-green-50 border border-green-200' : 'bg-amber-50 border border-amber-200'}`}>
                  <div className="flex items-start">
                    {importResults.success ? 
                      <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5 mr-2" /> : 
                      <AlertCircle className="h-5 w-5 text-amber-500 mt-0.5 mr-2" />
                    }
                    <div>
                      <h4 className="font-medium">
                        {importResults.success ? 'Import Completed' : 'Import Partially Completed'}
                      </h4>
                      <div className="mt-2 space-y-1 text-sm">
                        <p>Total processed: <span className="font-medium">{importResults.totalProcessed}</span></p>
                        <p>Successfully imported: <span className="font-medium text-green-600">{importResults.inserted}</span></p>
                        <p>Duplicates skipped: <span className="font-medium text-amber-600">{importResults.duplicates}</span></p>
                        <p>Errors: <span className="font-medium text-red-600">{importResults.errors}</span></p>
                      </div>
                      <div className="mt-3 text-xs text-gray-500">
                        Please check the status panel to confirm the subscribers appear in the "Pending" count.
                        If they don't appear within a few seconds, try refreshing the stats or checking diagnostics for details.
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex space-x-2">
                  <Button variant="outline" size="sm" onClick={resetImport}>
                    Import Another File
                  </Button>
                  <Button variant="secondary" size="sm" onClick={refreshData}>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Refresh Stats
                  </Button>
                </div>
              </div>
            ) : (
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
                        onClick={resetImport}
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
            )}
            
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
                  {progress < 40 ? 'Processing file...' : 
                   progress < 90 ? 'Importing subscribers in chunks...' : 
                   'Finalizing import...'}
                </div>
                <Progress value={progress} className="h-2" />
                <div className="text-xs text-center text-gray-500">
                  Large files are processed in smaller batches (50 records per batch) for reliability
                </div>
              </div>
            )}
          </div>
        </TabsContent>
        
        <TabsContent value="repository" className="space-y-4">
          <Alert className="bg-green-50 border-green-200">
            <AlertDescription className="text-green-800">
              Import subscriber files directly from the repository. Files placed in the <code>public/emails/</code> directory 
              are automatically detected and can be selected from the dropdown below. This method is recommended for large datasets.
            </AlertDescription>
          </Alert>
          
          <div className="flex flex-col space-y-4">
            {importResults ? (
              <div className="space-y-4">
                <div className={`p-4 rounded-lg ${importResults.success ? 'bg-green-50 border border-green-200' : 'bg-amber-50 border border-amber-200'}`}>
                  <div className="flex items-start">
                    {importResults.success ? 
                      <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5 mr-2" /> : 
                      <AlertCircle className="h-5 w-5 text-amber-500 mt-0.5 mr-2" />
                    }
                    <div>
                      <h4 className="font-medium">
                        {importResults.success ? 'Repository Import Completed' : 'Repository Import Failed'}
                      </h4>
                      <div className="mt-2 space-y-1 text-sm">
                        <p>Total processed: <span className="font-medium">{importResults.totalProcessed}</span></p>
                        <p>Successfully imported: <span className="font-medium text-green-600">{importResults.inserted}</span></p>
                        <p>Duplicates skipped: <span className="font-medium text-amber-600">{importResults.duplicates}</span></p>
                        <p>Errors: <span className="font-medium text-red-600">{importResults.errors}</span></p>
                      </div>
                      <div className="mt-3 text-xs text-gray-500">
                        Please check the status panel to confirm the subscribers appear in the "Pending" count.
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex space-x-2">
                  <Button variant="outline" size="sm" onClick={resetImport}>
                    Import Another File
                  </Button>
                  <Button variant="secondary" size="sm" onClick={refreshData}>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Refresh Stats
                  </Button>
                </div>
              </div>
            ) : (
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <div className="mb-4 space-y-2">
                  <div className="flex items-center mb-4">
                    <FileText className="h-5 w-5 text-blue-500 mr-2" />
                    <h4 className="text-md font-medium">Select Repository File</h4>
                  </div>
                  
                  <div className="w-full">
                    <Select 
                      value={selectedRepoFile} 
                      onValueChange={setSelectedRepoFile}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select a file" />
                      </SelectTrigger>
                      <SelectContent>
                        {isLoadingRepoFiles ? (
                          <div className="flex items-center justify-center p-2">
                            <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                            <span>Loading files...</span>
                          </div>
                        ) : repositoryFiles.length > 0 ? (
                          repositoryFiles.map(file => (
                            <SelectItem key={file} value={file}>
                              {file}
                            </SelectItem>
                          ))
                        ) : (
                          <div className="p-2 text-sm text-gray-500">
                            No files found in repository
                          </div>
                        )}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-gray-500 mt-1">
                      Files must be placed in the <code>public/emails/</code> directory to appear here
                    </p>
                  </div>
                  
                  <div className="mt-4">
                    <Button
                      onClick={processRepositoryFile}
                      disabled={isProcessing || !selectedRepoFile}
                      className="w-full"
                    >
                      {isProcessing ? (
                        <>
                          <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                          Processing Repository File...
                        </>
                      ) : (
                        'Import Selected File'
                      )}
                    </Button>
                  </div>
                </div>
                
                <div className="mt-4 text-sm text-gray-600">
                  <p>
                    <strong>Repository Import</strong> processes files that have been pre-loaded into the repository. 
                    This method is more reliable for large subscriber lists and doesn't require uploading through the browser.
                  </p>
                </div>
              </div>
            )}
            
            {isProcessing && (
              <div className="space-y-2">
                <div className="text-sm text-center">
                  {progress < 40 ? 'Processing repository file...' : 
                   progress < 90 ? 'Importing subscribers...' : 
                   'Finalizing import...'}
                </div>
                <Progress value={progress} className="h-2" />
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
      
      {diagnosticMode && (
        <div className="space-y-2 mt-4">
          <h4 className="font-medium text-sm">Diagnostic Information</h4>
          <Textarea 
            value={diagnosticInfo} 
            readOnly 
            className="h-64 font-mono text-xs"
          />
        </div>
      )}
    </Card>
  );
}
