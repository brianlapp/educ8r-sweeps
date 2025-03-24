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

        console.log(`Processing import of ${subscribers.length} subscribers`);

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
            total: insertedData.total
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

        const batchSize = requestData.batchSize || 100; // Default to 100 if not specified
        const batchId = `batch-${new Date().toISOString().split('T')[0]}-${Math.floor(Math.random() * 10000)}`;
        
        // Use the publication ID from the request, with a fallback to prevent breaking changes
        // FIXED: Default publication ID to what worked previously for our test upload
        const publicationId = requestData.publicationId || 'pub_4b47c3db-87fa-4253-956a-21c7afeb3e29';
        
        console.log(`Processing migration batch ${batchId} with size ${batchSize} for publication ${publicationId}`);

        // Get subscribers to migrate
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
            JSON.stringify({ success: true, message: "No subscribers to migrate" }),
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
                }
              ]
            };

            // ENHANCED LOGGING: Log the exact request payload
            console.log(`BeehiiV API request for ${subscriber.email}:`, JSON.stringify(beehiivData, null, 2));

            // Test the BeehiiV API endpoint first with a basic curl-like request
            try {
              console.log(`Testing BeehiiV API connectivity before actual request...`);
              const testResponse = await fetch(
                `https://api.beehiiv.com/v2/publications/${publicationId}`,
                {
                  method: 'GET',
                  headers: {
                    'Authorization': `Bearer ${BEEHIIV_API_KEY}`,
                    'Content-Type': 'application/json',
                  }
                }
              );
              
              const testResponseText = await testResponse.text();
              console.log(`BeehiiV API test response status: ${testResponse.status}`);
              console.log(`BeehiiV API test response: ${testResponseText}`);
              
              if (!testResponse.ok) {
                console.error(`❌ BeehiiV API test failed with status ${testResponse.status}`);
                throw new Error(`BeehiiV API test failed: ${testResponseText}`);
              }
            } catch (testError) {
              console.error(`Error testing BeehiiV API: ${testError.message}`);
            }

            // Send to BeehiiV API with complete logs of request and response
            console.log(`Sending actual subscription request to BeehiiV...`);
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
          const delay = 500 + Math.floor(Math.random() * 500); // 500-1000ms
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
        console.log(`Details of successful subscribers:`, JSON.stringify(results.successful_subscribers.slice(0, 5), null, 2));
        if (results.successful_subscribers.length > 5) {
          console.log(`... and ${results.successful_subscribers.length - 5} more`);
        }

        return new Response(
          JSON.stringify({ 
            success: true, 
            batchId,
            publicationId,
            results: {
              total: subscribersToMigrate.length,
              success: results.success,
              failed: results.failed,
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
        if (req.method !== 'GET') {
          return new Response(
            JSON.stringify({ error: "Method not allowed" }),
            { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

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

        // Get counts by status
        const { data: statusCounts, error: countError } = await supabaseAdmin
          .from('email_migration')
          .select('status, count')
          .group('status');

        if (countError) {
          console.error("Error fetching status counts:", countError);
        }

        // Format the status counts into a more usable structure
        const counts = {
          pending: 0,
          in_progress: 0,
          migrated: 0,
          failed: 0
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
              errors: results.errors
            }
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'clear-queue': {
        // Clear the migration queue by deleting all pending items
        if (req.method !== 'POST') {
          return new Response(
            JSON.stringify({ error: "Method not allowed" }),
            { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        console.log("Clearing migration queue - removing all pending migrations");
        
        // Update all pending records to be deleted
        const { data: deletedData, error: deleteError } = await supabaseAdmin
          .from('email_migration')
          .delete()
          .eq('status', 'pending')
          .select('count');

        if (deleteError) {
          console.error("Error clearing migration queue:", deleteError);
          return new Response(
            JSON.stringify({ error: "Failed to clear migration queue", details: deleteError }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Update the migration stats
        const { data: statsData, error: getStatsError } = await supabaseAdmin
          .from('email_migration_stats')
          .select('*')
          .single();

        if (!getStatsError && statsData) {
          // Adjust total subscribers count by subtracting the pending count
          const newTotal = statsData.total_subscribers - (deletedData?.length || 0);
          
          const { error: updateStatsError } = await supabaseAdmin
            .from('email_migration_stats')
            .update({ 
              total_subscribers: Math.max(0, newTotal) // Ensure we don't go negative
            })
            .eq('id', statsData.id);

          if (updateStatsError) {
            console.error("Error updating migration stats after queue clear:", updateStatsError);
          } else {
            console.log(`Updated migration stats: total_subscribers = ${Math.max(0, newTotal)}`);
          }
        }

        return new Response(
          JSON.stringify({ 
            success: true, 
            message: `Migration queue cleared. Removed ${deletedData?.length || 0} pending migrations.`
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
