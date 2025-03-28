
import { EntryForm } from "@/components/EntryForm";
import { CountdownTimer } from "@/components/CountdownTimer";
import { Helmet } from 'react-helmet-async';
import { Link } from "react-router-dom";
import { useEffect } from "react";
import { useCampaign } from "@/contexts/CampaignContext";
import { PartnershipBanner } from "@/components/PartnershipBanner";
import { OptimizedImage } from "@/components/OptimizedImage";
import { Skeleton } from "@/components/ui/skeleton";

const Index = () => {
  const targetDate = new Date("August 15, 2025");
  const {
    campaign,
    isLoading,
    error
  } = useCampaign();
  const currentYear = new Date().getFullYear();
  
  const defaultMeta = {
    title: "Win $1,000 for Your Classroom - Educ8r Sweepstakes",
    description: "Enter now to win $1,000 for your classroom supplies! Free entry for educators. Support your students with everything they need for a successful school year.",
    image: "https://educ8r.freeparentsearch.com/lovable-uploads/a0e26259-94d6-485e-b081-739e0d185d14.png",
    url: "https://educ8r.freeparentsearch.com"
  };
  
  const metaTitle = campaign?.meta_title ?? defaultMeta.title;
  const metaDescription = campaign?.meta_description ?? defaultMeta.description;
  const metaImage = campaign?.meta_image ?? defaultMeta.image;
  const metaUrl = campaign?.meta_url ?? defaultMeta.url;

  useEffect(() => {
    // Log current page information for debugging
    console.log('Index page loaded', {
      isLoading,
      campaignSlug: campaign?.slug,
      url: window.location.pathname
    });
    
    // Update meta tags
    document.title = metaTitle;
    let metaDescEl = document.querySelector('meta[name="description"]');
    if (!metaDescEl) {
      metaDescEl = document.createElement('meta');
      metaDescEl.setAttribute('name', 'description');
      document.head.appendChild(metaDescEl);
    }
    metaDescEl.setAttribute('content', metaDescription);
    const ogTags = {
      'og:title': metaTitle,
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
      'twitter:title': metaTitle,
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
  }, [metaTitle, metaDescription, metaImage, metaUrl, isLoading, campaign]);

  // Loading state UI
  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col bg-gradient-to-b from-gray-50 to-white font-poppins">
        <header className="w-full bg-[#f3f3f3] py-1 border-b border-gray-200">
          <div className="container mx-auto px-4">
            <div className="flex justify-center items-center">
              <Skeleton className="h-12 w-40" />
            </div>
          </div>
        </header>
        
        <main className="flex-grow">
          <div className="container mx-auto px-2 sm:px-4 pt-6">
            <div className="grid sm:grid-cols-2 gap-8 items-center max-w-6xl mx-auto">
              <div className="order-1 md:order-1">
                <Skeleton className="w-full h-[400px] rounded-xl" />
              </div>
              <div className="order-2 md:order-2">
                <Skeleton className="w-full h-[500px] rounded-xl" />
              </div>
            </div>
            
            <div className="mt-12">
              <Skeleton className="w-full h-[300px] rounded-xl" />
            </div>
          </div>
        </main>
        
        <footer className="w-full bg-[#f3f3f3] py-6 border-t border-gray-200">
          <div className="container mx-auto px-4">
            <div className="flex flex-col items-center gap-4">
              <Skeleton className="h-8 w-32" />
              <Skeleton className="h-4 w-48" />
            </div>
          </div>
        </footer>
      </div>
    );
  }
  
  // Error state UI
  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-gray-50 to-white font-poppins">
        <div className="bg-white p-8 rounded-xl shadow-md border border-red-200 max-w-md mx-auto">
          <h2 className="text-2xl font-semibold mb-4 text-red-600">Oops! Something went wrong</h2>
          <p className="text-gray-700 mb-6">We encountered an error loading this campaign. Please try refreshing the page or come back later.</p>
          <p className="text-sm text-gray-500 mb-4">Error details: {error.message}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="w-full py-2 px-4 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return <div className="min-h-screen flex flex-col bg-gradient-to-b from-gray-50 to-white font-poppins">
      <Helmet>
        <title>{metaTitle}</title>
        <meta name="description" content={metaDescription} />
        
        <meta property="og:title" content={metaTitle} />
        <meta property="og:description" content={metaDescription} />
        <meta property="og:image" content={metaImage} />
        <meta property="og:url" content={metaUrl} />
        <meta property="og:type" content="website" />
        
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={metaTitle} />
        <meta name="twitter:description" content={metaDescription} />
        <meta name="twitter:image" content={metaImage} />
        
        <link rel="canonical" href={metaUrl} />
        <meta name="keywords" content="teacher sweepstakes, classroom supplies, $1000 giveaway, education sweepstakes, free classroom supplies" />
      </Helmet>
      
      <header className="w-full bg-[#f3f3f3] py-1 border-b border-gray-200">
        <div className="container mx-auto px-4">
          <div className="flex justify-center items-center">
            <OptimizedImage src="/lovable-uploads/2b96223c-82ba-48db-9c96-5c37da48d93e.png" alt="FPS Logo" maxWidth={200} quality={0.85} width={160} height={48} eager={true} style={{
            objectFit: 'contain'
          }} className="h-12 w-auto py-1" />
          </div>
        </div>
      </header>

      <PartnershipBanner />

      <main className="flex-grow">
        <div className="container mx-auto px-2 sm:px-4 pt-0 md:pt-6">
          <div className="relative grid sm:grid-cols-2 gap-0 items-center max-w-6xl mx-auto">
            <div className="order-1 md:order-1 md:pr-12 z-0 md:w-[calc(100%+3rem)]">
              <OptimizedImage alt="Campaign hero image" className="w-full animate-fadeIn transform hover:scale-[1.02] transition-transform duration-300 rounded-none" src={campaign?.hero_image_url || "/lovable-uploads/308c0411-e546-4640-ab1a-b354a074f9c4.png"} maxWidth={800} quality={0.8} width={800} height={600} isLCP={true} eager={true} priority="high" />
            </div>
            <div className="order-2 md:order-2 md:-ml-12 z-10 -mt-4 sm:-mt-8 md:mt-0">
              <div className="bg-white p-6 md:p-8 rounded-xl shadow-md border border-blue-200 border-4 animate-slideUp">
                <EntryForm />
              </div>
            </div>
          </div>

          <div className="mt-12 bg-white p-4 sm:p-8 rounded-xl shadow-md border border-gray-100 mx-0">
            <div className="w-full mx-auto">
              <h2 className="text-2xl font-semibold mb-2 text-center font-poppins">⏰ Limited Time Opportunity!</h2>
              <p className="text-center font-semibold text-gray-800 mb-6 text-md font-poppins">
                Be Among the First 500 to Enter!
              </p>
              <CountdownTimer targetDate={targetDate} displayMode="launch-phase" />
              
              <p className="text-xl text-gray-600 max-w-2xl mx-auto leading-relaxed mt-6 text-center font-poppins">
                {campaign?.promotional_text || `Enter for a chance to win ${campaign?.prize_amount || "$1,000"} to spend on everything on your ${campaign?.prize_name || "school supply"} list - from backpacks and notebooks to markers and more! Get ready for a successful school year.`}
              </p>

              <div className="mt-8 bg-gradient-to-br from-blue-50 to-indigo-50 p-4 sm:p-8 rounded-2xl border border-blue-100">
                <div className="flex flex-col items-center mb-6">
                  <OptimizedImage src="https://i0.wp.com/dmlearninglab.com/wp-content/uploads/2024/03/Comprendi-Logo-5.png?fit=580%2C327&ssl=1" alt="Comprendi Logo" className="h-16 object-contain mb-4" maxWidth={400} quality={0.9} width={290} height={160} eager={true} />
                  <div className="flex items-center gap-3">
                    <span className="text-blue-600 text-2xl">📚</span>
                    <h3 className="text-xl font-semibold text-blue-800 font-poppins">About Comprendi</h3>
                  </div>
                </div>
                <div className="space-y-4">
                  <p className="text-gray-700 font-poppins">
                    Dr. Marion Blank and her team at Dr. Marion's Learning Lab have developed Comprendi™, a research-backed reading comprehension program that not only helps kids improve their reading skills but also makes reading fun and engaging.
                  </p>
                  <p className="text-gray-700 font-poppins">
                    We believe reading is a team effort, and that's why we're offering a free trial of Comprendi™—a gift you can share with your students (and their parents) just for entering our sweepstakes!
                  </p>
                  <p className="font-medium text-blue-700 mt-4 font-poppins">
                    Bonus: Earn extra sweepstakes entries for every student who enrolls—help your students thrive while increasing your chances to win!
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-12 text-center text-sm text-gray-500 max-w-2xl mx-auto font-poppins">
            <p className="py-[56px]">No purchase necessary. Void where prohibited. Must be 18 years or older to enter. See <Link to="/rules" className="text-primary hover:underline">official rules</Link> for complete details. Prize valued at approximately {campaign?.prize_amount || "$1000"}.</p>
          </div>
        </div>
      </main>

      <footer className="w-full bg-[#f3f3f3] py-6 border-t border-gray-200">
        <div className="container mx-auto px-4">
          <div className="flex flex-col items-center gap-4">
            <OptimizedImage src="/lovable-uploads/2b96223c-82ba-48db-9c96-5c37da48d93e.png" alt="FPS Logo" className="h-8 w-auto" maxWidth={160} quality={0.85} width={120} height={36} style={{
            objectFit: 'contain'
          }} eager={true} />
            <p className="text-sm text-gray-600 font-poppins">© {currentYear} All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>;
};

export default Index;
