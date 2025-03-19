
import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import { fileURLToPath } from 'url';
import { readAssetManifest, getAssetPath, isDevelopment, getJsEntryPoints, getCssFiles } from './asset-manifest.js';

// Get directory name in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Supabase client initialization
const supabaseUrl = process.env.VITE_SUPABASE_URL || "https://epfzraejquaxqrfmkmyx.supabase.co";
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVwZnpyYWVqcXVheHFyZm1rbXl4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzk0NzA2ODIsImV4cCI6MjA1NTA0NjY4Mn0.LY300ASTr6cn4vl2ZkCR0pV0rmah9YKLaUXVM5ISytM";
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Path to the template and output directories
const template = path.resolve(__dirname, '../../index.html');
const outputBaseDir = path.resolve(__dirname, '../../public');
const distBaseDir = path.resolve(__dirname, '../../dist');

// Read the asset manifest
const manifest = readAssetManifest();
console.log('Asset manifest loaded:', manifest ? 'Yes' : 'No');
console.log('Running in mode:', isDevelopment() ? 'Development' : 'Production');

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

  if (!data || data.length === 0) {
    console.warn('No active campaigns found. Please check your database.');
    return [];
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

/**
 * Generate the proper script tags for the application
 */
function generateScriptTags() {
  if (isDevelopment()) {
    // In development mode, use the source file directly
    return `
    <!-- Required script - do not remove -->
    <script src="https://cdn.gpteng.co/gptengineer.js" type="module"></script>
    
    <!-- Main application -->
    <script type="module" src="/src/main.tsx"></script>`;
  }
  
  // In production mode, use the hashed files from the manifest
  const jsEntryPoints = getJsEntryPoints(manifest);
  const cssFiles = getCssFiles(manifest);
  
  let scriptTags = `
    <!-- Required script - do not remove -->
    <script src="https://cdn.gpteng.co/gptengineer.js" type="module"></script>
    
    <!-- Application styles -->`;
  
  // Add CSS files
  cssFiles.forEach(cssFile => {
    scriptTags += `
    <link rel="stylesheet" href="${cssFile}">`;
  });
  
  scriptTags += `
    
    <!-- Application scripts -->`;
  
  // Add JS entry points
  jsEntryPoints.forEach(jsFile => {
    scriptTags += `
    <script type="module" src="${jsFile}"></script>`;
  });
  
  return scriptTags;
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
    
    if (campaigns.length === 0) {
      console.warn("No campaigns found to generate static pages for.");
      // Don't exit with error - this might be expected in some environments
      return;
    }

    // Process each campaign
    for (const campaign of campaigns) {
      console.log(`Generating static HTML for campaign: ${campaign.slug}`);
      
      if (!campaign.slug) {
        console.warn(`Campaign missing slug, skipping:`, campaign.id);
        continue;
      }
      
      // Process meta tags
      const meta = processMetaTags(campaign);
      
      // Generate proper script tags based on environment
      const scriptTags = generateScriptTags();
      
      // Add debugging markers to help troubleshoot
      let campaignHtml = templateHtml
        .replace('<head>', '<head>\n<!-- Static page generated for campaign: ' + campaign.slug + ' -->')
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
      
      // Replace the script tags section with our environment-appropriate scripts
      campaignHtml = campaignHtml.replace(
        /<!-- Required script - do not remove -->[\s\S]*?<script type="module" src="\/src\/main.tsx"><\/script>/,
        scriptTags
      );
        
      // Add special script to check if page loaded correctly and support error recovery
      campaignHtml = campaignHtml.replace('</body>', `
        <script>
          // Page load detection and error recovery
          console.log("Static page for ${campaign.slug} loaded successfully");
          
          // Add custom error tracking to detect failed script loads
          window.addEventListener('error', function(event) {
            console.error('Resource failed to load:', event.target);
            if (event.target && event.target.src && event.target.src.includes('.js')) {
              console.error('JS resource failed to load, attempting recovery');
              
              // Create a fallback for missing scripts
              const rootElement = document.getElementById('root');
              if (rootElement && rootElement.innerHTML === '') {
                rootElement.innerHTML = '<div style="padding: 20px; text-align: center; font-family: sans-serif;">' +
                  '<h2>Loading Application...</h2>' +
                  '<p>The application is taking longer than expected to load.</p>' +
                  '<p><a href="/" style="color: blue; text-decoration: underline;">Try refreshing the page</a></p>' +
                '</div>';
              }
            }
          }, true);
          
          // Check if root element exists and app initialization
          window.addEventListener('DOMContentLoaded', function() {
            if (document.getElementById('root')) {
              console.log("React root element found, app should initialize");
              
              // If nothing renders after 5 seconds, show a message
              setTimeout(function() {
                const rootElement = document.getElementById('root');
                if (rootElement && rootElement.innerHTML === '') {
                  console.error("App failed to render after timeout");
                  rootElement.innerHTML = '<div style="padding: 20px; text-align: center; font-family: sans-serif;">' +
                    '<h2>Application Error</h2>' +
                    '<p>Sorry, something went wrong loading the application.</p>' +
                    '<p><a href="/" style="color: blue; text-decoration: underline;">Try refreshing the page</a></p>' +
                  '</div>';
                }
              }, 5000);
            } else {
              console.error("React root element not found, page may not work correctly");
            }
          });
        </script>
      </body>`);

      // Create output directories for both public and dist
      [outputBaseDir, distBaseDir].forEach(baseDir => {
        try {
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
        } catch (dirError) {
          console.error(`Error creating directories or writing files for ${campaign.slug} in ${baseDir}:`, dirError);
          // Continue with next baseDir
        }
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
