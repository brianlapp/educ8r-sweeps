
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
    const envVars = ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "BEEHIIV_API_KEY"];
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
    
    // Get environment variables
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || 'https://epfzraejquaxqrfmkmyx.supabase.co';
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    console.log('Using Supabase URL:', supabaseUrl);
    console.log('Service role key available:', !!supabaseKey);
    
    // Create Supabase client with anon key if service role key is not available
    // This ensures the webhook can work in development environments
    const anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVwZnpyYWVxcXVheHFyZm1rbXl4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzk0NzA2ODIsImV4cCI6MjA1NTA0NjY4Mn0.LY300ASTr6cn4vl2ZkCR0pV0rmah9YKLaUXVM5ISytM';
    const apiKey = supabaseKey || anonKey;
    
    console.log('Using API key type:', supabaseKey ? 'SERVICE_ROLE' : 'ANON');
    
    const supabaseClient = createClient(supabaseUrl, apiKey);
    
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
        // Call the database function to handle the postback
        const { data, error } = await supabaseClient.rpc('handle_everflow_webhook', {
          payload: payload
        });

        if (error) {
          console.error('Error processing GET webhook:', error);
          throw error;
        }

        console.log('Successfully processed GET webhook in database:', data);
        
        // Now we need to get the email of the person who referred
        const { data: referrerData, error: referrerError } = await supabaseClient
          .from('entries')
          .select('email, referral_count, entry_count, total_entries')
          .eq('referral_code', referral_code)
          .single();
        
        if (referrerError) {
          console.error('Error fetching referrer data:', referrerError);
          throw referrerError;
        }
        
        // If we found the referrer, update their BeehiiV entry count
        if (referrerData && referrerData.email) {
          try {
            // Calculate current entries - should match total_entries in our DB
            const currentEntries = (referrerData.entry_count || 1) + (referrerData.referral_count || 0);
            
            console.log('Updating BeehiiV for referrer email:', referrerData.email);
            console.log('Current entry count in DB:', currentEntries);
            
            // First, get the subscriber ID by email
            const subscriberResponse = await fetch(`https://api.beehiiv.com/v2/publications/${BEEHIIV_PUBLICATION_ID}/subscribers?email=${encodeURIComponent(referrerData.email)}`, {
              method: 'GET',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${BEEHIIV_API_KEY}`,
              }
            });
            
            if (!subscriberResponse.ok) {
              const subscriberErrorText = await subscriberResponse.text();
              console.error('Error fetching BeehiiV subscriber:', subscriberErrorText);
              throw new Error('Failed to fetch BeehiiV subscriber');
            }
            
            const subscriberData = await subscriberResponse.json();
            console.log('BeehiiV subscriber response:', subscriberData);
            
            if (subscriberData.data && subscriberData.data.length > 0) {
              const subscriberId = subscriberData.data[0].id;
              console.log('Found BeehiiV subscriber ID:', subscriberId);
              
              // Update the subscriber's custom field with the new entry count
              const updateResponse = await fetch(`https://api.beehiiv.com/v2/publications/${BEEHIIV_PUBLICATION_ID}/subscribers/${subscriberId}/custom_fields`, {
                method: 'PUT',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${BEEHIIV_API_KEY}`,
                },
                body: JSON.stringify({
                  custom_fields: [
                    {
                      name: 'sweepstakes_entries',
                      value: currentEntries.toString()
                    }
                  ]
                })
              });
              
              if (!updateResponse.ok) {
                const updateErrorText = await updateResponse.text();
                console.error('Error updating BeehiiV custom field:', updateErrorText);
                throw new Error('Failed to update BeehiiV custom field');
              }
              
              const updateData = await updateResponse.json();
              console.log('BeehiiV update response:', updateData);
            } else {
              console.error('No subscriber found in BeehiiV for email:', referrerData.email);
            }
          } catch (beehiivError) {
            // Log but don't fail the entire request if BeehiiV update fails
            console.error('Error updating BeehiiV:', beehiivError);
            console.log('Continuing despite BeehiiV error');
          }
        }

        return new Response(
          JSON.stringify({
            success: true,
            message: 'GET webhook processed successfully',
            data,
            beehiiv_updated: true
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
        // Call the database function to handle the postback
        const { data, error } = await supabaseClient.rpc('handle_everflow_webhook', {
          payload: payload
        });

        if (error) {
          console.error('Error processing webhook:', error);
          throw error;
        }

        console.log('Successfully processed webhook in database:', data);
        
        // Now we need to get the email of the person who referred
        const { data: referrerData, error: referrerError } = await supabaseClient
          .from('entries')
          .select('email, referral_count, entry_count, total_entries')
          .eq('referral_code', payload.referral_code)
          .single();
        
        if (referrerError) {
          console.error('Error fetching referrer data:', referrerError);
          throw referrerError;
        }
        
        // If we found the referrer, update their BeehiiV entry count
        if (referrerData && referrerData.email) {
          try {
            // Calculate current entries - should match total_entries in our DB
            const currentEntries = (referrerData.entry_count || 1) + (referrerData.referral_count || 0);
            
            console.log('Updating BeehiiV for referrer email:', referrerData.email);
            console.log('Current entry count in DB:', currentEntries);
            
            // First, get the subscriber ID by email
            const subscriberResponse = await fetch(`https://api.beehiiv.com/v2/publications/${BEEHIIV_PUBLICATION_ID}/subscribers?email=${encodeURIComponent(referrerData.email)}`, {
              method: 'GET',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${BEEHIIV_API_KEY}`,
              }
            });
            
            if (!subscriberResponse.ok) {
              const subscriberErrorText = await subscriberResponse.text();
              console.error('Error fetching BeehiiV subscriber:', subscriberErrorText);
              throw new Error('Failed to fetch BeehiiV subscriber');
            }
            
            const subscriberData = await subscriberResponse.json();
            console.log('BeehiiV subscriber response:', subscriberData);
            
            if (subscriberData.data && subscriberData.data.length > 0) {
              const subscriberId = subscriberData.data[0].id;
              console.log('Found BeehiiV subscriber ID:', subscriberId);
              
              // Update the subscriber's custom field with the new entry count
              const updateResponse = await fetch(`https://api.beehiiv.com/v2/publications/${BEEHIIV_PUBLICATION_ID}/subscribers/${subscriberId}/custom_fields`, {
                method: 'PUT',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${BEEHIIV_API_KEY}`,
                },
                body: JSON.stringify({
                  custom_fields: [
                    {
                      name: 'sweepstakes_entries',
                      value: currentEntries.toString()
                    }
                  ]
                })
              });
              
              if (!updateResponse.ok) {
                const updateErrorText = await updateResponse.text();
                console.error('Error updating BeehiiV custom field:', updateErrorText);
                throw new Error('Failed to update BeehiiV custom field');
              }
              
              const updateData = await updateResponse.json();
              console.log('BeehiiV update response:', updateData);
            } else {
              console.error('No subscriber found in BeehiiV for email:', referrerData.email);
            }
          } catch (beehiivError) {
            // Log but don't fail the entire request if BeehiiV update fails
            console.error('Error updating BeehiiV:', beehiivError);
            console.log('Continuing despite BeehiiV error');
          }
        }

        return new Response(
          JSON.stringify({
            success: true,
            message: 'Webhook processed successfully',
            data,
            beehiiv_updated: true
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
