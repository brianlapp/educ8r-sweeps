
import { corsHeaders } from "../_shared/cors.ts";

const BEEHIIV_API_KEY = Deno.env.get('BEEHIIV_API_KEY');
const BEEHIIV_PUBLICATION_ID = 'pub_4b47c3db-7b59-4c82-a18b-16cf10fc2d23';

export interface BeehiivSubscriberData {
  email: string;
  first_name: string;
  last_name: string;
  utm_source: string;
  utm_medium: string;
  utm_campaign: string;
  reactivate: boolean;
  send_welcome_email: boolean;
  double_opt_in: boolean;
  custom_fields: Array<{
    name: string;
    value: string;
  }>;
}

export async function subscribeToBeehiiv(subscriberData: BeehiivSubscriberData): Promise<void> {
  console.log('[BeehiiV] Sending subscription data to BeehiiV:', JSON.stringify(subscriberData));
  console.log(`[BeehiiV] Making subscription API request for user: ${subscriberData.email}`);
  
  const beehiivSubscribeStartTime = Date.now();
  
  const subscribeResponse = await fetch(`https://api.beehiiv.com/v2/publications/${BEEHIIV_PUBLICATION_ID}/subscriptions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${BEEHIIV_API_KEY}`,
    },
    body: JSON.stringify(subscriberData)
  });

  console.log(`[BeehiiV] API subscription request completed in ${Date.now() - beehiivSubscribeStartTime}ms`);
  console.log(`[BeehiiV] Subscription API status code: ${subscribeResponse.status}`);
  
  const subscribeResponseText = await subscribeResponse.text();
  console.log(`[BeehiiV] subscription response body:`, subscribeResponseText);

  if (!subscribeResponse.ok) {
    console.error('[BeehiiV] subscription ERROR:', subscribeResponseText);
    throw new Error('Failed to subscribe to newsletter');
  } else {
    try {
      const responseData = JSON.parse(subscribeResponseText);
      console.log('[BeehiiV] Parsed subscription response data:', JSON.stringify(responseData));
    } catch (parseError) {
      console.error('[BeehiiV] Could not parse subscription response as JSON:', parseError);
    }
  }
}

export async function addTagsToBeehiivSubscriber(email: string): Promise<void> {
  try {
    const getSubscriberStartTime = Date.now();
    
    const getSubscriberResponse = await fetch(
      `https://api.beehiiv.com/v2/publications/${BEEHIIV_PUBLICATION_ID}/subscriptions?email=${encodeURIComponent(email)}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${BEEHIIV_API_KEY}`,
        }
      }
    );
    
    console.log(`[BeehiiV] Get subscriber API request completed in ${Date.now() - getSubscriberStartTime}ms`);
    console.log(`[BeehiiV] Get subscriber API status code: ${getSubscriberResponse.status}`);
    
    const subscriberResponseText = await getSubscriberResponse.text();
    console.log(`[BeehiiV] get subscriber response body:`, subscriberResponseText);
    
    if (!getSubscriberResponse.ok) {
      console.error(`[BeehiiV] get subscriber ERROR:`, subscriberResponseText);
      return;
    }
    
    try {
      const subscriberData = JSON.parse(subscriberResponseText);
      console.log('[BeehiiV] Parsed subscriber data:', JSON.stringify(subscriberData));
      
      if (!subscriberData.data || subscriberData.data.length === 0) {
        console.error('[BeehiiV] No subscriber found with email:', email);
        return;
      }
      
      const subscriberId = subscriberData.data[0].id;
      console.log(`[BeehiiV] Found subscriber ID: ${subscriberId}`);
      
      console.log(`[BeehiiV] Adding tags to subscriber ID: ${subscriberId}`);
      const tagUpdateStartTime = Date.now();
      
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
      );
      
      console.log(`[BeehiiV] Tag update API request completed in ${Date.now() - tagUpdateStartTime}ms`);
      console.log(`[BeehiiV] Tag update API status code: ${updateTagsResponse.status}`);
      
      const tagsResponseText = await updateTagsResponse.text();
      console.log(`[BeehiiV] tag update response body:`, tagsResponseText);
      
      if (!updateTagsResponse.ok) {
        console.error(`[BeehiiV] tag update ERROR:`, tagsResponseText);
      } else {
        console.log('[BeehiiV] Successfully added tags to BeehiiV subscriber');
        try {
          const tagsData = JSON.parse(tagsResponseText);
          console.log('[BeehiiV] Parsed tags response data:', JSON.stringify(tagsData));
        } catch (parseError) {
          console.error('[BeehiiV] Could not parse tags response as JSON:', parseError);
        }
      }
    } catch (parseError) {
      console.error('[BeehiiV] Error parsing BeehiiV subscriber data:', parseError);
    }
  } catch (tagError) {
    console.error('[BeehiiV] Error adding tags:', tagError);
  }
}

export function createBeehiivSubscriberData(
  email: string, 
  firstName: string, 
  lastName: string, 
  referralCode: string, 
  campaignSlug: string
): BeehiivSubscriberData {
  return {
    email: email,
    first_name: firstName,
    last_name: lastName,
    utm_source: 'sweepstakes',
    utm_medium: campaignSlug || 'unknown',
    utm_campaign: 'comprendi',
    reactivate: true,
    send_welcome_email: false,  // Set to false to prevent welcome emails
    double_opt_in: false,       // Set to false to skip double opt-in
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
        value: referralCode
      },
      {
        name: 'sweepstakes_entries',
        value: '1'
      }
    ]
  };
}
