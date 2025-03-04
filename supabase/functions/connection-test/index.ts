
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, X-Requested-With, *',
  'Access-Control-Max-Age': '86400',
}

serve(async (req) => {
  console.log('==== CONNECTION TEST FUNCTION CALLED ====');
  console.log('Request method:', req.method);
  console.log('Request URL:', req.url);
  
  try {
    console.log('Request headers:', Object.fromEntries(req.headers));
    const url = new URL(req.url);
    console.log('Path:', url.pathname);
    console.log('Search params:', Object.fromEntries(url.searchParams));
  } catch (error) {
    console.log('Error logging request details:', error.message);
  }
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { 
      headers: corsHeaders,
      status: 200
    });
  }

  // Return success with extremely detailed information
  return new Response(
    JSON.stringify({
      success: true,
      message: 'Connection test function accessed successfully',
      timestamp: new Date().toISOString(),
      method: req.method,
      url: req.url,
      headers: Object.fromEntries(req.headers),
      environment: {
        runtime: Deno.version,
        envVarsAvailable: {
          SUPABASE_URL: !!Deno.env.get('SUPABASE_URL'),
          SUPABASE_SERVICE_ROLE_KEY: !!Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
        }
      }
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
