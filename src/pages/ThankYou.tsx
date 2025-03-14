import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Helmet } from 'react-helmet-async';
import { supabase } from "@/integrations/supabase/client";
import { CheckCircle } from "lucide-react";
import { useCampaign } from "@/contexts/CampaignContext";
import { generateReferralLink } from "@/features/campaigns/utils/referralLinks";

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
  const [isLoading, setIsLoading] = useState(false);
  const [jwtStatus, setJwtStatus] = useState<string | null>(null);
  const { toast } = useToast();
  const { campaign } = useCampaign();
  
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);
  
  const metaDescription = "Help your students succeed while increasing your chances to win $1,000 for your classroom! Share with other teachers and parents to earn bonus entries.";
  const metaTitle = "Thank You - Share & Win More | Educ8r Sweepstakes";
  const metaImage = "https://educ8r.freeparentsearch.com/lovable-uploads/a0e26259-94d6-485e-b081-739e0d185d14.png";
  const metaUrl = "https://educ8r.freeparentsearch.com/thank-you";

  useEffect(() => {
    document.title = metaTitle;
    
    let metaDescEl = document.querySelector('meta[name="description"]');
    if (!metaDescEl) {
      metaDescEl = document.createElement('meta');
      metaDescEl.setAttribute('name', 'description');
      document.head.appendChild(metaDescEl);
    }
    metaDescEl.setAttribute('content', metaDescription);
    
    const ogTags = {
      'og:title': "Share & Get More Chances to Win $1,000 for Your Classroom!",
      'og:description': metaDescription,
      'og:image': metaImage,
      'og:url': metaUrl,
      'og:type': 'website'
    };
    
    Object.entries(ogTags).forEach(([property, content]) => {
      let ogTag = document.querySelector(`meta[property="${property}"]`);
      if (!ogTag) {
        ogTag = document.createElement('meta');
        ogTag.setAttribute('property', property);
        document.head.appendChild(ogTag);
      }
      ogTag.setAttribute('content', content);
    });
    
    const twitterTags = {
      'twitter:card': 'summary_large_image',
      'twitter:title': "Share & Get More Chances to Win $1,000 for Your Classroom!",
      'twitter:description': metaDescription,
      'twitter:image': metaImage
    };
    
    Object.entries(twitterTags).forEach(([name, content]) => {
      let twitterTag = document.querySelector(`meta[name="${name}"]`);
      if (!twitterTag) {
        twitterTag = document.createElement('meta');
        twitterTag.setAttribute('name', name);
        document.head.appendChild(twitterTag);
      }
      twitterTag.setAttribute('content', content);
    });
    
    return () => {
    };
  }, []);

  useEffect(() => {
    const checkJwtStatus = async () => {
      try {
        const response = await fetch("https://epfzraejquaxqrfmkmyx.supabase.co/functions/v1/everflow-webhook/debug?jwt_check=true");
        const data = await response.json();
        console.log('JWT verification status check result:', data);
        
        const jwtEnabled = data.jwt_status?.enabled;
        console.log('JWT enabled flag from endpoint:', jwtEnabled);
        
        setJwtStatus(jwtEnabled === false ? 'Disabled (OK)' : 'Enabled (Issue)');
        
        if (jwtEnabled !== false) {
          console.warn('WARNING: JWT verification appears to be enabled for everflow-webhook!');
        }
      } catch (err) {
        console.error('Error checking JWT status:', err);
        setJwtStatus('Error checking status');
      }
    };
    
    checkJwtStatus();
    
    const checkForReferralCode = async () => {
      const code = localStorage.getItem("referralCode");
      console.log('Retrieved referral code from localStorage:', code);
      
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
      
      if (code === "PROCESSING") {
        setIsLoading(true);
        return;
      }
      
      try {
        const { data, error } = await supabase
          .from('entries')
          .select('referral_code')
          .eq('email', localStorage.getItem('userEmail') || '')
          .single();
          
        if (error) {
          console.error("Error verifying referral code:", error);
        } else if (data) {
          console.log("Referral code in database:", data.referral_code);
          console.log("Referral code in localStorage:", code);
          
          if (data.referral_code !== code) {
            console.warn("MISMATCH: Local storage referral code doesn't match database code");
            localStorage.setItem("referralCode", data.referral_code);
            setReferralCode(data.referral_code);
          } else {
            setReferralCode(code);
          }
        }
      } catch (err) {
        console.error("Error during referral code verification:", err);
        setReferralCode(code);
      }
      
      setIsLoading(false);
    };
    
    checkForReferralCode();
    
    let pollInterval: number | null = null;
    if (isLoading) {
      pollInterval = window.setInterval(() => {
        const updatedCode = localStorage.getItem("referralCode");
        if (updatedCode && updatedCode !== "PROCESSING") {
          console.log("Referral code updated:", updatedCode);
          setReferralCode(updatedCode);
          setIsLoading(false);
          
          const returningUserFlag = localStorage.getItem("isReturningUser");
          setIsReturningUser(returningUserFlag === "true");
          
          if (pollInterval) {
            clearInterval(pollInterval);
          }
        }
      }, 500);
    }
    
    return () => {
      if (pollInterval) {
        clearInterval(pollInterval);
      }
    };
  }, [toast, isLoading]);

  const referralLink = generateReferralLink(referralCode, campaign?.source_id);
  const copyReferralLink = async () => {
    try {
      await navigator.clipboard.writeText(referralLink);
      toast({
        title: "Link Copied Successfully!",
        description: "Share it with parents to earn bonus entries!",
        variant: "default",
        duration: 4000,
      });
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to copy link. Please try again.",
        variant: "destructive"
      });
    }
  };
  
  const shareTitle = campaign?.share_title || "Give Your Students' Parents a Free Gift!";
  const shareDescription = campaign?.share_description || 
    "Share your referral link with the parents of your students. When they sign up for a free trial of Comprendi™, you'll earn an extra entry for every parent who activates the trial.";
  
  const defaultWhyShareItems = [
    {
      title: "A Gift for Parents",
      description: "Provide them with a valuable, no-cost resource to help their kids thrive in reading."
    },
    {
      title: "A Team Effort",
      description: "Working together, we can support kids in building confidence and comprehension."
    },
    {
      title: "Email Notifications",
      description: "You'll receive an email notification whenever someone uses your link, keeping you updated on your entries!"
    }
  ];
  
  const whyShareItems = campaign?.why_share_items || defaultWhyShareItems;
  
  return <div className="min-h-screen flex flex-col bg-gradient-to-b from-gray-50 to-white">
      <Helmet>
        <title>{metaTitle}</title>
        <meta name="description" content={metaDescription} />
        
        <meta property="og:title" content="Share & Get More Chances to Win $1,000 for Your Classroom!" />
        <meta property="og:description" content={metaDescription} />
        <meta property="og:image" content={metaImage} />
        <meta property="og:url" content={metaUrl} />
        <meta property="og:type" content="website" />
        
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Share & Get More Chances to Win $1,000 for Your Classroom!" />
        <meta name="twitter:description" content={metaDescription} />
        <meta name="twitter:image" content={metaImage} />
        
        <link rel="canonical" href={metaUrl} />
        <meta name="keywords" content="classroom sweepstakes, teacher referral, win classroom supplies, education contest, free school supplies" />
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

          {isReturningUser && (
            <div className="bg-blue-50 p-4 rounded-lg mb-6 border-l-4 border-blue-500">
              <p className="text-blue-800 font-medium">
                You've already entered the sweepstakes. We've retrieved your referral code so you can still share it with parents!
              </p>
            </div>
          )}

          <div className="bg-white p-5 md:p-8 rounded-xl shadow-md border border-gray-100">
            <h3 className="font-bold text-lg md:text-xl mb-3">
              <span className="hidden md:inline text-2xl text-blue-500">{shareTitle}</span>
              <span className="md:hidden text-blue-500 text-3xl">{shareTitle}</span>
            </h3>
            <p className="text-gray-600 mb-5 md:mb-6 text-sm md:text-base font-medium">
              {shareDescription}
            </p>
            
            <div className="bg-gray-50 p-3 md:p-4 rounded-lg mb-5 md:mb-6">
              <p className="text-sm text-gray-500 mb-2">🔗 Your Referral Link:</p>
              {isLoading ? (
                <div className="flex items-center justify-center p-2">
                  <div className="animate-pulse flex space-x-2">
                    <div className="h-4 w-4 bg-gray-300 rounded-full"></div>
                    <div className="h-4 w-4 bg-gray-300 rounded-full"></div>
                    <div className="h-4 w-4 bg-gray-300 rounded-full"></div>
                  </div>
                  <p className="ml-2 text-gray-500">Getting your referral code...</p>
                </div>
              ) : (
                <p className="text-primary font-medium break-all text-sm md:text-base">{referralLink}</p>
              )}
            </div>

            <Button 
              onClick={copyReferralLink} 
              className="w-full text-base py-6 mb-5 md:mb-6 text-neutral-50 bg-green-600 hover:bg-green-500"
              disabled={isLoading}
            >
              {isLoading ? "Preparing your link..." : "Copy Referral Link"}
            </Button>
            
            <div className="p-4 md:p-5 rounded-lg border-l-4 border-blue-500 bg-blue-50">
              <h3 className="font-bold text-lg md:text-xl mb-3 text-blue-500">📚 Why Share?</h3>
              <ul className="text-left text-gray-700 space-y-3">
                {whyShareItems.map((item, index) => (
                  <li key={index} className="flex items-start">
                    <span className="inline-block mr-2 text-blue-600">•</span>
                    <div>
                      <span className="font-medium">{item.title}:</span> {item.description}
                    </div>
                  </li>
                ))}
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
