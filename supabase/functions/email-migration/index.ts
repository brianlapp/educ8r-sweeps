
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Enhanced CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS, PUT, DELETE',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, X-Requested-With',
};

// Define interface for subscriber data
interface Subscriber {
  email: string;
  first_name?: string;
  last_name?: string;
}

// Define interface for the migration stats
interface MigrationStats {
  id: string;
  total_subscribers: number;
  migrated_subscribers: number;
  failed_subscribers: number;
  last_batch_id: string | null;
  last_batch_date: string | null;
}

// BeehiiV subscriber data interface
interface BeehiivSubscriberData {
  email: string;
  first_name: string;
  last_name: string;
  utm_source: string;
  utm_medium: string;
  utm_campaign: string;
  reactivate: boolean;
  custom_fields: Array<{
    name: string;
    value: string;
  }>;
}

// Define interface for automation settings
interface AutomationSettings {
  enabled: boolean;
  daily_total_target: number;
  start_hour: number;
  end_hour: number;
  min_batch_size: number;
  max_batch_size: number;
  last_automated_run: string | null;
}

serve(async (req) => {
  console.log("Email migration function called with method:", req.method);
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders, status: 204 });
  }

  try {
    const BEEHIIV_API_KEY = Deno.env.get('BEEHIIV_API_KEY');
    
    if (!BEEHIIV_API_KEY) {
      console.error("Missing BEEHIIV_API_KEY environment variable");
      return new Response(
        JSON.stringify({ error: "Server configuration error: Missing BEEHIIV_API_KEY" }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase client
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Parse the request URL and body to get the action
    const url = new URL(req.url);
    let actionFromQuery = url.searchParams.get('action');
    
    // Try to get action from the request body if not in query params
    let requestData = {};
    let actionFromBody = null;
    
    if (req.method === 'POST') {
      try {
        requestData = await req.json();
        actionFromBody = requestData?.action;
      } catch (e) {
        console.error("Error parsing request body:", e);
      }
    }
    
    // Use action from query params or body
    const action = actionFromQuery || actionFromBody;
    
    console.log("Action requested:", action);

    // Handle different actions
    switch (action) {
      case 'import': {
        // Import subscribers from OnGage export file
        if (req.method !== 'POST') {
          return new Response(
            JSON.stringify({ error: "Method not allowed" }),
            { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const subscribers: Subscriber[] = requestData.subscribers;
        const fileName = requestData.fileName || 'unknown_file';
        
        if (!Array.isArray(subscribers)) {
          console.error("Invalid subscribers data format, received:", typeof subscribers);
          return new Response(
            JSON.stringify({ error: "Invalid subscriber data format: expected an array", received: typeof subscribers }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
        if (subscribers.length === 0) {
          return new Response(
            JSON.stringify({ error: "No subscribers found in the import data" }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Validate subscriber data
        for (let i = 0; i < subscribers.length; i++) {
          const sub = subscribers[i];
          if (!sub.email || typeof sub.email !== 'string') {
            return new Response(
              JSON.stringify({ 
                error: "Invalid subscriber data", 
                details: `Subscriber at index ${i} has invalid email: ${JSON.stringify(sub)}` 
              }),
              { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }
          
          // Ensure email is trimmed and lowercase
          sub.email = sub.email.trim().toLowerCase();
          
          // Ensure first_name and last_name are strings
          if (sub.first_name !== undefined && typeof sub.first_name !== 'string') {
            sub.first_name = String(sub.first_name);
          }
          
          if (sub.last_name !== undefined && typeof sub.last_name !== 'string') {
            sub.last_name = String(sub.last_name);
          }
        }

        console.log(`Processing import of ${subscribers.length} subscribers from file: ${fileName}`);

        // IMPORTANT: Reset any in_progress subscribers first to avoid stuck subscribers
        console.log("Resetting any in_progress subscribers to pending state before import");
        const { error: resetError } = await supabaseAdmin
          .from('email_migration')
          .update({ 
            status: 'pending',
            error: 'Reset automatically before new import'
          })
          .eq('status', 'in_progress');

        if (resetError) {
          console.error("Error resetting in_progress subscribers:", resetError);
        } else {
          console.log("Cleared any subscribers that were stuck in 'in_progress' state");
        }

        // Insert subscribers into the email_migration table
        // Use a transaction to ensure atomicity
        const { data: insertedData, error: insertError } = await supabaseAdmin.rpc(
          'import_subscribers',
          { subscribers_data: subscribers }
        );

        if (insertError) {
          console.error("Error importing subscribers:", insertError);
          return new Response(
            JSON.stringify({ error: "Failed to import subscribers", details: insertError }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        console.log("Import results:", insertedData);

        // Update the migration stats
        const { data: statsData, error: getStatsError } = await supabaseAdmin
          .from('email_migration_stats')
          .select('*')
          .single();

        if (getStatsError) {
          console.error("Error fetching migration stats:", getStatsError);
        } else {
          // Update total_subscribers by adding newly inserted subscribers
          const newTotal = statsData.total_subscribers + insertedData.inserted;
          
          const { error: statsError } = await supabaseAdmin
            .from('email_migration_stats')
            .update({ total_subscribers: newTotal })
            .eq('id', statsData.id);

          if (statsError) {
            console.error("Error updating migration stats:", statsError);
          } else {
            console.log(`Updated migration stats: total_subscribers = ${newTotal}`);
          }
        }

        return new Response(
          JSON.stringify({ 
            success: true, 
            message: `Imported ${insertedData.inserted} subscribers successfully`,
            duplicates: insertedData.duplicates,
            total: insertedData.total,
            fileName
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'reset-in-progress': {
        // Reset in_progress subscriptions back to pending state
        if (req.method !== 'POST') {
          return new Response(
            JSON.stringify({ error: "Method not allowed" }),
            { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Get count of in_progress subscribers first
        const { data: countData, error: countError } = await supabaseAdmin
          .from('email_migration')
          .select('count(*)', { count: 'exact' })
          .eq('status', 'in_progress');

        if (countError) {
          console.error("Error counting in_progress subscribers:", countError);
          return new Response(
            JSON.stringify({ error: "Failed to count in_progress subscribers", details: countError }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const count = countData[0]?.count || 0;

        if (count === 0) {
          return new Response(
            JSON.stringify({ message: "No in_progress subscribers to reset", count: 0 }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Reset in_progress subscribers to pending
        const { error: updateError } = await supabaseAdmin
          .from('email_migration')
          .update({ 
            status: 'pending',
            error: null,
            migration_batch: null
          })
          .eq('status', 'in_progress');

        if (updateError) {
          console.error("Error resetting in_progress subscribers:", updateError);
          return new Response(
            JSON.stringify({ error: "Failed to reset in_progress subscribers", details: updateError }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        console.log(`Reset ${count} in_progress subscribers to pending state`);

        return new Response(
          JSON.stringify({ message: `Reset ${count} in_progress subscribers to pending`, count }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'check-existing': {
        // Check if subscribers already exist in BeehiiV
        if (req.method !== 'POST') {
          return new Response(
            JSON.stringify({ error: "Method not allowed" }),
            { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const batchSize = requestData.batchSize || 100;
        const publicationId = requestData.publicationId || 'pub_7588ba6b-a268-4571-9135-47a68568ee64';
        
        console.log(`Checking ${batchSize} subscribers against BeehiiV for publication ${publicationId}`);

        // Get subscribers to check
        const { data: subscribersToCheck, error: fetchError } = await supabaseAdmin
          .from('email_migration')
          .select('*')
          .eq('status', 'pending')
          .limit(batchSize);

        if (fetchError) {
          console.error("Error fetching subscribers to check:", fetchError);
          return new Response(
            JSON.stringify({ error: "Failed to fetch subscribers", details: fetchError }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        if (!subscribersToCheck || subscribersToCheck.length === 0) {
          console.log("No pending subscribers found to check");
          return new Response(
            JSON.stringify({ 
              success: true, 
              message: "No pending subscribers to check",
              results: {
                checked: 0,
                already_exists: 0,
                errors: 0,
                error_details: []
              }
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        console.log(`Found ${subscribersToCheck.length} subscribers to check`);

        // Check each subscriber
        const results = {
          checked: 0,
          already_exists: 0,
          errors: 0,
          error_details: [] as Array<{ email: string, error: string }>
        };

        for (const subscriber of subscribersToCheck) {
          try {
            console.log(`Checking subscriber: ${subscriber.email}`);
            
            // Call BeehiiV API to check if the subscriber exists
            const response = await fetch(
              `https://api.beehiiv.com/v2/publications/${publicationId}/subscriptions?email=${encodeURIComponent(subscriber.email)}`,
              {
                method: 'GET',
                headers: {
                  'Authorization': `Bearer ${BEEHIIV_API_KEY}`,
                  'Content-Type': 'application/json',
                }
              }
            );

            if (!response.ok) {
              console.error(`BeehiiV API error for ${subscriber.email}: ${response.status}`);
              const errorText = await response.text();
              
              results.errors++;
              results.error_details.push({
                email: subscriber.email,
                error: `API Error: ${response.status} - ${errorText}`
              });
              
              continue;
            }

            const data = await response.json();
            const exists = data.data && data.data.length > 0;
            
            if (exists) {
              // Subscriber already exists, update status
              const { error: updateError } = await supabaseAdmin
                .from('email_migration')
                .update({ 
                  status: 'already_exists',
                  migrated_at: new Date().toISOString(),
                  error: null
                })
                .eq('id', subscriber.id);

              if (updateError) {
                console.error(`Error updating status for ${subscriber.email}:`, updateError);
              } else {
                console.log(`Updated status to 'already_exists' for ${subscriber.email}`);
                results.already_exists++;
              }
            }
            
            results.checked++;
          } catch (error) {
            console.error(`Exception processing ${subscriber.email}:`, error);
            
            results.errors++;
            results.error_details.push({
              email: subscriber.email,
              error: `Exception: ${error.message}`
            });
          }

          // Add a small delay to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 100));
        }

        console.log(`Check results: ${results.checked} checked, ${results.already_exists} already exist, ${results.errors} errors`);
        
        return new Response(
          JSON.stringify({ 
            success: true, 
            message: `Checked ${results.checked} subscribers, found ${results.already_exists} already in BeehiiV`,
            results
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'migrate-batch': {
        // Migrate a batch of subscribers to BeehiiV
        if (req.method !== 'POST') {
          return new Response(
            JSON.stringify({ error: "Method not allowed" }),
            { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const batchSize = requestData.batchSize || 500; // Default to 500 which is what BeehiiV API can handle reliably
        const batchId = `batch-${new Date().toISOString().split('T')[0]}-${Math.floor(Math.random() * 10000)}`;
        const fileName = requestData.fileName || 'unknown_file';
        
        // Use the publication ID from the request, with a fallback to prevent breaking changes
        const publicationId = requestData.publicationId || 'pub_7588ba6b-a268-4571-9135-47a68568ee64';
        
        console.log(`Processing migration batch ${batchId} with size ${batchSize} for publication ${publicationId}, file: ${fileName}`);

        // Get subscribers to migrate - MODIFIED to filter out 'already_exists' status
        const { data: subscribersToMigrate, error: fetchError } = await supabaseAdmin
          .from('email_migration')
          .select('*')
          .eq('status', 'pending')
          .limit(batchSize);

        if (fetchError) {
          console.error("Error fetching subscribers to migrate:", fetchError);
          return new Response(
            JSON.stringify({ error: "Failed to fetch subscribers", details: fetchError }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        if (!subscribersToMigrate || subscribersToMigrate.length === 0) {
          return new Response(
            JSON.stringify({ 
              success: true, 
              message: "No subscribers to migrate",
              fileName,
              results: {
                total: 0,
                success: 0,
                duplicates: 0,
                failed: 0,
                errors: []
              }
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        console.log(`Found ${subscribersToMigrate.length} subscribers to migrate`);

        // Mark these subscribers as 'in_progress' with the batch ID
        const { error: updateError } = await supabaseAdmin
          .from('email_migration')
          .update({ 
            status: 'in_progress',
            migration_batch: batchId
          })
          .in('id', subscribersToMigrate.map(s => s.id));

        if (updateError) {
          console.error("Error updating subscribers status:", updateError);
          return new Response(
            JSON.stringify({ error: "Failed to update subscribers status", details: updateError }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Before processing subscribers, let's log the BeehiiV API key status (without revealing it)
        console.log(`BeehiiV API Key present and length: ${BEEHIIV_API_KEY ? BEEHIIV_API_KEY.length : 0} characters`);
        console.log(`Publication ID being used: ${publicationId}`);
        console.log(`Complete BeehiiV API endpoint being used: https://api.beehiiv.com/v2/publications/${publicationId}/subscriptions`);
        
        // Process each subscriber
        const results = {
          success: 0,
          failed: 0,
          duplicates: 0,
          errors: [] as Array<{ email: string, error: string }>,
          successful_subscribers: [] as Array<{ email: string, response: any }>
        };

        for (const subscriber of subscribersToMigrate) {
          try {
            console.log(`Migrating subscriber: ${subscriber.email}`);
            
            // Create BeehiiV subscriber data with improved tracking
            const beehiivData: BeehiivSubscriberData = {
              email: subscriber.email,
              first_name: subscriber.first_name || '',
              last_name: subscriber.last_name || '',
              utm_source: 'ongage_migration', // Updated for better tracking
              utm_medium: 'email_migration',
              utm_campaign: `batch_${batchId}`, // Include batch ID in campaign
              reactivate: true, // Prevent welcome emails
              custom_fields: [
                {
                  name: 'migrated_from_ongage',
                  value: 'true'
                },
                // ADDED: New custom field for tracking migration batch
                {
                  name: 'migration_batch_id',
                  value: batchId
                },
                // NEW: Add a clear tracking tag to easily identify migrated subscribers
                {
                  name: 'subscriber_source',
                  value: 'ongage_migration'
                },
                // NEW: Add timestamp of migration
                {
                  name: 'migration_date',
                  value: new Date().toISOString()
                },
                // NEW: Add file name for tracking source
                {
                  name: 'source_file',
                  value: fileName
                }
              ]
            };

            // ENHANCED LOGGING: Log the exact request payload
            console.log(`BeehiiV API request for ${subscriber.email}:`, JSON.stringify(beehiivData, null, 2));

            // Send to BeehiiV API with complete logs of request and response
            console.log(`Sending subscription request to BeehiiV...`);
            const subscribeResponse = await fetch(
              `https://api.beehiiv.com/v2/publications/${publicationId}/subscriptions`,
              {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${BEEHIIV_API_KEY}`,
                },
                body: JSON.stringify(beehiivData)
              }
            );

            const responseText = await subscribeResponse.text();
            
            // Detailed API response logging
            console.log(`BeehiiV API response status for ${subscriber.email}: ${subscribeResponse.status}`);
            console.log(`BeehiiV API response headers for ${subscriber.email}:`, JSON.stringify(Object.fromEntries([...subscribeResponse.headers]), null, 2));
            console.log(`BeehiiV API response body for ${subscriber.email}: ${responseText}`);

            // Try to parse response JSON for better debugging
            let responseData = null;
            try {
              responseData = JSON.parse(responseText);
              console.log(`BeehiiV API parsed response for ${subscriber.email}:`, JSON.stringify(responseData, null, 2));
              
              // Check if this is a duplicate subscriber
              if (responseData?.error && responseData.error.includes("already exists")) {
                console.log(`✅ DUPLICATE: Subscriber ${subscriber.email} already exists in BeehiiV`);
                
                // Update subscriber status to 'already_exists'
                const { error: updateError } = await supabaseAdmin
                  .from('email_migration')
                  .update({ 
                    status: 'already_exists',
                    migrated_at: new Date().toISOString(),
                    error: null
                  })
                  .eq('id', subscriber.id);

                if (updateError) {
                  console.error(`Error updating duplicate status for ${subscriber.email}:`, updateError);
                } else {
                  console.log(`Updated database status to 'already_exists' for ${subscriber.email}`);
                }

                results.duplicates++;
                continue;
              }
              
              // ENHANCED LOGGING: Check if subscriber ID is present in response
              if (responseData?.data?.id) {
                console.log(`✅ SUCCESS: Subscriber ID returned: ${responseData.data.id} for email: ${subscriber.email}`);
              } else {
                console.log(`⚠️ WARNING: No subscriber ID returned for email: ${subscriber.email} even though status was OK`);
              }
            } catch (parseError) {
              console.error(`Could not parse response as JSON for ${subscriber.email}:`, parseError);
            }

            if (subscribeResponse.ok) {
              // Store successful subscription data
              results.successful_subscribers.push({
                email: subscriber.email,
                response: responseData
              });
              
              // Update subscriber status to 'migrated'
              const { error: updateError } = await supabaseAdmin
                .from('email_migration')
                .update({ 
                  status: 'migrated',
                  migrated_at: new Date().toISOString(),
                  error: null
                })
                .eq('id', subscriber.id);

              if (updateError) {
                console.error(`Error updating migrated status for ${subscriber.email}:`, updateError);
              } else {
                console.log(`✅ Successfully updated database status to 'migrated' for ${subscriber.email}`);
              }

              results.success++;
            } else {
              // More detailed error logging
              console.error(`❌ BeehiiV API error for ${subscriber.email}: Status ${subscribeResponse.status}`);
              
              // Parse error message from response if possible
              let errorMessage = responseText;
              try {
                const errorData = JSON.parse(responseText);
                if (errorData.error) {
                  errorMessage = `API Error: ${errorData.error}`;
                  console.error(`BeehiiV error message: ${errorData.error}`);
                  
                  // Check if this is a duplicate subscriber
                  if (errorData.error.includes("already exists")) {
                    // Update subscriber status to 'already_exists'
                    const { error: updateError } = await supabaseAdmin
                      .from('email_migration')
                      .update({ 
                        status: 'already_exists',
                        migrated_at: new Date().toISOString(),
                        error: null
                      })
                      .eq('id', subscriber.id);

                    if (updateError) {
                      console.error(`Error updating duplicate status for ${subscriber.email}:`, updateError);
                    } else {
                      console.log(`Updated database status to 'already_exists' for ${subscriber.email}`);
                    }

                    results.duplicates++;
                    continue;
                  }
                }
              } catch (e) {
                // Keep the original error text if parsing fails
              }

              // Update subscriber status to 'failed'
              const { error: updateError } = await supabaseAdmin
                .from('email_migration')
                .update({ 
                  status: 'failed',
                  error: `API Error: ${subscribeResponse.status} - ${errorMessage}`
                })
                .eq('id', subscriber.id);

              if (updateError) {
                console.error(`Error updating failed status for ${subscriber.email}:`, updateError);
              } else {
                console.log(`Updated database status to 'failed' for ${subscriber.email}`);
              }

              results.failed++;
              results.errors.push({ 
                email: subscriber.email,
                error: `API Error: ${subscribeResponse.status} - ${errorMessage}`
              });
            }
          } catch (error) {
            console.error(`Exception processing ${subscriber.email}:`, error);
            
            // Update subscriber status to 'failed'
            const { error: updateError } = await supabaseAdmin
              .from('email_migration')
              .update({ 
                status: 'failed',
                error: `Exception: ${error.message}`
              })
              .eq('id', subscriber.id);

            if (updateError) {
              console.error(`Error updating failed status for ${subscriber.email}:`, updateError);
            }

            results.failed++;
            results.errors.push({ 
              email: subscriber.email,
              error: `Exception: ${error.message}`
            });
          }

          // Add a small delay to avoid rate limiting
          // ENHANCED: Randomize delay slightly to make it more natural
          const delay = 200 + Math.floor(Math.random() * 300); // 200-500ms
          console.log(`Waiting ${delay}ms before processing next subscriber`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }

        // Update the migration stats
        const { data: statsData, error: getStatsError } = await supabaseAdmin
          .from('email_migration_stats')
          .select('*')
          .single();

        if (getStatsError) {
          console.error("Error fetching migration stats:", getStatsError);
        } else if (statsData) {
          const { error: updateStatsError } = await supabaseAdmin
            .from('email_migration_stats')
            .update({ 
              migrated_subscribers: statsData.migrated_subscribers + results.success,
              failed_subscribers: statsData.failed_subscribers + results.failed,
              last_batch_id: batchId,
              last_batch_date: new Date().toISOString()
            })
            .eq('id', statsData.id);

          if (updateStatsError) {
            console.error("Error updating migration stats:", updateStatsError);
          } else {
            console.log("Successfully updated migration stats");
          }
        }

        // Enhance the response with details of the successful migrations
        console.log(`=== Batch ${batchId} Migration Details ===`);
        console.log(`Total successful migrations: ${results.success}`);
        console.log(`Total duplicates found: ${results.duplicates}`);
        console.log(`Total failed migrations: ${results.failed}`);
        console.log(`File name: ${fileName}`);
        console.log(`Details of successful subscribers:`, JSON.stringify(results.successful_subscribers.slice(0, 5), null, 2));
        if (results.successful_subscribers.length > 5) {
          console.log(`... and ${results.successful_subscribers.length - 5} more`);
        }

        return new Response(
          JSON.stringify({ 
            success: true, 
            batchId,
            publicationId,
            fileName,
            results: {
              total: subscribersToMigrate.length,
              success: results.success,
              failed: results.failed,
              duplicates: results.duplicates,
              errors: results.errors,
              // Include first 5 successful subscribers in the response for verification
              successful_sample: results.successful_subscribers.slice(0, 5)
            }
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'stats': {
        // Get migration statistics
        console.log("Fetching migration statistics");
        
        // Get the migration stats
        const { data: statsData, error: statsError } = await supabaseAdmin
          .from('email_migration_stats')
          .select('*')
          .single();

        if (statsError) {
          console.error("Error fetching migration stats:", statsError);
          return new Response(
            JSON.stringify({ error: "Failed to fetch migration stats", details: statsError }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Get counts by status - MODIFIED to include already_exists status
        const { data: statusCounts, error: countError } = await supabaseAdmin
          .from('email_migration')
          .select('status, count')
          .group('status');

        if (countError) {
          console.error("Error fetching status counts:", countError);
        }

        // Format the status counts into a more usable structure - MODIFIED to include already_exists
        const counts = {
          pending: 0,
          in_progress: 0,
          migrated: 0,
          failed: 0,
          already_exists: 0
        };

        if (statusCounts) {
          statusCounts.forEach(item => {
            counts[item.status as keyof typeof counts] = item.count;
          });
        }

        // Get the latest batches
        const { data: latestBatches, error: batchError } = await supabaseAdmin
          .from('email_migration')
          .select('migration_batch, count(*)')
          .not('migration_batch', 'is', null)
          .group('migration_batch')
          .order('migration_batch', { ascending: false })
          .limit(5);

        if (batchError) {
          console.error("Error fetching latest batches:", batchError);
        }

        // Get automation settings
        const { data: automationData, error: automationError } = await supabaseAdmin
          .from('email_migration_automation')
          .select('*')
          .single();

        let automation: AutomationSettings = {
          enabled: false,
          daily_total_target: 1000,
          start_hour: 9,
          end_hour: 17,
          min_batch_size: 10,
          max_batch_size: 100,
          last_automated_run: null
        };

        if (automationError) {
          console.log("No automation settings found, using defaults");
          
          // Create default automation settings if they don't exist
          const { error: createAutomationError } = await supabaseAdmin
            .from('email_migration_automation')
            .insert([automation]);
            
          if (createAutomationError) {
            console.error("Error creating default automation settings:", createAutomationError);
          }
        } else if (automationData) {
          automation = automationData;
        }

        // Check if total counts match and fix if necessary
        const totalInStatuses = counts.pending + counts.in_progress + counts.migrated + counts.failed + counts.already_exists;
        if (totalInStatuses !== statsData.total_subscribers) {
          console.log(`⚠️ Fixing mismatched total subscribers: ${statsData.total_subscribers} vs ${totalInStatuses}`);
          
          // Update the stats table to match the actual count
          const { error: updateStatsError } = await supabaseAdmin
            .from('email_migration_stats')
            .update({ 
              total_subscribers: totalInStatuses,
              migrated_subscribers: counts.migrated + counts.already_exists,
              failed_subscribers: counts.failed
            })
            .eq('id', statsData.id);
            
          if (updateStatsError) {
            console.error("Error updating stats to fix count mismatch:", updateStatsError);
          } else {
            console.log("✅ Fixed migration stats counts");
            // Update local statsData to return corrected values
            statsData.total_subscribers = totalInStatuses;
            statsData.migrated_subscribers = counts.migrated + counts.already_exists;
            statsData.failed_subscribers = counts.failed;
          }
        }

        return new Response(
          JSON.stringify({ 
            stats: statsData,
            counts,
            latest_batches: latestBatches || [],
            automation
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'reset-failed': {
        // Reset failed migrations to pending
        if (req.method !== 'POST') {
          return new Response(
            JSON.stringify({ error: "Method not allowed" }),
            { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Update all failed subscribers to pending
        const { data: updateData, error: updateError } = await supabaseAdmin
          .from('email_migration')
          .update({ 
            status: 'pending',
            error: null,
            migration_batch: null
          })
          .eq('status', 'failed')
          .select('count');

        if (updateError) {
          console.error("Error resetting failed subscribers:", updateError);
          return new Response(
            JSON.stringify({ error: "Failed to reset subscribers", details: updateError }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Update the migration stats
        const { data: statsData, error: getStatsError } = await supabaseAdmin
          .from('email_migration_stats')
          .select('*')
          .single();

        if (!getStatsError && statsData) {
          const { error: updateStatsError } = await supabaseAdmin
            .from('email_migration_stats')
            .update({ 
              failed_subscribers: 0
            })
            .eq('id', statsData.id);

          if (updateStatsError) {
            console.error("Error updating migration stats:", updateStatsError);
          }
        }

        return new Response(
          JSON.stringify({ 
            success: true, 
            message: `Reset ${updateData?.length || 0} failed subscribers to pending status`
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'update-automation': {
        // Update automation settings
        if (req.method !== 'POST') {
          return new Response(
            JSON.stringify({ error: "Method not allowed" }),
            { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const settings = requestData.settings as Partial<AutomationSettings>;
        
        if (!settings) {
          return new Response(
            JSON.stringify({ error: "Missing automation settings" }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Update automation settings
        const { error: updateError } = await supabaseAdmin
          .from('email_migration_automation')
          .update(settings)
          .eq('id', 'default');

        if (updateError) {
          console.error("Error updating automation settings:", updateError);
          return new Response(
            JSON.stringify({ error: "Failed to update automation settings", details: updateError }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        return new Response(
          JSON.stringify({ 
            success: true, 
            message: "Automation settings updated successfully"
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'run-automated-batch': {
        // Run an automated batch migration
        if (req.method !== 'POST') {
          return new Response(
            JSON.stringify({ error: "Method not allowed" }),
            { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Get automation settings
        const { data: automationData, error: automationError } = await supabaseAdmin
          .from('email_migration_automation')
          .select('*')
          .single();

        if (automationError || !automationData) {
          console.error("Error fetching automation settings:", automationError);
          return new Response(
            JSON.stringify({ error: "Failed to fetch automation settings", details: automationError }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Check if automation is enabled
        if (!automationData.enabled) {
          return new Response(
            JSON.stringify({ success: false, message: "Automation is disabled" }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Check if we're in the allowed time window
        const now = new Date();
        const hour = now.getHours();
        
        if (hour < automationData.start_hour || hour >= automationData.end_hour) {
          return new Response(
            JSON.stringify({ 
              success: false, 
              message: `Current time (${hour}:00) is outside the allowed window (${automationData.start_hour}:00-${automationData.end_hour}:00)`
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Check how many have been migrated today to respect daily limit
        const today = now.toISOString().split('T')[0];
        const { data: migratedToday, error: countError } = await supabaseAdmin
          .from('email_migration')
          .select('count')
          .eq('status', 'migrated')
          .gte('migrated_at', `${today}T00:00:00Z`)
          .lt('migrated_at', `${today}T23:59:59Z`);

        let migratedCount = 0;
        if (!countError && migratedToday && migratedToday.length > 0) {
          migratedCount = migratedToday[0].count;
        }

        // Check if we've reached the daily limit
        if (migratedCount >= automationData.daily_total_target) {
          return new Response(
            JSON.stringify({ 
              success: false, 
              message: `Daily migration limit reached (${migratedCount}/${automationData.daily_total_target})`
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Calculate remaining subscribers to migrate today
        const remaining = automationData.daily_total_target - migratedCount;
        
        // Randomly determine batch size within the configured range
        // But don't exceed the remaining count
        const minBatch = Math.min(automationData.min_batch_size, remaining);
        const maxBatch = Math.min(automationData.max_batch_size, remaining);
        const randomBatchSize = Math.floor(Math.random() * (maxBatch - minBatch + 1)) + minBatch;

        console.log(`Automated migration: Migrated today=${migratedCount}, Remaining=${remaining}, Batch size=${randomBatchSize}`);

        // Use the migrate-batch functionality with the random batch size
        const batchId = `auto-${new Date().toISOString().split('T')[0]}-${Math.floor(Math.random() * 10000)}`;
        const publicationId = requestData.publicationId || automationData.publication_id || 'pub_7588ba6b-a268-4571-9135-47a68568ee64';

        // First check if there are any in_progress subscribers and reset them
        const { data: inProgressData } = await supabaseAdmin
          .from('email_migration')
          .select('count(*)', { count: 'exact' })
          .eq('status', 'in_progress');
          
        if (inProgressData && inProgressData.length > 0 && inProgressData[0].count > 0) {
          console.log(`Resetting ${inProgressData[0].count} in_progress subscribers before automated batch`);
          
          await supabaseAdmin
            .from('email_migration')
            .update({ 
              status: 'pending',
              error: 'Reset automatically before automated batch',
              migration_batch: null
            })
            .eq('status', 'in_progress');
        }

        // Get subscribers to migrate
        const { data: subscribersToMigrate, error: fetchError } = await supabaseAdmin
          .from('email_migration')
          .select('*')
          .eq('status', 'pending')
          .limit(randomBatchSize);

        if (fetchError) {
          console.error("Error fetching subscribers to migrate:", fetchError);
          return new Response(
            JSON.stringify({ error: "Failed to fetch subscribers", details: fetchError }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        if (!subscribersToMigrate || subscribersToMigrate.length === 0) {
          return new Response(
            JSON.stringify({ success: true, message: "No subscribers to migrate" }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Mark these subscribers as 'in_progress' with the batch ID
        const { error: updateError } = await supabaseAdmin
          .from('email_migration')
          .update({ 
            status: 'in_progress',
            migration_batch: batchId
          })
          .in('id', subscribersToMigrate.map(s => s.id));

        if (updateError) {
          console.error("Error updating subscribers status:", updateError);
          return new Response(
            JSON.stringify({ error: "Failed to update subscribers status", details: updateError }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Process each subscriber with more random delays to appear natural
        const results = {
          success: 0,
          failed: 0,
          duplicates: 0,
          errors: [] as Array<{ email: string, error: string }>
        };

        for (const subscriber of subscribersToMigrate) {
          try {
            console.log(`Migrating subscriber: ${subscriber.email}`);
            
            // Create BeehiiV subscriber data with improved tracking parameters
            const beehiivData: BeehiivSubscriberData = {
              email: subscriber.email,
              first_name: subscriber.first_name || '',
              last_name: subscriber.last_name || '',
              utm_source: 'ongage_migration', // Updated for better tracking
              utm_medium: 'email_migration',
              utm_campaign: `auto_batch_${batchId}`, // Include batch ID in campaign
              reactivate: true, // Prevent welcome emails
              custom_fields: [
                {
                  name: 'migrated_from_ongage',
                  value: 'true'
                },
                {
                  name: 'migration_batch_id',
                  value: batchId
                },
                // NEW: Add a clear tracking tag to easily identify migrated subscribers
                {
                  name: 'subscriber_source',
                  value: 'ongage_migration'
                },
                // NEW: Add timestamp of migration
                {
                  name: 'migration_date',
                  value: new Date().toISOString()
                }
              ]
            };

            // Send to BeehiiV API
            const subscribeResponse = await fetch(
              `https://api.beehiiv.com/v2/publications/${publicationId}/subscriptions`,
              {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${BEEHIIV_API_KEY}`,
                },
                body: JSON.stringify(beehiivData)
              }
            );

            const responseText = await subscribeResponse.text();
            console.log(`BeehiiV API response for ${subscriber.email}: ${subscribeResponse.status} - ${responseText}`);

            // Check if this is a duplicate
            let isDuplicate = false;
            try {
              const responseData = JSON.parse(responseText);
              if (responseData.error && responseData.error.includes("already exists")) {
                isDuplicate = true;
              }
            } catch (e) {
              // Ignore parsing errors
            }
            
            if (isDuplicate) {
              // Update subscriber status to 'already_exists'
              const { error: updateError } = await supabaseAdmin
                .from('email_migration')
                .update({ 
                  status: 'already_exists',
                  migrated_at: new Date().toISOString(),
                  error: null
                })
                .eq('id', subscriber.id);

              if (updateError) {
                console.error(`Error updating duplicate status for ${subscriber.email}:`, updateError);
              }

              results.duplicates++;
              continue;
            }

            if (subscribeResponse.ok) {
              // Update subscriber status to 'migrated'
              const { error: updateError } = await supabaseAdmin
                .from('email_migration')
                .update({ 
                  status: 'migrated',
                  migrated_at: new Date().toISOString(),
                  error: null
                })
                .eq('id', subscriber.id);

              if (updateError) {
                console.error(`Error updating migrated status for ${subscriber.email}:`, updateError);
              }

              results.success++;
            } else {
              // Update subscriber status to 'failed'
              const { error: updateError } = await supabaseAdmin
                .from('email_migration')
                .update({ 
                  status: 'failed',
                  error: `API Error: ${subscribeResponse.status} - ${responseText}`
                })
                .eq('id', subscriber.id);

              if (updateError) {
                console.error(`Error updating failed status for ${subscriber.email}:`, updateError);
              }

              results.failed++;
              results.errors.push({ 
                email: subscriber.email,
                error: `API Error: ${subscribeResponse.status} - ${responseText}`
              });
            }
          } catch (error) {
            console.error(`Exception processing ${subscriber.email}:`, error);
            
            // Update subscriber status to 'failed'
            const { error: updateError } = await supabaseAdmin
              .from('email_migration')
              .update({ 
                status: 'failed',
                error: `Exception: ${error.message}`
              })
              .eq('id', subscriber.id);

            if (updateError) {
              console.error(`Error updating failed status for ${subscriber.email}:`, updateError);
            }

            results.failed++;
            results.errors.push({ 
              email: subscriber.email,
              error: `Exception: ${error.message}`
            });
          }

          // Add a random delay between subscribers (between 1-3 seconds)
          // This makes the migration pattern look more organic
          const randomDelay = Math.floor(Math.random() * 2000) + 1000;
          await new Promise(resolve => setTimeout(resolve, randomDelay));
        }

        // Update the migration stats
        const { data: statsData, error: getStatsError } = await supabaseAdmin
          .from('email_migration_stats')
          .select('*')
          .single();

        if (getStatsError) {
          console.error("Error fetching migration stats:", getStatsError);
        } else if (statsData) {
          const { error: updateStatsError } = await supabaseAdmin
            .from('email_migration_stats')
            .update({ 
              migrated_subscribers: statsData.migrated_subscribers + results.success,
              failed_subscribers: statsData.failed_subscribers + results.failed,
              last_batch_id: batchId,
              last_batch_date: new Date().toISOString()
            })
            .eq('id', statsData.id);

          if (updateStatsError) {
            console.error("Error updating migration stats:", updateStatsError);
          }
        }

        // Update the last automated run timestamp
        const { error: updateAutomationError } = await supabaseAdmin
          .from('email_migration_automation')
          .update({ 
            last_automated_run: new Date().toISOString()
          })
          .eq('id', 'default');

        if (updateAutomationError) {
          console.error("Error updating automation last run:", updateAutomationError);
        }

        return new Response(
          JSON.stringify({ 
            success: true, 
            batchId,
            results: {
              total: subscribersToMigrate.length,
              success: results.success,
              failed: results.failed,
              duplicates: results.duplicates,
              errors: results.errors
            }
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'clear-queue': {
        // Clear the migration queue - new action
        if (req.method !== 'POST') {
          return new Response(
            JSON.stringify({ error: "Method not allowed" }),
            { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const status = requestData.status || 'in_progress';
        
        // Only allow clearing certain statuses
        if (!['pending', 'in_progress', 'failed'].includes(status)) {
          return new Response(
            JSON.stringify({ error: "Invalid status. Can only clear 'pending', 'in_progress', or 'failed'" }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Delete the subscribers with the specified status
        const { data, error } = await supabaseAdmin
          .from('email_migration')
          .delete()
          .eq('status', status)
          .select('count');

        if (error) {
          console.error(`Error clearing ${status} subscribers:`, error);
          return new Response(
            JSON.stringify({ error: `Failed to clear ${status} subscribers`, details: error }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const count = data?.[0]?.count || 0;
        console.log(`Cleared ${count} ${status} subscribers`);

        // If we cleared pending or in_progress subscribers, update the stats
        if (status === 'pending' || status === 'in_progress') {
          const { data: statsData, error: getStatsError } = await supabaseAdmin
            .from('email_migration_stats')
            .select('*')
            .single();

          if (!getStatsError && statsData) {
            const { error: updateStatsError } = await supabaseAdmin
              .from('email_migration_stats')
              .update({ 
                total_subscribers: statsData.total_subscribers - count
              })
              .eq('id', statsData.id);

            if (updateStatsError) {
              console.error("Error updating migration stats:", updateStatsError);
            }
          }
        }

        // If we cleared failed subscribers, update the stats
        if (status === 'failed') {
          const { error: updateStatsError } = await supabaseAdmin
            .from('email_migration_stats')
            .update({ 
              failed_subscribers: 0
            })
            .eq('id', 'default');

          if (updateStatsError) {
            console.error("Error updating failed stats:", updateStatsError);
          }
        }

        return new Response(
          JSON.stringify({ 
            success: true, 
            message: `Cleared ${count} ${status} subscribers`
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      default:
        return new Response(
          JSON.stringify({ error: "Invalid action" }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
  } catch (error) {
    console.error("Unexpected error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error", details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
