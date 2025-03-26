
// Import required dependencies
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Version identifier for tracking deployments
const FUNCTION_VERSION = "1.0.1-heartbeat-fix";

// Initialize Supabase client with admin privileges
const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const supabaseAdmin = createClient(supabaseUrl, supabaseKey);

// Main function handler
serve(async (req) => {
  try {
    // Log function start
    console.log(`[SERVER-AUTOMATION][${new Date().toISOString()}] Background process started (v${FUNCTION_VERSION})`);
    
    // Update heartbeat to show automation is running
    await updateHeartbeat();
    
    // Check if automation is enabled
    const automation = await getAutomationConfig();
    if (!automation || !automation.enabled) {
      console.log('[SERVER-AUTOMATION] Automation is disabled, exiting');
      return new Response(JSON.stringify({ 
        success: true, 
        message: 'Automation is disabled' 
      }), { headers: { 'Content-Type': 'application/json' } });
    }
    
    // Check if we're within operating hours
    const currentHour = new Date().getHours();
    if (currentHour < automation.start_hour || currentHour >= automation.end_hour) {
      console.log(`[SERVER-AUTOMATION] Outside operating hours (${automation.start_hour}:00-${automation.end_hour}:00), current hour: ${currentHour}:00`);
      
      // Update status
      await updateAutomationStatus({
        status: 'idle',
        message: `Outside operating hours (${automation.start_hour}:00-${automation.end_hour}:00)`,
        last_check: new Date().toISOString()
      });
      
      return new Response(JSON.stringify({ 
        success: true, 
        message: 'Outside operating hours' 
      }), { headers: { 'Content-Type': 'application/json' } });
    }
    
    // Reset stalled records (any in_progress for more than 30 minutes)
    const resetResult = await resetStalledRecords();
    if (resetResult.count > 0) {
      console.log(`[SERVER-AUTOMATION] Reset ${resetResult.count} stalled records`);
    }
    
    // Get statistics
    const stats = await getMigrationStats();
    
    // Check if we have pending records to migrate
    if (stats.counts.pending === 0) {
      console.log('[SERVER-AUTOMATION] No pending records to migrate');
      
      // Update status
      await updateAutomationStatus({
        status: 'idle',
        message: 'No pending records to migrate',
        last_check: new Date().toISOString(),
        stats: stats
      });
      
      return new Response(JSON.stringify({ 
        success: true, 
        message: 'No pending records to migrate',
        stats: stats
      }), { headers: { 'Content-Type': 'application/json' } });
    }
    
    // Check if we've reached the daily target
    const migratedToday = await getMigratedTodayCount();
    const dailyTarget = automation.daily_total_target || 1000;
    
    if (migratedToday >= dailyTarget) {
      console.log(`[SERVER-AUTOMATION] Daily target reached (${migratedToday}/${dailyTarget})`);
      
      // Update status
      await updateAutomationStatus({
        status: 'idle',
        message: `Daily target reached (${migratedToday}/${dailyTarget})`,
        last_check: new Date().toISOString(),
        stats: stats
      });
      
      return new Response(JSON.stringify({ 
        success: true, 
        message: 'Daily target reached',
        stats: stats
      }), { headers: { 'Content-Type': 'application/json' } });
    }
    
    // Determine batch size (random between min and max)
    const minBatchSize = automation.min_batch_size || 10;
    const maxBatchSize = automation.max_batch_size || 100;
    const batchSize = Math.floor(Math.random() * (maxBatchSize - minBatchSize + 1)) + minBatchSize;
    
    // Process a batch
    console.log(`[SERVER-AUTOMATION] Processing batch of ${batchSize} records`);
    
    // Update status
    await updateAutomationStatus({
      status: 'processing',
      message: `Processing batch of ${batchSize} records`,
      last_check: new Date().toISOString(),
      batch_size: batchSize,
      stats: stats
    });
    
    // Migrate batch
    const batchResult = await migrateBatch(batchSize, automation.publication_id);
    
    // Update status after processing
    await updateAutomationStatus({
      status: 'idle',
      message: `Processed batch: ${batchResult.results.success} migrated, ${batchResult.results.failed} failed, ${batchResult.results.duplicates} duplicates`,
      last_check: new Date().toISOString(),
      last_batch: batchResult.batch_id,
      stats: await getMigrationStats()
    });
    
    // Return success
    return new Response(JSON.stringify({ 
      success: true, 
      message: 'Batch processed successfully',
      batch_result: batchResult
    }), { headers: { 'Content-Type': 'application/json' } });
  } catch (error) {
    console.error('[SERVER-AUTOMATION] Unexpected error:', error);
    
    // Log error to database
    try {
      await supabaseAdmin
        .from('email_migration_logs')
        .insert({
          context: 'server-automation',
          data: { error: error.message, stack: error.stack },
          is_error: true
        });
    } catch (logError) {
      console.error('[SERVER-AUTOMATION] Error logging to database:', logError);
    }
    
    // Update status to error
    await updateAutomationStatus({
      status: 'error',
      message: `Error: ${error.message}`,
      last_check: new Date().toISOString()
    }).catch(console.error);
    
    return new Response(JSON.stringify({ 
      success: false, 
      error: 'An unexpected error occurred', 
      details: error.message 
    }), { 
      status: 500, 
      headers: { 'Content-Type': 'application/json' } 
    });
  }
});

// Helper function to update heartbeat
async function updateHeartbeat() {
  try {
    const { error } = await supabaseAdmin
      .from('email_migration_automation')
      .update({ 
        last_heartbeat: new Date().toISOString() 
      })
      .eq('id', '7250c6e9-77ab-41c5-a88c-98c764c4f432'); // Default record ID
      
    if (error) {
      throw error;
    }
  } catch (error) {
    console.error('[SERVER-AUTOMATION] Error updating heartbeat:', error);
    throw error;
  }
}

// Helper function to get automation configuration
async function getAutomationConfig() {
  try {
    const { data, error } = await supabaseAdmin
      .from('email_migration_automation')
      .select('*')
      .eq('id', '7250c6e9-77ab-41c5-a88c-98c764c4f432') // Default record ID
      .single();
      
    if (error) {
      throw error;
    }
    
    return data;
  } catch (error) {
    console.error('[SERVER-AUTOMATION] Error fetching automation config:', error);
    throw error;
  }
}

// Helper function to update automation status
async function updateAutomationStatus(statusDetails: Record<string, any>) {
  try {
    const { error } = await supabaseAdmin
      .from('email_migration_automation')
      .update({ 
        status_details: statusDetails,
        last_updated: new Date().toISOString()
      })
      .eq('id', '7250c6e9-77ab-41c5-a88c-98c764c4f432'); // Default record ID
      
    if (error) {
      throw error;
    }
  } catch (error) {
    console.error('[SERVER-AUTOMATION] Error updating automation status:', error);
    throw error;
  }
}

// Helper function to reset stalled records
async function resetStalledRecords() {
  try {
    // Calculate timestamp for 30 minutes ago
    const thirtyMinutesAgo = new Date();
    thirtyMinutesAgo.setMinutes(thirtyMinutesAgo.getMinutes() - 30);
    
    // Update records that have been in progress for more than 30 minutes
    const { data, error } = await supabaseAdmin
      .from('email_migration')
      .update({ 
        status: 'pending', 
        migration_batch: null,
        error_message: 'Reset after being stuck in progress for > 30 minutes'
      })
      .eq('status', 'in_progress')
      .lt('updated_at', thirtyMinutesAgo.toISOString())
      .select('id');
      
    if (error) {
      throw error;
    }
    
    return { count: data?.length || 0 };
  } catch (error) {
    console.error('[SERVER-AUTOMATION] Error resetting stalled records:', error);
    throw error;
  }
}

// Helper function to get migration statistics
async function getMigrationStats() {
  try {
    // Get status counts
    const { data: counts, error: countsError } = await supabaseAdmin.rpc('get_status_counts');
    
    if (countsError) {
      throw countsError;
    }
    
    // Create a counts object
    const countsObject = counts.reduce((acc: Record<string, number>, curr: any) => {
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
    
    // Return combined stats
    return {
      counts: countsObject,
      total_subscribers: totalSubscribers,
      migrated_subscribers: countsObject.migrated || 0,
      failed_subscribers: countsObject.failed || 0,
    };
  } catch (error) {
    console.error('[SERVER-AUTOMATION] Error getting migration stats:', error);
    throw error;
  }
}

// Helper function to get migrated today count
async function getMigratedTodayCount() {
  try {
    // Calculate start of today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Get count of records migrated today
    const { count, error } = await supabaseAdmin
      .from('email_migration')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'migrated')
      .gte('updated_at', today.toISOString());
      
    if (error) {
      throw error;
    }
    
    return count || 0;
  } catch (error) {
    console.error('[SERVER-AUTOMATION] Error getting migrated today count:', error);
    throw error;
  }
}

// Helper function to migrate a batch of subscribers
async function migrateBatch(batchSize: number, publicationId: string) {
  try {
    if (!publicationId) {
      throw new Error('Publication ID is required');
    }
    
    // Get pending subscribers
    const { data: subscribers, error: selectError } = await supabaseAdmin
      .from('email_migration')
      .select('*')
      .eq('status', 'pending')
      .limit(batchSize);
      
    if (selectError) {
      throw selectError;
    }
    
    if (!subscribers || subscribers.length === 0) {
      return {
        batch_id: null,
        subscribers: 0,
        results: {
          success: 0,
          failed: 0,
          duplicates: 0
        }
      };
    }
    
    // Generate batch ID
    const batchId = crypto.randomUUID();
    console.log(`[SERVER-AUTOMATION] Created batch ${batchId} with ${subscribers.length} subscribers`);
    
    // Mark subscribers as in progress
    const subscriberIds = subscribers.map(s => s.id);
    const { error: updateError } = await supabaseAdmin
      .from('email_migration')
      .update({ 
        status: 'in_progress', 
        migration_batch: batchId 
      })
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
              updated_at: new Date().toISOString(),
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
              updated_at: new Date().toISOString()
            })
            .eq('id', subscriber.id);
            
          results.duplicates++;
        } else {
          // Simulate success (80% chance)
          await supabaseAdmin
            .from('email_migration')
            .update({ 
              status: 'migrated', 
              updated_at: new Date().toISOString(),
              subscriber_id: `mock-${crypto.randomUUID()}`
            })
            .eq('id', subscriber.id);
            
          results.success++;
        }
      } catch (error) {
        console.error(`[SERVER-AUTOMATION] Error processing subscriber ${subscriber.id}:`, error);
        
        // Mark as failed
        await supabaseAdmin
          .from('email_migration')
          .update({ 
            status: 'failed', 
            updated_at: new Date().toISOString(),
            error_message: error.message
          })
          .eq('id', subscriber.id);
          
        results.failed++;
      }
      
      // Add delay to prevent rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    // Return batch results
    return {
      batch_id: batchId,
      subscribers: subscribers.length,
      results
    };
  } catch (error) {
    console.error('[SERVER-AUTOMATION] Migrate batch error:', error);
    throw error;
  }
}
