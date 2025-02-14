
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Parse the webhook payload
    const payload = await req.json()
    console.log('Received Everflow webhook payload:', JSON.stringify(payload, null, 2))

    // Log headers for debugging
    console.log('Request headers:', Object.fromEntries(req.headers.entries()))

    // Validate required fields
    if (!payload.referral_code || !payload.transaction_id) {
      console.error('Missing required fields in payload:', JSON.stringify(payload, null, 2))
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
      payload: {
        referral_code: payload.referral_code,
        transaction_id: payload.transaction_id
      }
    })

    if (error) {
      console.error('Error processing webhook:', error)
      throw error
    }

    console.log('Successfully processed webhook:', data)

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

  } catch (error) {
    console.error('Error in everflow-webhook function:', error)
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
