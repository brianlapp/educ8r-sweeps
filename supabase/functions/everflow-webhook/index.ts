
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// This function is designed to be completely public
serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    console.log('Received request to everflow-webhook public endpoint');
    console.log('Request URL:', req.url);
    console.log('Request method:', req.method);
    
    // Initialize Supabase client with SERVICE_ROLE_KEY to bypass RLS
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )
    
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
        )
      }
      
      // Construct payload for database processing
      const payload = {
        referral_code: referral_code,
        transaction_id: transaction_id
      };
      
      console.log('Calling database function with payload:', payload);
      
      // Call the database function to handle the postback
      const { data, error } = await supabaseClient.rpc('handle_everflow_webhook', {
        payload: payload
      })

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
      )
    } 
    
    // Handle POST request (for manual testing or alternative integration)
    else if (req.method === 'POST') {
      const payload = await req.json();
      console.log('Received Everflow webhook POST payload:', JSON.stringify(payload, null, 2));

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
        )
      }
      
      // Call the database function to handle the postback
      const { data, error } = await supabaseClient.rpc('handle_everflow_webhook', {
        payload: payload
      })

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
      )
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
      )
    }

  } catch (error) {
    console.error('Error in everflow-webhook function:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      { 
        status: 400,
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      }
    )
  }
})
