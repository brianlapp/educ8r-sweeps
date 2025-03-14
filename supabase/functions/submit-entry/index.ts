
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders, handleCorsPreflightRequest } from "../_shared/cors.ts";
import { 
  initializeSupabaseClient, 
  getDefaultCampaign, 
  getCampaignByID,
  getExistingEntry, 
  verifyReferralCode, 
  createEntry,
  logReferral
} from "./database.ts";
import { 
  createBeehiivSubscriberData, 
  subscribeToBeehiiv, 
  addTagsToBeehiivSubscriber
} from "./beehiiv.ts";

serve(async (req) => {
  const startTime = Date.now();
  console.log(`[${new Date().toISOString()}] Request started`);
  
  // Handle CORS preflight requests
  const corsResponse = handleCorsPreflightRequest(req);
  if (corsResponse) {
    return corsResponse;
  }

  try {
    const { firstName, lastName, email, referredBy, campaignId } = await req.json();
    console.log('Received submission with referral:', { firstName, lastName, email, referredBy, campaignId });

    // Initialize Supabase client
    const supabaseClient = await initializeSupabaseClient();
    console.log(`Supabase client initialized in ${Date.now() - startTime}ms`);

    // Get campaign information
    let campaign_id = campaignId;
    let campaign_slug = '';
    
    if (!campaign_id) {
      const defaultCampaign = await getDefaultCampaign(supabaseClient);
      if (defaultCampaign) {
        campaign_id = defaultCampaign.id;
        campaign_slug = defaultCampaign.slug;
      }
    } else {
      const campaign = await getCampaignByID(supabaseClient, campaign_id);
      if (campaign) {
        campaign_slug = campaign.slug;
      }
    }

    // Check for existing entry
    const existingEntry = await getExistingEntry(supabaseClient, email);
    console.log(`Database lookup completed in ${Date.now() - startTime}ms`);
    
    if (existingEntry) {
      console.log('Found existing entry with referral code:', existingEntry.referral_code);
      
      // Use Edge Runtime's waitUntil for background tasks that shouldn't block response
      if (typeof EdgeRuntime !== 'undefined' && 'waitUntil' in EdgeRuntime) {
        // @ts-ignore: EdgeRuntime might not be typed
        EdgeRuntime.waitUntil((async () => {
          try {
            // Create BeehiiV subscriber data for existing user
            const subscriberData = createBeehiivSubscriberData(
              email, 
              firstName, 
              lastName, 
              existingEntry.referral_code,
              campaign_slug
            );
            
            // Update subscription for existing user
            await subscribeToBeehiiv(subscriberData);
          } catch (beehiivError) {
            console.error('[BeehiiV] Error processing BeehiiV actions for existing user:', beehiivError);
          }
        })());
      } else {
        // If no background task support, do it synchronously
        try {
          // Create BeehiiV subscriber data for existing user
          const subscriberData = createBeehiivSubscriberData(
            email, 
            firstName, 
            lastName, 
            existingEntry.referral_code,
            campaign_slug
          );
          
          // Update subscription for existing user
          await subscribeToBeehiiv(subscriberData);
        } catch (beehiivError) {
          console.error('[BeehiiV] Error processing BeehiiV actions for existing user:', beehiivError);
        }
      }
      
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
            'Content-Type': 'application/json',
            'Cache-Control': 'private, no-cache'
          }
        }
      );
    }

    // Verify referral code
    const validReferral = await verifyReferralCode(supabaseClient, referredBy);
    console.log(`Referral verification completed at ${Date.now() - startTime}ms`);

    // Create new entry
    const entry = await createEntry(supabaseClient, {
      first_name: firstName,
      last_name: lastName,
      email: email,
      referred_by: validReferral ? referredBy : null,
      entry_count: 1,
      campaign_id: campaign_id
    });
    console.log(`Database insert completed at ${Date.now() - startTime}ms`);

    // Background processing for non-critical tasks
    if (typeof EdgeRuntime !== 'undefined' && 'waitUntil' in EdgeRuntime) {
      // @ts-ignore: EdgeRuntime might not be typed
      EdgeRuntime.waitUntil((async () => {
        try {
          // Create BeehiiV subscriber data for new user
          const subscriberData = createBeehiivSubscriberData(
            email, 
            firstName, 
            lastName, 
            entry.referral_code,
            campaign_slug
          );
          
          // Subscribe new user to BeehiiV
          await subscribeToBeehiiv(subscriberData);
          
          // Add tags to BeehiiV subscriber
          await addTagsToBeehiivSubscriber(email);

          // Log referral if valid
          if (validReferral) {
            await logReferral(supabaseClient, email, referredBy, entry.referral_code);
          }
        } catch (error) {
          console.error('Error in background processing:', error);
        }
      })());
    } else {
      // If no background task support, do it synchronously
      try {
        // Create BeehiiV subscriber data for new user
        const subscriberData = createBeehiivSubscriberData(
          email, 
          firstName, 
          lastName, 
          entry.referral_code,
          campaign_slug
        );
        
        // Subscribe new user to BeehiiV
        await subscribeToBeehiiv(subscriberData);
        
        // Add tags to BeehiiV subscriber
        await addTagsToBeehiivSubscriber(email);

        // Log referral if valid
        if (validReferral) {
          await logReferral(supabaseClient, email, referredBy, entry.referral_code);
        }
      } catch (error) {
        console.error('Error in synchronous processing:', error);
      }
    }

    console.log(`Total processing time: ${Date.now() - startTime}ms`);

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
          'Content-Type': 'application/json',
          'Cache-Control': 'private, no-cache'
        } 
      }
    );

  } catch (error) {
    console.error('Error in submit-entry function:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      { 
        status: 400,
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store'
        }
      }
    );
  }
});
