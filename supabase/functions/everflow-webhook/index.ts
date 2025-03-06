import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { initJwtBypass, getJwtVerificationState } from "../_shared/jwt-cache.ts"

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

// Function to update BeehiiV with the latest total entries
async function updateBeehiivTotalEntries(userData) {
  console.log("=== UPDATING BEEHIIV TOTAL ENTRIES ===");
  console.log("User data for BeehiiV update:", JSON.stringify(userData, null, 2));
  
  const BEEHIIV_API_KEY = Deno.env.get('BEEHIIV_API_KEY');
  if (!BEEHIIV_API_KEY) {
    console.error("Missing BEEHIIV_API_KEY environment variable");
    return {
      success: false,
      error: "Missing BeehiiV API key"
    };
  }

  try {
    const BEEHIIV_PUBLICATION_ID = 'pub_4b47c3db-7b59-4c82-a18b-16cf10fc2d23';
    
    // Step 1: First check if the subscriber exists
    console.log(`Checking if subscriber exists: ${userData.email}`);
    const getSubscriberResponse = await fetch(
      `https://api.beehiiv.com/v2/publications/${BEEHIIV_PUBLICATION_ID}/subscriptions?email=${encodeURIComponent(userData.email)}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${BEEHIIV_API_KEY}`,
        }
      }
    );
    
    // Log the complete response including headers for debugging
    console.log(`BeehiiV get subscriber status: ${getSubscriberResponse.status}`);
    console.log(`BeehiiV get subscriber headers:`, Object.fromEntries(getSubscriberResponse.headers.entries()));
    
    const subscriberResponseText = await getSubscriberResponse.text();
    console.log(`BeehiiV get subscriber raw response:`, subscriberResponseText);
    
    if (!getSubscriberResponse.ok) {
      console.error(`BeehiiV get subscriber error (${getSubscriberResponse.status}):`, subscriberResponseText);
      return {
        success: false,
        error: `Failed to check if subscriber exists: ${getSubscriberResponse.status}`,
        details: subscriberResponseText
      };
    }
    
    let subscriberId;
    try {
      const subscriberData = JSON.parse(subscriberResponseText);
      console.log('BeehiiV subscriber data:', JSON.stringify(subscriberData, null, 2));
      
      if (!subscriberData.data || subscriberData.data.length === 0) {
        console.log('No subscriber found with email:', userData.email);
        
        // Create the subscriber if they don't exist
        console.log("Creating new subscriber in BeehiiV");
        const subscriberData = {
          email: userData.email,
          first_name: userData.first_name,
          last_name: userData.last_name,
          utm_source: 'sweepstakes',
          utm_medium: 'referral', // Marking as referral
          utm_campaign: 'comprendi',
          reactivate: true,
          custom_fields: [
            {
              name: 'First Name',
              value: userData.first_name
            },
            {
              name: 'Last Name',
              value: userData.last_name
            },
            {
              name: 'referral_code',
              value: userData.referral_code
            },
            {
              name: 'sweepstakes_entries',
              value: userData.total_entries.toString() // Convert to string and use actual total entries
            }
          ]
        };
        
        console.log('Creating subscriber with data:', JSON.stringify(subscriberData, null, 2));
        
        const createSubscriberResponse = await fetch(
          `https://api.beehiiv.com/v2/publications/${BEEHIIV_PUBLICATION_ID}/subscriptions`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${BEEHIIV_API_KEY}`,
            },
            body: JSON.stringify(subscriberData)
          }
        );
        
        console.log(`BeehiiV create subscriber status: ${createSubscriberResponse.status}`);
        console.log(`BeehiiV create subscriber headers:`, Object.fromEntries(createSubscriberResponse.headers.entries()));
        
        const createResponseText = await createSubscriberResponse.text();
        console.log(`BeehiiV create subscriber raw response:`, createResponseText);
        
        if (!createSubscriberResponse.ok) {
          console.error(`BeehiiV create subscriber error (${createSubscriberResponse.status}):`, createResponseText);
          return {
            success: false,
            error: `Failed to create subscriber: ${createSubscriberResponse.status}`,
            details: createResponseText
          };
        }
        
        // Wait a moment for the creation to propagate before trying to get the ID
        // This helps prevent the 404 errors when trying to update a just-created subscriber
        console.log("Waiting 2 seconds for subscriber creation to propagate...");
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Try to get the subscriber ID again
        return await updateBeehiivTotalEntries(userData);
      }
      
      subscriberId = subscriberData.data[0].id;
      console.log(`Found subscriber ID: ${subscriberId}`);
    } catch (parseError) {
      console.error('Error parsing BeehiiV subscriber data:', parseError);
      return {
        success: false,
        error: `Failed to parse subscriber data: ${parseError.message}`
      };
    }
    
    // Step 2: Implement retry logic for updating custom fields
    const MAX_RETRIES = 3;
    let attempt = 0;
    let lastError = null;
    
    while (attempt < MAX_RETRIES) {
      attempt++;
      console.log(`Attempt ${attempt} of ${MAX_RETRIES} to update subscriber ${subscriberId} custom fields with total_entries: ${userData.total_entries}`);
      
      try {
        // CRITICAL FIX: Use the correct endpoint for updating subscribers
        // Change from .../custom_fields to the main subscriber endpoint
        const customFieldsRequestBody = {
          custom_fields: [
            {
              name: 'sweepstakes_entries',
              value: userData.total_entries.toString() // Convert to string and use actual total entries
            }
          ]
        };
        console.log(`BeehiiV custom fields update request body:`, JSON.stringify(customFieldsRequestBody, null, 2));
        
        // UPDATED ENDPOINT: Using the main subscriber endpoint instead of the /custom_fields endpoint
        const customFieldsResponse = await fetch(
          `https://api.beehiiv.com/v2/publications/${BEEHIIV_PUBLICATION_ID}/subscriptions/${subscriberId}`,
          {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${BEEHIIV_API_KEY}`,
            },
            body: JSON.stringify(customFieldsRequestBody)
          }
        );
        
        // Log complete response details
        console.log(`BeehiiV update custom fields status: ${customFieldsResponse.status}`);
        console.log(`BeehiiV update custom fields headers:`, Object.fromEntries(customFieldsResponse.headers.entries()));
        
        const customFieldsResponseText = await customFieldsResponse.text();
        console.log(`BeehiiV update custom fields raw response:`, customFieldsResponseText);
        
        if (customFieldsResponse.ok) {
          console.log(`Custom fields updated successfully on attempt ${attempt}`);
          
          let responseData;
          try {
            responseData = JSON.parse(customFieldsResponseText);
            console.log("BeehiiV custom fields update parsed response:", JSON.stringify(responseData, null, 2));
          } catch (e) {
            console.log('Could not parse BeehiiV response as JSON, but operation succeeded');
            responseData = { success: true, rawResponse: customFieldsResponseText };
          }
          
          // Step 3: Add the appropriate tags
          console.log(`Adding tags to subscriber ID: ${subscriberId}`);
          const updateTagsResponse = await fetch(
            `https://api.beehiiv.com/v2/publications/${BEEHIIV_PUBLICATION_ID}/subscriptions/${subscriberId}/tags`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${BEEHIIV_API_KEY}`,
              },
              body: JSON.stringify({ 
                tags: ['comprendi', 'sweeps', 'referral'] // Added referral tag for tracking
              })
            }
          );
          
          console.log(`BeehiiV tag update status: ${updateTagsResponse.status}`);
          const tagsResponseText = await updateTagsResponse.text();
          console.log(`BeehiiV tag update raw response:`, tagsResponseText);
          
          if (!updateTagsResponse.ok) {
            console.error(`BeehiiV tag update error (${updateTagsResponse.status}):`, tagsResponseText);
            return {
              success: true, // Still consider it a success since the custom fields were updated
              subscriberId: subscriberId,
              entriesUpdated: userData.total_entries,
              tagUpdateError: `Failed to update tags: ${updateTagsResponse.status}`
            };
          }
          
          return {
            success: true,
            subscriberId: subscriberId,
            entriesUpdated: userData.total_entries
          };
        } else {
          lastError = `HTTP ${customFieldsResponse.status}: ${customFieldsResponseText}`;
          console.error(`BeehiiV update custom fields error on attempt ${attempt}:`, lastError);
          
          // If we get a 404, try getting the subscriber ID again, as it might have changed
          if (customFieldsResponse.status === 404 && attempt < MAX_RETRIES) {
            console.log("Got 404 error. Refreshing subscriber ID and trying again...");
            
            // Get subscriber ID again
            const refreshSubscriberResponse = await fetch(
              `https://api.beehiiv.com/v2/publications/${BEEHIIV_PUBLICATION_ID}/subscriptions?email=${encodeURIComponent(userData.email)}`,
              {
                method: 'GET',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${BEEHIIV_API_KEY}`,
                }
              }
            );
            
            if (refreshSubscriberResponse.ok) {
              const refreshData = await refreshSubscriberResponse.json();
              if (refreshData.data && refreshData.data.length > 0) {
                subscriberId = refreshData.data[0].id;
                console.log(`Refreshed subscriber ID: ${subscriberId}`);
              } else {
                console.log("No subscriber found during refresh attempt");
              }
            }
          }
          
          // Simple exponential backoff
          if (attempt < MAX_RETRIES) {
            const backoffTime = Math.pow(2, attempt) * 500; // 1s, 2s, 4s
            console.log(`Retrying after ${backoffTime}ms...`);
            await new Promise(resolve => setTimeout(resolve, backoffTime));
          }
        }
      } catch (error) {
        lastError = error.message || "Unknown error";
        console.error(`Exception during custom fields update attempt ${attempt}:`, error);
        
        if (attempt < MAX_RETRIES) {
          const backoffTime = Math.pow(2, attempt) * 500;
          console.log(`Retrying after error in ${backoffTime}ms...`);
          await new Promise(resolve => setTimeout(resolve, backoffTime));
        }
      }
    }
    
    // If we've exhausted all retries
    return {
      success: false,
      error: `Failed to update custom fields after ${MAX_RETRIES} attempts`,
      lastError: lastError
    };
    
  } catch (error) {
    console.error("Error updating BeehiiV:", error);
    return {
      success: false,
      error: error.message || "Unknown error during BeehiiV update",
      stack: error.stack
    };
  }
}

serve(async (req) => {
  console.log("=== EVERFLOW WEBHOOK FUNCTION STARTED ===");
  console.log("Request method:", req.method);
  
  // Initialize JWT bypass at the start of the function
  const jwtBypassResult = initJwtBypass();
  console.log("JWT bypass result:", JSON.stringify(jwtBypassResult));
  
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
  
  // Handle JWT verification status check with enhanced details
  if (url.searchParams.has('jwt_check')) {
    console.log("Checking JWT verification status");
    const jwtState = getJwtVerificationState();
    
    return new Response(
      JSON.stringify({
        jwt_status: {
          enabled: jwtState.jwtVerificationEnabled,
          source: jwtState.jwtConfigSource,
          bypass_active: !jwtState.jwtVerificationEnabled,
          message: jwtState.jwtVerificationEnabled ? 
            "WARNING: JWT verification is ENABLED - webhook may not work" : 
            "JWT verification is DISABLED - webhook should work correctly",
          bypass_result: jwtBypassResult
        },
        function_health: "ok",
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
  
  // The rest of the function remains unchanged
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
    
    console.log("Found referrer:", JSON.stringify(referrerData, null, 2));
    
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
    
    console.log("Updated referrer data:", JSON.stringify(updatedReferrer, null, 2));
    
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
    
    // For BeehiiV API integration
    let beehiivResult = {
      success: false,
      error: "BeehiiV update not attempted"
    };
    
    // Try to update BeehiiV with improved error handling and retry logic
    const BEEHIIV_API_KEY = Deno.env.get('BEEHIIV_API_KEY');
    if (BEEHIIV_API_KEY && updatedReferrer.email) {
      try {
        console.log("Updating BeehiiV with new total_entries:", updatedReferrer.total_entries);
        beehiivResult = await updateBeehiivTotalEntries(updatedReferrer);
        console.log("BeehiiV update result:", JSON.stringify(beehiivResult, null, 2));
      } catch (beehiivError) {
        console.error("BeehiiV API error:", beehiivError);
        beehiivResult = {
          success: false,
          error: beehiivError.message || "Unknown BeehiiV error",
          stack: beehiivError.stack
        };
      }
    }
    
    // Send notification email to the referrer
    const notificationResult = await sendReferralNotification(updatedReferrer);
    console.log("Notification result:", JSON.stringify(notificationResult, null, 2));
    
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
        beehiiv_updated: beehiivResult.success,
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
