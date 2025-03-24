
import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Upload } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface CSVFileUploadProps {
  onSuccess?: () => void;
}

export function CSVFileUpload({ onSuccess }: CSVFileUploadProps) {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selectedFile = e.target.files[0];
      // Validate file type
      if (selectedFile.type !== 'text/csv' && !selectedFile.name.endsWith('.csv')) {
        toast({
          title: "Invalid file format",
          description: "Please upload a CSV file",
          variant: "destructive",
        });
        return;
      }
      setFile(selectedFile);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      toast({
        title: "No file selected",
        description: "Please select a CSV file to upload",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);
    try {
      // Create form data for file upload
      const formData = new FormData();
      formData.append('file', file);

      // Call the Supabase Edge Function with file
      const { data, error } = await supabase.functions.invoke('email-migration', {
        method: 'POST',
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        body: formData,
        // Use query parameters to specify the action
        queryParams: { action: 'import-csv' },
      });

      if (error) {
        console.error("Error uploading CSV:", error);
        toast({
          title: "Upload failed",
          description: error.message || "Failed to upload CSV file",
          variant: "destructive",
        });
        return;
      }

      // Handle successful upload
      console.log("CSV upload response:", data);
      
      if (data.success) {
        toast({
          title: "Upload successful",
          description: `Imported ${data.message}`,
        });
        // Reset form
        setFile(null);
        if (onSuccess) {
          onSuccess();
        }
      } else {
        toast({
          title: "Import error",
          description: data.error || "Failed to process CSV file",
          variant: "destructive",
        });
      }
    } catch (err) {
      console.error("Exception during CSV upload:", err);
      toast({
        title: "Upload failed",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col space-y-2">
        <label htmlFor="csv-file" className="text-sm font-medium">
          Upload CSV File
        </label>
        <Input
          id="csv-file"
          type="file"
          accept=".csv"
          onChange={handleFileChange}
          disabled={uploading}
        />
        <p className="text-xs text-gray-500">
          The CSV file must have at least an 'email' column. Optional columns include 'first_name' and 'last_name'.
        </p>
      </div>
      
      <Button 
        onClick={handleUpload} 
        disabled={!file || uploading} 
        className="w-full"
      >
        {uploading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Uploading...
          </>
        ) : (
          <>
            <Upload className="mr-2 h-4 w-4" />
            Import Subscribers
          </>
        )}
      </Button>
    </div>
  );
}
