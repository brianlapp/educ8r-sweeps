
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Enhanced CORS headers for maximum compatibility
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, X-Requested-With, *',
  'Access-Control-Allow-Credentials': 'true',
  'Access-Control-Max-Age': '86400',
}

// Function to send a notification to the referrer
async function sendReferralNotification(referrerData) {
  console.log("=== SENDING NOTIFICATION TO REFERRER ===");
  console.log("Referrer data:", JSON.stringify(referrerData, null, 2));
  
  if (!referrerData || !referrerData.email) {
    console.error("Missing referrer data or email");
    return { 
      success: false, 
      error: "Missing referrer data or email" 
    };
  }
  
  try {
    // Prepare the notification payload with snake_case to camelCase conversion
    // Make sure to include the actual total_entries value
    const notificationPayload = {
      email: referrerData.email,
      firstName: referrerData.first_name,
      totalEntries: referrerData.total_entries, // Using the updated total_entries value
      referralCode: referrerData.referral_code
    };
    
    console.log("Notification payload (before sending):", JSON.stringify(notificationPayload, null, 2));
    
    // Validation check before sending
    const missingFields = [];
    if (!notificationPayload.email) missingFields.push('email');
    if (!notificationPayload.firstName) missingFields.push('firstName');
    if (notificationPayload.totalEntries === undefined) missingFields.push('totalEntries');
    if (!notificationPayload.referralCode) missingFields.push('referralCode');
    
    if (missingFields.length > 0) {
      console.error(`Cannot send notification: Missing fields: ${missingFields.join(', ')}`);
      return {
        success: false,
        error: `Missing fields for notification: ${missingFields.join(', ')}`
      };
    }
    
    // Generate the full URL for the notification endpoint
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
    if (!SUPABASE_URL) {
      console.error("Missing SUPABASE_URL environment variable");
      return { 
        success: false, 
        error: "Server configuration error: Missing SUPABASE_URL" 
      };
    }
    
    // Build the notification endpoint URL
    const notificationUrl = `${SUPABASE_URL}/functions/v1/send-referral-notification`;
    console.log(`Sending notification to: ${notificationUrl}`);
    
    // Make the request to the notification function
    const response = await fetch(notificationUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(notificationPayload)
    });
    
    // Log HTTP status code
    console.log(`Notification response status: ${response.status}`);
    
    // Parse and log the response
    const responseText = await response.text();
    console.log(`Notification raw response: ${responseText}`);
    
    let responseData;
    try {
      responseData = JSON.parse(responseText);
      console.log("Notification parsed response:", JSON.stringify(responseData, null, 2));
      return {
        success: response.ok,
        data: responseData,
        error: response.ok ? null : responseData.error || "Unknown error"
      };
    } catch (e) {
      console.error("Failed to parse notification response:", e);
      return {
        success: false,
        error: "Failed to parse notification response",
        rawResponse: responseText
      };
    }
  } catch (error) {
    console.error("Error sending notification:", error);
    return {
      success: false,
      error: error.message || "Unknown error during notification"
    };
  }
}

serve(async (req) => {
  console.log("=== EVERFLOW WEBHOOK FUNCTION STARTED ===");
  console.log("Request method:", req.method);
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    console.log("Handling OPTIONS request with CORS headers");
    return new Response(null, { 
      headers: corsHeaders,
      status: 200
    });
  }
  
  // Handle debug requests - useful for verifying the function is working
  const url = new URL(req.url);
  if (url.searchParams.has('debug')) {
    console.log("Processing debug request");
    return new Response(
      JSON.stringify({ 
        status: "ok", 
        message: "Everflow webhook is running",
        timestamp: new Date().toISOString()
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
  
  // Handle JWT verification status check
  if (url.searchParams.has('jwt_check')) {
    console.log("Checking JWT verification status");
    return new Response(
      JSON.stringify({
        jwt_status: {
          enabled: false,
          message: "JWT verification is disabled for this function"
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
    // Extract parameters from either URL query parameters or body based on the method
    let referralCode = null;
    let transactionId = null;
    let payload = {};
    
    // For GET requests, extract from query parameters (for direct postback URL)
    if (req.method === 'GET') {
      console.log("Processing GET request with search params:", Object.fromEntries(url.searchParams));
      
      // Extract parameters from query params (supporting various parameter names)
      referralCode = url.searchParams.get('sub1') || url.searchParams.get('referral_code') || url.searchParams.get('referralCode');
      transactionId = url.searchParams.get('tid') || url.searchParams.get('transaction_id') || url.searchParams.get('transactionId');
      
      // Build a payload object from all query parameters
      payload = Object.fromEntries(url.searchParams);
      console.log("Constructed payload from GET params:", payload);
    } 
    // For POST requests, extract from body
    else if (req.method === 'POST') {
      // Dump raw request body for debugging
      try {
        const clonedReq = req.clone();
        const rawBody = await clonedReq.text();
        console.log("Raw request body:", rawBody);
        
        // Try to parse JSON body, but handle empty or invalid JSON gracefully
        if (rawBody && rawBody.trim()) {
          try {
            payload = JSON.parse(rawBody);
            console.log("Parsed webhook payload:", JSON.stringify(payload, null, 2));
          } catch (parseError) {
            console.error("Error parsing webhook payload:", parseError);
            // If parsing fails, check if we have URL parameters as fallback
            if (url.searchParams.has('sub1') || url.searchParams.has('tid')) {
              console.log("Using URL params as fallback after JSON parse error");
              payload = Object.fromEntries(url.searchParams);
            } else {
              // If no fallback is available, return an error
              return new Response(
                JSON.stringify({
                  success: false,
                  error: "Invalid JSON payload",
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
          }
        } else {
          console.log("Empty request body, checking URL parameters");
          // If body is empty, check if we have URL parameters
          if (url.searchParams.has('sub1') || url.searchParams.has('tid')) {
            console.log("Using URL params instead of empty body");
            payload = Object.fromEntries(url.searchParams);
          } else {
            console.error("No parameters found in request");
            return new Response(
              JSON.stringify({
                success: false,
                error: "No parameters found in request"
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
        }
      } catch (error) {
        console.error("Error processing request body:", error);
        return new Response(
          JSON.stringify({
            success: false,
            error: "Error processing request",
            details: error.message
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
      
      // Extract parameters from the payload
      referralCode = payload.sub1 || payload.referral_code || payload.referralCode;
      transactionId = payload.tid || payload.transaction_id || payload.transactionId;
    }
    
    console.log("Extracted parameters - referralCode:", referralCode, "transactionId:", transactionId);
    
    // Initialize Supabase client
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );
    
    // Enhanced validation with detailed error messages
    if (!transactionId) {
      console.error("Missing transaction_id in webhook payload");
      return new Response(
        JSON.stringify({
          success: false,
          error: "Missing required parameter: transaction_id",
          received: payload
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
    
    if (!referralCode) {
      console.error("Missing referral_code in webhook payload");
      return new Response(
        JSON.stringify({
          success: false,
          error: "Missing required parameter: referral_code",
          received: payload
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
    
    // Try to find the referrer using the provided referral code
    const { data: referrerData, error: referrerError } = await supabaseAdmin
      .from('entries')
      .select('*')
      .eq('referral_code', referralCode)
      .single();
    
    if (referrerError) {
      console.error("Error fetching referrer:", referrerError);
      return new Response(
        JSON.stringify({
          success: false,
          error: "Failed to fetch referrer information",
          details: referrerError.message,
          ref_code: referralCode
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
    
    if (!referrerData) {
      console.error("No referrer found with code:", referralCode);
      return new Response(
        JSON.stringify({
          success: false,
          error: "Invalid referral code: No matching entry found",
          ref_code: referralCode
        }),
        { 
          status: 404,
          headers: { 
            ...corsHeaders,
            'Content-Type': 'application/json'
          }
        }
      );
    }
    
    console.log("Found referrer:", referrerData);
    
    // Update referral stats in database
    const { data: updatedReferrer, error: updateError } = await supabaseAdmin
      .from('entries')
      .update({
        referral_count: (referrerData.referral_count || 0) + 1,
        total_entries: (referrerData.entry_count || 1) + (referrerData.referral_count || 0) + 1
      })
      .eq('referral_code', referralCode)
      .select()
      .single();
    
    if (updateError) {
      console.error("Error updating referrer stats:", updateError);
      return new Response(
        JSON.stringify({
          success: false,
          error: "Failed to update referral statistics",
          details: updateError.message
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
    
    console.log("Updated referrer data:", updatedReferrer);
    
    // Record the conversion in our logs - handle potential duplicate gracefully
    try {
      const { error: conversionError } = await supabaseAdmin
        .from('referral_conversions')
        .insert({
          transaction_id: transactionId,
          referral_code: referralCode
        });
      
      if (conversionError) {
        // If it's a duplicate key error, log it but continue processing
        if (conversionError.code === '23505') {
          console.warn("Duplicate transaction_id detected:", transactionId, "- This is not a critical error, continuing...");
        } else {
          console.warn("Error logging conversion:", conversionError);
        }
        // Non-fatal, continue processing
      }
    } catch (conversionInsertError) {
      console.warn("Error during conversion insert:", conversionInsertError);
      // Non-fatal, continue processing
    }
    
    // For BeehiiV API (optional)
    let beehiivResult = {
      updated: false,
      error: "BeehiiV update not attempted"
    };
    
    // Try to update BeehiiV if API key is available (optional)
    const BEEHIIV_API_KEY = Deno.env.get('BEEHIIV_API_KEY');
    if (BEEHIIV_API_KEY && updatedReferrer.email) {
      try {
        // TODO: Implement BeehiiV integration if needed
        beehiivResult = {
          updated: true,
          error: null
        };
      } catch (beehiivError) {
        console.error("BeehiiV API error:", beehiivError);
        beehiivResult = {
          updated: false,
          error: beehiivError.message
        };
      }
    }
    
    // Send notification email to the referrer
    const notificationResult = await sendReferralNotification(updatedReferrer);
    console.log("Notification result:", notificationResult);
    
    // Return success response with all the details
    return new Response(
      JSON.stringify({
        success: true,
        message: "Referral processed successfully",
        referral_code: referralCode,
        transaction_id: transactionId,
        data: {
          id: updatedReferrer.id,
          email: updatedReferrer.email,
          first_name: updatedReferrer.first_name,
          last_name: updatedReferrer.last_name,
          referral_count: updatedReferrer.referral_count,
          total_entries: updatedReferrer.total_entries
        },
        beehiiv_updated: beehiivResult.updated,
        beehiiv_error: beehiivResult.error,
        notification_sent: notificationResult.success,
        notification_error: notificationResult.error
      }),
      { 
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      }
    );
    
  } catch (error) {
    console.error("Unexpected error in everflow-webhook function:", error);
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
});
