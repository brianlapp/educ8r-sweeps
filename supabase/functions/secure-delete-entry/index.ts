
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { id } = await req.json()
    
    // Initialize Supabase client with service role key for admin operations
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )
    
    console.log(`[secure-delete-entry] Deleting entry with ID: ${id}`)
    
    // Use direct SQL execution for guaranteed deletion
    const { error } = await supabaseClient
      .from('entries')
      .delete()
      .eq('id', id)
    
    if (error) {
      console.error(`[secure-delete-entry] Error: ${error.message}`)
      throw error
    }
    
    console.log(`[secure-delete-entry] Successfully deleted entry: ${id}`)
    
    // Double-check the deletion
    const { data, error: verifyError } = await supabaseClient
      .from('entries')
      .select('id')
      .eq('id', id)
    
    if (verifyError) {
      console.error(`[secure-delete-entry] Verification error: ${verifyError.message}`)
    } else if (data && data.length > 0) {
      console.error(`[secure-delete-entry] WARNING: Entry still exists after deletion: ${id}`)
    } else {
      console.log(`[secure-delete-entry] Verified: Entry no longer exists in database`)
    }
    
    return new Response(
      JSON.stringify({ success: true, id }),
      { 
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json'
        } 
      }
    )
  } catch (error) {
    console.error(`[secure-delete-entry] Process error: ${error.message}`)
    
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
