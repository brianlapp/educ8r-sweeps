
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

// CORS headers for cross-origin requests
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS, PUT, DELETE',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, X-Requested-With',
};

serve(async (req) => {
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
    
    if (!email || !publicationId) {
      return new Response(
        JSON.stringify({ error: "Missing required parameters: email and publicationId are required" }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Encode email for URL use
    const encodedEmail = encodeURIComponent(email);
    
    // Log the API request we're making
    console.log(`Checking BeehiiV subscriber: ${email} in publication: ${publicationId}`);
    console.log(`Using API endpoint: https://api.beehiiv.com/v2/publications/${publicationId}/subscriptions?email=${encodedEmail}`);
    
    // Make request to BeehiiV API to get subscriber details
    const apiResponse = await fetch(
      `https://api.beehiiv.com/v2/publications/${publicationId}/subscriptions?email=${encodedEmail}`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${BEEHIIV_API_KEY}`,
          'Content-Type': 'application/json',
        }
      }
    );

    // Get response as text first for proper logging
    const responseText = await apiResponse.text();
    console.log(`BeehiiV API response status: ${apiResponse.status}`);
    console.log(`BeehiiV API response headers:`, JSON.stringify(Object.fromEntries([...apiResponse.headers]), null, 2));
    console.log(`BeehiiV API response body: ${responseText}`);

    // Try to parse the response
    let responseData;
    try {
      responseData = JSON.parse(responseText);
    } catch (e) {
      console.error("Failed to parse BeehiiV API response:", e);
      return new Response(
        JSON.stringify({ 
          exists: false, 
          error: "Failed to parse BeehiiV API response", 
          rawResponse: responseText 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if the subscriber exists
    if (apiResponse.ok && responseData.data && responseData.data.length > 0) {
      // Found subscriber
      return new Response(
        JSON.stringify({ 
          exists: true, 
          data: responseData.data[0],
          message: "Subscriber found in BeehiiV"
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else if (apiResponse.ok && (!responseData.data || responseData.data.length === 0)) {
      // No subscriber found
      return new Response(
        JSON.stringify({ 
          exists: false, 
          message: "No subscriber found with this email in BeehiiV"
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else {
      // API error
      return new Response(
        JSON.stringify({ 
          exists: false, 
          error: responseData.error || "Unknown API error", 
          details: responseData
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
  } catch (error) {
    console.error("Unexpected error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error", details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
