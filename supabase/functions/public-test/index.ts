
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, X-Requested-With, *',
  'Access-Control-Max-Age': '86400',
}

serve(async (req) => {
  console.log('==== PUBLIC TEST FUNCTION CALLED ====');
  console.log('Request method:', req.method);
  console.log('Request URL:', req.url);
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { 
      headers: corsHeaders,
      status: 200
    });
  }

  // Return success for any request with detailed info
  return new Response(
    JSON.stringify({
      success: true,
      message: 'Public test function accessed successfully',
      timestamp: new Date().toISOString(),
      method: req.method,
      url: req.url,
      headers: Object.fromEntries(req.headers)
    }),
    { 
      status: 200,
      headers: { 
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    }
  );
})
