
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const BEEHIIV_API_KEY = Deno.env.get('BEEHIIV_API_KEY')
const BEEHIIV_PUBLICATION_ID = 'pub_4b47c3db-7b59-4c82-a18b-16cf10fc2d23'
// Define the automation ID from the URL you provided
const BEEHIIV_AUTOMATION_ID = 'a1eb15e2-5d7c-4d3e-867f-d8a3c8c06642'

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
      .select('referral_code, entry_count, created_at')
      .eq('email', email)
      .maybeSingle()

    if (lookupError) {
      console.error('Error checking for existing entry:', lookupError)
      throw new Error(lookupError.message)
    }

    if (existingEntry) {
      console.log('Found existing entry with referral code:', existingEntry.referral_code)
      
      // Add to BeehiiV automation (even for existing users)
      try {
        await addToBeehiivAutomation(email)
        await updateBeehiivTags(email) // Add the comprendi tag
      } catch (automationError) {
        // Log the error but don't throw - we still want to continue with the response
        console.error('Error adding existing user to BeehiiV automation:', automationError)
      }
      
      // Return existing entry with a clear message about already being entered
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

    console.log('Successfully created entry with referral code:', entry.referral_code)

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
      },
      {
        name: 'sweepstakes_entries',
        value: '1'
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

    // Add to BeehiiV automation for new subscribers too
    try {
      await addToBeehiivAutomation(email)
      await updateBeehiivTags(email) // Add the comprendi tag explicitly
    } catch (automationError) {
      // Log the error but don't throw - we still want to continue with the response
      console.error('Error adding new user to BeehiiV automation:', automationError)
    }

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

/**
 * Helper function to add a subscriber to a BeehiiV automation flow
 * This function handles the API call and provides detailed logging
 */
async function addToBeehiivAutomation(email: string) {
  console.log(`Adding email ${email} to BeehiiV automation: ${BEEHIIV_AUTOMATION_ID}`)
  
  try {
    const response = await fetch(
      `https://api.beehiiv.com/v2/publications/${BEEHIIV_PUBLICATION_ID}/automations/${BEEHIIV_AUTOMATION_ID}/journeys`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${BEEHIIV_API_KEY}`,
        },
        body: JSON.stringify({
          email: email,
          double_opt_override: "on"
        })
      }
    )

    const responseText = await response.text()
    
    if (!response.ok) {
      console.error(`BeehiiV automation error (${response.status}):`, responseText)
      throw new Error(`Failed to add to automation: ${response.status} - ${responseText}`)
    }

    try {
      const data = JSON.parse(responseText)
      console.log('Successfully added to automation:', data)
      return data
    } catch (parseError) {
      console.log('Successfully added to automation but response is not JSON:', responseText)
      return { success: true, responseText }
    }
  } catch (error) {
    console.error('Error in addToBeehiivAutomation:', error)
    throw error
  }
}

/**
 * Helper function to explicitly update BeehiiV tags for a subscriber
 * This ensures the 'comprendi' tag is added to match automation trigger
 */
async function updateBeehiivTags(email: string) {
  console.log(`Adding 'comprendi' tag to BeehiiV subscriber: ${email}`)
  
  try {
    // First get the subscriber ID
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
    
    if (!getSubscriberResponse.ok) {
      const errorText = await getSubscriberResponse.text()
      console.error(`BeehiiV get subscriber error:`, errorText)
      throw new Error(`Failed to get subscriber ID: ${errorText}`)
    }
    
    const subscriberData = await getSubscriberResponse.json()
    console.log('BeehiiV subscriber data:', subscriberData)
    
    if (!subscriberData.data || subscriberData.data.length === 0) {
      console.error('No subscriber found with email:', email)
      throw new Error('Subscriber not found')
    }
    
    const subscriberId = subscriberData.data[0].id
    console.log(`Found subscriber ID: ${subscriberId}`)
    
    // Now add the comprendi tag
    const updateTagsResponse = await fetch(
      `https://api.beehiiv.com/v2/publications/${BEEHIIV_PUBLICATION_ID}/subscriptions/${subscriberId}/tags`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${BEEHIIV_API_KEY}`,
        },
        body: JSON.stringify({ 
          tags: ['comprendi']  // Explicitly setting the comprendi tag
        })
      }
    )
    
    if (!updateTagsResponse.ok) {
      const errorText = await updateTagsResponse.text()
      console.error(`BeehiiV tag update error:`, errorText)
      throw new Error(`Failed to update tags: ${errorText}`)
    }
    
    const updateTagsData = await updateTagsResponse.json()
    console.log('Successfully updated BeehiiV tags:', updateTagsData)
    return updateTagsData
  } catch (error) {
    console.error('Error in updateBeehiivTags:', error)
    throw error
  }
}
