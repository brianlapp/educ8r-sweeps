
import React, { useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { toast } from '@/hooks/use-toast';
import { RefreshCw, Upload, FileUp, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';

export function EmailMigrationImport({ onImportComplete }: { onImportComplete: () => void }) {
  const [isUploading, setIsUploading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [progress, setProgress] = useState(0);
  const [parseError, setParseError] = useState<string | null>(null);
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
    const CHUNK_SIZE = 500; // Import 500 subscribers at a time
    const chunks = chunkArray(subscribers, CHUNK_SIZE);
    
    let totalProcessed = 0;
    let totalInserted = 0;
    let totalDuplicates = 0;
    let totalErrors = 0;
    let hasFailure = false;
    
    console.log(`Splitting ${subscribers.length} subscribers into ${chunks.length} chunks of ${CHUNK_SIZE}`);
    
    for (let i = 0; i < chunks.length; i++) {
      try {
        setProgress(Math.round((i / chunks.length) * 100));
        
        console.log(`Processing chunk ${i+1}/${chunks.length} with ${chunks[i].length} subscribers`);
        
        const { data, error } = await supabase.functions.invoke('email-migration', {
          method: 'POST',
          body: { 
            action: 'import', 
            subscribers: chunks[i],
            fileName: `${fileName}.chunk-${i+1}-of-${chunks.length}`
          }
        });

        if (error) {
          console.error(`Chunk ${i+1} import error:`, error);
          hasFailure = true;
          throw error;
        }
        
        console.log(`Chunk ${i+1} processed:`, data);
        
        // Update totals
        totalProcessed += chunks[i].length;
        totalInserted += data.inserted || 0;
        totalDuplicates += data.duplicates || 0;
        totalErrors += data.errors || 0;
      } catch (err) {
        console.error(`Error processing chunk ${i+1}:`, err);
        hasFailure = true;
        
        // We'll continue with the next chunk even if this one failed
        // This ensures we import as many subscribers as possible
      }
    }
    
    setProgress(100);
    
    return {
      success: !hasFailure,
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
      
      // Extract required fields
      const formattedSubscribers = subscribers.map((sub: any) => {
        // Try different field name variations
        const email = sub.email || sub.Email || sub.EMAIL;
        const firstName = sub.first_name || sub.firstName || sub.FirstName || sub['First Name'] || '';
        const lastName = sub.last_name || sub.lastName || sub.LastName || sub['Last Name'] || '';
        
        return { email, first_name: firstName, last_name: lastName };
      }).filter((sub: any) => sub.email); // Filter out entries with no email
      
      setProgress(40);
      
      // Submit to API in chunks
      console.log(`Importing ${formattedSubscribers.length} subscribers using chunked upload`);
      
      const result = await uploadSubscribersInChunks(formattedSubscribers, file.name);
      
      setProgress(100);
      console.log('Import completed:', result);
      
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

  return (
    <Card className="p-4 bg-white shadow-sm">
      <h3 className="text-lg font-semibold mb-4">Import Subscribers</h3>
      
      <div className="space-y-4">
        <Alert className="bg-blue-50 border-blue-200">
          <AlertDescription className="text-blue-800">
            Upload a CSV or JSON file containing subscribers to import from OnGage. 
            Large files will be automatically processed in smaller chunks for reliability.
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
                {progress < 40 ? 'Processing file...' : 
                 progress < 90 ? 'Importing subscribers in chunks...' : 
                 'Finalizing import...'}
              </div>
              <Progress value={progress} className="h-2" />
              <div className="text-xs text-center text-gray-500">
                Large files are processed in smaller batches for reliability
              </div>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
