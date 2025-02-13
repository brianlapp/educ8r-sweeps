
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const BEEHIIV_API_KEY = Deno.env.get('BEEHIIV_API_KEY')
const BEEHIIV_PUBLICATION_ID = 'pub_' // TODO: Add your Beehiiv publication ID

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { firstName, lastName, email, referredBy } = await req.json()

    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Insert entry into Supabase
    const { data: entry, error: supabaseError } = await supabaseClient
      .from('entries')
      .insert({
        first_name: firstName,
        last_name: lastName,
        email: email,
        referred_by: referredBy || null
      })
      .select()
      .single()

    if (supabaseError) {
      console.error('Supabase error:', supabaseError)
      throw new Error(supabaseError.message)
    }

    // Subscribe to Beehiiv newsletter
    const beehiivResponse = await fetch('https://api.beehiiv.com/v2/subscribers', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${BEEHIIV_API_KEY}`,
      },
      body: JSON.stringify({
        email: email,
        publication_id: BEEHIIV_PUBLICATION_ID,
        reactivate_existing: false,
        send_welcome_email: true,
        utm_source: referredBy || 'website',
        custom_fields: {
          first_name: firstName,
          last_name: lastName,
          referral_code: entry.referral_code
        }
      })
    })

    if (!beehiivResponse.ok) {
      console.error('Beehiiv error:', await beehiivResponse.text())
      throw new Error('Failed to subscribe to newsletter')
    }

    // Return success response with the entry data
    return new Response(
      JSON.stringify({ 
        success: true, 
        data: entry 
      }),
      { 
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json'
        } 
      }
    )

  } catch (error) {
    console.error('Error in submit-entry function:', error)
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
