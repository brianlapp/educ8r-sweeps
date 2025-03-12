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

const handler = async (req: Request): Promise<Response> => {
  console.log("=== Send Referral Notification Handler Started ===");
  
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Log incoming request payload
    const payload: EmailPayload = await req.json();
    console.log("Received notification request:", JSON.stringify(payload));
    
    // Validate input and log any issues
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

    // Log BeehiiV API key presence (not the actual key)
    const apiKey = Deno.env.get("BEEHIIV_API_KEY");
    console.log("BeehiiV API Key present:", !!apiKey);
    
    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Get campaign-specific information if campaign ID is provided
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

    // Generate the share URL
    const shareUrl = campaign 
      ? `https://educ8r.freeparentsearch.com/${campaign.slug}?ref=${payload.referralCode}`
      : `https://educ8r.freeparentsearch.com/?ref=${payload.referralCode}`;

    // Format the current date
    const today = new Date();
    const formattedDate = `${today.toLocaleString('default', { month: 'long' })} ${today.getDate()}, ${today.getFullYear()}`;

    // Define email variables
    const emailVariables = {
      first_name: payload.firstName,
      referral_code: payload.referralCode,
      referral_link: shareUrl,
      share_text: shareText,
      thank_you_title: thankYouTitle,
      current_date: formattedDate,
      campaign_name: campaign?.title || "$1,000 Classroom Sweepstakes",
      prize_amount: campaign?.prize_amount || "$1,000",
      prize_name: campaign?.prize_name || "classroom supplies"
    };

    // Log BeehiiV request attempt
    console.log("Attempting BeehiiV API request with email:", payload.email);
    
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
          email: payload.email,
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

    // Log BeehiiV response details
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

// Main serve function
serve(handler);
