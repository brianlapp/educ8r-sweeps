
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Helmet } from 'react-helmet-async';
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
  const [isReturningUser, setIsReturningUser] = useState(false);
  const [jwtStatus, setJwtStatus] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    // Check JWT status of the everflow-webhook endpoint
    const checkJwtStatus = async () => {
      try {
        const response = await fetch("https://epfzraejquaxqrfmkmyx.supabase.co/functions/v1/everflow-webhook/debug?jwt_check=true");
        const data = await response.json();
        console.log('JWT verification status check result:', data);
        setJwtStatus(data.jwt_status?.enabled === false ? 'Disabled (OK)' : 'Enabled (Issue)');
        
        if (data.jwt_status?.enabled !== false) {
          console.warn('WARNING: JWT verification appears to be enabled for everflow-webhook!');
        }
      } catch (err) {
        console.error('Error checking JWT status:', err);
        setJwtStatus('Error checking status');
      }
    };
    
    checkJwtStatus();
    
    // Get the unique referral code that was saved during signup
    const code = localStorage.getItem("referralCode");
    console.log('Retrieved referral code from localStorage:', code);
    
    // Check if user is returning from localStorage flag
    const returningUserFlag = localStorage.getItem("isReturningUser");
    setIsReturningUser(returningUserFlag === "true");
    
    if (!code) {
      console.error("No referral code found in localStorage");
      toast({
        title: "Error",
        description: "Could not retrieve your referral code. Please try signing up again.",
        variant: "destructive"
      });
      return;
    }
    setReferralCode(code);
    // Only remove the code after we've successfully set it in state
    // NOTE: We're no longer removing the code to make it persistent 
    // across sessions for returning users
    // localStorage.removeItem("referralCode");
  }, [toast]);

  // Updated to use the production partner URL
  const referralLink = `https://dmlearninglab.com/homesc/?utm_source=sweeps&oid=1987&sub1=${referralCode}`;
  const copyReferralLink = async () => {
    try {
      await navigator.clipboard.writeText(referralLink);
      toast({
        title: "Link Copied!",
        description: "Your referral link has been copied to clipboard."
      });
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to copy link. Please try again.",
        variant: "destructive"
      });
    }
  };
  
  return <div className="min-h-screen flex flex-col bg-gradient-to-b from-gray-50 to-white">
      <Helmet>
        <title>Thank You - Share & Win More | Educ8r Sweepstakes</title>
      </Helmet>
      <header className="w-full bg-[#f3f3f3] py-4 border-b border-gray-200">
        <div className="container mx-auto px-4">
          <div className="flex justify-center items-center">
            <img src="/lovable-uploads/2b96223c-82ba-48db-9c96-5c37da48d93e.png" alt="FPS Logo" className="h-10 md:h-12 w-auto" />
          </div>
        </div>
      </header>

      <main className="flex-grow container mx-auto px-4 py-8 md:py-12">
        <div className="max-w-2xl mx-auto text-center">
          <h1 className="text-3xl md:text-4xl font-bold mb-3 md:mb-4 text-[#2C3E50]">
            {isReturningUser ? (
              <span className="text-blue-500">Welcome Back!</span>
            ) : (
              <span>🎉 Thank You for Entering!</span>
            )}
          </h1>

          {jwtStatus && jwtStatus !== 'Disabled (OK)' && (
            <div className="bg-yellow-50 p-4 rounded-lg mb-6 border-l-4 border-yellow-500">
              <p className="text-yellow-800 font-medium">
                System Notice: Referral tracking status - {jwtStatus}
              </p>
            </div>
          )}

          {isReturningUser && (
            <div className="bg-blue-50 p-4 rounded-lg mb-6 border-l-4 border-blue-500">
              <p className="text-blue-800 font-medium">
                You've already entered the sweepstakes. We've retrieved your referral code so you can still share it with parents!
              </p>
            </div>
          )}

          <div className="bg-white p-5 md:p-8 rounded-xl shadow-md border border-gray-100">
            <h3 className="font-bold text-lg md:text-xl mb-3">
              <span className="hidden md:inline text-2xl text-blue-500">Give Your Students' Parents a Free Gift!</span>
              <span className="md:hidden text-blue-500 text-3xl">Give a Free Gift!</span>
            </h3>
            <p className="text-gray-600 mb-5 md:mb-6 text-sm md:text-base font-medium">
              Share your referral link with the parents of your students. When they sign up for a free trial of Comprendi™, you'll earn an extra entry for every parent who activates the trial.
            </p>
            
            <div className="bg-gray-50 p-3 md:p-4 rounded-lg mb-5 md:mb-6">
              <p className="text-sm text-gray-500 mb-2">🔗 Your Referral Link:</p>
              <p className="text-primary font-medium break-all text-sm md:text-base">{referralLink}</p>
            </div>

            <Button onClick={copyReferralLink} className="w-full text-base py-6 mb-5 md:mb-6 text-neutral-50 bg-green-600 hover:bg-green-500">
              Copy Referral Link
            </Button>
            
            <div className="p-4 md:p-5 rounded-lg border-l-4 border-blue-500 bg-blue-50">
              <h3 className="font-bold text-lg md:text-xl mb-3 text-blue-500">📚 Why Share?</h3>
              <ul className="text-left text-gray-700 space-y-3">
                <li className="flex items-start">
                  <span className="inline-block mr-2 text-blue-600">•</span>
                  <div>
                    <span className="font-medium">A Gift for Parents:</span> Provide them with a valuable, no-cost resource to help their kids thrive in reading.
                  </div>
                </li>
                <li className="flex items-start">
                  <span className="inline-block mr-2 text-blue-600">•</span>
                  <div>
                    <span className="font-medium">A Team Effort:</span> Working together, we can support kids in building confidence and comprehension.
                  </div>
                </li>
              </ul>
            </div>
            
            <p className="text-sm text-gray-500 mt-4 italic">
              Quick Tip: Share the link in your class newsletter, emails, or parent groups!
            </p>
          </div>
        </div>
      </main>

      <footer className="w-full bg-[#f3f3f3] py-4 md:py-6 border-t border-gray-200">
        <div className="container mx-auto px-4">
          <div className="flex flex-col items-center gap-3 md:gap-4">
            <img src="/lovable-uploads/2b96223c-82ba-48db-9c96-5c37da48d93e.png" alt="FPS Logo" className="h-6 md:h-8 w-auto" />
            <p className="text-xs md:text-sm text-gray-600">© 2024 All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>;
};
export default ThankYou;
