
// Initialize Supabase client
export async function initializeSupabaseClient() {
  const { createClient } = await import('@supabase/supabase-js');
  
  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  
  return createClient(supabaseUrl, supabaseServiceKey);
}

// Get default campaign if no campaign ID is provided
export async function getDefaultCampaign(supabaseClient) {
  const { data, error } = await supabaseClient
    .from('campaigns')
    .select('id, slug')
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();
  
  if (error) {
    console.error('Error fetching default campaign:', error);
    return null;
  }
  
  return data;
}

// Make sure the getCampaignByID function also selects the email template fields
export async function getCampaignByID(supabaseClient, campaignId) {
  if (!campaignId) return null;
  
  const { data, error } = await supabaseClient
    .from('campaigns')
    .select('slug, title, prize_name, prize_amount, email_subject, email_heading, email_referral_message, email_cta_text, email_footer_message')
    .eq('id', campaignId)
    .single();
  
  if (error) {
    console.error('Error fetching campaign by ID:', error);
    return null;
  }
  
  return data;
}

// Check if user has already entered with this email
export async function getExistingEntry(supabaseClient, email) {
  if (!email) {
    console.error('No email provided to getExistingEntry');
    return null;
  }
  
  const { data, error } = await supabaseClient
    .from('entries')
    .select('id, email, referral_code, entry_count, referral_count, total_entries, campaign_id')
    .eq('email', email.toLowerCase())
    .order('created_at', { ascending: false })
    .limit(1)
    .single();
  
  if (error) {
    if (error.code === 'PGRST116') {
      // No matching record found - this is expected for new entries
      return null;
    }
    console.error('Error checking for existing entry:', error);
    return null;
  }
  
  return data;
}

// Verify if the referral code exists
export async function verifyReferralCode(supabaseClient, referralCode) {
  if (!referralCode) {
    return false;
  }
  
  const { data, error } = await supabaseClient
    .from('entries')
    .select('id')
    .eq('referral_code', referralCode)
    .limit(1)
    .single();
  
  if (error || !data) {
    console.log('Invalid referral code or not found:', referralCode);
    return false;
  }
  
  return true;
}

// Create new entry
export async function createEntry(supabaseClient, entryData) {
  const { data, error } = await supabaseClient
    .from('entries')
    .insert([
      {
        first_name: entryData.first_name,
        last_name: entryData.last_name,
        email: entryData.email.toLowerCase(),
        referred_by: entryData.referred_by,
        entry_count: entryData.entry_count || 1,
        total_entries: entryData.entry_count || 1,
        campaign_id: entryData.campaign_id
      }
    ])
    .select()
    .single();
  
  if (error) {
    console.error('Error creating entry:', error);
    throw error;
  }
  
  return data;
}

// Log referral relationship for debugging
export async function logReferral(supabaseClient, email, referredBy, referralCode) {
  try {
    // Get referrer email
    const { data: referrerData, error: referrerError } = await supabaseClient
      .from('entries')
      .select('email')
      .eq('referral_code', referredBy)
      .single();
    
    if (referrerError) {
      console.error('Error getting referrer email:', referrerError);
      return;
    }
    
    // Log the referral relationship
    const { error } = await supabaseClient
      .from('referral_debug')
      .insert([
        {
          email,
          referrer_email: referrerData?.email,
          referred_by: referredBy,
          referral_code: referralCode
        }
      ]);
    
    if (error) {
      console.error('Error logging referral debug:', error);
    }
  } catch (error) {
    console.error('Error in logReferral function:', error);
  }
}
