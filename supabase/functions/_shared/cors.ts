
// Shared CORS headers to be used across all functions
export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, X-Requested-With, *',
  'Access-Control-Max-Age': '86400',
};

// Helper function to handle CORS preflight requests
export function handleCorsPreflightRequest(request: Request) {
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      headers: corsHeaders,
      status: 200
    });
  }
  return null;
}
