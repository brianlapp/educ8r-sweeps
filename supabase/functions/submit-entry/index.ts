
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.1.1";
import { corsHeaders } from "../_shared/cors.ts";

console.log("Hello from Submit Entry Function!");

// Function to generate a random referral code
function generateReferralCode(length = 8) {
  const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return result;
}

// Function to validate email format
function isValidEmail(email: string): boolean {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
}

// Handle entry submission
async function handleSubmitEntry(req: Request) {
  try {
    // Handle CORS
    if (req.method === "OPTIONS") {
      return new Response("ok", { headers: corsHeaders });
    }

    // Get the request body
    const requestData = await req.json();
    console.log("Received submission request:", JSON.stringify(requestData));

    // Extract fields from request
    const { firstName, lastName, email, referredBy, campaignId } = requestData;

    // Validate input data
    if (!firstName || !lastName || !email) {
      return new Response(
        JSON.stringify({
          success: false,
          message: "Missing required fields: firstName, lastName, email",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Validate email format
    if (!isValidEmail(email)) {
      return new Response(
        JSON.stringify({
          success: false,
          message: "Invalid email format",
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
    console.log("Supabase client initialized");

    // If campaignId is provided, check if it exists
    let effectiveCampaignId = campaignId;
    if (campaignId) {
      const { data: campaignData, error: campaignError } = await supabase
        .from("campaigns")
        .select("id")
        .eq("id", campaignId)
        .maybeSingle();

      if (campaignError) {
        console.error("Error checking campaign:", campaignError);
      }

      if (!campaignData) {
        console.warn(`Campaign with ID ${campaignId} not found, using default`);
        // Get the default campaign
        const { data: defaultCampaign, error: defaultCampaignError } = await supabase
          .from("campaigns")
          .select("id")
          .eq("slug", "classroom-1000")
          .maybeSingle();

        if (defaultCampaignError) {
          console.error("Error fetching default campaign:", defaultCampaignError);
        } else if (defaultCampaign) {
          effectiveCampaignId = defaultCampaign.id;
          console.log(`Using default campaign: ${effectiveCampaignId}`);
        }
      }
    } else {
      // Get the default campaign if no campaign ID provided
      const { data: defaultCampaign, error: defaultCampaignError } = await supabase
        .from("campaigns")
        .select("id")
        .eq("slug", "classroom-1000")
        .maybeSingle();

      if (defaultCampaignError) {
        console.error("Error fetching default campaign:", defaultCampaignError);
      } else if (defaultCampaign) {
        effectiveCampaignId = defaultCampaign.id;
        console.log(`Using default campaign: ${effectiveCampaignId}`);
      }
    }

    // Check if the email already exists
    const { data: existingEntries, error: checkError } = await supabase
      .from("entries")
      .select("*")
      .eq("email", email.toLowerCase())
      .maybeSingle();

    if (checkError) {
      console.error("Error checking existing entries:", checkError);
      throw new Error("Database error while checking for existing entries");
    }

    let result;
    let isExisting = false;

    if (existingEntries) {
      // User already exists, update them and return their referral code
      console.log("Existing user found:", existingEntries.id);
      isExisting = true;

      const { data: updatedEntry, error: updateError } = await supabase
        .from("entries")
        .update({
          first_name: firstName,
          last_name: lastName,
          campaign_id: effectiveCampaignId, // Update campaign ID for existing user
          // Don't overwrite other fields
        })
        .eq("id", existingEntries.id)
        .select()
        .single();

      if (updateError) {
        console.error("Error updating existing entry:", updateError);
        throw new Error("Database error while updating existing entry");
      }

      result = updatedEntry;
      console.log("Updated existing entry:", result);
    } else {
      // New user, create a new entry
      console.log("Creating new entry for:", email);

      // Generate a referral code
      const referralCode = generateReferralCode();
      console.log("Generated referral code:", referralCode);

      // Prepare the entry data
      const entryData = {
        first_name: firstName,
        last_name: lastName,
        email: email.toLowerCase(),
        referral_code: referralCode,
        referred_by: referredBy || null,
        campaign_id: effectiveCampaignId, // Set campaign ID for new user
      };

      // Insert the new entry
      const { data: newEntry, error: insertError } = await supabase
        .from("entries")
        .insert(entryData)
        .select()
        .single();

      if (insertError) {
        console.error("Error inserting new entry:", insertError);
        throw new Error("Database error while creating new entry");
      }

      result = newEntry;
      console.log("Created new entry:", result);

      // If this entry was referred by someone, increment their referral count
      if (referredBy) {
        console.log("Processing referral from:", referredBy);

        const { data: referrerData, error: referrerError } = await supabase
          .from("entries")
          .select("*")
          .eq("referral_code", referredBy)
          .maybeSingle();

        if (referrerError) {
          console.error("Error finding referrer:", referrerError);
        } else if (referrerData) {
          console.log("Found referrer:", referrerData.id);

          // Update the referrer's counts
          const { error: updateReferrerError } = await supabase
            .from("entries")
            .update({
              referral_count: (referrerData.referral_count || 0) + 1,
              total_entries: (referrerData.entry_count || 1) + (referrerData.referral_count || 0) + 1,
            })
            .eq("id", referrerData.id);

          if (updateReferrerError) {
            console.error("Error updating referrer counts:", updateReferrerError);
          } else {
            console.log("Updated referrer counts for:", referrerData.id);

            // Log the referral for debugging
            await supabase.from("referral_debug").insert({
              email: email.toLowerCase(),
              referred_by: referredBy,
              referrer_email: referrerData.email,
              referral_code: referralCode,
            });
          }
        } else {
          console.warn("Referrer not found for code:", referredBy);
        }
      }
    }

    // Return the result
    return new Response(
      JSON.stringify({
        success: true,
        data: result,
        isExisting,
        message: isExisting
          ? "Welcome back! Your entry has been updated."
          : "Thank you for your entry!",
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error processing submission:", error);

    return new Response(
      JSON.stringify({
        success: false,
        message: `Error processing submission: ${error.message}`,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
}

// Main serve function
serve(handleSubmitEntry);
