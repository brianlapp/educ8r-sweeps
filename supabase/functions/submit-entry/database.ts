
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
  
  return data ? data.slug : null;
}
