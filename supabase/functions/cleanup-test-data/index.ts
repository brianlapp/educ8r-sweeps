
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

    // Delete entries with first_name='brian' AND last_name='lapp', except for brian@freebies.com
    const { data, error, count } = await supabase
      .from('entries')
      .delete({ count: 'exact' })
      .match({ first_name: 'brian', last_name: 'lapp' })
      .neq('email', 'brian@freebies.com')
      .select()

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

    const removedCount = count || 0
    console.log(`Successfully removed test data. Removed ${removedCount} entries.`)

    return new Response(
      JSON.stringify({
        success: true,
        message: `Successfully removed ${removedCount} test entries with first_name='brian' AND last_name='lapp', excluding brian@freebies.com`
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
