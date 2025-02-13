
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const BEEHIIV_API_KEY = Deno.env.get('BEEHIIV_API_KEY')
const BEEHIIV_PUBLICATION_ID = 'pub_4b47c3db-7b59-4c82-a18b-16cf10fc2d23'

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { firstName, lastName, email, referredBy } = await req.json()
    console.log('Received submission with referral:', { firstName, lastName, email, referredBy })

    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // First check if the email already exists
    const { data: existingEntry, error: lookupError } = await supabaseClient
      .from('entries')
      .select('referral_code')
      .eq('email', email)
      .single()

    if (lookupError && lookupError.code !== 'PGRST116') { // PGRST116 means no rows found
      console.error('Error checking for existing entry:', lookupError)
      throw new Error(lookupError.message)
    }

    if (existingEntry) {
      // If entry exists, return it with a specific flag
      return new Response(
        JSON.stringify({
          success: true,
          data: existingEntry,
          isExisting: true
        }),
        {
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json'
          }
        }
      )
    }

    // Verify the referral code exists if one was provided
    if (referredBy) {
      const { data: referrerEntry, error: referrerError } = await supabaseClient
        .from('entries')
        .select('referral_code')
        .eq('referral_code', referredBy)
        .single()

      if (referrerError) {
        console.error('Error verifying referral code:', referrerError)
        // Invalid referral code - we'll continue without it
        console.log('Invalid referral code provided:', referredBy)
      } else {
        console.log('Valid referral code found:', referredBy)
      }
    }

    // If email doesn't exist, proceed with insertion
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

    console.log('Successfully created entry:', entry)

    // Step 1: Initialize base tags array
    const tags = ['sweeps'];  // Base tag for all sweepstakes entries
    const customTag = 'comprendi';
    if (customTag) {
      tags.push(customTag);  // Add the sweepstakes-specific tag
    }

    // Step 2: Create/Update BeehiiV subscription
    const subscriberData = {
      email: email,
      first_name: firstName,
      last_name: lastName,
      utm_source: 'sweepstakes',
      utm_medium: customTag || 'organic',
      utm_campaign: customTag || undefined,
      tags: tags,
      reactivate: true,
      referral_code: entry.referral_code
    }

    console.log('Sending subscription data to BeehiiV:', subscriberData)
    
    const subscribeResponse = await fetch(`https://api.beehiiv.com/v2/publications/${BEEHIIV_PUBLICATION_ID}/subscriptions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${BEEHIIV_API_KEY}`,
      },
      body: JSON.stringify(subscriberData)
    })

    if (!subscribeResponse.ok) {
      console.error('BeehiiV subscription error:', await subscribeResponse.text())
      throw new Error('Failed to subscribe to newsletter')
    }

    const subscribeData = await subscribeResponse.json()
    console.log('BeehiiV subscription response:', subscribeData)

    // Step 3: Explicitly add tags to ensure they stick
    if (subscribeData.data?.id) {  // Notice the .data.id path
      console.log('Adding tags explicitly:', tags)
      const tagResponse = await fetch(`https://api.beehiiv.com/v2/publications/${BEEHIIV_PUBLICATION_ID}/subscriptions/${subscribeData.data.id}/tags`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${BEEHIIV_API_KEY}`,
        },
        body: JSON.stringify({ tags })
      })

      if (!tagResponse.ok) {
        console.error('BeehiiV tag error:', await tagResponse.text())
        // Don't throw here - the subscription was successful even if tag addition failed
      } else {
        console.log('Tags added successfully')
      }
    }

    // Return success response with the entry data
    return new Response(
      JSON.stringify({ 
        success: true, 
        data: entry,
        isExisting: false
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
