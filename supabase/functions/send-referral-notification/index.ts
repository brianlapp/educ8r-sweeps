
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.1.1";
import { corsHeaders } from "../_shared/cors.ts";

console.log("Send Referral Notification Function!");

interface EmailPayload {
  email: string;
  firstName: string;
  referralCode: string;
  campaignId?: string; // Make this optional to support both new and old flows
}

async function sendNotification(req: Request) {
  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Parse the payload
    const payload: EmailPayload = await req.json();
    console.log("Received notification request:", JSON.stringify(payload));

    // Extract fields from payload
    const { email, firstName, referralCode, campaignId } = payload;

    // Validate input
    if (!email || !firstName || !referralCode) {
      return new Response(
        JSON.stringify({
          success: false,
          message: "Missing required fields: email, firstName, referralCode",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Get campaign-specific information if campaign ID is provided
    let campaign = null;
    let shareText = "I just entered to win $1,000 for classroom supplies! You can enter too!";
    let thankYouTitle = "Thanks for Sharing!";
    
    if (campaignId) {
      const { data: campaignData, error: campaignError } = await supabase
        .from("campaigns")
        .select("*")
        .eq("id", campaignId)
        .maybeSingle();

      if (campaignError) {
        console.error("Error fetching campaign:", campaignError);
      } else if (campaignData) {
        campaign = campaignData;
        shareText = `I just entered to win ${campaign.prize_amount} for ${campaign.prize_name}! You can enter too!`;
        thankYouTitle = campaign.thank_you_title;
        console.log(`Using campaign template: ${campaign.title}`);
      }
    }

    // Generate the share URL
    const shareUrl = campaign 
      ? `https://educ8r.freeparentsearch.com/${campaign.slug}?ref=${referralCode}`
      : `https://educ8r.freeparentsearch.com/?ref=${referralCode}`;

    // Format the current date
    const today = new Date();
    const formattedDate = `${today.toLocaleString('default', { month: 'long' })} ${today.getDate()}, ${today.getFullYear()}`;

    // Define email variables
    const emailVariables = {
      first_name: firstName,
      referral_code: referralCode,
      referral_link: shareUrl,
      share_text: shareText,
      thank_you_title: thankYouTitle,
      current_date: formattedDate,
      campaign_name: campaign?.title || "$1,000 Classroom Sweepstakes",
      prize_amount: campaign?.prize_amount || "$1,000",
      prize_name: campaign?.prize_name || "classroom supplies"
    };

    // Send email via BeehiiV API
    const BEEHIIV_API_KEY = Deno.env.get("BEEHIIV_API_KEY");
    const publicationId = "pub_26e1c2a3-8da8-49b1-a07c-1b42adb5dad2"; // FPS BeehiiV publication

    const beehiivResponse = await fetch(
      `https://api.beehiiv.com/v2/publications/${publicationId}/subscriptions`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${BEEHIIV_API_KEY}`,
        },
        body: JSON.stringify({
          email: email,
          reactivate_existing: true,
          send_welcome_email: true,
          utm_source: "sweepstakes-referral",
          utm_medium: "email",
          utm_campaign: campaign?.slug || "classroom-1000",
          custom_fields: emailVariables,
          tags: ["sweeps", "comprendi"], // Add any campaign-specific tags if needed
        }),
      }
    );

    if (!beehiivResponse.ok) {
      const errorText = await beehiivResponse.text();
      console.error("BeehiiV API error:", errorText);
      throw new Error(`BeehiiV API error: ${errorText}`);
    }

    const beehiivResult = await beehiivResponse.json();
    console.log("BeehiiV result:", beehiivResult);

    return new Response(
      JSON.stringify({
        success: true,
        message: "Notification sent successfully",
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error sending notification:", error);

    return new Response(
      JSON.stringify({
        success: false,
        message: `Error sending notification: ${error.message}`,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
}

// Main serve function
serve(sendNotification);
