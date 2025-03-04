
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

// This function is designed to be completely public with NO authentication
serve(async (req) => {
  console.log('==== EVERFLOW WEBHOOK FUNCTION STARTED ====');
  console.log('Request method:', req.method);
  console.log('Request URL:', req.url);
  
  try {
    // More detailed logging
    console.log('Request headers:', Object.fromEntries(req.headers));
    const url = new URL(req.url);
    console.log('Request path:', url.pathname);
    console.log('Request query params:', Object.fromEntries(url.searchParams));
    
    // Log environment variables availability (without exposing values)
    const envVars = ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"];
    for (const varName of envVars) {
      console.log(`Env var ${varName} exists:`, !!Deno.env.get(varName));
    }
  } catch (error) {
    console.log('Error logging request details:', error.message);
  }
  
  // Special debug endpoint to confirm the function is accessible
  const url = new URL(req.url);
  if (url.pathname.endsWith('/debug') || url.searchParams.has('debug')) {
    console.log('Debug endpoint accessed');
    return new Response(
      JSON.stringify({
        success: true,
        message: 'Debug endpoint accessed successfully',
        timestamp: new Date().toISOString(),
        headers: Object.fromEntries(req.headers),
        env_vars_exist: {
          SUPABASE_URL: !!Deno.env.get('SUPABASE_URL'),
          SUPABASE_SERVICE_ROLE_KEY: !!Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
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
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    console.log('Handling OPTIONS request with CORS headers');
    return new Response(null, { 
      headers: corsHeaders,
      status: 200
    });
  }

  try {
    console.log('Received request to everflow-webhook public endpoint');
    
    // Initialize Supabase client with hardcoded values for testing
    // IMPORTANT: This is for debugging only and should be replaced with env vars in production
    const supabaseUrl = 'https://epfzraejquaxqrfmkmyx.supabase.co';
    // We'll still try env vars first, then fall back to a placeholder for debugging
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || 'SERVICE_ROLE_KEY_NOT_AVAILABLE';
    
    console.log('Using Supabase URL:', supabaseUrl);
    console.log('Service role key available:', !!supabaseKey);
    
    // We'll create the client but won't make any database calls if we don't have a valid key
    // This allows testing the endpoint connectivity without DB operations
    const supabaseClient = createClient(supabaseUrl, supabaseKey);
    
    // For GET requests (coming from Everflow)
    if (req.method === 'GET') {
      // Parse URL search parameters for GET requests
      const url = new URL(req.url);
      const params = url.searchParams;
      
      console.log('Received Everflow GET request with params:', Object.fromEntries(params));
      
      // Extract required parameters from URL using Everflow parameter naming
      const referral_code = params.get('sub1');
      const transaction_id = params.get('tid') || params.get('transaction_id');
      
      console.log('Extracted parameters - referral_code:', referral_code, 'transaction_id:', transaction_id);
      
      // For debugging - skip DB operations if we're just testing connectivity
      if (params.has('test_only') || !supabaseKey || supabaseKey === 'SERVICE_ROLE_KEY_NOT_AVAILABLE') {
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
        // Call the database function to handle the postback
        const { data, error } = await supabaseClient.rpc('handle_everflow_webhook', {
          payload: payload
        });

        if (error) {
          console.error('Error processing GET webhook:', error);
          throw error;
        }

        console.log('Successfully processed GET webhook:', data);

        return new Response(
          JSON.stringify({
            success: true,
            message: 'GET webhook processed successfully',
            data
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
      if (payload?.test_only || !supabaseKey || supabaseKey === 'SERVICE_ROLE_KEY_NOT_AVAILABLE') {
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
        // Call the database function to handle the postback
        const { data, error } = await supabaseClient.rpc('handle_everflow_webhook', {
          payload: payload
        });

        if (error) {
          console.error('Error processing webhook:', error);
          throw error;
        }

        console.log('Successfully processed webhook:', data);

        return new Response(
          JSON.stringify({
            success: true,
            message: 'Webhook processed successfully',
            data
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
        status: 400,
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      }
    );
  }
})
