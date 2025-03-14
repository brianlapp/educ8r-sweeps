
// Logging imports and configuration to help debug
console.log("==== STARTING FUNCTION INITIALIZATION ====");
console.log("Import map location:", import.meta.resolve ? "Available" : "Not available");
console.log("Environment:", Deno.env.get("ENVIRONMENT") || "Not set");

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { Resend } from "npm:resend@2.0.0"
import { initJwtBypass, getJwtVerificationState } from "../_shared/jwt-cache.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

console.log("==== IMPORTS LOADED SUCCESSFULLY ====");

const resend = new Resend(Deno.env.get("RESEND_API_KEY"))
const supabaseUrl = Deno.env.get("SUPABASE_URL") || ""
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || ""

console.log("API configurations loaded:", {
  resendKeyAvailable: !!Deno.env.get("RESEND_API_KEY"),
  supabaseUrlAvailable: !!supabaseUrl,
  supabaseKeyAvailable: !!supabaseKey
});

// Enhanced CORS headers for maximum compatibility
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, X-Requested-With, *',
  'Access-Control-Allow-Credentials': 'true',
  'Access-Control-Max-Age': '86400',
}

interface ReferralNotificationRequest {
  email: string;
  firstName: string;
  totalEntries: number;
  referralCode: string;
  campaignId?: string; // Optional campaign ID to determine which template to use
}

interface CampaignEmailTemplate {
  id: string;           // Added ID field for better debugging
  email_subject: string;
  email_heading: string;
  email_referral_message: string;
  email_cta_text: string;
  email_footer_message: string;
  prize_amount: string;
  prize_name: string;
}

serve(async (req) => {
  console.log('==== REFERRAL NOTIFICATION FUNCTION STARTED ====');
  console.log('Request method:', req.method);
  console.log('Request headers:', Object.fromEntries(req.headers));
  
  // Initialize JWT bypass at the start of the function
  const jwtBypassResult = initJwtBypass();
  console.log("JWT bypass result:", JSON.stringify(jwtBypassResult));
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    console.log('Handling OPTIONS request with CORS headers');
    return new Response(null, { 
      headers: corsHeaders,
      status: 200
    });
  }
  
  // Add health check endpoint
  const url = new URL(req.url);
  if (url.searchParams.has('health_check')) {
    console.log("Health check requested");
    const jwtState = getJwtVerificationState();
    
    return new Response(
      JSON.stringify({
        status: "ok",
        message: "Email notification service is running",
        timestamp: new Date().toISOString(),
        jwt_status: {
          enabled: jwtState.jwtVerificationEnabled,
          source: jwtState.jwtConfigSource,
          bypass_active: !jwtState.jwtVerificationEnabled,
          bypass_result: jwtBypassResult
        }
      }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      }
    );
  }
  
  try {
    // Dump raw request body for debugging
    const clonedReq = req.clone();
    const rawBody = await clonedReq.text();
    console.log('Raw request body:', rawBody);
    
    // First check to see if we received a valid JSON payload
    if (!rawBody || rawBody.trim() === '') {
      console.error('Error: Empty request body');
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Empty request body'
        }),
        { 
          status: 400,
          headers: { 
            ...corsHeaders,
            'Content-Type': 'application/json'
          }
        }
      );
    }
    
    // Attempt to parse the JSON body with additional safeguards
    let payload;
    try {
      payload = JSON.parse(rawBody);
      console.log('Parsed JSON payload:', JSON.stringify(payload, null, 2));
    } catch (parseError) {
      console.error('Error parsing JSON payload:', parseError);
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Invalid JSON payload',
          details: parseError.message
        }),
        { 
          status: 400,
          headers: { 
            ...corsHeaders,
            'Content-Type': 'application/json'
          }
        }
      );
    }
    
    // Log all top-level keys in the payload for debugging
    console.log('Available keys in payload:', Object.keys(payload));
    
    // Check if data is nested in a "data" object (common pattern)
    let notificationData = payload;
    if (payload.data && typeof payload.data === 'object') {
      console.log('Found nested data object, checking its contents...');
      notificationData = payload.data;
      console.log('Keys in data object:', Object.keys(notificationData));
    }
    
    // Try to extract the needed fields with max flexibility
    const email = notificationData.email || payload.email;
    const firstName = notificationData.firstName || notificationData.first_name || payload.firstName || payload.first_name;
    // For total entries, look in multiple possible locations and formats
    const totalEntries = notificationData.totalEntries || notificationData.total_entries || 
                         payload.totalEntries || payload.total_entries ||
                         notificationData.entryCount || notificationData.entry_count ||
                         payload.entryCount || payload.entry_count;
    // For referral code, check multiple possible formats
    const referralCode = notificationData.referralCode || notificationData.referral_code || 
                        payload.referralCode || payload.referral_code ||
                        payload.ref || notificationData.ref;
    // Get campaign ID if provided - with more robust extraction
    const campaignId = notificationData.campaignId || notificationData.campaign_id || 
                      payload.campaignId || payload.campaign_id ||
                      notificationData.campaign || payload.campaign;
    
    // Detailed logging of what was extracted
    console.log('Extracted email:', email, typeof email);
    console.log('Extracted firstName:', firstName, typeof firstName);
    console.log('Extracted totalEntries:', totalEntries, typeof totalEntries);
    console.log('Extracted referralCode:', referralCode, typeof referralCode);
    console.log('Extracted campaignId:', campaignId, typeof campaignId);
    
    // Validate that we have all required fields
    const missingFields = [];
    if (!email) missingFields.push('email');
    if (!firstName) missingFields.push('firstName');
    if (totalEntries === undefined) missingFields.push('totalEntries');
    if (!referralCode) missingFields.push('referralCode');
    
    if (missingFields.length > 0) {
      console.error('Missing required fields:', missingFields);
      console.error('Full payload received:', payload);
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Missing required fields',
          details: `Missing required fields: ${missingFields.join(', ')}`,
          receivedPayload: payload
        }),
        { 
          status: 400,
          headers: { 
            ...corsHeaders,
            'Content-Type': 'application/json'
          }
        }
      );
    }

    // Create the referral link using the referral code
    const referralLink = `https://dmlearninglab.com/homesc/?utm_source=sweeps&oid=1987&sub1=${referralCode}`;
    
    // Initialize the Supabase client if we have a campaign ID
    let templateData: CampaignEmailTemplate | null = null;
    
    // ENHANCED: Determine the campaign ID for the referral code if not provided
    if (!campaignId && supabaseUrl && supabaseKey) {
      console.log("No campaign ID provided, attempting to look up from entries table");
      try {
        const supabase = createClient(supabaseUrl, supabaseKey);
        const { data: entryData, error: entryError } = await supabase
          .from('entries')
          .select('campaign_id')
          .eq('referral_code', referralCode)
          .maybeSingle();
          
        if (entryError) {
          console.error('Error looking up entry campaign ID:', entryError);
        } else if (entryData && entryData.campaign_id) {
          console.log(`Found campaign ID ${entryData.campaign_id} from entries lookup`);
          // Use the found campaign ID
          const resolvedCampaignId = entryData.campaign_id;
          console.log("Will use campaign ID from entry:", resolvedCampaignId);
        }
      } catch (lookupError) {
        console.error('Exception during campaign ID lookup:', lookupError);
      }
    }
    
    if (campaignId && supabaseUrl && supabaseKey) {
      console.log(`Fetching campaign ${campaignId} from Supabase`);
      try {
        const supabase = createClient(supabaseUrl, supabaseKey);
        
        // Log Supabase connection status
        console.log("Supabase client initialized:", !!supabase);
        
        // IMPROVED: Enhanced logging and error handling for campaign fetch
        console.log(`Running Supabase query for campaign ID: ${campaignId}`);
        
        const { data, error } = await supabase
          .from('campaigns')
          .select('id, email_subject, email_heading, email_referral_message, email_cta_text, email_footer_message, prize_amount, prize_name')
          .eq('id', campaignId);
        
        if (error) {
          console.error('Error fetching campaign:', error);
          console.error('Error details:', JSON.stringify(error));
        } else if (!data || data.length === 0) {
          console.log(`No campaign found with ID: ${campaignId}`);
        } else {
          console.log(`Found ${data.length} campaign records`);
          console.log('Campaign data retrieved:', JSON.stringify(data[0], null, 2));
          templateData = data[0] as CampaignEmailTemplate;
          
          // VALIDATION: Validate the critical template fields are present
          const missingTemplateFields = [];
          if (!templateData.email_subject) missingTemplateFields.push('email_subject');
          if (!templateData.email_heading) missingTemplateFields.push('email_heading');
          if (!templateData.email_referral_message) missingTemplateFields.push('email_referral_message');
          if (!templateData.prize_name) missingTemplateFields.push('prize_name');
          if (!templateData.prize_amount) missingTemplateFields.push('prize_amount');
          
          if (missingTemplateFields.length > 0) {
            console.warn(`Campaign ${campaignId} is missing template fields: ${missingTemplateFields.join(', ')}`);
          }
        }
        
        // If no specific campaign was found, try to fetch any active campaign as a fallback
        if (!templateData) {
          console.log('No campaign found with ID, attempting to fetch any active campaign as fallback');
          const fallbackQuery = await supabase
            .from('campaigns')
            .select('id, email_subject, email_heading, email_referral_message, email_cta_text, email_footer_message, prize_amount, prize_name')
            .eq('is_active', true)
            .limit(1);
            
          if (fallbackQuery.error) {
            console.error('Fallback query also failed:', fallbackQuery.error);
          } else if (fallbackQuery.data && fallbackQuery.data.length > 0) {
            console.log('Fallback campaign found:', fallbackQuery.data[0].id);
            console.log('Fallback template data:', fallbackQuery.data[0]);
            templateData = fallbackQuery.data[0] as CampaignEmailTemplate;
          } else {
            console.log('No active campaigns found as fallback');
          }
        }
      } catch (dbError) {
        console.error('Exception fetching campaign data:', dbError);
        console.error('Exception stack:', dbError.stack);
      }
    } else {
      console.log('No campaign ID provided or Supabase credentials missing - using default template');
      console.log('campaignId present:', !!campaignId);
      console.log('supabaseUrl present:', !!supabaseUrl);
      console.log('supabaseKey present:', !!supabaseKey);
    }
    
    // Detailed logging of template data for debugging
    if (templateData) {
      console.log("Template data found:", {
        id: templateData.id,
        email_subject: templateData.email_subject || "Not set",
        email_heading: templateData.email_heading || "Not set",
        email_referral_message: templateData.email_referral_message || "Not set",
        email_cta_text: templateData.email_cta_text || "Not set",
        email_footer_message: templateData.email_footer_message || "Not set",
        prize_amount: templateData.prize_amount || "Not set",
        prize_name: templateData.prize_name || "Not set"
      });
    } else {
      console.log("No template data found, using defaults");
    }
    
    // Set default template values that will be used if no template is found
    // FIXED: Only use these defaults as a last resort if no campaign data is available
    const emailSubject = templateData?.email_subject || 'Congratulations! You earned a Sweepstakes entry!';
    const emailHeading = templateData?.email_heading || 'You just earned an extra Sweepstakes entry!';
    const prizeAmount = templateData?.prize_amount || '$1,000';
    const prizeName = templateData?.prize_name || 'Classroom Sweepstakes';
    
    // Log the template values that will be used
    console.log('Template values being used:', {
      emailSubject,
      emailHeading,
      prizeAmount,
      prizeName,
      templateDataFound: !!templateData
    });
    
    // Process the email template fields with the data
    const processTemplate = (text: string) => {
      if (!text) {
        console.log("Warning: Empty template text received");
        return "";
      }
      
      console.log(`Processing template text before replacement: "${text}"`);
      
      // IMPROVED: More robust template variable replacement
      try {
        const processed = text
          .replace(/\{\{firstName\}\}/g, firstName)
          .replace(/\{\{first_name\}\}/g, firstName)
          .replace(/\{\{totalEntries\}\}/g, totalEntries.toString())
          .replace(/\{\{total_entries\}\}/g, totalEntries.toString())
          .replace(/\{\{prize_amount\}\}/g, prizeAmount)
          .replace(/\{\{prize_name\}\}/g, prizeName)
          .replace(/\{\{referralCode\}\}/g, referralCode)
          .replace(/\{\{referral_code\}\}/g, referralCode)
          .replace(/\{\{referralLink\}\}/g, referralLink)
          .replace(/\{\{referral_link\}\}/g, referralLink);
        
        console.log(`Template processing result: "${processed}"`);
        return processed;
      } catch (templateError) {
        console.error('Error processing template:', templateError);
        // Return original text if processing fails
        return text;
      }
    };
    
    // FIXED: Ensure we use the campaign-specific template with proper fallbacks
    let emailReferralMessage = templateData?.email_referral_message || 
      `Great news! One of your referrals just tried Comprendi™, and you now have ${totalEntries} entries in the ${prizeAmount} ${prizeName} Sweepstakes!`;
    
    emailReferralMessage = processTemplate(emailReferralMessage);
    
    const emailCtaText = processTemplate(templateData?.email_cta_text || 'Visit Comprendi Reading');
    const emailFooterMessage = processTemplate(templateData?.email_footer_message || 
      'Remember, each parent who activates a free trial through your link gives you another entry in the sweepstakes!');
    
    // Process these values explicitly and log them
    const finalEmailSubject = processTemplate(emailSubject);
    const finalEmailHeading = processTemplate(emailHeading);
    
    console.log('Final processed template values:', {
      subject: finalEmailSubject,
      heading: finalEmailHeading,
      referralMessage: emailReferralMessage,
      ctaText: emailCtaText,
      footerMessage: emailFooterMessage,
      prizeAmount: prizeAmount,
      prizeName: prizeName
    });
    
    // IMPROVED: Enhanced email HTML with better mobile responsiveness
    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
        <div style="text-align: center; margin-bottom: 20px;">
          <img src="https://educ8r.freeparentsearch.com/lovable-uploads/2b96223c-82ba-48db-9c96-5c37da48d93e.png" alt="FPS Logo" style="max-width: 180px;">
        </div>
        
        <h1 style="color: #2C3E50; text-align: center; margin-bottom: 20px;">Congratulations, ${firstName}!</h1>
        
        <div style="background-color: #f8fafc; border-radius: 8px; padding: 20px; margin-bottom: 20px; border-left: 4px solid #3b82f6;">
          <h2 style="color: #3b82f6; margin-top: 0;">${finalEmailHeading}</h2>
          <p style="font-size: 16px; line-height: 1.5;">
            ${emailReferralMessage}
          </p>
        </div>
        
        <p style="font-size: 16px; line-height: 1.5; margin-bottom: 20px;">
          Keep the momentum going! Share your referral link with more parents to increase your chances of winning:
        </p>
        
        <div style="background-color: #f0f9ff; border-radius: 8px; padding: 15px; margin-bottom: 25px; word-break: break-all; font-family: monospace; font-size: 14px;">
          ${referralLink}
        </div>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${referralLink}" style="display: inline-block; background-color: #16a34a; color: white; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: bold; font-size: 16px;">${emailCtaText}</a>
        </div>
        
        <p style="font-size: 16px; line-height: 1.5;">
          ${emailFooterMessage}
        </p>
        
        <p style="font-size: 16px; line-height: 1.5; margin-top: 30px;">
          Thank you for spreading the word about Comprendi™ and helping more students succeed!
        </p>
        
        <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e2e8f0; text-align: center; color: #64748b; font-size: 14px;">
          <p>© 2025 Free Parent Search. All rights reserved.</p>
        </div>
      </div>
    `;
    
    // IMPROVED: Add more detailed email metadata logging
    console.log('Email sending details:', {
      to: email,
      subject: finalEmailSubject,
      campaignId: campaignId || 'Not provided',
      templateFound: !!templateData,
      prizeName: prizeName,
      prizeAmount: prizeAmount
    });
    
    const emailResult = await resend.emails.send({
      from: 'FPS Sweepstakes <noreply@educ8r.freeparentsearch.com>',
      to: email,
      subject: finalEmailSubject,
      html: emailHtml
    });
    
    console.log('Email sent response:', JSON.stringify(emailResult, null, 2));
    
    if (emailResult.error) {
      console.error('Error sending email:', emailResult.error);
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Email sending failed',
          details: emailResult.error
        }),
        { 
          status: 500,
          headers: { 
            ...corsHeaders,
            'Content-Type': 'application/json'
          }
        }
      );
    }
    
    console.log('Email sent successfully:', emailResult);
    
    // Success response with detailed metadata
    return new Response(
      JSON.stringify({
        success: true,
        message: 'Referral notification email sent successfully',
        emailId: emailResult.id,
        metadata: {
          campaignId: campaignId || 'Not provided',
          templateFound: !!templateData,
          prizeName: prizeName,
          prizeAmount: prizeAmount
        }
      }),
      { 
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      }
    );
    
  } catch (error) {
    console.error('Error in send-referral-notification function:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        stack: error.stack,
        details: String(error)
      }),
      { 
        status: 500,
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      }
    );
  }
})
