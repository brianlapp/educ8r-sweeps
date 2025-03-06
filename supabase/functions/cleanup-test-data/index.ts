
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

export const handler = async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Create a Supabase client with the service role key (to bypass RLS)
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    const supabase = createClient(supabaseUrl, supabaseKey)

    console.log('Starting test data cleanup')

    // Delete all entries with first_name='brian', except for brian@freebies.com
    const { data, error } = await supabase
      .from('entries')
      .delete()
      .match({ first_name: 'brian' })
      .neq('email', 'brian@freebies.com')

    if (error) {
      console.error('Error during cleanup:', error)
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: error.message 
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400
        }
      )
    }

    console.log(`Successfully removed test data. Affected rows: ${data?.length || 'unknown'}`)

    return new Response(
      JSON.stringify({
        success: true,
        message: `Successfully removed test data with first_name='brian', excluding brian@freebies.com`
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )
  } catch (err) {
    console.error('Unexpected error during test data cleanup:', err)
    return new Response(
      JSON.stringify({
        success: false,
        error: 'An unexpected error occurred during test data cleanup'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    )
  }
}
