
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.1.1";
import { corsHeaders } from "../_shared/cors.ts";

console.log("Everflow Webhook handler is running!");

serve(async (req) => {
  // Handle CORS preflight request
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  
  try {
    // Parse the webhook payload
    const payload = await req.json();
    console.log("Received webhook payload:", JSON.stringify(payload));
    
    // Extract the relevant information
    const transactionId = payload.transaction_id;
    const offer = payload.offer || {};
    const affiliate = payload.affiliate || {};
    const payout = payload.payout || {};
    
    // Extract the referral code from the transaction ID or custom parameters
    // Assuming format: REFCODE_[actual code]
    let referralCode = null;
    
    if (transactionId && transactionId.startsWith('REFCODE_')) {
      referralCode = transactionId.replace('REFCODE_', '');
      console.log(`Extracted referral code: ${referralCode}`);
    }
    
    // If we can't extract from transaction ID, try custom fields
    if (!referralCode && payload.custom_fields) {
      referralCode = payload.custom_fields.referral_code;
      console.log(`Found referral code in custom fields: ${referralCode}`);
    }
    
    // If we still don't have a referral code, log and exit
    if (!referralCode) {
      console.warn("No referral code found in webhook data");
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "No referral code found in transaction data"
        }),
        { 
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    }
    
    // Connect to Supabase
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );
    
    // Check if the referral code exists
    const { data: referralEntry, error: referralError } = await supabase
      .from('entries')
      .select('*')
      .eq('referral_code', referralCode)
      .maybeSingle();
    
    if (referralError) {
      console.error("Error checking referral code:", referralError);
      throw new Error(`Database error: ${referralError.message}`);
    }
    
    if (!referralEntry) {
      console.warn(`Invalid referral code: ${referralCode}`);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Invalid referral code: No matching entry found"
        }),
        { 
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    }
    
    console.log(`Found entry for referral code ${referralCode}:`, referralEntry.id);
    
    // Record the conversion in the database
    const { data: conversionData, error: conversionError } = await supabase
      .from('referral_conversions')
      .insert({
        referral_code: referralCode,
        transaction_id: transactionId
      })
      .select()
      .single();
    
    if (conversionError) {
      console.error("Error recording conversion:", conversionError);
      throw new Error(`Database error while recording conversion: ${conversionError.message}`);
    }
    
    console.log("Conversion recorded:", conversionData.id);
    
    // Update the entry with new referral count and total entries
    const updatedReferralCount = (referralEntry.referral_count || 0) + 1;
    const updatedTotalEntries = (referralEntry.entry_count || 1) + updatedReferralCount;
    
    const { data: updatedEntry, error: updateError } = await supabase
      .from('entries')
      .update({
        referral_count: updatedReferralCount,
        total_entries: updatedTotalEntries
      })
      .eq('id', referralEntry.id)
      .select()
      .single();
    
    if (updateError) {
      console.error("Error updating entry counts:", updateError);
      throw new Error(`Database error while updating entry: ${updateError.message}`);
    }
    
    console.log("Updated entry counts:", {
      id: updatedEntry.id,
      referral_count: updatedEntry.referral_count,
      total_entries: updatedEntry.total_entries
    });
    
    // Send a notification email to the referrer (using send-referral-notification function)
    try {
      const notificationPayload = {
        email: referralEntry.email,
        firstName: referralEntry.first_name,
        referralCode: referralCode,
        campaignId: referralEntry.campaign_id // Include the campaign ID for campaign-specific emails
      };
      
      const notificationResponse = await fetch(
        `${Deno.env.get('SUPABASE_URL')}/functions/v1/send-referral-notification`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`
          },
          body: JSON.stringify(notificationPayload)
        }
      );
      
      if (!notificationResponse.ok) {
        const errorText = await notificationResponse.text();
        console.error("Error sending notification:", errorText);
      } else {
        console.log("Notification sent successfully");
      }
    } catch (notifError) {
      console.error("Error calling notification function:", notifError);
      // Don't throw here, we still want to return success for the main operation
    }
    
    // Return success response
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Conversion processed successfully",
        data: {
          referral_code: referralCode,
          transaction_id: transactionId,
          new_referral_count: updatedReferralCount,
          new_total_entries: updatedTotalEntries
        }
      }),
      { 
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
    
  } catch (error) {
    console.error("Error processing webhook:", error);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: `Error processing webhook: ${error.message}`
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  }
});
