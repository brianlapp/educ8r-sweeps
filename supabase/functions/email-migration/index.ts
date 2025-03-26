
// Import required dependencies
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Version identifier for tracking deployments
const FUNCTION_VERSION = "1.3.0-http-repository-fix";

// Initialize Supabase client with admin privileges
const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const supabaseAdmin = createClient(supabaseUrl, supabaseKey);

// CORS headers for cross-origin requests
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Main function handler
serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: corsHeaders
    });
  }

  // Get base URL for HTTP file operations
  const url = new URL(req.url);
  const baseUrl = `${url.protocol}//${url.host}`;
  console.log("[EMAIL-MIGRATION] Server base URL determined as:", baseUrl);

  try {
    // Parse request body
    const requestBody = await req.json();
    
    // Extract action and params, supporting different payload formats
    const action = requestBody.action;
    // Handle both formats: { params: { ... } } and direct properties
    const params = requestBody.params || requestBody;
    
    console.log(`[EMAIL-MIGRATION][${new Date().toISOString()}][request]:`, 
      JSON.stringify({ 
        action, 
        params: { ...params, subscribers: params.subscribers ? `[${params.subscribers?.length} items]` : undefined }, 
        functionVersion: FUNCTION_VERSION 
      })
    );

    // Route request to appropriate handler based on action
    switch (action) {
      case 'stats':
        return await getStats();
      case 'import':
        return await importSubscribers(params);
      case 'import-repository-file':
        return await importRepositoryFile(params.fileName, baseUrl);
      case 'migrate-batch':
        return await migrateBatch(params.batchSize, params.publicationId);
      case 'reset-failed':
        return await resetFailedRecords();
      case 'retry-failed':
        return await retryFailedRecords(params.publicationId);
      case 'toggle-automation':
        return await toggleAutomation(params.enabled);
      case 'automation-config':
        return await updateAutomationConfig(params);
      case 'repository-files':
        return await listRepositoryFiles(baseUrl);
      case 'heartbeat':
        return await checkAutomationHeartbeat();
      default:
        return new Response(
          JSON.stringify({ error: `Unsupported action: ${action}` }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
  } catch (error) {
    console.error('[EMAIL-MIGRATION] Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'An unexpected error occurred', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// Get migration statistics
async function getStats() {
  try {
    // Get status counts
    const { data: counts, error: countsError } = await supabaseAdmin.rpc('get_status_counts');
    
    if (countsError) {
      throw countsError;
    }
    
    // Create a counts object
    const countsObject = counts.reduce((acc, curr) => {
      acc[curr.status] = curr.count;
      return acc;
    }, {});
    
    // Get total subscriber count
    const { count: totalSubscribers, error: totalError } = await supabaseAdmin
      .from('email_migration')
      .select('*', { count: 'exact', head: true });
      
    if (totalError) {
      throw totalError;
    }
    
    // Get latest records
    const { data: latestRecords, error: latestError } = await supabaseAdmin
      .from('email_migration')
      .select('*')
      .order('updated_at', { ascending: false })
      .limit(5);
      
    if (latestError) {
      throw latestError;
    }
    
    // Get automation config
    const { data: automationConfig, error: automationError } = await supabaseAdmin
      .from('email_migration_automation')
      .select('*')
      .single();
      
    if (automationError && automationError.code !== 'PGRST116') {
      throw automationError;
    }
    
    // Return combined stats
    return new Response(
      JSON.stringify({
        counts: countsObject,
        stats: {
          total_subscribers: totalSubscribers,
          migrated_subscribers: countsObject.migrated || 0,
          failed_subscribers: countsObject.failed || 0,
        },
        latest: latestRecords,
        automation: automationConfig || null,
        version: FUNCTION_VERSION
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[EMAIL-MIGRATION] Stats error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}

// Import subscribers from provided data
async function importSubscribers(params) {
  try {
    // Extract subscribers ensuring we handle both formats
    let subscribers = [];
    
    // Handle both formats:
    // 1. {action: 'import', params: {subscribers: [...]}} 
    // 2. {action: 'import', subscribers: [...]}
    if (params.subscribers) {
      subscribers = params.subscribers;
    } else if (params.params && params.params.subscribers) {
      subscribers = params.params.subscribers;
    }
    
    if (!subscribers || !Array.isArray(subscribers) || subscribers.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No subscribers provided or invalid format' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    console.log(`[EMAIL-MIGRATION] Importing ${subscribers.length} subscribers from ${params.fileName || 'direct upload'}`);
    
    // Prepare data for insertion
    const records = subscribers.map(sub => ({
      email: sub.email,
      first_name: sub.first_name || '',
      last_name: sub.last_name || '',
      source_file: params.fileName || 'direct import',
      status: 'pending',
      import_date: new Date().toISOString()
    }));
    
    // Determine duplicates that already exist in the system
    const emails = subscribers.map(s => s.email);
    const { data: existingEmails, error: existingError } = await supabaseAdmin
      .from('email_migration')
      .select('email')
      .in('email', emails);
      
    if (existingError) {
      throw existingError;
    }
    
    const existingSet = new Set(existingEmails.map(e => e.email));
    const newRecords = records.filter(r => !existingSet.has(r.email));
    const duplicateCount = records.length - newRecords.length;
    
    // Insert new records
    let insertedCount = 0;
    let errorCount = 0;
    
    if (newRecords.length > 0) {
      const { data, error } = await supabaseAdmin
        .from('email_migration')
        .insert(newRecords)
        .select();
        
      if (error) {
        errorCount = newRecords.length;
        throw error;
      }
      
      insertedCount = data.length;
    }
    
    // Return summary of operation
    return new Response(
      JSON.stringify({ 
        success: true, 
        inserted: insertedCount, 
        duplicates: duplicateCount,
        errors: errorCount,
        total: records.length
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[EMAIL-MIGRATION] Import error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}

// List files in the repository (using HTTP requests)
async function listRepositoryFiles(baseUrl) {
  try {
    console.log("[EMAIL-MIGRATION] Listing repository files using HTTP method");
    console.log("[EMAIL-MIGRATION] Base URL:", baseUrl);
    
    // Common naming patterns for email export chunks
    const patterns = [
      // Standard chunk patterns
      ...Array.from({ length: 26 }, (_, i) => `chunk_${String.fromCharCode(97 + i)}.csv`),
      ...Array.from({ length: 26 }, (_, i) => `chunk_${String.fromCharCode(97 + i)}${String.fromCharCode(97)}.csv`),
      ...Array.from({ length: 26 }, (_, i) => `chunk_${String.fromCharCode(97 + i)}${String.fromCharCode(98)}.csv`),
      ...Array.from({ length: 26 }, (_, i) => `chunk_${String.fromCharCode(97 + i)}${String.fromCharCode(99)}.csv`),
      
      // Generic patterns
      'subscribers.csv',
      'export.csv',
      'ongage_export.csv',
      'subscribers.json',
      'export.json',
    ];
    
    // Try each pattern with HEAD requests
    const foundFiles = [];
    
    for (const pattern of patterns) {
      const url = `${baseUrl}/emails/${pattern}`;
      try {
        const response = await fetch(url, { method: 'HEAD' });
        
        if (response.ok) {
          foundFiles.push(pattern);
          console.log(`[EMAIL-MIGRATION] Found file: ${pattern}`);
        }
      } catch (err) {
        // Ignore errors for patterns that don't exist
      }
    }
    
    return new Response(
      JSON.stringify({ 
        success: true,
        files: foundFiles,
        total: foundFiles.length
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[EMAIL-MIGRATION] List repository files error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}

// Import a file from the repository (using HTTP requests)
async function importRepositoryFile(fileName, baseUrl) {
  try {
    if (!fileName) {
      return new Response(
        JSON.stringify({ error: 'No file name provided' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    console.log(`[EMAIL-MIGRATION] Importing repository file: ${fileName}`);
    
    // Fetch file content from HTTP URL
    const fileUrl = `${baseUrl}/emails/${fileName}`;
    console.log(`[EMAIL-MIGRATION] Fetching file from: ${fileUrl}`);
    
    const response = await fetch(fileUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch file: ${response.status} ${response.statusText}`);
    }
    
    const content = await response.text();
    console.log(`[EMAIL-MIGRATION] Successfully fetched file (${content.length} bytes)`);
    
    // Process file based on extension
    let subscribers = [];
    
    if (fileName.endsWith('.csv')) {
      // Process CSV
      const lines = content.split('\n');
      const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
      
      for (let i = 1; i < lines.length; i++) {
        if (!lines[i].trim()) continue;
        
        const values = lines[i].split(',').map(v => v.trim().replace(/^"|"$/g, ''));
        const subscriber = {};
        
        headers.forEach((header, index) => {
          if (index < values.length) {
            subscriber[header] = values[index];
          }
        });
        
        subscribers.push(subscriber);
      }
    } else if (fileName.endsWith('.json')) {
      // Process JSON
      const parsed = JSON.parse(content);
      
      if (Array.isArray(parsed)) {
        subscribers = parsed;
      } else if (parsed.subscribers) {
        subscribers = parsed.subscribers;
      } else if (parsed.data) {
        subscribers = parsed.data;
      } else {
        throw new Error('Could not find subscriber data in JSON file');
      }
    } else {
      throw new Error('Unsupported file type. Only CSV and JSON are supported');
    }
    
    // Normalize data
    subscribers = subscribers.map(sub => ({
      email: sub.email || sub.Email || sub.EMAIL || '',
      first_name: sub.first_name || sub.firstName || sub.FirstName || sub['First Name'] || '',
      last_name: sub.last_name || sub.lastName || sub.LastName || sub['Last Name'] || ''
    })).filter(sub => sub.email && sub.email.includes('@'));
    
    console.log(`[EMAIL-MIGRATION] Normalized to ${subscribers.length} valid subscribers`);
    
    if (subscribers.length === 0) {
      throw new Error('No valid subscribers found in file');
    }
    
    // Set up data for insertion
    const records = subscribers.map(sub => ({
      email: sub.email,
      first_name: sub.first_name || '',
      last_name: sub.last_name || '',
      source_file: fileName,
      status: 'pending',
      import_date: new Date().toISOString()
    }));
    
    // Determine duplicates
    const emails = subscribers.map(s => s.email);
    const { data: existingEmails, error: existingError } = await supabaseAdmin
      .from('email_migration')
      .select('email')
      .in('email', emails);
      
    if (existingError) {
      throw existingError;
    }
    
    const existingSet = new Set(existingEmails.map(e => e.email));
    const newRecords = records.filter(r => !existingSet.has(r.email));
    const duplicateCount = records.length - newRecords.length;
    
    // Insert new records
    let insertedCount = 0;
    let errorCount = 0;
    
    if (newRecords.length > 0) {
      const { data, error } = await supabaseAdmin
        .from('email_migration')
        .insert(newRecords)
        .select();
        
      if (error) {
        errorCount = newRecords.length;
        throw error;
      }
      
      insertedCount = data.length;
    }
    
    // Move file to completed folder
    // Note: This is handled differently in HTTP mode - we can't move the file
    
    // Return summary
    return new Response(
      JSON.stringify({ 
        success: true, 
        inserted: insertedCount, 
        duplicates: duplicateCount,
        errors: errorCount,
        total: records.length
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[EMAIL-MIGRATION] Import repository file error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}

// Migrate a batch of subscribers
async function migrateBatch(batchSize, publicationId) {
  try {
    if (!publicationId) {
      return new Response(
        JSON.stringify({ error: 'Publication ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const batchLimit = batchSize || 10;
    console.log(`[EMAIL-MIGRATION] Migrating batch of up to ${batchLimit} subscribers to publication ${publicationId}`);
    
    // Get pending subscribers
    const { data: subscribers, error: selectError } = await supabaseAdmin
      .from('email_migration')
      .select('*')
      .eq('status', 'pending')
      .limit(batchLimit);
      
    if (selectError) {
      throw selectError;
    }
    
    if (!subscribers || subscribers.length === 0) {
      return new Response(
        JSON.stringify({ 
          message: 'No pending subscribers to migrate',
          results: {
            success: 0,
            failed: 0,
            duplicates: 0
          } 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Generate batch ID
    const batchId = crypto.randomUUID();
    console.log(`[EMAIL-MIGRATION] Created batch ${batchId} with ${subscribers.length} subscribers`);
    
    // Mark subscribers as in progress
    const subscriberIds = subscribers.map(s => s.id);
    const { error: updateError } = await supabaseAdmin
      .from('email_migration')
      .update({ status: 'in_progress', migration_batch: batchId })
      .in('id', subscriberIds);
      
    if (updateError) {
      throw updateError;
    }
    
    // Mock BeehiiV API calls here - in production, this would call the actual API
    // This is just to simulate the process
    
    const results = {
      success: 0,
      failed: 0,
      duplicates: 0
    };
    
    // Process each subscriber
    for (const subscriber of subscribers) {
      try {
        // Simulate API call success/failure
        const random = Math.random();
        
        if (random < 0.1) {
          // Simulate failure (10% chance)
          await supabaseAdmin
            .from('email_migration')
            .update({ 
              status: 'failed', 
              migration_date: new Date().toISOString(),
              error_message: 'Simulated API failure'
            })
            .eq('id', subscriber.id);
            
          results.failed++;
        } else if (random < 0.2) {
          // Simulate duplicate (10% chance)
          await supabaseAdmin
            .from('email_migration')
            .update({ 
              status: 'already_exists', 
              migration_date: new Date().toISOString()
            })
            .eq('id', subscriber.id);
            
          results.duplicates++;
        } else {
          // Simulate success (80% chance)
          await supabaseAdmin
            .from('email_migration')
            .update({ 
              status: 'migrated', 
              migration_date: new Date().toISOString(),
              beehiiv_id: `mock-${crypto.randomUUID()}`
            })
            .eq('id', subscriber.id);
            
          results.success++;
        }
      } catch (error) {
        console.error(`[EMAIL-MIGRATION] Error processing subscriber ${subscriber.id}:`, error);
        
        // Mark as failed
        await supabaseAdmin
          .from('email_migration')
          .update({ 
            status: 'failed', 
            migration_date: new Date().toISOString(),
            error_message: error.message
          })
          .eq('id', subscriber.id);
          
        results.failed++;
      }
      
      // Add delay to prevent rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    // Return batch results
    return new Response(
      JSON.stringify({ 
        batch_id: batchId,
        subscribers: subscribers.length,
        results
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[EMAIL-MIGRATION] Migrate batch error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}

// Reset failed records to pending
async function resetFailedRecords() {
  try {
    // Update records with status 'failed' to 'pending'
    const { data, error } = await supabaseAdmin
      .from('email_migration')
      .update({ 
        status: 'pending', 
        migration_batch: null, 
        error_message: null 
      })
      .eq('status', 'failed')
      .select('id');
      
    if (error) {
      throw error;
    }
    
    const count = data?.length || 0;
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Reset ${count} failed records to pending status`,
        count
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[EMAIL-MIGRATION] Reset failed records error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}

// Retry failed records
async function retryFailedRecords(publicationId) {
  try {
    if (!publicationId) {
      return new Response(
        JSON.stringify({ error: 'Publication ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Update records with status 'failed' to 'pending'
    const { data, error } = await supabaseAdmin
      .from('email_migration')
      .update({ 
        status: 'pending', 
        migration_batch: null, 
        error_message: null 
      })
      .eq('status', 'failed')
      .select('id');
      
    if (error) {
      throw error;
    }
    
    const count = data?.length || 0;
    
    if (count === 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No failed records to retry',
          count: 0
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Begin migrating the reset records
    return migrateBatch(count, publicationId);
  } catch (error) {
    console.error('[EMAIL-MIGRATION] Retry failed records error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}

// Toggle automation
async function toggleAutomation(enabled) {
  try {
    const { error } = await supabaseAdmin
      .from('email_migration_automation')
      .update({ 
        enabled: enabled, 
        last_updated: new Date().toISOString() 
      })
      .eq('id', '7250c6e9-77ab-41c5-a88c-98c764c4f432'); // Default record ID
      
    if (error) {
      throw error;
    }
    
    // If enabling, update the heartbeat
    if (enabled) {
      await supabaseAdmin
        .from('email_migration_automation')
        .update({ 
          last_heartbeat: new Date().toISOString()
        })
        .eq('id', '7250c6e9-77ab-41c5-a88c-98c764c4f432');
    }
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Automation ${enabled ? 'enabled' : 'disabled'}`
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[EMAIL-MIGRATION] Toggle automation error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}

// Update automation configuration
async function updateAutomationConfig(params) {
  try {
    const updates = {
      last_updated: new Date().toISOString()
    };
    
    // Only update fields that are provided
    if (params.daily_total_target !== undefined) {
      updates.daily_total_target = params.daily_total_target;
    }
    
    if (params.min_batch_size !== undefined) {
      updates.min_batch_size = params.min_batch_size;
    }
    
    if (params.max_batch_size !== undefined) {
      updates.max_batch_size = params.max_batch_size;
    }
    
    if (params.start_hour !== undefined) {
      updates.start_hour = params.start_hour;
    }
    
    if (params.end_hour !== undefined) {
      updates.end_hour = params.end_hour;
    }
    
    if (params.publication_id !== undefined) {
      updates.publication_id = params.publication_id;
    }
    
    const { error } = await supabaseAdmin
      .from('email_migration_automation')
      .update(updates)
      .eq('id', '7250c6e9-77ab-41c5-a88c-98c764c4f432'); // Default record ID
      
    if (error) {
      throw error;
    }
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Automation configuration updated',
        updates
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[EMAIL-MIGRATION] Update automation config error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}

// Check automation heartbeat
async function checkAutomationHeartbeat() {
  try {
    const { data, error } = await supabaseAdmin
      .from('email_migration_automation')
      .select('*')
      .eq('id', '7250c6e9-77ab-41c5-a88c-98c764c4f432')
      .single();
      
    if (error) {
      throw error;
    }
    
    // Calculate heartbeat age
    const lastHeartbeat = new Date(data.last_heartbeat || 0);
    const now = new Date();
    const heartbeatAgeSeconds = Math.floor((now.getTime() - lastHeartbeat.getTime()) / 1000);
    
    const isAlive = heartbeatAgeSeconds < 60; // Heartbeat is alive if less than 60 seconds old
    
    return new Response(
      JSON.stringify({ 
        alive: isAlive,
        last_heartbeat: data.last_heartbeat,
        heartbeat_age_seconds: heartbeatAgeSeconds,
        enabled: data.enabled,
        status: data.status_details,
        config: {
          daily_total_target: data.daily_total_target,
          min_batch_size: data.min_batch_size,
          max_batch_size: data.max_batch_size,
          start_hour: data.start_hour,
          end_hour: data.end_hour,
          publication_id: data.publication_id
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[EMAIL-MIGRATION] Check heartbeat error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}
