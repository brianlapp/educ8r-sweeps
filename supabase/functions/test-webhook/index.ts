
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// This is a test function to simulate an Everflow webhook call
serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

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

    // Now simulate a webhook call to our everflow-webhook endpoint
    const response = await fetch(
      'https://epfzraejquaxqrfmkmyx.supabase.co/functions/v1/everflow-webhook',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`
        },
        body: JSON.stringify({
          referral_code: referralCode,
          transaction_id: 'test-' + Date.now()
        })
      }
    );

    const result = await response.json();
    console.log('Test webhook response:', result);

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Test webhook executed',
        result 
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
        error: error.message 
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
