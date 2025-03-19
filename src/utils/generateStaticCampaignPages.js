
import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import { fileURLToPath } from 'url';

// Get directory name in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Supabase client initialization
const supabaseUrl = process.env.VITE_SUPABASE_URL || "https://epfzraejquaxqrfmkmyx.supabase.co";
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVwZnpyYWVqcXVheHFyZm1rbXl4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzk0NzA2ODIsImV4cCI6MjA1NTA0NjY4Mn0.LY300ASTr6cn4vl2ZkCR0pV0rmah9YKLaUXVM5ISytM";
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Path to the template and both possible output directories
const template = path.resolve(__dirname, '../../index.html');
const outputBaseDir = path.resolve(__dirname, '../../public');
const distBaseDir = path.resolve(__dirname, '../../dist'); // Add dist directory for direct build output

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

  console.log(`Found ${data.length} active campaigns:`, data.map(c => c.slug));
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

  // Use nullish coalescing to handle empty strings as well as null/undefined
  const metaTitle = (campaign.meta_title && campaign.meta_title.trim()) ? campaign.meta_title : defaultMeta.title;
  const metaDescription = (campaign.meta_description && campaign.meta_description.trim()) ? campaign.meta_description : defaultMeta.description;
  const metaImage = (campaign.meta_image && campaign.meta_image.trim()) ? campaign.meta_image : defaultMeta.image;
  const metaUrl = (campaign.meta_url && campaign.meta_url.trim()) ? campaign.meta_url : defaultMeta.url;

  console.log(`Meta tags for campaign ${campaign.slug}:`, { metaTitle, metaDescription });

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
    if (!fs.existsSync(template)) {
      console.error(`Template file not found at: ${template}`);
      process.exit(1);
    }
    
    const templateHtml = fs.readFileSync(template, 'utf8');
    console.log(`Successfully read template file: ${template}`);
    
    // Create output directories if they don't exist
    [outputBaseDir, distBaseDir].forEach(baseDir => {
      if (!fs.existsSync(baseDir)) {
        console.log(`Creating base directory: ${baseDir}`);
        fs.mkdirSync(baseDir, { recursive: true });
      }
    });
    
    // Fetch all active campaigns
    const campaigns = await fetchCampaigns();

    // Process each campaign
    for (const campaign of campaigns) {
      console.log(`Generating static HTML for campaign: ${campaign.slug}`);
      
      // Process meta tags
      const meta = processMetaTags(campaign);
      
      // Update HTML with campaign-specific meta tags using more reliable regex patterns
      let campaignHtml = templateHtml
        .replace(/<title>.*?<\/title>/i, `<title>${meta.title}</title>`)
        .replace(/<meta name="description" content=".*?"/i, `<meta name="description" content="${meta.description}"`)
        .replace(/<meta property="og:title" content=".*?"/i, `<meta property="og:title" content="${meta.title}"`)
        .replace(/<meta property="og:description" content=".*?"/i, `<meta property="og:description" content="${meta.description}"`)
        .replace(/<meta property="og:image" content=".*?"/i, `<meta property="og:image" content="${meta.image}"`)
        .replace(/<meta property="og:url" content=".*?"/i, `<meta property="og:url" content="${meta.url}"`)
        .replace(/<meta name="twitter:title" content=".*?"/i, `<meta name="twitter:title" content="${meta.title}"`)
        .replace(/<meta name="twitter:description" content=".*?"/i, `<meta name="twitter:description" content="${meta.description}"`)
        .replace(/<meta name="twitter:image" content=".*?"/i, `<meta name="twitter:image" content="${meta.image}"`)
        .replace(/<link rel="canonical" href=".*?"/i, `<link rel="canonical" href="${meta.url}"`);

      // Create output directories for both public and dist
      [outputBaseDir, distBaseDir].forEach(baseDir => {
        // Create slug directory
        const campaignDir = path.join(baseDir, campaign.slug);
        if (!fs.existsSync(campaignDir)) {
          console.log(`Creating campaign directory: ${campaignDir}`);
          fs.mkdirSync(campaignDir, { recursive: true });
        }
        
        // Create campaigns/slug directory
        const campaignsDir = path.join(baseDir, 'campaigns');
        if (!fs.existsSync(campaignsDir)) {
          console.log(`Creating campaigns directory: ${campaignsDir}`);
          fs.mkdirSync(campaignsDir, { recursive: true });
        }
        
        const rootCampaignDir = path.join(campaignsDir, campaign.slug);
        if (!fs.existsSync(rootCampaignDir)) {
          console.log(`Creating root campaign directory: ${rootCampaignDir}`);
          fs.mkdirSync(rootCampaignDir, { recursive: true });
        }

        // Write the HTML files
        const filePath1 = path.join(campaignDir, 'index.html');
        const filePath2 = path.join(rootCampaignDir, 'index.html');
        
        fs.writeFileSync(filePath1, campaignHtml);
        fs.writeFileSync(filePath2, campaignHtml);
        
        console.log(`Generated static HTML at:
        - ${filePath1}
        - ${filePath2}`);
      });
    }

    console.log('All static campaign pages generated successfully!');
  } catch (error) {
    console.error('Error generating static files:', error);
    process.exit(1);
  }
}

// Run the generator
generateStaticFiles();
