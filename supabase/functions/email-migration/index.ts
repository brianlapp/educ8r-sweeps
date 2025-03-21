
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

serve(async (req) => {
  console.log("Email migration function called with method:", req.method);
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders, status: 204 });
  }

  try {
    const BEEHIIV_API_KEY = Deno.env.get('BEEHIIV_API_KEY');
    const BEEHIIV_PUBLICATION_ID = 'pub_4b47c3db-7b59-4c82-a18b-16cf10fc2d23';
    
    if (!BEEHIIV_API_KEY) {
      console.error("Missing BEEHIIV_API_KEY environment variable");
      return new Response(
        JSON.stringify({ error: "Server configuration error" }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase client
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Parse the request URL to get the action
    const url = new URL(req.url);
    const action = url.pathname.split('/').pop();
    
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

        // Parse the request body
        const requestData = await req.json();
        const subscribers: Subscriber[] = requestData.subscribers;
        
        if (!Array.isArray(subscribers) || subscribers.length === 0) {
          return new Response(
            JSON.stringify({ error: "Invalid subscriber data format" }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
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

        // Update the migration stats
        const { error: statsError } = await supabaseAdmin
          .from('email_migration_stats')
          .update({ total_subscribers: subscribers.length })
          .eq('id', (await supabaseAdmin.from('email_migration_stats').select('id').single()).data?.id);

        if (statsError) {
          console.error("Error updating migration stats:", statsError);
        }

        return new Response(
          JSON.stringify({ 
            success: true, 
            message: `Imported ${subscribers.length} subscribers successfully` 
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

        // Parse the request body
        const requestData = await req.json();
        const batchSize = requestData.batchSize || 100; // Default to 100 if not specified
        const batchId = `batch-${new Date().toISOString().split('T')[0]}-${Math.floor(Math.random() * 10000)}`;
        
        console.log(`Processing migration batch ${batchId} with size ${batchSize}`);

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

        // Process each subscriber
        const results = {
          success: 0,
          failed: 0,
          errors: [] as Array<{ email: string, error: string }>
        };

        for (const subscriber of subscribersToMigrate) {
          try {
            console.log(`Migrating subscriber: ${subscriber.email}`);
            
            // Create BeehiiV subscriber data
            const beehiivData: BeehiivSubscriberData = {
              email: subscriber.email,
              first_name: subscriber.first_name || '',
              last_name: subscriber.last_name || '',
              utm_source: 'migration',
              utm_medium: 'ongage',
              utm_campaign: 'email_migration',
              reactivate: true, // Prevent welcome emails
              custom_fields: [
                {
                  name: 'migrated_from_ongage',
                  value: 'true'
                }
              ]
            };

            // Send to BeehiiV API
            const subscribeResponse = await fetch(
              `https://api.beehiiv.com/v2/publications/${BEEHIIV_PUBLICATION_ID}/subscriptions`,
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

          // Add a small delay to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 500));
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

        return new Response(
          JSON.stringify({ 
            stats: statsData,
            counts,
            latest_batches: latestBatches || []
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
