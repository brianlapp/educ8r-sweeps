
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

// Enhanced CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS, PUT, DELETE',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, X-Requested-With',
};

serve(async (req) => {
  console.log("Check BeehiiV subscriber function called with method:", req.method);
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders, status: 204 });
  }

  try {
    const BEEHIIV_API_KEY = Deno.env.get('BEEHIIV_API_KEY');
    
    if (!BEEHIIV_API_KEY) {
      console.error("Missing BEEHIIV_API_KEY environment variable");
      return new Response(
        JSON.stringify({ error: "Server configuration error: Missing BEEHIIV_API_KEY" }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request data
    const requestData = await req.json();
    const { email, publicationId } = requestData;
    
    if (!email) {
      return new Response(
        JSON.stringify({ error: "Missing required parameter: email" }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Use the publication ID from the request, with a fallback to prevent breaking changes
    const pubId = publicationId || 'pub_7588ba6b-a268-4571-9135-47a68568ee64';
    
    console.log(`Checking if subscriber ${email} exists in BeehiiV for publication ${pubId}`);

    // Call BeehiiV API to check if the subscriber exists
    const response = await fetch(
      `https://api.beehiiv.com/v2/publications/${pubId}/subscriptions?email=${encodeURIComponent(email)}`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${BEEHIIV_API_KEY}`,
          'Content-Type': 'application/json',
        }
      }
    );

    if (!response.ok) {
      console.error(`BeehiiV API error: ${response.status}`);
      const errorText = await response.text();
      return new Response(
        JSON.stringify({ 
          error: `BeehiiV API error: ${response.status}`, 
          details: errorText 
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    console.log(`BeehiiV API response for ${email}:`, JSON.stringify(data, null, 2));

    // Check if the subscriber exists
    const exists = data.data && data.data.length > 0;
    
    const result = {
      exists,
      email,
      data: exists ? data.data[0] : null
    };
    
    console.log(`Subscriber ${email} ${exists ? 'exists' : 'does not exist'} in BeehiiV`);

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error("Error checking BeehiiV subscriber:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
