
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

export interface EntryData {
  first_name: string;
  last_name: string;
  email: string;
  referred_by: string | null;
  entry_count: number;
  campaign_id: string;
}

export interface EntryResponse {
  id: string;
  referral_code: string;
  [key: string]: any;
}

export interface CampaignData {
  id: string;
  slug: string;
}

export async function initializeSupabaseClient() {
  return createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );
}

export async function getDefaultCampaign(supabaseClient: any): Promise<CampaignData | null> {
  console.log('No campaign ID provided, fetching default campaign');
  
  const { data: defaultCampaign, error: campaignError } = await supabaseClient
    .from('campaigns')
    .select('id, slug')
    .eq('slug', 'classroom-supplies-2025')
    .maybeSingle();
  
  if (campaignError) {
    console.error('Error fetching default campaign:', campaignError);
    return null;
  } 
  
  if (defaultCampaign) {
    console.log('Using default campaign:', defaultCampaign.id, 'with slug:', defaultCampaign.slug);
    return defaultCampaign;
  }
  
  return null;
}

export async function getCampaignByID(supabaseClient: any, campaignId: string): Promise<string | null> {
  const { data: campaignData, error: campaignError } = await supabaseClient
    .from('campaigns')
    .select('slug')
    .eq('id', campaignId)
    .maybeSingle();
    
  if (campaignError || !campaignData) {
    return null;
  }
  
  return campaignData.slug;
}

export async function getExistingEntry(supabaseClient: any, email: string): Promise<EntryResponse | null> {
  const { data: existingEntry, error: lookupError } = await supabaseClient
    .from('entries')
    .select('referral_code, entry_count, created_at')
    .eq('email', email)
    .maybeSingle();

  if (lookupError) {
    console.error('Error checking for existing entry:', lookupError);
    throw new Error(lookupError.message);
  }

  return existingEntry;
}

export async function verifyReferralCode(supabaseClient: any, referralCode: string): Promise<boolean> {
  if (!referralCode) {
    return false;
  }
  
  const { data: referrerEntry, error: referrerError } = await supabaseClient
    .from('entries')
    .select('referral_code')
    .eq('referral_code', referralCode)
    .maybeSingle();

  if (referrerError) {
    console.error('Error verifying referral code:', referrerError);
    console.log('Invalid referral code provided:', referralCode);
    return false;
  } 
  
  if (referrerEntry) {
    console.log('Valid referral code found:', referralCode);
    return true;
  } 
  
  console.log('Referral code not found in database:', referralCode);
  return false;
}

export async function createEntry(
  supabaseClient: any, 
  entryData: EntryData
): Promise<EntryResponse> {
  const { data: entry, error: supabaseError } = await supabaseClient
    .from('entries')
    .insert(entryData)
    .select()
    .single();

  if (supabaseError) {
    console.error('Supabase error:', supabaseError);
    throw new Error(supabaseError.message);
  }

  console.log('Successfully created entry with referral code:', entry.referral_code);
  return entry;
}

export async function logReferral(supabaseClient: any, email: string, referralCode: string, entryReferralCode: string) {
  const { error: debugError } = await supabaseClient
    .from('referral_debug')
    .insert({
      email: email,
      referrer_email: null,
      referred_by: referralCode,
      referral_code: entryReferralCode
    });

  if (debugError) {
    console.error('Error creating debug entry:', debugError);
  }
}
