
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { Resend } from "npm:resend@2.0.0"
import { initJwtBypass, getJwtVerificationState } from "../_shared/jwt-cache.ts"

const resend = new Resend(Deno.env.get("RESEND_API_KEY"))

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
    
    // Detailed logging of what was extracted
    console.log('Extracted email:', email, typeof email);
    console.log('Extracted firstName:', firstName, typeof firstName);
    console.log('Extracted totalEntries:', totalEntries, typeof totalEntries);
    console.log('Extracted referralCode:', referralCode, typeof referralCode);
    
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
    
    // Send the email notification
    console.log('Sending email to:', email);
    console.log('Email payload:', {
      email: email,
      firstName: firstName,
      totalEntries: totalEntries,
      referralCode: referralCode,
      referralLink
    });
    
    const emailResult = await resend.emails.send({
      from: 'School Supplies Sweepstakes <noreply@educ8r.freeparentsearch.com>',
      to: email,
      subject: 'Congratulations! You earned a Sweepstakes entry!',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
          <div style="text-align: center; margin-bottom: 20px;">
            <img src="https://educ8r.freeparentsearch.com/lovable-uploads/2b96223c-82ba-48db-9c96-5c37da48d93e.png" alt="FPS Logo" style="max-width: 180px;">
          </div>
          
          <h1 style="color: #2C3E50; text-align: center; margin-bottom: 20px;">Congratulations, ${firstName}!</h1>
          
          <div style="background-color: #f8fafc; border-radius: 8px; padding: 20px; margin-bottom: 20px; border-left: 4px solid #3b82f6;">
            <h2 style="color: #3b82f6; margin-top: 0;">You just earned an extra Sweepstakes entry!</h2>
            <p style="font-size: 16px; line-height: 1.5;">
              Great news! One of your referrals just tried Comprendi™, and you now have <strong>${totalEntries} entries</strong> in the $1,000 Classroom Sweepstakes!
            </p>
          </div>
          
          <p style="font-size: 16px; line-height: 1.5; margin-bottom: 20px;">
            Keep the momentum going! Share your referral link with more parents to increase your chances of winning:
          </p>
          
          <div style="background-color: #f0f9ff; border-radius: 8px; padding: 15px; margin-bottom: 25px; word-break: break-all; font-family: monospace; font-size: 14px;">
            ${referralLink}
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${referralLink}" style="display: inline-block; background-color: #16a34a; color: white; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: bold; font-size: 16px;">Visit Comprendi Reading</a>
          </div>
          
          <p style="font-size: 16px; line-height: 1.5;">
            Remember, each parent who activates a free trial through your link gives you another entry in the sweepstakes!
          </p>
          
          <p style="font-size: 16px; line-height: 1.5; margin-top: 30px;">
            Thank you for spreading the word about Comprendi™ and helping more students succeed!
          </p>
          
          <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e2e8f0; text-align: center; color: #64748b; font-size: 14px;">
            <p>© 2025 Free Parent Search. All rights reserved.</p>
          </div>
        </div>
      `
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
    
    return new Response(
      JSON.stringify({
        success: true,
        message: 'Referral notification email sent successfully',
        emailId: emailResult.id
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
