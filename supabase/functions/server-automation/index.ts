import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Initialize Supabase client
const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
const supabaseAdminKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const supabaseAdmin = createClient(supabaseUrl, supabaseAdminKey);

// Add a version identifier to verify deployment
const AUTOMATION_FUNCTION_VERSION = "1.2.0-http-file-access";

// Handle CORS
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Utility function to handle errors
const handleError = (error: any, context: string) => {
  console.error(`[${context}] Error:`, error);
  return { error: `${context} failed: ${error.message}` };
};

// Utility function to add delay
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Utility function to log details to database
const logDebug = async (context: string, data: any, isError = false) => {
  const timestamp = new Date().toISOString();
  const logPrefix = `[SERVER-AUTOMATION][${timestamp}][${context}]`;
  
  if (isError) {
    console.error(`${logPrefix} ERROR:`, data);
  } else {
    console.log(`${logPrefix}:`, typeof data === 'object' ? JSON.stringify(data) : data);
  }
  
  try {
    await supabaseAdmin
      .from('email_migration_logs')
      .insert({
        context,
        timestamp: new Date().toISOString(),
        data: typeof data === 'object' ? data : { message: data },
        is_error: isError
      });
  } catch (err) {
    // Fail silently to not disrupt the main process
    console.error(`${logPrefix} Failed to log to database:`, err);
  }
};

// Update the automation status and heartbeat
const updateAutomationStatus = async (details: any = {}) => {
  try {
    const { error } = await supabaseAdmin
      .from('email_migration_automation')
      .update({ 
        last_heartbeat: new Date().toISOString(),
        status_details: details
      })
      .eq('id', '7250c6e9-77ab-41c5-a88c-98c764c4f432'); // Default automation record ID
      
    if (error) {
      console.error('Failed to update automation status:', error);
    }
  } catch (err) {
    console.error('Exception updating automation status:', err);
  }
};

// Detect and reset stalled records
const resetStalledRecords = async () => {
  try {
    // Find records stuck in "in_progress" for more than 30 minutes
    const thirtyMinutesAgo = new Date();
    thirtyMinutesAgo.setMinutes(thirtyMinutesAgo.getMinutes() - 30);
    
    const { data, error } = await supabaseAdmin
      .from('email_migration')
      .update({ 
        status: 'pending', 
        migration_batch: null,
        error_message: 'Reset by automation - record was stuck'
      })
      .eq('status', 'in_progress')
      .lt('updated_at', thirtyMinutesAgo.toISOString())
      .select('id, email');
      
    if (error) {
      await logDebug('reset-stalled-error', error, true);
      return { reset: 0, error: error.message };
    }
    
    const resetCount = data?.length || 0;
    if (resetCount > 0) {
      await logDebug('reset-stalled-success', { 
        count: resetCount, 
        emails: data?.map(r => r.email).slice(0, 5) 
      });
    }
    
    return { reset: resetCount };
  } catch (err: any) {
    await logDebug('reset-stalled-exception', err, true);
    return { reset: 0, error: err.message };
  }
};

// Main migration process function
const processMigrationBatch = async (batchSize: number, publicationId: string) => {
  try {
    // Reset any stalled records first
    await resetStalledRecords();
    
    // Generate a batch ID
    const batchId = crypto.randomUUID();
    
    // 1. Get subscribers with 'pending' status
    const { data: pendingSubscribers, error: selectError } = await supabaseAdmin
      .from('email_migration')
      .select('*')
      .eq('status', 'pending')
      .limit(batchSize);

    if (selectError) {
      await logDebug('fetch-pending-error', selectError, true);
      return { 
        success: false, 
        error: selectError.message, 
        batchId 
      };
    }

    if (!pendingSubscribers || pendingSubscribers.length === 0) {
      await logDebug('no-pending-subscribers', 'No pending subscribers to migrate');
      return { 
        success: true, 
        message: 'No pending subscribers to migrate', 
        batchId,
        subscribers: 0 
      };
    }

    // 2. Update status to 'in_progress'
    const subscriberIds = pendingSubscribers.map(subscriber => subscriber.id);
    
    const { error: updateError } = await supabaseAdmin
      .from('email_migration')
      .update({ 
        status: 'in_progress', 
        migration_batch: batchId 
      })
      .in('id', subscriberIds);

    if (updateError) {
      await logDebug('update-status-error', updateError, true);
      return { 
        success: false, 
        error: updateError.message, 
        batchId 
      };
    }

    // 3. Update automation status with current batch
    await supabaseAdmin
      .from('email_migration_automation')
      .update({ 
        current_batch_id: batchId,
        last_heartbeat: new Date().toISOString(),
        status_details: { 
          state: 'processing',
          batch_size: pendingSubscribers.length,
          batch_id: batchId,
          started_at: new Date().toISOString()
        }
      })
      .eq('id', '7250c6e9-77ab-41c5-a88c-98c764c4f432');

    // 4. Process the batch by calling the standard email-migration function
    const response = await fetch(`${supabaseUrl}/functions/v1/email-migration`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseAdminKey}`,
      },
      body: JSON.stringify({ 
        action: 'migrate-batch', 
        batchSize: pendingSubscribers.length,
        publicationId,
        fileName: `server-automation-${new Date().toISOString()}` 
      }),
    });

    const result = await response.json();
    
    // 5. Log the results
    await logDebug('batch-processed', { 
      batchId, 
      subscribers: pendingSubscribers.length,
      result 
    });

    // 6. Update automation status with batch results
    await supabaseAdmin
      .from('email_migration_automation')
      .update({ 
        last_heartbeat: new Date().toISOString(),
        status_details: { 
          state: 'completed',
          batch_id: batchId,
          processed: pendingSubscribers.length,
          success: result.results?.success || 0,
          failed: result.results?.failed || 0,
          duplicates: result.results?.duplicates || 0,
          completed_at: new Date().toISOString()
        }
      })
      .eq('id', '7250c6e9-77ab-41c5-a88c-98c764c4f432');

    return { 
      success: true, 
      batchId,
      subscribers: pendingSubscribers.length,
      results: result.results
    };
  } catch (error: any) {
    await logDebug('process-batch-exception', error, true);
    return { 
      success: false, 
      error: error.message 
    };
  }
};

// Check if automation should be running now based on configured hours
const isWithinOperatingHours = async () => {
  try {
    // Get automation settings
    const { data, error } = await supabaseAdmin
      .from('email_migration_automation')
      .select('enabled, start_hour, end_hour')
      .eq('id', '7250c6e9-77ab-41c5-a88c-98c764c4f432')
      .single();
      
    if (error || !data) {
      return false;
    }
    
    if (!data.enabled) {
      return false;
    }
    
    // Check if current hour is within operating hours
    const currentHour = new Date().getUTCHours();
    
    // If end_hour is less than start_hour, it spans across midnight
    if (data.end_hour < data.start_hour) {
      return currentHour >= data.start_hour || currentHour < data.end_hour;
    } else {
      return currentHour >= data.start_hour && currentHour < data.end_hour;
    }
  } catch (err) {
    console.error('Error checking operating hours:', err);
    return false;
  }
};

// Get automation configuration
const getAutomationConfig = async () => {
  try {
    const { data, error } = await supabaseAdmin
      .from('email_migration_automation')
      .select('*')
      .eq('id', '7250c6e9-77ab-41c5-a88c-98c764c4f432')
      .single();
      
    if (error || !data) {
      await logDebug('get-config-error', error, true);
      return null;
    }
    
    return data;
  } catch (err) {
    await logDebug('get-config-exception', err, true);
    return null;
  }
};

// List repository files (CSV or JSON files) using HTTP directly
const listRepositoryFiles = async (baseUrl: string) => {
  try {
    await logDebug('list-repository-files-start', {
      message: 'Starting repository file listing with HTTP method',
      baseUrl
    });
    
    // We'll use a combination of known patterns and HTTP probing to find files
    // First, check if the baseUrl ends with a slash, if not add it
    if (!baseUrl.endsWith('/')) {
      baseUrl += '/';
    }
    
    // Common naming patterns for email export chunks
    const patterns = [
      // Numeric patterns
      ...Array.from({ length: 10 }, (_, i) => `chunk_${i}.csv`),
      // Alphabetic patterns (aa, ab, ac, etc.)
      ...Array.from({ length: 10 }, (_, i) => {
        const firstChar = 'a';
        const secondChar = String.fromCharCode(firstChar.charCodeAt(0) + i);
        return `chunk_${firstChar}${secondChar}.csv`;
      }),
      // Alphabetic patterns with uppercase
      ...Array.from({ length: 10 }, (_, i) => {
        const firstChar = 'A';
        const secondChar = String.fromCharCode(firstChar.charCodeAt(0) + i);
        return `chunk_${firstChar}${secondChar}.csv`;
      }),
      // Date-based patterns (for today, yesterday, and the day before)
      ...[0, 1, 2].map(daysAgo => {
        const date = new Date();
        date.setDate(date.getDate() - daysAgo);
        const formattedDate = date.toISOString().split('T')[0]; // YYYY-MM-DD
        return `export_${formattedDate}.csv`;
      }),
      // Generic patterns
      'subscribers.csv',
      'export.csv',
      'contacts.csv',
      'email_list.csv',
      'mailing_list.csv',
      'ongage_export.csv',
      'subscribers.json',
      'export.json',
    ];
    
    await logDebug('http-probe-patterns', { 
      count: patterns.length,
      samples: patterns.slice(0, 5)
    });

    // Try each pattern by making HEAD requests
    const foundFiles = [];
    const filesWithStatus = [];
    
    for (const pattern of patterns) {
      const url = `${baseUrl}emails/${pattern}`;
      try {
        const response = await fetch(url, { method: 'HEAD' });
        filesWithStatus.push({ file: pattern, status: response.status });
        
        if (response.ok) {
          foundFiles.push(pattern);
          await logDebug('http-file-found', { file: pattern, url });
        }
      } catch (err) {
        await logDebug('http-file-check-error', { 
          file: pattern, 
          url,
          error: err.message 
        }, true);
      }
    }
    
    // Log a summary of what we found
    await logDebug('http-file-check-summary', { 
      totalPatterns: patterns.length,
      foundFiles: foundFiles.length,
      filesWithStatus: filesWithStatus.slice(0, 10) // Only show first 10 for brevity
    });
    
    if (foundFiles.length === 0) {
      await logDebug('no-files-found', 'No files found using HTTP probing patterns');
      
      // Try the /emails/ directory to see if we can at least access it
      try {
        const directoryCheckUrl = `${baseUrl}emails/`;
        const directoryResponse = await fetch(directoryCheckUrl, { method: 'HEAD' });
        
        await logDebug('directory-check', { 
          url: directoryCheckUrl,
          status: directoryResponse.status,
          statusText: directoryResponse.statusText
        });
        
        if (directoryResponse.ok) {
          await logDebug('directory-accessible', 'The /emails/ directory exists but no matching files were found.');
        } else {
          await logDebug('directory-not-accessible', 'The /emails/ directory appears to be inaccessible.');
        }
      } catch (dirErr) {
        await logDebug('directory-check-error', { 
          error: dirErr.message 
        }, true);
      }
    }
    
    return { 
      success: true,
      files: foundFiles,
      total: foundFiles.length,
      method: "http-probe",
      baseUrl: baseUrl
    };
  } catch (err) {
    await logDebug('list-repository-files-exception', err, true);
    return { 
      success: false, 
      files: [], 
      error: err.message,
      method: "http-probe-failed"
    };
  }
};

// Main handler for the edge function
serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    });
  }

  try {
    // Parse request
    const requestData = await req.json();
    const { action } = requestData;
    
    console.log(`[SERVER-AUTOMATION] Request received: action=${action}`);
    
    // Handle heartbeat check
    if (action === 'heartbeat') {
      const { data, error } = await supabaseAdmin
        .from('email_migration_automation')
        .select('last_heartbeat, status_details, enabled')
        .eq('id', '7250c6e9-77ab-41c5-a88c-98c764c4f432')
        .single();
        
      return new Response(
        JSON.stringify({ 
          alive: !!data?.last_heartbeat,
          last_heartbeat: data?.last_heartbeat,
          status: data?.status_details,
          enabled: data?.enabled,
          version: AUTOMATION_FUNCTION_VERSION
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Handle list-repository-files action
    if (action === 'list-repository-files') {
      console.log('[SERVER-AUTOMATION] Processing list-repository-files request');
      // Extract the base URL from the request if provided, otherwise use the request URL
      const baseUrl = requestData.baseUrl || new URL(req.url).origin;
      const result = await listRepositoryFiles(baseUrl);
      return new Response(
        JSON.stringify(result),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Handle run-automation action - does a single iteration
    if (action === 'run-automation') {
      // Check if automation is enabled
      const config = await getAutomationConfig();
      if (!config || !config.enabled) {
        return new Response(
          JSON.stringify({ 
            error: 'Automation is not enabled', 
            version: AUTOMATION_FUNCTION_VERSION 
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      // Check if within operating hours
      const withinHours = await isWithinOperatingHours();
      if (!withinHours) {
        return new Response(
          JSON.stringify({ 
            message: 'Outside of configured operating hours', 
            version: AUTOMATION_FUNCTION_VERSION 
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      // Get counts to determine if we should continue
      const { data: counts, error: countsError } = await supabaseAdmin.rpc('get_status_counts');
      
      if (countsError) {
        return new Response(
          JSON.stringify({ 
            error: 'Failed to get subscriber counts', 
            details: countsError.message,
            version: AUTOMATION_FUNCTION_VERSION 
          }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      // Check if there are any pending subscribers
      const pendingCount = counts.find((item: any) => item.status === 'pending')?.count || 0;
      
      if (pendingCount === 0) {
        await updateAutomationStatus({ 
          state: 'idle',
          message: 'No pending subscribers to process',
          timestamp: new Date().toISOString()
        });
        
        return new Response(
          JSON.stringify({ 
            message: 'No pending subscribers to process', 
            version: AUTOMATION_FUNCTION_VERSION 
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      // Determine batch size based on configuration
      const batchSize = Math.min(config.max_batch_size, Math.max(config.min_batch_size, 10));
      
      // Process a batch
      const result = await processMigrationBatch(batchSize, config.publication_id);
      
      return new Response(
        JSON.stringify({ 
          result, 
          version: AUTOMATION_FUNCTION_VERSION 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Handle continuous-automation - for cron job to call
    if (action === 'continuous-automation') {
      // This one runs and returns immediately, but keeps processing in the background
      EdgeRuntime.waitUntil((async () => {
        try {
          await logDebug('continuous-start', 'Starting continuous automation process');
          
          // Check if automation is enabled
          const config = await getAutomationConfig();
          if (!config || !config.enabled) {
            await logDebug('continuous-disabled', 'Automation is not enabled');
            return;
          }
          
          // Check if within operating hours
          const withinHours = await isWithinOperatingHours();
          if (!withinHours) {
            await logDebug('continuous-outside-hours', 'Outside of configured operating hours');
            return;
          }
          
          // Get counts to determine if we should continue
          const { data: counts, error: countsError } = await supabaseAdmin.rpc('get_status_counts');
          
          if (countsError) {
            await logDebug('continuous-counts-error', countsError, true);
            return;
          }
          
          // Check if there are any pending subscribers
          const pendingCount = counts.find((item: any) => item.status === 'pending')?.count || 0;
          
          if (pendingCount === 0) {
            await updateAutomationStatus({ 
              state: 'idle',
              message: 'No pending subscribers to process',
              timestamp: new Date().toISOString()
            });
            
            await logDebug('continuous-no-pending', 'No pending subscribers to process');
            return;
          }
          
          // Determine batch size based on configuration
          const batchSize = Math.min(config.max_batch_size, Math.max(config.min_batch_size, 10));
          
          // Process a batch
          await logDebug('continuous-processing', `Processing batch of ${batchSize} subscribers`);
          const result = await processMigrationBatch(batchSize, config.publication_id);
          
          // Update the last automation run time
          await supabaseAdmin
            .from('email_migration_automation')
            .update({ 
              last_automated_run: new Date().toISOString() 
            })
            .eq('id', '7250c6e9-77ab-41c5-a88c-98c764c4f432');
            
          await logDebug('continuous-complete', result);
        } catch (err) {
          await logDebug('continuous-exception', err, true);
        }
      })());
      
      // Return immediately while processing continues in the background
      return new Response(
        JSON.stringify({ 
          message: 'Continuous automation initiated', 
          version: AUTOMATION_FUNCTION_VERSION 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // If action is not recognized
    console.warn(`[SERVER-AUTOMATION] Unsupported action: ${action}`);
    return new Response(
      JSON.stringify({ error: `Unsupported action: ${action}` }),
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
