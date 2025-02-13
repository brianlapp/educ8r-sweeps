
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

declare global {
  interface Window {
    EF: {
      conversion: (params: any) => void;
      click: (params: any) => void;
      impression: (params: any) => void;
      urlParameter: (param: string) => string | null;
    };
  }
}

const ThankYou = () => {
  const [referralCode, setReferralCode] = useState<string>("");
  const { toast } = useToast();

  useEffect(() => {
    // Get the unique referral code that was saved during signup
    const code = localStorage.getItem("referralCode");
    console.log('Retrieved referral code from localStorage:', code);
    
    if (!code) {
      console.error("No referral code found in localStorage");
      toast({
        title: "Error",
        description: "Could not retrieve your referral code. Please try signing up again.",
        variant: "destructive",
      });
      return;
    }
    
    setReferralCode(code);
    // Only remove the code after we've successfully set it in state
    localStorage.removeItem("referralCode");
  }, [toast]);

  // Generate tracking link with Everflow parameters - including sub1 for referral tracking
  const referralLink = `${window.location.origin}/test-landing?ref=${referralCode}&oid=1986&sub1=${referralCode}`;

  const copyReferralLink = async () => {
    try {
      await navigator.clipboard.writeText(referralLink);
      toast({
        title: "Link Copied!",
        description: "Your referral link has been copied to clipboard.",
      });
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to copy link. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-gray-50 to-white">
      <header className="w-full bg-[#f3f3f3] py-4 border-b border-gray-200">
        <div className="container mx-auto px-4">
          <div className="flex justify-center items-center">
            <img 
              src="/lovable-uploads/2b96223c-82ba-48db-9c96-5c37da48d93e.png" 
              alt="FPS Logo" 
              className="h-12 w-auto"
            />
          </div>
        </div>
      </header>

      <main className="flex-grow container mx-auto px-4 py-12">
        <div className="max-w-2xl mx-auto text-center">
          <h1 className="text-4xl font-bold mb-6 text-[#2C3E50]">
            🎉 Thank You for Entering!
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            Your entry has been received. Want to increase your chances of winning?
          </p>

          <div className="bg-white p-8 rounded-xl shadow-md border border-gray-100">
            <h2 className="text-2xl font-semibold mb-4">Share & Win More!</h2>
            <p className="text-gray-600 mb-6">
              Share your unique referral link with friends and family. For each person who enters using your link, you'll get an extra entry!
            </p>

            <div className="flex flex-col gap-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm text-gray-500 mb-2">Your Referral Link:</p>
                <p className="text-primary font-medium break-all">{referralLink}</p>
              </div>

              <Button 
                onClick={copyReferralLink}
                className="w-full"
              >
                Copy Referral Link
              </Button>
            </div>
          </div>

          <div className="mt-8 text-gray-500 text-sm">
            <p>Check your email for confirmation and updates about the giveaway!</p>
          </div>
        </div>
      </main>

      <footer className="w-full bg-[#f3f3f3] py-6 border-t border-gray-200">
        <div className="container mx-auto px-4">
          <div className="flex flex-col items-center gap-4">
            <img 
              src="/lovable-uploads/2b96223c-82ba-48db-9c96-5c37da48d93e.png" 
              alt="FPS Logo" 
              className="h-8 w-auto"
            />
            <p className="text-sm text-gray-600">© 2024 All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default ThankYou;
