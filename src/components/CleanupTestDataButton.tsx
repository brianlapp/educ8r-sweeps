
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

export const CleanupTestDataButton = () => {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleCleanup = async () => {
    if (!confirm("This will remove all test entries with first_name='brian' AND last_name='lapp', except for brian@freebies.com. Continue?")) {
      return;
    }

    setIsLoading(true);
    
    try {
      const { data, error } = await supabase.functions.invoke("cleanup-test-data");
      
      if (error) throw error;
      
      if (data && data.success) {
        toast({
          title: "Cleanup Successful",
          description: data.message,
        });
        
        // Refresh the page to update the entries list
        window.location.reload();
      } else {
        throw new Error(data?.error || "Unknown error during cleanup");
      }
    } catch (error) {
      console.error("Error cleaning up test data:", error);
      toast({
        title: "Cleanup Failed",
        description: error instanceof Error ? error.message : "An error occurred while removing test data",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button 
      onClick={handleCleanup} 
      disabled={isLoading}
      variant="destructive"
      size="sm"
    >
      {isLoading ? "Cleaning..." : "Remove Test Data"}
    </Button>
  );
};
