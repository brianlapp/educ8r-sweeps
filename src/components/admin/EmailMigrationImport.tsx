import React, { useState, useRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { toast } from '@/hooks/use-toast';
import { RefreshCw, Upload, FileUp, AlertCircle, CheckCircle2, Info, FileText, FolderSearch } from 'lucide-react';
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
import { Input } from '@/components/ui/input';

export function EmailMigrationImport({ onImportComplete }: { onImportComplete: () => void }) {
  const [isUploading, setIsUploading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [progress, setProgress] = useState(0);
  const [parseError, setParseError] = useState<string | null>(null);
  const [importResults, setImportResults] = useState<any>(null);
  const [diagnosticMode, setDiagnosticMode] = useState(true); // Set diagnostics on by default for troubleshooting
  const [diagnosticInfo, setDiagnosticInfo] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [repositoryFiles, setRepositoryFiles] = useState<string[]>([]);
  const [selectedRepoFile, setSelectedRepoFile] = useState<string>('');
  const [isLoadingRepoFiles, setIsLoadingRepoFiles] = useState(false);
  const [repoFilesLoadError, setRepoFilesLoadError] = useState<string | null>(null);
  const [manualFileUrl, setManualFileUrl] = useState<string>('');

  useEffect(() => {
    fetchRepositoryFiles();
  }, []);

  const fetchRepositoryFiles = async () => {
    setIsLoadingRepoFiles(true);
    setRepoFilesLoadError(null);
    setDiagnosticInfo(prev => prev + `\n----- FETCHING REPOSITORY FILES [${new Date().toISOString()}] -----\n`);
    
    try {
      console.log('Fetching repository files...');
      setDiagnosticInfo(prev => prev + `Attempting to fetch repository files via server-automation function\n`);
      
      // Get the base URL for the current site
      const baseUrl = window.location.origin;
      setDiagnosticInfo(prev => prev + `Using base URL: ${baseUrl}\n`);
      
      // Try server-automation endpoint with HTTP method
      let response;
      try {
        response = await supabase.functions.invoke('server-automation', {
          method: 'POST',
          body: { 
            action: 'list-repository-files',
            baseUrl: baseUrl,
            timestamp: new Date().toISOString() // Prevent caching
          }
        });
        
        if (response.error) {
          throw new Error(response.error.message || "Server automation endpoint failed");
        }
      } catch (serverError) {
        console.warn('Server automation endpoint failed:', serverError);
        setDiagnosticInfo(prev => prev + `Server automation endpoint error: ${serverError}\n`);
        setDiagnosticInfo(prev => prev + `Falling back to email-migration function endpoint\n`);
        
        // Fall back to email-migration endpoint
        response = await supabase.functions.invoke('email-migration', {
          method: 'POST',
          body: { 
            action: 'list-repository-files',
            debug: true,
            timestamp: new Date().toISOString() // Prevent caching
          }
        });
        
        if (response.error) {
          throw new Error(response.error.message || "Email migration endpoint failed");
        }
      }
      
      console.log('Repository files response:', response.data);
      setDiagnosticInfo(prev => prev + `Response data: ${JSON.stringify(response.data, null, 2)}\n`);
      
      if (response.data?.files) {
        // Make sure we have a proper array
        const filesList = Array.isArray(response.data.files) ? response.data.files : [];
        setRepositoryFiles(filesList);
        
        if (filesList.length === 0) {
          const errorMsg = 'No files found in repository. Make sure files are in public/emails/ directory';
          console.warn(errorMsg);
          setDiagnosticInfo(prev => prev + `${errorMsg}\n`);
          setRepoFilesLoadError(errorMsg);
        } else {
          const successMsg = `Found ${filesList.length} files in repository`;
          console.log(successMsg);
          setDiagnosticInfo(prev => prev + `${successMsg}\n`);
          setDiagnosticInfo(prev => prev + `File list sample: ${filesList.slice(0, 5).join(', ')}...\n`);
        }
      } else {
        const noFilesMsg = 'No files property in response. Check function implementation.';
        console.warn(noFilesMsg, response.data);
        setDiagnosticInfo(prev => prev + `${noFilesMsg}\n`);
        setRepoFilesLoadError(noFilesMsg);
      }
    } catch (err) {
      const errorMsg = `Failed to load repository files: ${(err as Error).message}`;
      console.error(errorMsg, err);
      setDiagnosticInfo(prev => prev + `${errorMsg}\n`);
      setDiagnosticInfo(prev => prev + `Full error details: ${JSON.stringify(err)}\n`);
      setRepoFilesLoadError(errorMsg);
      
      toast({
        title: "Repository Error",
        description: "Failed to load files from repository. Check diagnostic panel for details.",
        variant: "destructive"
      });
    } finally {
      setIsLoadingRepoFiles(false);
      setDiagnosticInfo(prev => prev + `----- REPOSITORY FILE FETCH COMPLETE [${new Date().toISOString()}] -----\n`);
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
      const rows = csvText.split(/\r?\n/);
      const headers = rows[0].split(',').map(header => 
        header.trim().replace(/^"|"$/g, '')
      );
      
      const data: Array<any> = [];
      
      for (let i = 1; i < rows.length; i++) {
        if (!rows[i].trim()) continue;
        
        const values: string[] = [];
        let currentValue = '';
        let inQuotes = false;
        
        for (let j = 0; j < rows[i].length; j++) {
          const char = rows[i][j];
          
          if (char === '"') {
            inQuotes = !inQuotes;
            currentValue += char;
          } else if (char === ',' && !inQuotes) {
            values.push(currentValue.trim().replace(/^"|"$/g, ''));
            currentValue = '';
          } else {
            currentValue += char;
          }
        }
        
        values.push(currentValue.trim().replace(/^"|"$/g, ''));
        
        const obj: Record<string, string> = {};
        headers.forEach((header, index) => {
          if (index < values.length) {
            obj[header] = values[index];
          }
        });
        
        data.push(obj);
      }

      setDiagnosticInfo(prev => prev + `CSV processing successful. Found ${data.length} records with headers: ${headers.join(', ')}\n`);
      
      return data;
    } catch (error) {
      setDiagnosticInfo(prev => prev + `CSV processing error: ${(error as Error).message}\n`);
      throw error;
    }
  };

  const chunkArray = <T extends any>(array: T[], size: number): T[][] => {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  };

  const uploadSubscribersInChunks = async (subscribers: any[], fileName: string) => {
    const CHUNK_SIZE = 50;
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
        
        if (i === 0 && chunks[i].length > 0) {
          setDiagnosticInfo(prev => prev + `Sample record: ${JSON.stringify(chunks[i][0])}\n`);
        }
        
        // Enhanced error handling with retries
        let attempts = 0;
        const maxAttempts = 3;
        let response;
        
        while (attempts < maxAttempts) {
          attempts++;
          try {
            response = await supabase.functions.invoke('email-migration', {
              method: 'POST',
              body: { 
                action: 'import', 
                subscribers: chunks[i],
                fileName: `${fileName}.chunk-${i+1}-of-${chunks.length}`,
                debug: true // Add debug flag for extra logging
              }
            });
            
            if (response.error) {
              setDiagnosticInfo(prev => prev + `Chunk ${i+1} Attempt ${attempts} ERROR: ${response.error.message}\n`);
              
              if (attempts < maxAttempts) {
                setDiagnosticInfo(prev => prev + `Retrying in 1 second... (Attempt ${attempts+1}/${maxAttempts})\n`);
                await new Promise(resolve => setTimeout(resolve, 1000)); // Wait before retry
                continue;
              }
              
              throw response.error;
            }
            
            // If we get here, we succeeded
            break;
          } catch (err) {
            if (attempts < maxAttempts) {
              setDiagnosticInfo(prev => prev + `Chunk ${i+1} Attempt ${attempts} failed with error: ${(err as Error).message}\n`);
              setDiagnosticInfo(prev => prev + `Retrying in 1 second... (Attempt ${attempts+1}/${maxAttempts})\n`);
              await new Promise(resolve => setTimeout(resolve, 1000)); // Wait before retry
            } else {
              throw err; // Rethrow after max attempts
            }
          }
        }

        if (response.error) {
          setDiagnosticInfo(prev => prev + `Chunk ${i+1} FINAL ERROR: ${response.error.message}\n`);
          hasFailure = true;
          toast({
            title: `Chunk ${i+1} Failed`,
            description: response.error.message || "Import error occurred",
            variant: "destructive"
          });
          totalErrors += chunks[i].length;
        } else {
          setDiagnosticInfo(prev => prev + `Chunk ${i+1} processed: ${JSON.stringify(response.data)}\n`);
          
          totalProcessed += chunks[i].length;
          totalInserted += response.data?.inserted || 0;
          totalDuplicates += response.data?.duplicates || 0;
          totalErrors += response.data?.errors || 0;
        }
        
        // Add a small delay between chunks to avoid overwhelming the system
        await new Promise(resolve => setTimeout(resolve, 800));
      } catch (err) {
        setDiagnosticInfo(prev => prev + `Error processing chunk ${i+1}: ${(err as Error).message}\n`);
        hasFailure = true;
        totalErrors += chunks[i].length;
        toast({
          title: `Chunk ${i+1} Failed`,
          description: (err as Error).message || "Unexpected error during import",
          variant: "destructive"
        });
        
        // Add a longer delay after an error
        await new Promise(resolve => setTimeout(resolve, 1500));
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
        try {
          setDiagnosticInfo(prev => prev + `Parsing JSON file...\n`);
          subscribers = JSON.parse(fileContent);
          
          if (!Array.isArray(subscribers)) {
            setDiagnosticInfo(prev => prev + `JSON is not an array, trying to find subscribers property...\n`);
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
        try {
          setDiagnosticInfo(prev => prev + `Parsing CSV file...\n`);
          subscribers = processCSV(fileContent);
        } catch (error) {
          setParseError('Invalid CSV format: ' + (error as Error).message);
          setDiagnosticInfo(prev => prev + `CSV parse error: ${(error as Error).message}\n`);
          throw error;
        }
      }
      
      if (!Array.isArray(subscribers) || subscribers.length === 0) {
        setParseError('No subscribers found in file');
        setDiagnosticInfo(prev => prev + `No subscribers found in file or not an array.\n`);
        throw new Error('No subscribers found in file');
      }
      
      const formattedSubscribers = subscribers.map((sub: any) => {
        const email = sub.email || sub.Email || sub.EMAIL;
        const firstName = sub.first_name || sub.firstName || sub.FirstName || sub['First Name'] || '';
        const lastName = sub.last_name || sub.lastName || sub.LastName || sub['Last Name'] || '';
        
        return { email, first_name: firstName, last_name: lastName };
      }).filter((sub: any) => sub.email);
      
      if (formattedSubscribers.length === 0) {
        setParseError('No valid email addresses found in file');
        setDiagnosticInfo(prev => prev + `No valid email addresses found after mapping fields.\n`);
        throw new Error('No valid email addresses found in file');
      }
      
      setDiagnosticInfo(prev => prev + `Formatted ${formattedSubscribers.length} subscribers for import.\n`);
      setDiagnosticInfo(prev => prev + `First subscriber: ${JSON.stringify(formattedSubscribers[0])}\n`);

      console.log(`Importing ${formattedSubscribers.length} subscribers using chunked upload`);
      setProgress(40);
      
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
      
      if (fileInputRef.current) fileInputRef.current.value = '';
      setFile(null);
      
      if (onImportComplete) {
        onImportComplete();
        setTimeout(onImportComplete, 1000);
        setTimeout(onImportComplete, 3000);
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
    setDiagnosticInfo(`\n----- STARTING REPOSITORY IMPORT [${new Date().toISOString()}] -----\n`);
    setDiagnosticInfo(prev => prev + `Starting import of repository file: ${selectedRepoFile}\n`);
    
    try {
      // Enhanced error handling with retries
      let attempts = 0;
      const maxAttempts = 3;
      let response;
      
      while (attempts < maxAttempts) {
        attempts++;
        try {
          setDiagnosticInfo(prev => prev + `Attempt ${attempts}/${maxAttempts} to import repository file\n`);
          
          response = await supabase.functions.invoke('email-migration', {
            method: 'POST',
            body: { 
              action: 'import-repository-file', 
              fileName: selectedRepoFile,
              debug: true // Add debug mode for more logging
            }
          });
          
          if (response.error) {
            setDiagnosticInfo(prev => prev + `Attempt ${attempts} ERROR: ${response.error.message}\n`);
            
            if (attempts < maxAttempts) {
              setDiagnosticInfo(prev => prev + `Retrying in 2 seconds... (Attempt ${attempts+1}/${maxAttempts})\n`);
              await new Promise(resolve => setTimeout(resolve, 2000)); // Wait before retry
              continue;
            }
            
            throw response.error;
          }
          
          // If we get here, we succeeded
          break;
        } catch (err) {
          if (attempts < maxAttempts) {
            setDiagnosticInfo(prev => prev + `Attempt ${attempts} exception: ${(err as Error).message}\n`);
            setDiagnosticInfo(prev => prev + `Retrying in 2 seconds... (Attempt ${attempts+1}/${maxAttempts})\n`);
            await new Promise(resolve => setTimeout(resolve, 2000)); // Wait before retry
          } else {
            throw err; // Rethrow after max attempts
          }
        }
      }

      if (response.error) {
        throw response.error;
      }

      setDiagnosticInfo(prev => prev + `Repository file processed: ${JSON.stringify(response.data)}\n`);
      setProgress(100);
      
      setImportResults({
        success: response.data?.success,
        totalProcessed: response.data?.total || 0,
        inserted: response.data?.inserted || 0,
        duplicates: response.data?.duplicates || 0,
        errors: response.data?.errors || 0
      });
      
      if (response.data?.success) {
        toast({
          title: "Import Successful",
          description: `Imported ${response.data.inserted} subscribers (${response.data.duplicates} duplicates, ${response.data.errors} errors).`,
          variant: "default"
        });
      } else {
        toast({
          title: "Import Failed",
          description: response.data?.error || "Failed to import subscribers from repository file.",
          variant: "destructive"
        });
      }
      
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
      setDiagnosticInfo(prev => prev + `----- REPOSITORY IMPORT COMPLETE [${new Date().toISOString()}] -----\n`);
    }
  };

  const processManualFileUrl = async () => {
    if (!manualFileUrl) {
      toast({
        title: "No File URL Entered",
        description: "Please enter a repository file URL to import.",
        variant: "destructive"
      });
      return;
    }
    
    setIsProcessing(true);
    setProgress(10);
    setImportResults(null);
    setDiagnosticInfo(`\n----- STARTING MANUAL URL IMPORT [${new Date().toISOString()}] -----\n`);
    setDiagnosticInfo(prev => prev + `Starting import of file from URL: ${manualFileUrl}\n`);
    
    try {
      // First, try to fetch the file content directly
      setDiagnosticInfo(prev => prev + `Fetching file content from URL...\n`);
      let fileResponse;
      
      try {
        fileResponse = await fetch(manualFileUrl);
        
        if (!fileResponse.ok) {
          throw new Error(`Failed to fetch file: ${fileResponse.status} ${fileResponse.statusText}`);
        }
      } catch (fetchErr) {
        setDiagnosticInfo(prev => prev + `Error fetching file: ${fetchErr.message}\n`);
        throw new Error(`Failed to fetch file: ${fetchErr.message}`);
      }
      
      // Get the file content as text
      const fileContent = await fileResponse.text();
      setDiagnosticInfo(prev => prev + `Successfully fetched file (${fileContent.length} bytes)\n`);
      
      // Extract file name from URL
      const fileName = manualFileUrl.split('/').pop() || 'manual_import.csv';
      setDiagnosticInfo(prev => prev + `Extracted filename: ${fileName}\n`);
      
      // Process the file content similar to processFile
      setProgress(30);
      
      let subscribers;
      
      if (fileName.endsWith('.json')) {
        try {
          setDiagnosticInfo(prev => prev + `Parsing JSON file...\n`);
          subscribers = JSON.parse(fileContent);
          
          if (!Array.isArray(subscribers)) {
            setDiagnosticInfo(prev => prev + `JSON is not an array, trying to find subscribers property...\n`);
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
          if (subscribers.length > 0) {
            setDiagnosticInfo(prev => prev + `Sample record: ${JSON.stringify(subscribers[0])}\n`);
          }
        } catch (error) {
          setParseError('Invalid JSON format: ' + (error as Error).message);
          setDiagnosticInfo(prev => prev + `JSON parse error: ${(error as Error).message}\n`);
          throw error;
        }
      } else {
        try {
          setDiagnosticInfo(prev => prev + `Parsing CSV file...\n`);
          subscribers = processCSV(fileContent);
        } catch (error) {
          setParseError('Invalid CSV format: ' + (error as Error).message);
          setDiagnosticInfo(prev => prev + `CSV parse error: ${(error as Error).message}\n`);
          throw error;
        }
      }
      
      if (!Array.isArray(subscribers) || subscribers.length === 0) {
        setParseError('No subscribers found in file');
        setDiagnosticInfo(prev => prev + `No subscribers found in file or not an array.\n`);
        throw new Error('No subscribers found in file');
      }
      
      const formattedSubscribers = subscribers.map((sub: any) => {
        const email = sub.email || sub.Email || sub.EMAIL;
        const firstName = sub.first_name || sub.firstName || sub.FirstName || sub['First Name'] || '';
        const lastName = sub.last_name || sub.lastName || sub.LastName || sub['Last Name'] || '';
        
        return { email, first_name: firstName, last_name: lastName };
      }).filter((sub: any) => sub.email);
      
      if (formattedSubscribers.length === 0) {
        setParseError('No valid email addresses found in file');
        setDiagnosticInfo(prev => prev + `No valid email addresses found after mapping fields.\n`);
        throw new Error('No valid email addresses found in file');
      }
      
      setDiagnosticInfo(prev => prev + `Formatted ${formattedSubscribers.length} subscribers for import.\n`);
      setDiagnosticInfo(prev => prev + `First subscriber: ${JSON.stringify(formattedSubscribers[0])}\n`);

      console.log(`Importing ${formattedSubscribers.length} subscribers using chunked upload`);
      setProgress(40);
      
      const result = await uploadSubscribersInChunks(formattedSubscribers, fileName);
      
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
      
      setManualFileUrl('');
      
      if (onImportComplete) {
        onImportComplete();
        setTimeout(onImportComplete, 1000);
        setTimeout(onImportComplete, 3000);
      }
    } catch (error: any) {
      console.error('Manual file URL import error:', error);
      setDiagnosticInfo(prev => prev + `MANUAL URL IMPORT ERROR: ${error.message}\n`);
      setImportResults({
        success: false,
        error: error.message || "Failed to import subscribers from URL"
      });
      toast({
        title: "Import Failed",
        description: error.message || "Failed to import subscribers from URL.",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
      setProgress(0);
      setDiagnosticInfo(prev => prev + `----- MANUAL URL IMPORT COMPLETE [${new Date().toISOString()}] -----\n`);
    }
  };

  const resetImport = () => {
    setFile(null);
    setSelectedRepoFile('');
    setManualFileUrl('');
    setParseError(null);
    setImportResults(null);
    setDiagnosticInfo('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const refreshData = () => {
    setDiagnosticInfo(prev => prev + "\nManually refreshing repository files...\n");
    fetchRepositoryFiles();
    if (onImportComplete) {
      onImportComplete();
    }
  };

  const forceDirectPath = async () => {
    setDiagnosticInfo(prev => prev + `\n----- TRYING DIRECT PATH CHECK [${new Date().toISOString()}] -----\n`);
    
    try {
      // Direct fetch to check if the files exist on the URL path
      const testUrl = `${window.location.origin}/emails/chunk_aa.csv`;
      setDiagnosticInfo(prev => prev + `Testing direct URL access: ${testUrl}\n`);
      
      const response = await fetch(testUrl, { method: 'HEAD' });
      setDiagnosticInfo(prev => prev + `Direct URL test result: ${response.status} ${response.statusText}\n`);
      
      if (response.ok) {
        setDiagnosticInfo(prev => prev + `Direct path access WORKS! Files should be accessible directly.\n`);
      } else {
        setDiagnosticInfo(prev => prev + `Direct path access FAILED. Files may not be in the correct location.\n`);
      }
      
      // Try some other common patterns
      const patterns = [
        'chunk_0.csv',
        'chunk_1.csv',
        'subscribers.csv',
        'export.csv'
      ];
      
      for (const pattern of patterns) {
        const patternUrl = `${window.location.origin}/emails/${pattern}`;
        try {
          const patternResponse = await fetch(patternUrl, { method: 'HEAD' });
          setDiagnosticInfo(prev => prev + `Testing ${pattern}: ${patternResponse.status} ${patternResponse.statusText}\n`);
          
          if (patternResponse.ok) {
            setDiagnosticInfo(prev => prev + `Found file at ${patternUrl}\n`);
            // If found, add it to the repository files list
            if (!repositoryFiles.includes(pattern)) {
              setRepositoryFiles(prev => [...prev, pattern]);
            }
          }
        } catch (err) {
          setDiagnosticInfo(prev => prev + `Error checking ${pattern}: ${(err as Error).message}\n`);
        }
      }
    } catch (err) {
      setDiagnosticInfo(prev => prev + `Direct path test error: ${(err as Error).message}\n`);
    }
    
    setDiagnosticInfo(prev => prev + `----- DIRECT PATH CHECK COMPLETE [${new Date().toISOString()}] -----\n`);
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
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoadingRepoFiles ? 'animate-spin' : ''}`} />
            Refresh Data
          </Button>
        </div>
      </div>
      
      {diagnosticMode
