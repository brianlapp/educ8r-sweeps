
import { useState, useEffect } from "react";
import { Helmet } from 'react-helmet-async';
import { useParams, useSearchParams, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useAnalytics } from "@/hooks/use-analytics";
import { useCampaign } from "@/contexts/CampaignContext";

const ThankYou = () => {
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const [copied, setCopied] = useState(false);
  const [referralCode, setReferralCode] = useState<string | null>(null);
  const [isReturningUser, setIsReturningUser] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const analytics = useAnalytics();
  const { slug } = useParams();
  const { campaign, isLoading } = useCampaign();

  // Construct the full referral URL
  const baseUrl = window.location.origin;
  const referralUrl = campaign 
    ? `${baseUrl}/${campaign.slug}?ref=${referralCode}` 
    : `${baseUrl}?ref=${referralCode}`;

  useEffect(() => {
    // Load the user's stored referral code
    const storedReferralCode = localStorage.getItem('referralCode');
    const storedIsReturningUser = localStorage.getItem('isReturningUser') === 'true';
    const storedUserEmail = localStorage.getItem('userEmail');
    
    setReferralCode(storedReferralCode);
    setIsReturningUser(storedIsReturningUser);
    setUserEmail(storedUserEmail);
    
    // Track page view
    analytics.trackPageView('/thank-you');
    
    if (storedReferralCode) {
      analytics.trackEvent('thank_you_page_loaded', {
        referral_code: storedReferralCode,
        is_returning: storedIsReturningUser,
        campaign_slug: campaign?.slug || 'default'
      });
    }
  }, [analytics, campaign]);

  const copyReferralLink = async () => {
    if (referralUrl) {
      try {
        await navigator.clipboard.writeText(referralUrl);
        setCopied(true);
        
        analytics.trackEvent('referral_link_copied', { 
          campaign_slug: campaign?.slug || 'default' 
        });
        
        toast({
          title: "Copied!",
          description: "Referral link copied to clipboard",
        });
        
        // Reset the copied state after 2 seconds
        setTimeout(() => setCopied(false), 2000);
      } catch (err) {
        console.error("Failed to copy text: ", err);
        
        toast({
          title: "Could not copy",
          description: "Please select and copy the link manually",
          variant: "destructive"
        });
      }
    }
  };

  // Customize thank you page content based on campaign data
  const pageTitle = campaign ? campaign.thank_you_title : "Thanks for Sharing!";
  const pageDescription = campaign 
    ? campaign.thank_you_description 
    : "Share with other teachers to get more entries!";

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-gray-50 to-white">
      <Helmet>
        <title>{pageTitle} - Educ8r Sweepstakes</title>
        <meta name="description" content={pageDescription} />
        <meta property="og:title" content={`${pageTitle} - Educ8r Sweepstakes`} />
        <meta property="og:description" content={pageDescription} />
      </Helmet>
      
      <header className="w-full bg-[#f3f3f3] py-1 border-b border-gray-200">
        <div className="container mx-auto px-4">
          <div className="flex justify-center items-center">
            <img src="/lovable-uploads/2b96223c-82ba-48db-9c96-5c37da48d93e.png" alt="FPS Logo" className="h-12 w-auto" />
          </div>
        </div>
      </header>

      <main className="flex-grow">
        <div className="container mx-auto px-4 py-12">
          <div className="max-w-4xl mx-auto bg-white p-8 rounded-xl shadow-md border border-blue-100">
            {isLoading ? (
              <div className="flex justify-center py-12">
                <p className="text-xl">Loading...</p>
              </div>
            ) : (
              <>
                <div className="text-center mb-10">
                  <h1 className="text-3xl md:text-4xl font-bold text-[#2C3E50] mb-6">
                    {isReturningUser ? "Welcome Back!" : pageTitle}
                  </h1>
                  
                  {isReturningUser ? (
                    <p className="text-xl text-gray-700 mb-2">
                      You've already entered the sweepstakes. Thanks for your participation!
                    </p>
                  ) : (
                    <p className="text-xl text-gray-700 mb-2">
                      Your entry has been received. You now have 1 entry in the sweepstakes.
                    </p>
                  )}
                  
                  <div className="mb-6">
                    <p className="text-lg text-blue-800 font-semibold">
                      {pageDescription}
                    </p>
                  </div>
                </div>

                <div className="mb-8 bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-xl border border-blue-200">
                  <div className="text-center mb-4">
                    <h2 className="text-2xl font-bold text-gray-800">Your Personal Referral Link</h2>
                    <p className="text-gray-600 mt-2">Share this link to get 1 additional entry for each person who enters!</p>
                  </div>
                  
                  <div className="flex flex-col md:flex-row gap-2 mt-4">
                    <Input 
                      value={referralUrl} 
                      readOnly 
                      className="bg-white flex-grow text-base"
                      onClick={(e) => (e.target as HTMLInputElement).select()}
                    />
                    <Button 
                      onClick={copyReferralLink}
                      className="bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      {copied ? "Copied!" : "Copy Link"}
                    </Button>
                  </div>
                </div>
                
                <div className="space-y-6">
                  <div className="p-6 bg-green-50 rounded-lg border border-green-100">
                    <h3 className="text-xl font-semibold text-green-800 mb-2">
                      Bonus: Free Resource for Your Students!
                    </h3>
                    <p className="text-gray-700 mb-4">
                      We've partnered with Dr. Marion's Learning Lab to offer you and your students free access to Comprendi™, a cutting-edge reading comprehension program.
                    </p>
                    <p className="font-medium text-green-700">
                      Check your email for access details and share with your students' parents for an additional entry!
                    </p>
                  </div>
                  
                  <div className="text-center mt-8">
                    <p className="text-gray-500 text-sm mb-2">Want to return to the main page?</p>
                    <Link to={slug ? `/${slug}` : "/"}>
                      <Button variant="outline" className="text-blue-600">
                        Return to Home
                      </Button>
                    </Link>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </main>

      <footer className="w-full bg-[#f3f3f3] py-6 border-t border-gray-200">
        <div className="container mx-auto px-4">
          <div className="flex flex-col items-center gap-4">
            <img src="/lovable-uploads/2b96223c-82ba-48db-9c96-5c37da48d93e.png" alt="FPS Logo" className="h-8 w-auto" />
            <p className="text-sm text-gray-600">© 2024 All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default ThankYou;
