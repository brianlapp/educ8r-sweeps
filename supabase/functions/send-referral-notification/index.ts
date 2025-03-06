
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { Resend } from "npm:resend@2.0.0"

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
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    console.log('Handling OPTIONS request with CORS headers');
    return new Response(null, { 
      headers: corsHeaders,
      status: 200
    });
  }
  
  try {
    // Parse the request body
    let payload: ReferralNotificationRequest;
    try {
      payload = await req.json();
      console.log('Received referral notification request:', payload);
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
    
    // Validate the payload
    if (!payload.email || !payload.firstName || payload.totalEntries === undefined || !payload.referralCode) {
      console.error('Missing required fields in payload:', payload);
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Missing required fields',
          details: 'email, firstName, totalEntries, and referralCode are required'
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
    const referralLink = `https://dmlearninglab.com/homesc/?utm_source=sweeps&oid=1987&sub1=${payload.referralCode}`;
    
    // Send the email notification
    console.log('Sending email to:', payload.email);
    const emailResult = await resend.emails.send({
      from: 'Educ8r Sweepstakes <noreply@educ8r.freeparentsearch.com>',
      to: payload.email,
      subject: 'Congratulations! You earned a Sweepstakes entry!',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
          <div style="text-align: center; margin-bottom: 20px;">
            <img src="https://educ8r.freeparentsearch.com/lovable-uploads/2b96223c-82ba-48db-9c96-5c37da48d93e.png" alt="FPS Logo" style="max-width: 180px;">
          </div>
          
          <h1 style="color: #2C3E50; text-align: center; margin-bottom: 20px;">Congratulations, ${payload.firstName}!</h1>
          
          <div style="background-color: #f8fafc; border-radius: 8px; padding: 20px; margin-bottom: 20px; border-left: 4px solid #3b82f6;">
            <h2 style="color: #3b82f6; margin-top: 0;">You just earned an extra Sweepstakes entry!</h2>
            <p style="font-size: 16px; line-height: 1.5;">
              Great news! One of your referrals just tried Comprendi™, and you now have <strong>${payload.totalEntries} entries</strong> in the $1,000 Classroom Sweepstakes!
            </p>
          </div>
          
          <p style="font-size: 16px; line-height: 1.5; margin-bottom: 20px;">
            Keep the momentum going! Share your referral link with more parents to increase your chances of winning:
          </p>
          
          <div style="background-color: #f0f9ff; border-radius: 8px; padding: 15px; margin-bottom: 25px; word-break: break-all; font-family: monospace; font-size: 14px;">
            ${referralLink}
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${referralLink}" style="display: inline-block; background-color: #16a34a; color: white; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: bold; font-size: 16px;">Share Your Link</a>
          </div>
          
          <p style="font-size: 16px; line-height: 1.5;">
            Remember, each parent who activates a free trial through your link gives you another entry in the sweepstakes!
          </p>
          
          <p style="font-size: 16px; line-height: 1.5; margin-top: 30px;">
            Thank you for spreading the word about Comprendi™ and helping more students succeed!
          </p>
          
          <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e2e8f0; text-align: center; color: #64748b; font-size: 14px;">
            <p>© 2024 Free Parent Search. All rights reserved.</p>
          </div>
        </div>
      `
    });
    
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
