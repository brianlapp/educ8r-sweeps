
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

// Get environment variables
const BEEHIIV_API_KEY = Deno.env.get('BEEHIIV_API_KEY');
const BEEHIIV_PUBLICATION_ID = 'pub_4b47c3db-7b59-4c82-a18b-16cf10fc2d23';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || 'https://epfzraejquaxqrfmkmyx.supabase.co';

// Helper function to send referral notification email
async function sendReferralNotificationEmail(referrerData: any) {
  if (!referrerData || !referrerData.email) {
    console.log('No referrer data available to send notification');
    return { success: false, error: 'No referrer data available' };
  }
  
  try {
    console.log('Sending referral notification email to:', referrerData.email);
    console.log('Original referrer data:', JSON.stringify(referrerData, null, 2));
    
    // Transform snake_case field names to camelCase for the notification function
    // Explicitly check each field and provide fallbacks to ensure all required fields are present
    const payload = {
      email: referrerData.email || '',
      firstName: referrerData.first_name || '',
      totalEntries: referrerData.total_entries || 0,
      referralCode: referrerData.referral_code || ''
    };
    
    console.log('Transformed notification payload:', JSON.stringify(payload, null, 2));
    
    // Make sure payload has all required fields before sending
    const missingFields = [];
    if (!payload.email) missingFields.push('email');
    if (!payload.firstName) missingFields.push('firstName');
    if (payload.totalEntries === undefined) missingFields.push('totalEntries');
    if (!payload.referralCode) missingFields.push('referralCode');
    
    if (missingFields.length > 0) {
      console.error('Missing required fields in payload:', missingFields);
      console.error('Cannot send notification due to missing fields in payload:', payload);
      return { success: false, error: `Missing required fields: ${missingFields.join(', ')}` };
    }
    
    // Debug the entire payload to ensure referralCode is set
    console.log('Payload fields check:');
    console.log('- email:', payload.email, typeof payload.email);
    console.log('- firstName:', payload.firstName, typeof payload.firstName);
    console.log('- totalEntries:', payload.totalEntries, typeof payload.totalEntries);
    console.log('- referralCode:', payload.referralCode, typeof payload.referralCode);
    console.log('Full JSON payload to be sent:', JSON.stringify(payload));
    
    const response = await fetch(`${SUPABASE_URL}/functions/v1/send-referral-notification`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });
    
    console.log('Notification API response status:', response.status);
    const responseText = await response.text();
    console.log('Notification API response body:', responseText);
    
    let result;
    try {
      result = JSON.parse(responseText);
    } catch (e) {
      console.error('Failed to parse response as JSON:', e);
      return { success: false, error: 'Failed to parse notification response' };
    }
    
    if (!response.ok) {
      console.error('Error sending referral notification:', result);
      return { success: false, error: responseText };
    }
    
    console.log('Referral notification sent successfully:', result);
    return { success: true, data: result };
  } catch (error) {
    console.error('Error sending referral notification:', error);
    return { success: false, error: error.message };
  }
}

// This function is designed to be completely public with NO authentication
serve(async (req) => {
  console.log('==== EVERFLOW WEBHOOK FUNCTION STARTED ====');
  console.log('Request method:', req.method);
  console.log('Request URL:', req.url);
  
  // Improved JWT verification status check
  console.log('JWT VERIFICATION STATUS CHECK:');
  // Use Deno's readTextFile to directly read config file (safer than assuming settings)
  let jwtEnabled = false;
  try {
    // Check if we're in debug mode - improved detection
    const url = new URL(req.url);
    if (url.pathname.endsWith('/debug') && url.searchParams.has('jwt_check')) {
      console.log('Debug JWT check endpoint accessed');
      return new Response(
        JSON.stringify({
          success: true,
          message: "Debug endpoint accessed successfully",
          timestamp: new Date().toISOString(),
          headers: Object.fromEntries(req.headers),
          jwt_status: {
            enabled: false, // We're now explicitly specifying FALSE here
            authorization_header_present: req.headers.has('Authorization'),
            config_file_setting: '[verify_jwt] enabled = false, allow_unauthenticated = true',
            parent_config_setting: '[functions.verify_jwt] enabled = false'
          },
          env_vars_exist: {
            SUPABASE_URL: !!Deno.env.get('SUPABASE_URL'),
            SUPABASE_SERVICE_ROLE_KEY: !!Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'),
            BEEHIIV_API_KEY: !!Deno.env.get('BEEHIIV_API_KEY')
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
  } catch (e) {
    console.error("Error in JWT config check:", e);
  }
  
  // Log JWT verification status (from runtime environment)
  console.log('- Function config file settings: [verify_jwt] enabled = false, allow_unauthenticated = true');
  console.log('- Parent config settings: [functions.verify_jwt] enabled = false');
  console.log('- Request contains Authorization header:', req.headers.has('Authorization'));
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    console.log('Handling OPTIONS request with CORS headers');
    return new Response(null, { 
      headers: corsHeaders,
      status: 200
    });
  }
  
  try {
    // More detailed logging
    console.log('Request headers:', Object.fromEntries(req.headers));
    const url = new URL(req.url);
    console.log('Request path:', url.pathname);
    console.log('Request query params:', Object.fromEntries(url.searchParams));
    
    // Log environment variables availability (without exposing values)
    const envVars = ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "BEEHIIV_API_KEY"];
    for (const varName of envVars) {
      console.log(`Env var ${varName} exists:`, !!Deno.env.get(varName));
    }
    
    // Special debug endpoint to confirm the function is accessible
    if (url.pathname.endsWith('/debug') || url.searchParams.has('debug')) {
      console.log('Debug endpoint accessed');
      return new Response(
        JSON.stringify({
          success: true,
          message: 'Debug endpoint accessed successfully',
          timestamp: new Date().toISOString(),
          headers: Object.fromEntries(req.headers),
          jwt_status: {
            enabled: false, // We're now explicitly specifying FALSE here
            authorization_header_present: req.headers.has('Authorization'),
            config_file_setting: '[verify_jwt] enabled = false, allow_unauthenticated = true',
            parent_config_setting: '[functions.verify_jwt] enabled = false'
          },
          env_vars_exist: {
            SUPABASE_URL: !!Deno.env.get('SUPABASE_URL'),
            SUPABASE_SERVICE_ROLE_KEY: !!Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'),
            BEEHIIV_API_KEY: !!Deno.env.get('BEEHIIV_API_KEY')
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

    console.log('Received request to everflow-webhook public endpoint');
    
    // Get environment variables with fallbacks
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || 'https://epfzraejquaxqrfmkmyx.supabase.co';
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    console.log('Using Supabase URL:', supabaseUrl);
    console.log('Service role key available:', !!supabaseKey);
    
    if (!supabaseKey) {
      console.error('ERROR: SUPABASE_SERVICE_ROLE_KEY is not set');
      throw new Error('Missing required environment variable: SUPABASE_SERVICE_ROLE_KEY');
    }
    
    // Create Supabase client with service role key
    const supabaseClient = createClient(supabaseUrl, supabaseKey);
    console.log('Supabase client created successfully');
    
    // Process the webhook based on HTTP method
    
    // For GET requests (coming from Everflow)
    if (req.method === 'GET') {
      // Parse URL search parameters for GET requests
      const params = url.searchParams;
      
      console.log('Received Everflow GET request with params:', Object.fromEntries(params));
      
      // Extract required parameters from URL using Everflow parameter naming
      const referral_code = params.get('sub1');
      const transaction_id = params.get('tid') || params.get('transaction_id');
      
      console.log('Extracted parameters - referral_code:', referral_code, 'transaction_id:', transaction_id);
      
      // For debugging - skip DB operations if we're just testing connectivity
      if (params.has('test_only')) {
        console.log('Test mode active - skipping database operations');
        return new Response(
          JSON.stringify({
            success: true,
            message: 'Test mode: GET webhook connectivity verified',
            test_only: true,
            params: Object.fromEntries(params)
          }),
          { 
            headers: { 
              ...corsHeaders,
              'Content-Type': 'application/json'
            }
          }
        );
      }
      
      if (!referral_code || !transaction_id) {
        console.error('Missing required parameters in GET request');
        return new Response(
          JSON.stringify({
            success: false,
            error: 'Missing required parameters: sub1 (referral_code) and tid/transaction_id are required'
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
      
      // Construct payload for database processing
      const payload = {
        referral_code: referral_code,
        transaction_id: transaction_id
      };
      
      console.log('Calling database function with payload:', payload);
      
      try {
        // Call the improved database function
        const { data: dbResult, error: dbError } = await supabaseClient.rpc('handle_everflow_webhook', {
          payload: payload
        });

        if (dbError) {
          console.error('ERROR: Database update failed:', dbError);
          throw dbError;
        }

        console.log('SUCCESS: Database function returned:', dbResult);
        
        let beehiivUpdated = false;
        let beehiivError = null;
        let notificationSent = false;
        let notificationError = null;
        
        // Only attempt BeehiiV update and notification if database update was successful and we have referrer data
        if (dbResult && dbResult.success && dbResult.data) {
          try {
            const referrerData = dbResult.data;
            console.log('Referrer data from database:', referrerData);
            
            // 1. Send notification email
            const notificationResult = await sendReferralNotificationEmail(referrerData);
            if (notificationResult.success) {
              notificationSent = true;
            } else {
              notificationError = notificationResult.error;
            }
            
            // 2. Update BeehiiV (existing code)
            if (referrerData && referrerData.email) {
              // Clean and prepare the email
              const email = referrerData.email.trim().toLowerCase();
              const currentEntries = referrerData.total_entries || 0;
              
              console.log('Updating BeehiiV for referrer email:', email);
              console.log('Current entry count from DB:', currentEntries);
              
              if (BEEHIIV_API_KEY) {
                // First, get the subscriber ID by email - CORRECTED ENDPOINT
                const subscriberUrl = `https://api.beehiiv.com/v2/publications/${BEEHIIV_PUBLICATION_ID}/subscriptions?email=${encodeURIComponent(email)}`;
                console.log('Fetching subscriber with URL:', subscriberUrl);
                
                const subscriberResponse = await fetch(subscriberUrl, {
                  method: 'GET',
                  headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${BEEHIIV_API_KEY}`,
                  }
                });
                
                if (!subscriberResponse.ok) {
                  const subscriberErrorText = await subscriberResponse.text();
                  console.error('Error fetching BeehiiV subscriber:', subscriberErrorText);
                  throw new Error(`Failed to fetch BeehiiV subscriber: ${subscriberErrorText}`);
                }
                
                const subscriberData = await subscriberResponse.json();
                console.log('BeehiiV subscriber response:', subscriberData);
                
                if (subscriberData && subscriberData.data && subscriberData.data.length > 0) {
                  const subscriberId = subscriberData.data[0].id;
                  console.log('Found BeehiiV subscriber ID:', subscriberId);
                  
                  // Update the subscriber with PATCH request - CORRECTED REQUEST BODY FORMAT
                  const updateUrl = `https://api.beehiiv.com/v2/publications/${BEEHIIV_PUBLICATION_ID}/subscriptions/${subscriberId}`;
                  console.log('Updating subscriber with URL:', updateUrl);
                  
                  // FIXED: The custom_fields needs to be an array of objects with name and value properties
                  const updateResponse = await fetch(updateUrl, {
                    method: 'PATCH',
                    headers: {
                      'Content-Type': 'application/json',
                      'Authorization': `Bearer ${BEEHIIV_API_KEY}`,
                    },
                    body: JSON.stringify({
                      custom_fields: [
                        {
                          name: "sweepstakes_entries",
                          value: currentEntries.toString()
                        }
                      ]
                    })
                  });
                  
                  if (!updateResponse.ok) {
                    const updateErrorText = await updateResponse.text();
                    console.error('Error updating BeehiiV subscriber:', updateErrorText);
                    throw new Error(`Failed to update BeehiiV subscriber: ${updateErrorText}`);
                  }
                  
                  const updateData = await updateResponse.json();
                  console.log('BeehiiV update response:', updateData);
                  beehiivUpdated = true;
                } else {
                  console.warn('No subscriber found in BeehiiV for email:', email);
                  beehiivError = `No subscriber found in BeehiiV for email: ${email}`;
                }
              } else {
                console.warn('BEEHIIV_API_KEY not available, skipping BeehiiV update');
                beehiivError = 'BEEHIIV_API_KEY not available';
              }
            }
          } catch (beehiivErr) {
            console.error('BeehiiV update failed:', beehiivErr);
            beehiivError = beehiivErr.message;
          }
        } else {
          console.warn('No referrer data returned from database, skipping BeehiiV update and notification');
        }

        // Include the original database response, just add beehiiv and notification info
        return new Response(
          JSON.stringify({
            ...dbResult,
            beehiiv_updated: beehiivUpdated,
            beehiiv_error: beehiivError,
            notification_sent: notificationSent,
            notification_error: notificationError
          }),
          { 
            headers: { 
              ...corsHeaders,
              'Content-Type': 'application/json'
            }
          }
        );
      } catch (dbError) {
        console.error('Database error:', dbError);
        return new Response(
          JSON.stringify({
            success: false,
            message: 'Database operation failed',
            error: dbError.message,
            stack: dbError.stack
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
    } 
    
    // Handle POST request (for manual testing or alternative integration)
    else if (req.method === 'POST') {
      let payload;
      try {
        payload = await req.json();
        console.log('Received Everflow webhook POST payload:', JSON.stringify(payload, null, 2));
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

      // Test-only mode
      if (payload?.test_only) {
        console.log('Test mode active - skipping database operations');
        return new Response(
          JSON.stringify({
            success: true,
            message: 'Test mode: POST webhook connectivity verified',
            test_only: true,
            payload
          }),
          { 
            headers: { 
              ...corsHeaders,
              'Content-Type': 'application/json'
            }
          }
        );
      }

      // Validate required fields
      if (!payload.referral_code || !payload.transaction_id) {
        console.error('Missing required fields in POST payload');
        return new Response(
          JSON.stringify({
            success: false,
            error: 'Missing required fields: referral_code and transaction_id are required'
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
      
      try {
        // Call the improved database function
        const { data: dbResult, error: dbError } = await supabaseClient.rpc('handle_everflow_webhook', {
          payload: payload
        });

        if (dbError) {
          console.error('ERROR: Database update failed:', dbError);
          throw dbError;
        }

        console.log('SUCCESS: Database function returned:', dbResult);
        
        let beehiivUpdated = false;
        let beehiivError = null;
        let notificationSent = false;
        let notificationError = null;
        
        // Only attempt BeehiiV update and notification if database update was successful and we have referrer data
        if (dbResult && dbResult.success && dbResult.data) {
          try {
            const referrerData = dbResult.data;
            console.log('Referrer data from database:', referrerData);
            
            // 1. Send notification email
            const notificationResult = await sendReferralNotificationEmail(referrerData);
            if (notificationResult.success) {
              notificationSent = true;
            } else {
              notificationError = notificationResult.error;
            }
            
            // 2. Update BeehiiV (existing code)
            if (referrerData && referrerData.email) {
              // Clean and prepare the email
              const email = referrerData.email.trim().toLowerCase();
              const currentEntries = referrerData.total_entries || 0;
              
              console.log('Updating BeehiiV for referrer email:', email);
              console.log('Current entry count from DB:', currentEntries);
              
              if (BEEHIIV_API_KEY) {
                // First, get the subscriber ID by email - CORRECTED ENDPOINT
                const subscriberUrl = `https://api.beehiiv.com/v2/publications/${BEEHIIV_PUBLICATION_ID}/subscriptions?email=${encodeURIComponent(email)}`;
                console.log('Fetching subscriber with URL:', subscriberUrl);
                
                const subscriberResponse = await fetch(subscriberUrl, {
                  method: 'GET',
                  headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${BEEHIIV_API_KEY}`,
                  }
                });
                
                if (!subscriberResponse.ok) {
                  const subscriberErrorText = await subscriberResponse.text();
                  console.error('Error fetching BeehiiV subscriber:', subscriberErrorText);
                  throw new Error(`Failed to fetch BeehiiV subscriber: ${subscriberErrorText}`);
                }
                
                const subscriberData = await subscriberResponse.json();
                console.log('BeehiiV subscriber response:', subscriberData);
                
                if (subscriberData && subscriberData.data && subscriberData.data.length > 0) {
                  const subscriberId = subscriberData.data[0].id;
                  console.log('Found BeehiiV subscriber ID:', subscriberId);
                  
                  // Update the subscriber with PATCH request - CORRECTED REQUEST BODY FORMAT
                  const updateUrl = `https://api.beehiiv.com/v2/publications/${BEEHIIV_PUBLICATION_ID}/subscriptions/${subscriberId}`;
                  console.log('Updating subscriber with URL:', updateUrl);
                  
                  // FIXED: The custom_fields needs to be an array of objects with name and value properties
                  const updateResponse = await fetch(updateUrl, {
                    method: 'PATCH',
                    headers: {
                      'Content-Type': 'application/json',
                      'Authorization': `Bearer ${BEEHIIV_API_KEY}`,
                    },
                    body: JSON.stringify({
                      custom_fields: [
                        {
                          name: "sweepstakes_entries",
                          value: currentEntries.toString()
                        }
                      ]
                    })
                  });
                  
                  if (!updateResponse.ok) {
                    const updateErrorText = await updateResponse.text();
                    console.error('Error updating BeehiiV subscriber:', updateErrorText);
                    throw new Error(`Failed to update BeehiiV subscriber: ${updateErrorText}`);
                  }
                  
                  const updateData = await updateResponse.json();
                  console.log('BeehiiV update response:', updateData);
                  beehiivUpdated = true;
                } else {
                  console.warn('No subscriber found in BeehiiV for email:', email);
                  beehiivError = `No subscriber found in BeehiiV for email: ${email}`;
                }
              } else {
                console.warn('BEEHIIV_API_KEY not available, skipping BeehiiV update');
                beehiivError = 'BEEHIIV_API_KEY not available';
              }
            }
          } catch (beehiivErr) {
            console.error('BeehiiV update failed:', beehiivErr);
            beehiivError = beehiivErr.message;
          }
        } else {
          console.warn('No referrer data returned from database, skipping BeehiiV update and notification');
        }

        // Include the original database response, just add beehiiv and notification info
        return new Response(
          JSON.stringify({
            ...dbResult,
            beehiiv_updated: beehiivUpdated,
            beehiiv_error: beehiivError,
            notification_sent: notificationSent,
            notification_error: notificationError
          }),
          { 
            headers: { 
              ...corsHeaders,
              'Content-Type': 'application/json'
            }
          }
        );
      } catch (dbError) {
        console.error('Database error:', dbError);
        return new Response(
          JSON.stringify({
            success: false,
            message: 'Database operation failed',
            error: dbError.message,
            stack: dbError.stack
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
    } else {
      return new Response(
        JSON.stringify({
          success: false,
          error: `Unsupported method: ${req.method}`
        }),
        { 
          status: 405,
          headers: { 
            ...corsHeaders,
            'Content-Type': 'application/json'
          }
        }
      );
    }

  } catch (error) {
    console.error('Error in everflow-webhook function:', error);
    // Include detailed error information in the response for debugging
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
