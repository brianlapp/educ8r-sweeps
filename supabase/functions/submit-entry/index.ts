
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const BEEHIIV_API_KEY = Deno.env.get('BEEHIIV_API_KEY')
const BEEHIIV_PUBLICATION_ID = 'pub_4b47c3db-7b59-4c82-a18b-16cf10fc2d23'

serve(async (req) => {
  // Record start time for performance monitoring
  const startTime = Date.now()
  console.log(`[${new Date().toISOString()}] Request started`)
  
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
    
    console.log(`Supabase client initialized in ${Date.now() - startTime}ms`)

    // First check if the email already exists
    const { data: existingEntry, error: lookupError } = await supabaseClient
      .from('entries')
      .select('referral_code, entry_count, created_at')
      .eq('email', email)
      .maybeSingle()

    if (lookupError) {
      console.error('Error checking for existing entry:', lookupError)
      throw new Error(lookupError.message)
    }

    console.log(`Database lookup completed in ${Date.now() - startTime}ms`)
    
    if (existingEntry) {
      console.log('Found existing entry with referral code:', existingEntry.referral_code)
      
      // For existing users, update BeehiiV subscription 
      try {
        // Only update subscription data - no need to trigger automation directly
        // since BeehiiV will now trigger based on "Email Submitted" event
        const subscriberData = {
          email: email,
          first_name: firstName,
          last_name: lastName,
          utm_source: 'sweepstakes',
          utm_medium: 'comprendi',
          utm_campaign: 'comprendi',
          reactivate: true,
          custom_fields: [
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
              value: existingEntry.referral_code
            },
            {
              name: 'sweepstakes_entries',
              value: '1'
            }
          ]
        }

        console.log('Updating existing user in BeehiiV with data:', subscriberData)
        
        const subscribeResponse = await fetch(`https://api.beehiiv.com/v2/publications/${BEEHIIV_PUBLICATION_ID}/subscriptions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${BEEHIIV_API_KEY}`,
          },
          body: JSON.stringify(subscriberData)
        })

        const subscribeResponseText = await subscribeResponse.text()
        console.log(`BeehiiV subscription update response (${subscribeResponse.status}):`, subscribeResponseText)

        if (!subscribeResponse.ok) {
          console.error('BeehiiV subscription update error:', subscribeResponseText)
        } else {
          console.log('Successfully updated BeehiiV subscription for existing user')
        }
      } catch (beehiivError) {
        console.error('Error processing BeehiiV actions for existing user:', beehiivError)
      }
      
      // Return existing entry with a clear message
      return new Response(
        JSON.stringify({
          success: true,
          data: existingEntry,
          isExisting: true,
          message: "You've already entered the sweepstakes. We've retrieved your referral code so you can still share it!"
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
        .maybeSingle()

      if (referrerError) {
        console.error('Error verifying referral code:', referrerError)
        console.log('Invalid referral code provided:', referredBy)
      } else if (referrerEntry) {
        console.log('Valid referral code found:', referredBy)
        validReferral = true
      } else {
        console.log('Referral code not found in database:', referredBy)
      }
    }

    console.log(`Referral verification completed at ${Date.now() - startTime}ms`)

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

    console.log(`Database insert completed at ${Date.now() - startTime}ms`)
    console.log('Successfully created entry with referral code:', entry.referral_code)

    // Create/Update BeehiiV subscription
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
      },
      {
        name: 'sweepstakes_entries',
        value: '1'
      }
    ]

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
    
    // Create/update subscriber
    const subscribeResponse = await fetch(`https://api.beehiiv.com/v2/publications/${BEEHIIV_PUBLICATION_ID}/subscriptions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${BEEHIIV_API_KEY}`,
      },
      body: JSON.stringify(subscriberData)
    })

    const subscribeResponseText = await subscribeResponse.text()
    console.log(`BeehiiV subscription response (${subscribeResponse.status}):`, subscribeResponseText)

    if (!subscribeResponse.ok) {
      console.error('BeehiiV subscription error:', subscribeResponseText)
      throw new Error('Failed to subscribe to newsletter')
    }

    // Add tags to the subscriber
    try {
      // Get subscriber ID first (needed for tag update)
      console.log(`Retrieving subscriber ID for: ${email}`)
      const getSubscriberResponse = await fetch(
        `https://api.beehiiv.com/v2/publications/${BEEHIIV_PUBLICATION_ID}/subscriptions?email=${encodeURIComponent(email)}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${BEEHIIV_API_KEY}`,
          }
        }
      )
      
      const subscriberResponseText = await getSubscriberResponse.text()
      console.log(`BeehiiV get subscriber response (${getSubscriberResponse.status}):`, subscriberResponseText)
      
      if (!getSubscriberResponse.ok) {
        console.error(`BeehiiV get subscriber error:`, subscriberResponseText)
      } else {
        try {
          const subscriberData = JSON.parse(subscriberResponseText)
          console.log('BeehiiV subscriber data:', subscriberData)
          
          if (!subscriberData.data || subscriberData.data.length === 0) {
            console.error('No subscriber found with email:', email)
          } else {
            const subscriberId = subscriberData.data[0].id
            console.log(`Found subscriber ID: ${subscriberId}`)
            
            // Now add the comprendi tag - this is critical for the automation to work
            console.log(`Adding tags to subscriber ID: ${subscriberId}`)
            const updateTagsResponse = await fetch(
              `https://api.beehiiv.com/v2/publications/${BEEHIIV_PUBLICATION_ID}/subscriptions/${subscriberId}/tags`,
              {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${BEEHIIV_API_KEY}`,
                },
                body: JSON.stringify({ 
                  tags: ['comprendi', 'sweeps']  // Explicitly setting both required tags
                })
              }
            )
            
            const tagsResponseText = await updateTagsResponse.text()
            console.log(`BeehiiV tag update response (${updateTagsResponse.status}):`, tagsResponseText)
            
            if (!updateTagsResponse.ok) {
              console.error(`BeehiiV tag update error:`, tagsResponseText)
            } else {
              console.log('Successfully added tags to BeehiiV subscriber')
            }
          }
        } catch (parseError) {
          console.error('Error parsing BeehiiV subscriber data:', parseError)
        }
      }
    } catch (tagError) {
      console.error('Error adding tags:', tagError)
    }

    // Add debug entry for referral tracking
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

    console.log(`Total processing time: ${Date.now() - startTime}ms`)

    // Return success response with the entry data
    return new Response(
      JSON.stringify({ 
        success: true, 
        data: entry,
        isExisting: false,
        message: "Your entry has been successfully submitted!"
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
