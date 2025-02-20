
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
      .select('referral_code, entry_count')
      .eq('email', email)
      .single()

    if (lookupError && lookupError.code !== 'PGRST116') { // PGRST116 means no rows found
      console.error('Error checking for existing entry:', lookupError)
      throw new Error(lookupError.message)
    }

    if (existingEntry) {
      // Update entry count for existing entry
      const { error: updateError } = await supabaseClient
        .from('entries')
        .update({ entry_count: (existingEntry.entry_count || 1) + 1 })
        .eq('email', email)

      if (updateError) {
        console.error('Error updating entry count:', updateError)
        throw new Error(updateError.message)
      }

      // Return existing entry
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
    let validReferral = false
    if (referredBy) {
      const { data: referrerEntry, error: referrerError } = await supabaseClient
        .from('entries')
        .select('referral_code')
        .eq('referral_code', referredBy)
        .single()

      if (referrerError) {
        console.error('Error verifying referral code:', referrerError)
        console.log('Invalid referral code provided:', referredBy)
      } else {
        console.log('Valid referral code found:', referredBy)
        validReferral = true
      }
    }

    // If email doesn't exist, proceed with insertion
    const { data: entry, error: supabaseError } = await supabaseClient
      .from('entries')
      .insert({
        first_name: firstName,
        last_name: lastName,
        email: email,
        referred_by: validReferral ? referredBy : null,
        entry_count: 1
      })
      .select()
      .single()

    if (supabaseError) {
      console.error('Supabase error:', supabaseError)
      throw new Error(supabaseError.message)
    }

    console.log('Successfully created entry:', entry)

    // Step 1: Initialize base tags array and custom fields with exact BeehiiV field names
    const tags = ['sweeps', 'comprendi']
    const customFields = [
      {
        name: 'First Name',
        value: firstName
      },
      {
        name: 'Last Name',
        value: lastName
      },
      {
        name: 'referral_code',
        value: entry.referral_code
      }
    ]

    // Step 2: Create/Update BeehiiV subscription with custom fields
    const subscriberData = {
      email: email,
      first_name: firstName,
      last_name: lastName,
      utm_source: 'sweepstakes',
      utm_medium: 'comprendi',
      utm_campaign: 'comprendi',
      reactivate: true,
      custom_fields: customFields
    }

    console.log('Sending subscription data to BeehiiV:', subscriberData)
    
    // Create/update subscriber first
    const subscribeResponse = await fetch(`https://api.beehiiv.com/v2/publications/${BEEHIIV_PUBLICATION_ID}/subscriptions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${BEEHIIV_API_KEY}`,
      },
      body: JSON.stringify(subscriberData)
    })

    if (!subscribeResponse.ok) {
      const errorText = await subscribeResponse.text()
      console.error('BeehiiV subscription error:', errorText)
      throw new Error('Failed to subscribe to newsletter')
    }

    const subscribeData = await subscribeResponse.json()
    console.log('BeehiiV subscription response:', subscribeData)

    // Step 3: Add tags in a separate request
    if (subscribeData.data?.id) {
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
        const tagErrorText = await tagResponse.text()
        console.error('BeehiiV tag error:', tagErrorText)
        // Log error but don't throw - subscription was successful
        console.log('Tag addition failed but subscription successful')
      } else {
        const tagData = await tagResponse.json()
        console.log('Tags added successfully:', tagData)
      }
    }

    // Step 4: Add debug entry for referral tracking
    if (validReferral) {
      const { error: debugError } = await supabaseClient
        .from('referral_debug')
        .insert({
          email: email,
          referrer_email: null, // We don't store referrer email
          referred_by: referredBy,
          referral_code: entry.referral_code
        })

      if (debugError) {
        console.error('Error creating debug entry:', debugError)
        // Don't throw, this is just for debugging
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
