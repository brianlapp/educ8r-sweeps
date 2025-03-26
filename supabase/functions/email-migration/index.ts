
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { cors } from '../_shared/cors.ts';

const MIGRATION_FUNCTION_VERSION = "1.2.0-http-repository";

const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
const supabaseAdminKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

const supabase = createClient(supabaseUrl, supabaseKey);
const supabaseAdmin = createClient(supabaseUrl, supabaseAdminKey);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const handleDbError = (error: any, message: string) => {
  console.error(message, error);
  return { error: `${message}: ${error.message}` };
};

const isValidEmail = (email: string) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

const logDebug = async (context: string, data: any, isError = false) => {
  const timestamp = new Date().toISOString();
  const logPrefix = `[EMAIL-MIGRATION][${timestamp}][${context}]`;
  
  if (isError) {
    console.error(`${logPrefix} ERROR:`, data);
  } else {
    console.log(`${logPrefix}:`, typeof data === 'object' ? JSON.stringify(data) : data);
  }
  
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
    console.error(`${logPrefix} Exception during database logging:`, err);
  }
};

const handleApiResponse = async (response: Response, email: string, context: string) => {
  const responseStatus = response.status;
  let responseData = null;
  let responseText = null;
  
  try {
    responseText = await response.clone().text();
    
    try {
      responseData = await response.json();
    } catch (jsonError) {
      await logDebug(`${context}-parse-error`, { 
        email, 
        status: responseStatus, 
        error: jsonError.message,
        responseText 
      }, true);
      
      responseData = { message: responseText };
    }
  } catch (e) {
    await logDebug(`${context}-response-error`, { 
      email, 
      status: responseStatus, 
      error: e.message 
    }, true);
    return { 
      success: false, 
      status: responseStatus, 
      error: "Failed to process API response" 
    };
  }

  await logDebug(`${context}-response`, { 
    email, 
    status: responseStatus, 
    body: responseData,
    responseText: responseText,
    headers: Object.fromEntries(response.headers.entries())
  });
  
  return { 
    success: responseStatus >= 200 && responseStatus < 300,
    status: responseStatus,
    data: responseData,
    text: responseText
  };
};

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const listRepositoryFiles = async () => {
  try {
    const command = new Deno.Command("ls", {
      args: ["./public/emails"],
      stdout: "piped",
    });
    
    const output = await command.output();
    const files = new TextDecoder().decode(output.stdout).trim().split("\n");
    
    const filteredFiles = files
      .filter(file => file.endsWith('.csv') || file.endsWith('.json'))
      .filter(file => !file.includes('/'));
    
    console.log(`Found ${filteredFiles.length} files in repository`);
    
    return { success: true, files: filteredFiles };
  } catch (error) {
    console.error('Error listing repository files:', error);
    return { success: false, error: error.message };
  }
};

const readRepositoryFile = async (fileName: string) => {
  try {
    const baseUrl = Deno.env.get('BASE_URL') || 'https://reading-rewards.educ8r.com';
    const fileUrl = `${baseUrl}/emails/${fileName}`;
    
    console.log(`Fetching repository file via HTTP: ${fileUrl}`);
    
    const response = await fetch(fileUrl);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch file: ${response.status} ${response.statusText}`);
    }
    
    const fileContent = await response.text();
    
    if (fileName.endsWith('.json')) {
      const data = JSON.parse(fileContent);
      
      let subscribers = Array.isArray(data) ? data : null;
      
      if (!subscribers) {
        if (data.subscribers) subscribers = data.subscribers;
        else if (data.data) subscribers = data.data;
        else if (data.results) subscribers = data.results;
        else {
          throw new Error('Could not find subscribers array in JSON file');
        }
      }
      
      return subscribers;
    } else if (fileName.endsWith('.csv')) {
      const rows = fileContent.split('\n');
      
      const headers = rows[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
      
      const subscribers = [];
      for (let i = 1; i < rows.length; i++) {
        if (!rows[i].trim()) continue;
        
        const values = rows[i].split(',').map(v => v.trim().replace(/^"|"$/g, ''));
        
        const subscriber: Record<string, string> = {};
        headers.forEach((header, index) => {
          if (index < values.length) {
            subscriber[header] = values[index];
          }
        });
        
        subscribers.push(subscriber);
      }
      
      return subscribers;
    } else {
      throw new Error('Unsupported file format');
    }
  } catch (error) {
    console.error(`Error reading repository file ${fileName}:`, error);
    throw error;
  }
};

const importRepositoryFile = async (fileName: string) => {
  try {
    const subscribers = await readRepositoryFile(fileName);
    
    if (!Array.isArray(subscribers) || subscribers.length === 0) {
      return { success: false, error: 'No subscribers found in file' };
    }
    
    const formattedSubscribers = subscribers.map((sub: any) => {
      const email = sub.email || sub.Email || sub.EMAIL;
      const firstName = sub.first_name || sub.firstName || sub.FirstName || sub['First Name'] || '';
      const lastName = sub.last_name || sub.lastName || sub.LastName || sub['Last Name'] || '';
      
      return { email, first_name: firstName, last_name: lastName };
    }).filter((sub: any) => sub.email);
    
    if (formattedSubscribers.length === 0) {
      return { success: false, error: 'No valid email addresses found in file' };
    }
    
    const CHUNK_SIZE = 50;
    
    let totalInserted = 0;
    let totalDuplicates = 0;
    let totalErrors = 0;
    let batchCount = 0;
    
    for (let i = 0; i < formattedSubscribers.length; i += CHUNK_SIZE) {
      const chunk = formattedSubscribers.slice(i, i + CHUNK_SIZE);
      batchCount++;
      
      const { data, error } = await supabaseAdmin.rpc('import_subscribers', {
        subscribers_data: chunk
      });
      
      if (error) {
        console.error(`Chunk ${batchCount} error:`, error);
        totalErrors += chunk.length;
      } else {
        console.log(`Chunk ${batchCount} processed:`, data);
        totalInserted += data.inserted || 0;
        totalDuplicates += data.duplicates || 0;
        totalErrors += data.errors || 0;
      }
      
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    try {
      const sourcePath = `./public/emails/${fileName}`;
      const destPath = `./public/emails/completed/${fileName}`;
      
      try {
        await Deno.mkdir('./public/emails/completed', { recursive: true });
      } catch (e) {
        // Directory may already exist, ignore error
      }
      
      await Deno.rename(sourcePath, destPath);
      console.log(`Moved file to ${destPath}`);
    } catch (moveError) {
      console.error('Error moving file to completed folder:', moveError);
    }
    
    return {
      success: true,
      total: formattedSubscribers.length,
      inserted: totalInserted,
      duplicates: totalDuplicates,
      errors: totalErrors
    };
  } catch (error) {
    console.error('Repository import error:', error);
    return { success: false, error: error.message };
  }
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    });
  }

  try {
    // Extract the request body and detect what format it's in
    const requestBody = await req.json();
    let action, params, fileName;

    // Normalize the request structure to handle both formats
    if (requestBody.action) {
      // Standard format: { action, params, fileName }
      action = requestBody.action;
      params = requestBody.params || {};
      fileName = requestBody.fileName;
    } else if (requestBody.subscribers) {
      // Direct subscribers format: assume it's an import action
      action = 'import';
      params = {
        subscribers: requestBody.subscribers,
        fileName: requestBody.fileName
      };
      fileName = requestBody.fileName;
    } else {
      // Unknown format
      return new Response(
        JSON.stringify({ error: 'Invalid request format' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    await logDebug('request', { action, params, functionVersion: MIGRATION_FUNCTION_VERSION });

    const url = new URL(req.url);
    Deno.env.set('BASE_URL', `${url.protocol}//${url.host}`);
    
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

        const BATCH_SIZE = 100;
        let inserted = 0;
        let duplicates = 0;
        let errors = 0;
        
        for (let i = 0; i < validSubscribers.length; i += BATCH_SIZE) {
          const batch = validSubscribers.slice(i, i + BATCH_SIZE);
          try {
            const { data, error } = await supabaseAdmin.rpc('import_subscribers', {
              subscribers_data: JSON.stringify(batch),
            });

            if (error) {
              await logDebug('import-batch-error', {
                batchIndex: i / BATCH_SIZE,
                error: error.message
              }, true);
              errors += batch.length;
              continue;
            }

            inserted += data.inserted || 0;
            duplicates += data.duplicates || 0;
            errors += data.errors || 0;
            
            await logDebug('import-batch-complete', {
              batchIndex: i / BATCH_SIZE,
              batchSize: batch.length,
              results: data
            });
          } catch (batchError: any) {
            await logDebug('import-batch-exception', {
              batchIndex: i / BATCH_SIZE, 
              error: batchError.message
            }, true);
            errors += batch.length;
          }
        }

        const results = {
          inserted,
          duplicates,
          errors,
          total: validSubscribers.length
        };
        
        await logDebug('import-complete', results);

        return new Response(
          JSON.stringify({ 
            message: `Successfully processed ${validSubscribers.length} subscribers.`, 
            ...results 
          }),
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
        await logDebug('migrate-batch-params', { batchSize, publicationId, fileName, functionVersion: MIGRATION_FUNCTION_VERSION });

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

        const migrationResults = {
          success: 0,
          duplicates: 0,
          failed: 0,
          errors: [] as any[],
          total: pendingSubscribers.length,
          functionVersion: MIGRATION_FUNCTION_VERSION
        };

        const apiKey = Deno.env.get('BEEHIIV_API_KEY');
        if (!apiKey) {
          await logDebug('api-key-missing', 'BEEHIIV_API_KEY environment variable is not set', true);
          return new Response(
            JSON.stringify({ error: 'API key not configured on server' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        for (const subscriber of pendingSubscribers) {
          const apiUrl = 'https://api.beehiiv.com/v2/publications/' + publicationId + '/subscriptions';
          
          try {
            await logDebug('processing-subscriber', { email: subscriber.email, id: subscriber.id });
            
            const requestBody = {
              email: subscriber.email,
              double_opt_in: false,
              send_welcome_email: false,
              custom_fields: [
                {
                  name: "first_name",
                  value: subscriber.first_name || ''
                },
                {
                  name: "last_name",
                  value: subscriber.last_name || ''
                }
              ]
            };
            
            await logDebug('api-request', { 
              url: apiUrl, 
              body: requestBody,
              email: subscriber.email,
              subscriberId: subscriber.id,
              functionVersion: MIGRATION_FUNCTION_VERSION,
              format: "ARRAY"
            });
            
            const startTime = Date.now();
            let response;
            try {
              response = await fetch(apiUrl, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${apiKey}`,
                },
                body: JSON.stringify(requestBody),
              });
            } catch (fetchError) {
              await logDebug('fetch-error', { 
                email: subscriber.email, 
                error: fetchError.message,
                stack: fetchError.stack
              }, true);
              
              throw new Error(`Network error: ${fetchError.message}`);
            }
            
            const responseTime = Date.now() - startTime;
            
            await logDebug('api-response-time', { email: subscriber.email, ms: responseTime });
            
            const apiResponse = await handleApiResponse(response, subscriber.email, 'beehiiv-api');
            
            if (response.status === 201) {
              migrationResults.success++;
              await logDebug('migration-success', { email: subscriber.email, subscriberId: apiResponse.data?.data?.id });

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
              migrationResults.duplicates++;
              await logDebug('duplicate-subscriber', { email: subscriber.email });

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
              
              await delay(parseInt(retryAfter, 10) * 1000);
            } else {
              migrationResults.failed++;
              
              let errorMsg;
              if (apiResponse.data && apiResponse.data.message) {
                errorMsg = apiResponse.data.message;
              } else if (apiResponse.text) {
                errorMsg = `HTTP ${response.status}: ${apiResponse.text.substring(0, 100)}`;
              } else {
                errorMsg = `HTTP ${response.status}: Unknown error`;
              }
              
              await logDebug('migration-failed', { 
                email: subscriber.email, 
                status: response.status,
                error: errorMsg,
                response: apiResponse
              }, true);
              
              migrationResults.errors.push({ 
                email: subscriber.email, 
                error: errorMsg 
              });

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
            
            await delay(500);
          }
        }

        await logDebug('migration-batch-complete', migrationResults);

        try {
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
          
          const { error: statsError } = await supabaseAdmin
            .from('email_migration_stats')
            .update({
              migrated_subscribers: counts.migrated,
              failed_subscribers: counts.failed,
              total_subscribers: counts.total,
              last_batch_id: batchId,
              last_batch_date: new Date().toISOString()
            })
            .eq('id', '7250c6e9-77ab-41c5-a88c-98c764c4f432');
            
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
          JSON.stringify({ 
            message: `Successfully reset ${count} in_progress subscribers back to pending.`, 
            count,
            functionVersion: MIGRATION_FUNCTION_VERSION 
          }),
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
          JSON.stringify({ 
            message: `Successfully reset ${count} failed migrations to pending.`, 
            count,
            functionVersion: MIGRATION_FUNCTION_VERSION 
          }),
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

        const counts = {
          pending: 0,
          in_progress: 0,
          migrated: 0,
          failed: 0,
          already_exists: 0
        };

        if (statusCounts && Array.isArray(statusCounts)) {
          statusCounts.forEach(item => {
            if (item && item.status && typeof item.count === 'number') {
              counts[item.status as keyof typeof counts] = item.count;
            }
          });
        }

        const { data: batchesData, error: batchesError } = await supabaseAdmin.rpc(
          'get_migration_batches',
          { limit_count: 5 }
        );

        if (batchesError) {
          await logDebug('batches-fetch-error', batchesError, true);
        }

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
          automation,
          functionVersion: MIGRATION_FUNCTION_VERSION
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

    if (action === 'get-stuck-subscribers') {
      try {
        const { data, error } = await supabaseAdmin
          .from('email_migration')
          .select('*')
          .eq('status', 'in_progress')
          .order('updated_at', { ascending: false });
        
        if (error) {
          await logDebug('get-stuck-subscribers-error', error, true);
          return new Response(
            JSON.stringify({ error: "Failed to get stuck subscribers", details: error.message }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
        await logDebug('get-stuck-subscribers-success', { count: data.length });
        
        return new Response(
          JSON.stringify({ 
            count: data.length,
            subscribers: data,
            functionVersion: MIGRATION_FUNCTION_VERSION 
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      } catch (err) {
        await logDebug('get-stuck-subscribers-exception', err, true);
        return new Response(
          JSON.stringify({ error: 'An unexpected error occurred', details: err.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    if (action === 'analyze-stuck-subscribers') {
      try {
        const { data: stuckSubscribers, error: stuckError } = await supabaseAdmin
          .from('email_migration')
          .select('*')
          .eq('status', 'in_progress')
          .order('updated_at', { ascending: false });
        
        if (stuckError) {
          await logDebug('analyze-stuck-subscribers-error', stuckError, true);
          return new Response(
            JSON.stringify({ error: "Failed to get stuck subscribers for analysis", details: stuckError.message }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
        if (!stuckSubscribers || stuckSubscribers.length === 0) {
          return new Response(
            JSON.stringify({ 
              count: 0,
              message: "No stuck subscribers found for analysis",
              analysis: {},
              functionVersion: MIGRATION_FUNCTION_VERSION 
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
        const batchGroups: { [key: string]: any[] } = {};
        for (const subscriber of stuckSubscribers) {
          const batchId = subscriber.migration_batch || 'no_batch';
          if (!batchGroups[batchId]) {
            batchGroups[batchId] = [];
          }
          batchGroups[batchId].push(subscriber);
        }
        
        let oldestBatch = null;
        let oldestTimestamp = null;
        
        for (const subscriber of stuckSubscribers) {
          const updatedAt = new Date(subscriber.updated_at).getTime();
          if (oldestTimestamp === null || updatedAt < oldestTimestamp) {
            oldestTimestamp = updatedAt;
            oldestBatch = {
              id: subscriber.migration_batch,
              updated_at: subscriber.updated_at
            };
          }
        }
        
        const potentialInvalidEmails = stuckSubscribers.filter(sub => {
          const email = sub.email || '';
          return email.includes('..') || 
                 email.includes(',,') || 
                 email.includes('@@') ||
                 email.startsWith('.') ||
                 email.endsWith('.') ||
                 /[^\x00-\x7F]/.test(email);
        });
        
        const potentialIssues = [];
        const recommendations = [];
        
        const apiKey = Deno.env.get('BEEHIIV_API_KEY');
        if (!apiKey) {
          potentialIssues.push("BeehiiV API key not configured");
          recommendations.push("Configure the BEEHIIV_API_KEY environment variable in Supabase");
        }
        
        if (Object.keys(batchGroups).length > 1) {
          potentialIssues.push("Multiple migration batches are stuck");
          recommendations.push("Use the 'Reset In-Progress Subscribers' function to reset all stuck subscribers");
        }
        
        if (oldestTimestamp && (Date.now() - oldestTimestamp) > 30 * 60 * 1000) {
          potentialIssues.push("Subscribers have been stuck for more than 30 minutes");
          recommendations.push("Reset in-progress subscribers and check for system-wide issues");
        }
        
        if (potentialInvalidEmails.length > 0) {
          potentialIssues.push("Some subscribers have potentially invalid email addresses");
          recommendations.push("Check for and fix invalid email formats in the database");
        }
        
        const analysis = {
          total_stuck: stuckSubscribers.length,
          batch_groups: Object.keys(batchGroups).map(batchId => ({
            batch_id: batchId,
            count: batchGroups[batchId].length
          })),
          oldest_batch: oldestBatch,
          potential_invalid_emails: potentialInvalidEmails.length,
          potential_issues: potentialIssues,
          recommendations: recommendations
        };
        
        return new Response(
          JSON.stringify({ 
            count: stuckSubscribers.length,
            analysis,
            functionVersion: MIGRATION_FUNCTION_VERSION 
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      } catch (err) {
        await logDebug('analyze-stuck-subscribers-exception', err, true);
        return new Response(
          JSON.stringify({ error: 'An unexpected error occurred', details: err.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    if (action === 'repository-files') {
      try {
        const result = await listRepositoryFiles();
        
        return new Response(
          JSON.stringify({
            ...result,
            functionVersion: MIGRATION_FUNCTION_VERSION
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      } catch (err) {
        await logDebug('repository-files-exception', err, true);
        return new Response(
          JSON.stringify({ error: 'An unexpected error occurred', details: err.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    if (action === 'import-repository-file') {
      try {
        if (!fileName) {
          return new Response(
            JSON.stringify({ error: 'fileName is required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
        await logDebug('import-repository-file', { fileName, baseUrl: Deno.env.get('BASE_URL') });
        
        const result = await importRepositoryFile(fileName);
        
        return new Response(
          JSON.stringify({
            ...result,
            fileName,
            functionVersion: MIGRATION_FUNCTION_VERSION
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      } catch (err) {
        await logDebug('import-repository-file-exception', err, true);
        return new Response(
          JSON.stringify({ error: 'An unexpected error occurred', details: err.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    if (action === 'version-check') {
      return new Response(
        JSON.stringify({ 
          version: MIGRATION_FUNCTION_VERSION,
          customFieldsFormat: "ARRAY",
          environment: {
            apiKey: !!Deno.env.get('BEEHIIV_API_KEY'),
            hasSupabaseKeys: !!supabaseUrl && !!supabaseKey && !!supabaseAdminKey
          }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: `Unknown action: ${action}` }),
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
