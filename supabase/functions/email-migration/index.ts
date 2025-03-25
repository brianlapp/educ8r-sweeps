import { serve } from 'std/server';
import { createClient } from '@supabase/supabase-js';
import { cors } from '../_shared/cors.ts';

// Initialize Supabase client
const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
const supabaseAdminKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

const supabase = createClient(supabaseUrl, supabaseKey);
const supabaseAdmin = createClient(supabaseUrl, supabaseAdminKey);

// Handle CORS
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Utility function to handle errors
const handleDbError = (error: any, message: string) => {
  console.error(message, error);
  return { error: `${message}: ${error.message}` };
};

// Utility function to validate email format
const isValidEmail = (email: string) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

serve(async (req) => {
  // Handle CORS preflight request
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    });
  }

  try {
    const { action, ...params } = await req.json();

    if (action === 'import') {
      try {
        const { subscribers, fileName } = params;

        if (!subscribers || !Array.isArray(subscribers)) {
          return new Response(
            JSON.stringify({ error: 'Subscribers must be a non-empty array' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const validSubscribers = subscribers.filter((subscriber: any) => {
          return subscriber && subscriber.email && isValidEmail(subscriber.email);
        });

        if (validSubscribers.length === 0) {
          return new Response(
            JSON.stringify({ error: 'No valid subscribers found in the import data' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        console.log(`Importing ${validSubscribers.length} subscribers...`);

        const { data, error } = await supabaseAdmin.rpc('import_subscribers', {
          subscribers_data: JSON.stringify(validSubscribers),
        });

        if (error) {
          console.error("Database import error:", error);
          return new Response(
            JSON.stringify({ error: "Failed to import subscribers", details: error.message }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        console.log("Import process completed:", data);

        return new Response(
          JSON.stringify({ message: `Successfully queued ${validSubscribers.length} subscribers for migration.`, ...data }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      } catch (err) {
        console.error('Unexpected error during import:', err);
        return new Response(
          JSON.stringify({ error: 'An unexpected error occurred during import', details: err.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    if (action === 'migrate-batch') {
      try {
        const { batchSize, publicationId, fileName } = params;

        if (!batchSize || typeof batchSize !== 'number' || batchSize <= 0) {
          return new Response(
            JSON.stringify({ error: 'Invalid batchSize provided' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        if (!publicationId || typeof publicationId !== 'string') {
          return new Response(
            JSON.stringify({ error: 'Invalid publicationId provided' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        console.log(`Attempting to migrate a batch of ${batchSize} subscribers...`);

        // Fetch subscribers with 'pending' status
        const { data: pendingSubscribers, error: selectError } = await supabaseAdmin
          .from('email_migration')
          .select('*')
          .eq('status', 'pending')
          .limit(batchSize);

        if (selectError) {
          console.error("Error fetching pending subscribers:", selectError);
          return new Response(
            JSON.stringify({ error: "Failed to fetch pending subscribers", details: selectError.message }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        if (!pendingSubscribers || pendingSubscribers.length === 0) {
          return new Response(
            JSON.stringify({ message: 'No pending subscribers to migrate' }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        console.log(`Fetched ${pendingSubscribers.length} pending subscribers for migration.`);

        // Update status to 'in_progress'
        const subscriberIds = pendingSubscribers.map(subscriber => subscriber.id);
        const batchId = crypto.randomUUID();

        const { error: updateError } = await supabaseAdmin
          .from('email_migration')
          .update({ status: 'in_progress', migration_batch: batchId })
          .in('id', subscriberIds);

        if (updateError) {
          console.error("Error updating subscriber status to in_progress:", updateError);
          return new Response(
            JSON.stringify({ error: "Failed to update subscriber status", details: updateError.message }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        console.log(`Updated status to 'in_progress' for ${subscriberIds.length} subscribers.`);

        // Call the external API to migrate subscribers
        const migrationResults = {
          success: 0,
          duplicates: 0,
          failed: 0,
          errors: [] as any[],
          total: pendingSubscribers.length
        };

        for (const subscriber of pendingSubscribers) {
          try {
            const apiUrl = 'https://api.beehiiv.com/v2/publications/' + publicationId + '/subscriptions';
            const apiKey = Deno.env.get('BEEHIIV_API_KEY');

            const response = await fetch(apiUrl, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`,
              },
              body: JSON.stringify({
                email: subscriber.email,
                double_opt_in: false,
                send_welcome_email: false,
                custom_fields: {
                  first_name: subscriber.first_name || '',
                  last_name: subscriber.last_name || ''
                }
              }),
            });

            const data = await response.json();

            if (response.status === 201) {
              // Successful migration
              migrationResults.success++;

              // Update subscriber status to 'migrated'
              await supabaseAdmin
                .from('email_migration')
                .update({ status: 'migrated', subscriber_id: data.data.id, migrated_at: new Date().toISOString() })
                .eq('id', subscriber.id);
            } else if (response.status === 409) {
              // Duplicate subscriber
              migrationResults.duplicates++;

              // Update subscriber status to 'already_exists'
              await supabaseAdmin
                .from('email_migration')
                .update({ status: 'already_exists' })
                .eq('id', subscriber.id);
            } else {
              // Failed migration
              migrationResults.failed++;
              migrationResults.errors.push({ email: subscriber.email, error: data.message || 'Unknown error' });

              // Update subscriber status to 'failed'
              await supabaseAdmin
                .from('email_migration')
                .update({ status: 'failed', error_message: data.message || 'Unknown error' })
                .eq('id', subscriber.id);
            }
          } catch (apiError) {
            console.error(`API error migrating subscriber ${subscriber.email}:`, apiError);
            migrationResults.failed++;
            migrationResults.errors.push({ email: subscriber.email, error: apiError.message || 'API request failed' });

            // Update subscriber status to 'failed'
            await supabaseAdmin
              .from('email_migration')
              .update({ status: 'failed', error_message: apiError.message || 'API request failed' })
              .eq('id', subscriber.id);
          }
        }

        console.log(`Migration batch completed. Results:`, migrationResults);

        return new Response(
          JSON.stringify({ 
            message: `Successfully processed batch ${batchId}.`, 
            batchId, 
            fileName,
            results: migrationResults 
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      } catch (err) {
        console.error('Unexpected error during migration:', err);
        return new Response(
          JSON.stringify({ error: 'An unexpected error occurred during migration', details: err.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    if (action === 'clear-queue') {
      try {
        const { status } = params;

        if (!status || (status !== 'pending' && status !== 'failed')) {
          return new Response(
            JSON.stringify({ error: 'Invalid status provided. Must be "pending" or "failed".' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Delete subscribers with the specified status
        const { error: deleteError } = await supabaseAdmin
          .from('email_migration')
          .delete()
          .eq('status', status);

        if (deleteError) {
          console.error(`Error clearing ${status} queue:`, deleteError);
          return new Response(
            JSON.stringify({ error: `Failed to clear ${status} queue`, details: deleteError.message }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        console.log(`Successfully cleared ${status} queue.`);

        return new Response(
          JSON.stringify({ message: `Successfully cleared ${status} queue.` }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      } catch (err) {
        console.error('Unexpected error during queue clearing:', err);
        return new Response(
          JSON.stringify({ error: 'An unexpected error occurred during queue clearing', details: err.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    if (action === 'reset-failed') {
      try {
        // Reset failed migrations to pending
        const { error: updateError } = await supabaseAdmin
          .from('email_migration')
          .update({ status: 'pending', error_message: null })
          .eq('status', 'failed');

        if (updateError) {
          console.error("Error resetting failed migrations:", updateError);
          return new Response(
            JSON.stringify({ error: "Failed to reset failed migrations", details: updateError.message }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        console.log("Successfully reset failed migrations to pending.");

        return new Response(
          JSON.stringify({ message: "Successfully reset failed migrations to pending." }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      } catch (err) {
        console.error('Unexpected error during reset failed migrations:', err);
        return new Response(
          JSON.stringify({ error: 'An unexpected error occurred during reset failed migrations', details: err.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    if (action === 'reset-in-progress') {
      try {
        // Reset in_progress subscribers back to pending
        const { data, error: updateError } = await supabaseAdmin
          .from('email_migration')
          .update({ status: 'pending', migration_batch: null })
          .eq('status', 'in_progress')
          .select('id');

        if (updateError) {
          console.error("Error resetting in_progress subscribers:", updateError);
          return new Response(
            JSON.stringify({ error: "Failed to reset in_progress subscribers", details: updateError.message }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const count = data ? data.length : 0;
        console.log(`Successfully reset ${count} in_progress subscribers back to pending.`);

        return new Response(
          JSON.stringify({ message: `Successfully reset ${count} in_progress subscribers back to pending.`, count }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      } catch (err) {
        console.error('Unexpected error during reset in_progress:', err);
        return new Response(
          JSON.stringify({ error: 'An unexpected error occurred during reset in_progress', details: err.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    if (action === 'stats') {
      try {
        console.log('Getting migration statistics...');
        
        // Get overall stats
        const { data: statsData, error: statsError } = await supabaseAdmin
          .from('email_migration_stats')
          .select('*')
          .limit(1)
          .maybeSingle();
        
        if (statsError) {
          console.error("Error fetching migration stats:", statsError);
          return new Response(
            JSON.stringify({ error: "Failed to fetch migration statistics", details: statsError.message }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Get counts for each status using the new database function
        const { data: statusCounts, error: countError } = await supabaseAdmin.rpc(
          'get_status_counts'
        );

        if (countError) {
          console.error("Error fetching status counts:", countError);
          return new Response(
            JSON.stringify({ error: "Failed to fetch status counts", details: countError.message }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Prepare the counts object with default values
        const counts = {
          pending: 0,
          in_progress: 0,
          migrated: 0,
          failed: 0,
          already_exists: 0
        };

        // Format the status counts 
        if (statusCounts && Array.isArray(statusCounts)) {
          statusCounts.forEach(item => {
            if (item && item.status && typeof item.count === 'number') {
              counts[item.status as keyof typeof counts] = item.count;
            }
          });
        }

        // Get latest batches
        const { data: batchesData, error: batchesError } = await supabaseAdmin
          .from('email_migration')
          .select('migration_batch, count(*)')
          .not('migration_batch', 'is', null)
          .group('migration_batch')
          .order('migration_batch', { ascending: false })
          .limit(5);

        if (batchesError) {
          console.error("Error fetching latest batches:", batchesError);
          // Continue with the data we have
        }

        // Get automation settings
        const { data: automationData, error: automationError } = await supabaseAdmin
          .from('email_migration_automation')
          .select('*')
          .limit(1)
          .maybeSingle();

        let automation = {
          enabled: false,
          daily_total_target: 1000,
          start_hour: 9,
          end_hour: 17,
          min_batch_size: 10,
          max_batch_size: 100,
          publication_id: null
        };

        if (!automationError && automationData) {
          automation = { 
            ...automation,
            ...automationData
          };
        }

        // Prepare and return the response
        const response = {
          stats: statsData || {
            id: '0',
            total_subscribers: counts.pending + counts.in_progress + counts.migrated + counts.failed + counts.already_exists,
            migrated_subscribers: counts.migrated,
            failed_subscribers: counts.failed,
            last_batch_id: null,
            last_batch_date: null
          },
          counts,
          latest_batches: batchesData || [],
          automation
        };

        console.log('Returning migration stats:', response);
        
        return new Response(
          JSON.stringify(response),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      } catch (err) {
        console.error('Unexpected error:', err);
        return new Response(
          JSON.stringify({ error: 'An unexpected error occurred', details: err.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    return new Response(
      JSON.stringify({ error: 'Invalid action' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('Unexpected error:', err);
    return new Response(
      JSON.stringify({ error: 'An unexpected error occurred', details: err.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
