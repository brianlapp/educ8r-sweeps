
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.1.1";
import { corsHeaders } from "../_shared/cors.ts";

console.log("Send Referral Notification Function!");

interface EmailPayload {
  email: string;
  firstName: string;
  referralCode: string;
  campaignId?: string;
}

interface CustomField {
  key: string;
  value: string;
}

const handler = async (req: Request): Promise<Response> => {
  console.log("=== Send Referral Notification Handler Started ===");
  
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const payload: EmailPayload = await req.json();
    console.log("Received notification request:", JSON.stringify(payload));
    
    if (!payload.email || !payload.firstName || !payload.referralCode) {
      console.error("Missing required fields:", { 
        hasEmail: !!payload.email, 
        hasFirstName: !!payload.firstName, 
        hasReferralCode: !!payload.referralCode 
      });
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

    const apiKey = Deno.env.get("BEEHIIV_API_KEY");
    console.log("BeehiiV API Key present:", !!apiKey);
    
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    let campaign = null;
    let shareText = "I just entered to win $1,000 for classroom supplies! You can enter too!";
    let thankYouTitle = "Thanks for Sharing!";
    
    if (payload.campaignId) {
      const { data: campaignData, error: campaignError } = await supabase
        .from("campaigns")
        .select("*")
        .eq("id", payload.campaignId)
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

    const shareUrl = campaign 
      ? `https://educ8r.freeparentsearch.com/${campaign.slug}?ref=${payload.referralCode}`
      : `https://educ8r.freeparentsearch.com/?ref=${payload.referralCode}`;

    const today = new Date();
    const formattedDate = `${today.toLocaleString('default', { month: 'long' })} ${today.getDate()}, ${today.getFullYear()}`;

    // Convert email variables to array format as required by BeehiiV
    const customFields: CustomField[] = [
      { key: "first_name", value: payload.firstName },
      { key: "referral_code", value: payload.referralCode },
      { key: "referral_link", value: shareUrl },
      { key: "share_text", value: shareText },
      { key: "thank_you_title", value: thankYouTitle },
      { key: "current_date", value: formattedDate },
      { key: "campaign_name", value: campaign?.title || "$1,000 Classroom Sweepstakes" },
      { key: "prize_amount", value: campaign?.prize_amount || "$1,000" },
      { key: "prize_name", value: campaign?.prize_name || "classroom supplies" }
    ];

    console.log("Attempting BeehiiV API request with custom fields:", JSON.stringify(customFields));
    
    const BEEHIIV_API_KEY = Deno.env.get("BEEHIIV_API_KEY");
    const publicationId = "pub_26e1c2a3-8da8-49b1-a07c-1b42adb5dad2";

    const beehiivResponse = await fetch(
      `https://api.beehiiv.com/v2/publications/${publicationId}/subscriptions`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${BEEHIIV_API_KEY}`,
        },
        body: JSON.stringify({
          email: payload.email,
          reactivate_existing: true,
          send_welcome_email: true,
          utm_source: "sweepstakes-referral",
          utm_medium: "email",
          utm_campaign: campaign?.slug || "classroom-1000",
          custom_fields: customFields,
          tags: ["sweeps", "comprendi"],
        }),
      }
    );

    const responseStatus = beehiivResponse.status;
    console.log("BeehiiV API Response Status:", responseStatus);
    
    if (!beehiivResponse.ok) {
      const errorText = await beehiivResponse.text();
      console.error("BeehiiV API error response:", errorText);
      throw new Error(`BeehiiV API error: ${errorText}`);
    }

    const beehiivResult = await beehiivResponse.json();
    console.log("BeehiiV API success response:", beehiivResult);

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
    console.error("Detailed error in send-referral-notification:", {
      message: error.message,
      stack: error.stack,
      name: error.name
    });

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
};

serve(handler);
