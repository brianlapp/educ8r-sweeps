
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
    
    // First, check if there are any referral_conversions records linked to this entry
    const { data: entryData, error: entryError } = await supabaseClient
      .from('entries')
      .select('referral_code')
      .eq('id', id)
      .single()
    
    if (entryError) {
      console.error(`[secure-delete-entry] Error fetching entry: ${entryError.message}`)
      throw entryError
    }
    
    if (entryData?.referral_code) {
      console.log(`[secure-delete-entry] Checking for referral_conversions with code: ${entryData.referral_code}`)
      
      // First delete any referral_conversions that reference this entry's referral_code
      const { error: deleteConversionsError } = await supabaseClient
        .from('referral_conversions')
        .delete()
        .eq('referral_code', entryData.referral_code)
      
      if (deleteConversionsError) {
        console.error(`[secure-delete-entry] Error deleting referral_conversions: ${deleteConversionsError.message}`)
        throw deleteConversionsError
      }
      
      console.log(`[secure-delete-entry] Successfully removed referral_conversions for code: ${entryData.referral_code}`)
      
      // Clear the referred_by field for any entries that were referred by this entry
      const { error: updateReferralsError } = await supabaseClient
        .from('entries')
        .update({ 
          referred_by: null,
          // Adjust total entries since the referral is being removed
          total_entries: supabaseClient.rpc('greatest', { a: 1, b: 'entry_count' })
        })
        .eq('referred_by', entryData.referral_code)
      
      if (updateReferralsError) {
        console.error(`[secure-delete-entry] Error updating referred entries: ${updateReferralsError.message}`)
        throw updateReferralsError
      }
      
      console.log(`[secure-delete-entry] Successfully updated entries referred by: ${entryData.referral_code}`)
    }
    
    // Now delete the entry itself
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
