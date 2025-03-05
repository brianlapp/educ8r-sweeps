
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// This is a test function to simulate an Everflow webhook call
serve(async (req) => {
  console.log('==== TEST WEBHOOK FUNCTION STARTED ====');
  console.log('Request method:', req.method);
  console.log('Request URL:', req.url);
  
  // Log JWT verification status
  console.log('JWT VERIFICATION STATUS CHECK:');
  console.log('- Function config file settings: verify_jwt.enabled = false, allow_unauthenticated = true');
  console.log('- Parent config settings: functions.verify_jwt.enabled = false');
  console.log('- Request contains Authorization header:', req.headers.has('Authorization'));
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? 'https://epfzraejquaxqrfmkmyx.supabase.co';
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseKey) {
      console.error('ERROR: SUPABASE_SERVICE_ROLE_KEY is not set');
      throw new Error('Missing required environment variable: SUPABASE_SERVICE_ROLE_KEY');
    }
    
    const supabaseClient = createClient(supabaseUrl, supabaseKey);

    // First, get a valid referral code from the entries table
    const { data: entries, error: fetchError } = await supabaseClient
      .from('entries')
      .select('referral_code')
      .not('referral_code', 'is', null)
      .limit(1);

    if (fetchError || !entries?.length) {
      console.error('Error fetching referral code:', fetchError);
      throw new Error('No valid referral code found');
    }

    const referralCode = entries[0].referral_code;
    console.log('Using referral code:', referralCode);
    
    // Test both methods (GET and POST) to the everflow-webhook
    // First test with direct GET request with parameters
    const functionUrl = 'https://epfzraejquaxqrfmkmyx.supabase.co/functions/v1/everflow-webhook';
    const getUrl = `${functionUrl}?sub1=${referralCode}&tid=test-${Date.now()}`;
    
    console.log('Testing GET request to:', getUrl);
    const getResponse = await fetch(getUrl, {
      method: 'GET'
    });
    
    const getResult = await getResponse.text();
    console.log('GET test response status:', getResponse.status);
    console.log('GET test response:', getResult);
    
    // Now test with POST payload
    console.log('Testing POST request to:', functionUrl);
    const postResponse = await fetch(functionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        referral_code: referralCode,
        transaction_id: 'test-post-' + Date.now()
      })
    });
    
    const postResult = await postResponse.text();
    console.log('POST test response status:', postResponse.status);
    console.log('POST test response:', postResult);

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Test webhook executed',
        get_test: {
          status: getResponse.status,
          response: getResult
        },
        post_test: {
          status: postResponse.status,
          response: postResult
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
    console.error('Error in test webhook:', error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message,
        stack: error.stack,
        jwt_status: {
          authorization_header_present: req.headers.has('Authorization'),
          config_file_setting: 'verify_jwt.enabled = false, allow_unauthenticated = true',
          parent_config_setting: 'functions.verify_jwt.enabled = false'
        }
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
