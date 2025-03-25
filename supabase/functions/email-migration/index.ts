
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
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

// New function to log detailed debugging information
const logDebug = async (context: string, data: any, isError = false) => {
  const timestamp = new Date().toISOString();
  const logPrefix = `[EMAIL-MIGRATION][${timestamp}][${context}]`;
  
  if (isError) {
    console.error(`${logPrefix} ERROR:`, data);
  } else {
    console.log(`${logPrefix}:`, typeof data === 'object' ? JSON.stringify(data) : data);
  }
  
  // Log to the database for persistent debugging
  try {
    const { error } = await supabaseAdmin
      .from('email_migration_logs')
      .insert({
        context,
        timestamp: new Date().toISOString(),
        data: typeof data === 'object' ? data : { message: data },
        is_error: isError
      });
      
    if (error) {
      console.error(`${logPrefix} Failed to log to database:`, error);
    }
  } catch (err) {
    // Fail silently to not disrupt the main process
    console.error(`${logPrefix} Exception during database logging:`, err);
  }
};

// New function to handle API responses with detailed logging
const handleApiResponse = async (response: Response, email: string, context: string) => {
  const responseStatus = response.status;
  let responseData = null;
  
  try {
    responseData = await response.json();
  } catch (e) {
    await logDebug(`${context}-parse-error`, { email, status: responseStatus, error: e.message }, true);
    return { success: false, status: responseStatus, error: "Failed to parse API response" };
  }

  // Log full response details including all headers
  await logDebug(`${context}-response`, { 
    email, 
    status: responseStatus, 
    body: responseData,
    headers: Object.fromEntries(response.headers.entries())
  });
  
  return { 
    success: responseStatus >= 200 && responseStatus < 300,
    status: responseStatus,
    data: responseData
  };
};

// New function to add delay for rate limiting
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

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
    await logDebug('request', { action, params });

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

        await logDebug('import-start', { fileName, count: validSubscribers.length });

        const { data, error } = await supabaseAdmin.rpc('import_subscribers', {
          subscribers_data: JSON.stringify(validSubscribers),
        });

        if (error) {
          await logDebug('import-error', error, true);
          return new Response(
            JSON.stringify({ error: "Failed to import subscribers", details: error.message }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        await logDebug('import-complete', data);

        return new Response(
          JSON.stringify({ message: `Successfully queued ${validSubscribers.length} subscribers for migration.`, ...data }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      } catch (err) {
        await logDebug('import-exception', err, true);
        return new Response(
          JSON.stringify({ error: 'An unexpected error occurred during import', details: err.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    if (action === 'migrate-batch') {
      try {
        const { batchSize, publicationId, fileName } = params;
        await logDebug('migrate-batch-params', { batchSize, publicationId, fileName });

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

        await logDebug('migrate-batch-start', `Attempting to migrate a batch of ${batchSize} subscribers...`);

        // Fetch subscribers with 'pending' status
        const { data: pendingSubscribers, error: selectError } = await supabaseAdmin
          .from('email_migration')
          .select('*')
          .eq('status', 'pending')
          .limit(batchSize);

        if (selectError) {
          await logDebug('fetch-pending-error', selectError, true);
          return new Response(
            JSON.stringify({ error: "Failed to fetch pending subscribers", details: selectError.message }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        if (!pendingSubscribers || pendingSubscribers.length === 0) {
          await logDebug('no-pending-subscribers', 'No pending subscribers to migrate');
          return new Response(
            JSON.stringify({ message: 'No pending subscribers to migrate' }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        await logDebug('pending-subscribers-fetched', { count: pendingSubscribers.length });

        // Update status to 'in_progress'
        const subscriberIds = pendingSubscribers.map(subscriber => subscriber.id);
        const batchId = crypto.randomUUID();

        const { error: updateError } = await supabaseAdmin
          .from('email_migration')
          .update({ status: 'in_progress', migration_batch: batchId })
          .in('id', subscriberIds);

        if (updateError) {
          await logDebug('update-status-error', updateError, true);
          return new Response(
            JSON.stringify({ error: "Failed to update subscriber status", details: updateError.message }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        await logDebug('batch-updated', { batchId, count: subscriberIds.length });

        // Call the external API to migrate subscribers
        const migrationResults = {
          success: 0,
          duplicates: 0,
          failed: 0,
          errors: [] as any[],
          total: pendingSubscribers.length
        };

        const apiKey = Deno.env.get('BEEHIIV_API_KEY');
        if (!apiKey) {
          await logDebug('api-key-missing', 'BEEHIIV_API_KEY environment variable is not set', true);
          return new Response(
            JSON.stringify({ error: 'API key not configured on server' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Process each subscriber
        for (const subscriber of pendingSubscribers) {
          const apiUrl = 'https://api.beehiiv.com/v2/publications/' + publicationId + '/subscriptions';
          
          try {
            await logDebug('processing-subscriber', { email: subscriber.email, id: subscriber.id });
            
            // Log API request details for debugging
            const requestBody = {
              email: subscriber.email,
              double_opt_in: false,
              send_welcome_email: false,
              custom_fields: {
                first_name: subscriber.first_name || '',
                last_name: subscriber.last_name || ''
              }
            };
            
            await logDebug('api-request', { 
              url: apiUrl, 
              body: requestBody,
              email: subscriber.email,
              subscriberId: subscriber.id
            });
            
            // Make the API request
            const startTime = Date.now();
            const response = await fetch(apiUrl, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`,
              },
              body: JSON.stringify(requestBody),
            });
            const responseTime = Date.now() - startTime;
            
            await logDebug('api-response-time', { email: subscriber.email, ms: responseTime });
            
            // Process the API response
            const apiResponse = await handleApiResponse(response, subscriber.email, 'beehiiv-api');
            
            // Handle the response based on status code
            if (response.status === 201) {
              // Successful migration
              migrationResults.success++;
              await logDebug('migration-success', { email: subscriber.email, subscriberId: apiResponse.data?.data?.id });

              // Update subscriber status to 'migrated'
              const updateResult = await supabaseAdmin
                .from('email_migration')
                .update({ 
                  status: 'migrated', 
                  subscriber_id: apiResponse.data?.data?.id, 
                  migrated_at: new Date().toISOString(),
                  error_message: null
                })
                .eq('id', subscriber.id);
                
              if (updateResult.error) {
                await logDebug('update-success-status-error', { 
                  email: subscriber.email, 
                  error: updateResult.error 
                }, true);
              }
            } else if (response.status === 409) {
              // Duplicate subscriber
              migrationResults.duplicates++;
              await logDebug('duplicate-subscriber', { email: subscriber.email });

              // Update subscriber status to 'already_exists'
              const updateResult = await supabaseAdmin
                .from('email_migration')
                .update({ 
                  status: 'already_exists',
                  error_message: apiResponse.data?.message || 'Subscriber already exists'
                })
                .eq('id', subscriber.id);
                
              if (updateResult.error) {
                await logDebug('update-duplicate-status-error', { 
                  email: subscriber.email, 
                  error: updateResult.error 
                }, true);
              }
            } else if (response.status === 429) {
              // Rate limited - handle specially
              migrationResults.failed++;
              const retryAfter = response.headers.get('Retry-After') || '60';
              const errorMsg = `Rate limited by BeehiiV API. Retry after ${retryAfter} seconds`;
              
              await logDebug('rate-limited', { 
                email: subscriber.email, 
                retryAfter,
                headers: Object.fromEntries(response.headers.entries())
              }, true);
              
              migrationResults.errors.push({ 
                email: subscriber.email, 
                error: errorMsg 
              });

              // Update subscriber status back to 'pending' to retry later
              const updateResult = await supabaseAdmin
                .from('email_migration')
                .update({ 
                  status: 'pending', 
                  migration_batch: null,
                  error_message: errorMsg
                })
                .eq('id', subscriber.id);
                
              if (updateResult.error) {
                await logDebug('update-rate-limited-status-error', { 
                  email: subscriber.email, 
                  error: updateResult.error 
                }, true);
              }
              
              // Add a delay before the next request based on retry-after header
              await delay(parseInt(retryAfter, 10) * 1000);
            } else {
              // Failed migration for other reasons
              migrationResults.failed++;
              const errorMsg = apiResponse.data?.message || `HTTP ${response.status}: Unknown error`;
              
              await logDebug('migration-failed', { 
                email: subscriber.email, 
                status: response.status,
                error: errorMsg
              }, true);
              
              migrationResults.errors.push({ 
                email: subscriber.email, 
                error: errorMsg 
              });

              // Update subscriber status to 'failed'
              const updateResult = await supabaseAdmin
                .from('email_migration')
                .update({ 
                  status: 'failed', 
                  error_message: errorMsg
                })
                .eq('id', subscriber.id);
                
              if (updateResult.error) {
                await logDebug('update-failed-status-error', { 
                  email: subscriber.email, 
                  error: updateResult.error 
                }, true);
              }
            }
            
            // Add a small delay between requests to avoid overwhelming the API
            await delay(300);
          } catch (apiError) {
            migrationResults.failed++;
            const errorMsg = apiError.message || 'API request failed';
            
            await logDebug('api-error', { 
              email: subscriber.email, 
              error: errorMsg,
              stack: apiError.stack
            }, true);
            
            migrationResults.errors.push({ 
              email: subscriber.email, 
              error: errorMsg 
            });

            // Update subscriber status to 'failed'
            const updateResult = await supabaseAdmin
              .from('email_migration')
              .update({ 
                status: 'failed', 
                error_message: errorMsg
              })
              .eq('id', subscriber.id);
              
            if (updateResult.error) {
              await logDebug('update-exception-status-error', { 
                email: subscriber.email, 
                error: updateResult.error 
              }, true);
            }
            
            // Add a delay to recover from potential errors
            await delay(500);
          }
        }

        await logDebug('migration-batch-complete', migrationResults);

        // Update the stats table with the latest information
        try {
          // Get the current counts
          const { data: currentCounts, error: countError } = await supabaseAdmin.rpc('get_status_counts');
          
          if (countError) {
            await logDebug('get-counts-error', countError, true);
          }
          
          const counts = {
            migrated: 0,
            failed: 0,
            total: 0
          };
          
          if (currentCounts && Array.isArray(currentCounts)) {
            currentCounts.forEach((item: any) => {
              if (item && item.status) {
                if (item.status === 'migrated') {
                  counts.migrated = item.count;
                } else if (item.status === 'failed') {
                  counts.failed = item.count;
                }
                counts.total += item.count;
              }
            });
          }
          
          // Update the stats table
          const { error: statsError } = await supabaseAdmin
            .from('email_migration_stats')
            .update({
              migrated_subscribers: counts.migrated,
              failed_subscribers: counts.failed,
              total_subscribers: counts.total,
              last_batch_id: batchId,
              last_batch_date: new Date().toISOString()
            })
            .eq('id', '7250c6e9-77ab-41c5-a88c-98c764c4f432'); // Use the existing stats ID
            
          if (statsError) {
            await logDebug('update-stats-error', statsError, true);
          }
        } catch (statsErr) {
          await logDebug('stats-update-exception', statsErr, true);
        }

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
        await logDebug('migrate-batch-exception', err, true);
        return new Response(
          JSON.stringify({ error: 'An unexpected error occurred during migration', details: err.message }),
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
          await logDebug("Error resetting in_progress subscribers:", updateError, true);
          return new Response(
            JSON.stringify({ error: "Failed to reset in_progress subscribers", details: updateError.message }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const count = data ? data.length : 0;
        await logDebug(`Successfully reset ${count} in_progress subscribers back to pending.`);

        return new Response(
          JSON.stringify({ message: `Successfully reset ${count} in_progress subscribers back to pending.`, count }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      } catch (err) {
        await logDebug('Unexpected error during reset in_progress:', err, true);
        return new Response(
          JSON.stringify({ error: 'An unexpected error occurred during reset in_progress', details: err.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    if (action === 'reset-failed') {
      try {
        // Reset failed migrations to pending
        const { data, error: updateError } = await supabaseAdmin
          .from('email_migration')
          .update({ status: 'pending', error_message: null })
          .eq('status', 'failed')
          .select('id');

        if (updateError) {
          await logDebug("Error resetting failed migrations:", updateError, true);
          return new Response(
            JSON.stringify({ error: "Failed to reset failed migrations", details: updateError.message }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const count = data ? data.length : 0;
        await logDebug(`Successfully reset ${count} failed migrations to pending.`);

        return new Response(
          JSON.stringify({ message: `Successfully reset ${count} failed migrations to pending.`, count }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      } catch (err) {
        await logDebug('Unexpected error during reset failed migrations:', err, true);
        return new Response(
          JSON.stringify({ error: 'An unexpected error occurred during reset failed migrations', details: err.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    if (action === 'stats') {
      try {
        await logDebug('getting-stats', 'Fetching migration statistics');
        
        // Get overall stats
        const { data: statsData, error: statsError } = await supabaseAdmin
          .from('email_migration_stats')
          .select('*')
          .limit(1)
          .maybeSingle();
        
        if (statsError) {
          await logDebug('stats-fetch-error', statsError, true);
          return new Response(
            JSON.stringify({ error: "Failed to fetch migration statistics", details: statsError.message }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Get counts for each status
        const { data: statusCounts, error: countError } = await supabaseAdmin.rpc(
          'get_status_counts'
        );

        if (countError) {
          await logDebug('status-counts-error', countError, true);
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
        const { data: batchesData, error: batchesError } = await supabaseAdmin.rpc(
          'get_migration_batches',
          { limit_count: 5 }
        );

        if (batchesError) {
          await logDebug('batches-fetch-error', batchesError, true);
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

        await logDebug('stats-response', response);
        
        return new Response(
          JSON.stringify(response),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      } catch (err) {
        await logDebug('stats-exception', err, true);
        return new Response(
          JSON.stringify({ error: 'An unexpected error occurred', details: err.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Add an action to check specific subscriber status
    if (action === 'check-subscriber') {
      try {
        const { email } = params;
        
        if (!email) {
          return new Response(
            JSON.stringify({ error: 'Email parameter is required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
        await logDebug('check-subscriber', { email });
        
        const { data, error } = await supabaseAdmin
          .from('email_migration')
          .select('*')
          .eq('email', email)
          .maybeSingle();
          
        if (error) {
          await logDebug('check-subscriber-error', error, true);
          return new Response(
            JSON.stringify({ error: "Failed to check subscriber", details: error.message }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
        return new Response(
          JSON.stringify({ 
            found: !!data,
            subscriber: data 
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      } catch (err) {
        await logDebug('check-subscriber-exception', err, true);
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
    await logDebug('unhandled-exception', err, true);
    return new Response(
      JSON.stringify({ error: 'An unexpected error occurred', details: err.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
