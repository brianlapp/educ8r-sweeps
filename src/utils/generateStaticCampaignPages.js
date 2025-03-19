
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Supabase client initialization
const supabaseUrl = process.env.VITE_SUPABASE_URL || "https://epfzraejquaxqrfmkmyx.supabase.co";
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVwZnpyYWVqcXVheHFyZm1rbXl4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzk0NzA2ODIsImV4cCI6MjA1NTA0NjY4Mn0.LY300ASTr6cn4vl2ZkCR0pV0rmah9YKLaUXVM5ISytM";
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Path to the template and output directory
const template = path.resolve(__dirname, '../../index.html');
const outputBaseDir = path.resolve(__dirname, '../../public');

async function fetchCampaigns() {
  console.log('Fetching active campaigns from Supabase...');
  const { data, error } = await supabase
    .from('campaigns')
    .select('*')
    .eq('is_active', true);

  if (error) {
    console.error('Error fetching campaigns:', error);
    throw error;
  }

  console.log(`Found ${data.length} active campaigns`);
  return data;
}

function processMetaTags(campaign) {
  // Default values if campaign meta fields are not set
  const defaultMeta = {
    title: "Win $1,000 for Your Classroom - Educ8r Sweepstakes",
    description: "Enter now to win $1,000 for your classroom supplies! Free entry for educators. Support your students with everything they need for a successful school year.",
    image: "https://educ8r.freeparentsearch.com/lovable-uploads/a0e26259-94d6-485e-b081-739e0d185d14.png",
    url: `https://educ8r.freeparentsearch.com/${campaign.slug}`
  };

  // Use nullish coalescing to handle empty strings
  const metaTitle = campaign.meta_title ?? defaultMeta.title;
  const metaDescription = campaign.meta_description ?? defaultMeta.description;
  const metaImage = campaign.meta_image ?? defaultMeta.image;
  const metaUrl = campaign.meta_url ?? defaultMeta.url;

  return {
    title: metaTitle,
    description: metaDescription,
    image: metaImage,
    url: metaUrl
  };
}

async function generateStaticFiles() {
  try {
    // Read the template HTML file
    const templateHtml = fs.readFileSync(template, 'utf8');
    
    // Fetch all active campaigns
    const campaigns = await fetchCampaigns();

    // Process each campaign
    for (const campaign of campaigns) {
      console.log(`Generating static HTML for campaign: ${campaign.slug}`);
      
      // Process meta tags
      const meta = processMetaTags(campaign);
      
      // Update HTML with campaign-specific meta tags
      let campaignHtml = templateHtml
        .replace(/<title>(.*?)<\/title>/, `<title>${meta.title}</title>`)
        .replace(/<meta name="description" content="(.*?)"/, `<meta name="description" content="${meta.description}"`)
        .replace(/<meta property="og:title" content="(.*?)"/, `<meta property="og:title" content="${meta.title}"`)
        .replace(/<meta property="og:description" content="(.*?)"/, `<meta property="og:description" content="${meta.description}"`)
        .replace(/<meta property="og:image" content="(.*?)"/, `<meta property="og:image" content="${meta.image}"`)
        .replace(/<meta property="og:url" content="(.*?)"/, `<meta property="og:url" content="${meta.url}"`)
        .replace(/<meta name="twitter:title" content="(.*?)"/, `<meta name="twitter:title" content="${meta.title}"`)
        .replace(/<meta name="twitter:description" content="(.*?)"/, `<meta name="twitter:description" content="${meta.description}"`)
        .replace(/<meta name="twitter:image" content="(.*?)"/, `<meta name="twitter:image" content="${meta.image}"`)
        .replace(/<link rel="canonical" href="(.*?)"/, `<link rel="canonical" href="${meta.url}"`);

      // Create output directory for campaign
      const campaignDir = path.join(outputBaseDir, campaign.slug);
      const rootCampaignDir = path.join(outputBaseDir, 'campaigns', campaign.slug);
      
      // Create directory structure if it doesn't exist
      [campaignDir, rootCampaignDir].forEach(dir => {
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }
      });

      // Write the HTML files
      fs.writeFileSync(path.join(campaignDir, 'index.html'), campaignHtml);
      fs.writeFileSync(path.join(rootCampaignDir, 'index.html'), campaignHtml);
      
      console.log(`Generated static HTML for ${campaign.slug}`);
    }

    console.log('All static campaign pages generated successfully!');
  } catch (error) {
    console.error('Error generating static files:', error);
    process.exit(1);
  }
}

// Run the generator
generateStaticFiles();
