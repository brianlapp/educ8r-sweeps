
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Google Sheets API configurations
const GOOGLE_SHEETS_API_URL = "https://sheets.googleapis.com/v4/spreadsheets/";

// Get this from shared sheet URL (between /d/ and /edit in the URL)
// This must be configured in Supabase Edge Function secrets
const SPREADSHEET_ID = Deno.env.get('SPREADSHEET_ID');

// The name of the sheet tab (default is "Sheet1")
const SHEET_NAME = Deno.env.get('SHEET_NAME') || 'Sweepstakes Entries';

// Load service account credentials from environment variable
const GOOGLE_SERVICE_ACCOUNT = Deno.env.get('GOOGLE_SERVICE_ACCOUNT');

// This table will store the last sync time and sync status
const SYNC_METADATA_TABLE = 'sheets_sync_metadata';

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Check if this is an automated sync
    let isAutomated = false;
    try {
      const requestData = await req.json();
      isAutomated = requestData?.automated === true;
      console.log(isAutomated ? 'Starting automated Google Sheets sync' : 'Starting manual Google Sheets sync');
    } catch (e) {
      console.log('Starting manual Google Sheets sync (no request body)');
    }
    
    // Parse service account credentials from string
    let serviceAccountCreds;
    try {
      serviceAccountCreds = JSON.parse(GOOGLE_SERVICE_ACCOUNT || '{}');
      console.log('Successfully parsed service account credentials');
    } catch (e) {
      console.error('Failed to parse service account credentials:', e);
      throw new Error('Invalid service account credentials');
    }

    if (!SPREADSHEET_ID) {
      throw new Error('SPREADSHEET_ID is not configured in secrets');
    }

    // Initialize Supabase client with service role key for admin privileges
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );
    console.log('Initialized Supabase client');

    // Get the last successful sync timestamp
    let lastSyncTime = new Date(0); // Default to epoch if no previous sync
    let syncMetadataRecord = null;
    
    try {
      // Try to get the last sync metadata
      const { data: syncMetadata, error: syncError } = await supabaseClient
        .from(SYNC_METADATA_TABLE)
        .select('last_sync_time, total_entries_synced')
        .eq('id', 'google_sheets_sync')
        .maybeSingle();

      if (syncError) {
        // Table might not exist yet, we'll create it during the first sync
        console.log('Sync metadata table might not exist yet:', syncError.message);
      } else if (syncMetadata?.last_sync_time) {
        lastSyncTime = new Date(syncMetadata.last_sync_time);
        syncMetadataRecord = syncMetadata;
        console.log('Last successful sync at:', lastSyncTime.toISOString());
      }
    } catch (error) {
      console.error('Error retrieving sync metadata:', error);
      // Continue with default lastSyncTime
    }

    // Determine what entries need to be synced - only get entries created AFTER the last sync
    const { data: entries, error } = await supabaseClient
      .from('entries')
      .select('*')
      .gt('created_at', lastSyncTime.toISOString())
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching entries:', error);
      throw error;
    }

    console.log(`Found ${entries?.length || 0} new entries to sync`);

    if (!entries || entries.length === 0) {
      // Also update the sync metadata with the latest attempt even if no new entries
      const now = new Date();
      try {
        const { error: syncUpdateError } = await supabaseClient
          .from(SYNC_METADATA_TABLE)
          .upsert(
            { 
              id: 'google_sheets_sync', 
              last_sync_time: now.toISOString(),
              entries_synced: 0,
              total_entries_synced: syncMetadataRecord?.total_entries_synced || 0,
              is_automated: isAutomated,
              last_sync_type: isAutomated ? 'automated' : 'manual'
            },
            { onConflict: 'id' }
          );

        if (syncUpdateError) {
          console.error('Error updating sync metadata:', syncUpdateError);
        } else {
          console.log('Successfully updated sync metadata (no new entries)');
        }
      } catch (error) {
        console.error('Error handling sync metadata:', error);
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No new entries to sync',
          is_automated: isAutomated
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Format the data for Google Sheets
    // First row is headers if the sheet is empty
    const rows = entries.map(entry => {
      // Format the date in a more readable format: MM/DD/YYYY HH:MM AM/PM
      const createdDate = new Date(entry.created_at);
      const formattedDate = createdDate.toLocaleString('en-US', { 
        month: '2-digit',
        day: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
      
      return [
        entry.first_name,
        entry.last_name,
        entry.email,
        entry.referral_code,
        "", // Empty string for "Referred By" column (Option B implementation)
        entry.entry_count,
        entry.referral_count,
        entry.total_entries,
        formattedDate,
      ];
    });

    // Generate JWT token for authentication
    const jwt = await generateJWT(serviceAccountCreds);
    console.log('Generated JWT token for Google auth');

    // Get OAuth2 token using service account credentials
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion: jwt,
      }),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error('Failed to get OAuth token:', errorText);
      throw new Error(`Failed to authenticate with Google: ${errorText}`);
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;
    console.log('Successfully obtained Google OAuth token');

    // Check if the sheet exists
    let sheetId;
    try {
      // Get spreadsheet info
      const spreadsheetResponse = await fetch(
        `${GOOGLE_SHEETS_API_URL}${SPREADSHEET_ID}`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`
          }
        }
      );

      if (!spreadsheetResponse.ok) {
        const errorText = await spreadsheetResponse.text();
        console.error('Error accessing spreadsheet:', errorText);
        throw new Error(`Could not access spreadsheet: ${errorText}`);
      }

      const spreadsheetData = await spreadsheetResponse.json();
      
      // Find the sheet with the given name
      const sheet = spreadsheetData.sheets.find(
        (s: any) => s.properties.title === SHEET_NAME
      );
      
      if (sheet) {
        sheetId = sheet.properties.sheetId;
        console.log(`Found existing sheet "${SHEET_NAME}" with ID ${sheetId}`);
      } else {
        // Create the sheet if it doesn't exist
        console.log(`Sheet "${SHEET_NAME}" not found, creating it...`);
        const addSheetResponse = await fetch(
          `${GOOGLE_SHEETS_API_URL}${SPREADSHEET_ID}:batchUpdate`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              requests: [
                {
                  addSheet: {
                    properties: {
                      title: SHEET_NAME
                    }
                  }
                }
              ]
            })
          }
        );

        if (!addSheetResponse.ok) {
          const errorText = await addSheetResponse.text();
          console.error('Error creating sheet:', errorText);
          throw new Error(`Failed to create sheet: ${errorText}`);
        }

        const addSheetData = await addSheetResponse.json();
        sheetId = addSheetData.replies[0].addSheet.properties.sheetId;
        console.log(`Created new sheet "${SHEET_NAME}" with ID ${sheetId}`);
        
        // Add headers to the new sheet
        const headers = [
          'First Name', 
          'Last Name', 
          'Email', 
          'Referral Code', 
          'Referred By', 
          'Entry Count', 
          'Referral Count', 
          'Total Entries', 
          'Created At'
        ];
        
        await fetch(
          `${GOOGLE_SHEETS_API_URL}${SPREADSHEET_ID}/values/${SHEET_NAME}!A1:I1?valueInputOption=RAW`,
          {
            method: 'PUT',
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              values: [headers]
            })
          }
        );
        console.log('Added headers to new sheet');
        
        // Hide the "Referred By" column (column E) by setting its width to 0
        const hideColumnRequest = await fetch(
          `${GOOGLE_SHEETS_API_URL}${SPREADSHEET_ID}:batchUpdate`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              requests: [
                {
                  updateDimensionProperties: {
                    range: {
                      sheetId: sheetId,
                      dimension: "COLUMNS",
                      startIndex: 4,  // 0-based index, 4 = column E
                      endIndex: 5     // 5 = column F (exclusive)
                    },
                    properties: {
                      hiddenByUser: true  // This will hide the column
                    },
                    fields: "hiddenByUser"
                  }
                }
              ]
            })
          }
        );
        
        if (!hideColumnRequest.ok) {
          const errorText = await hideColumnRequest.text();
          console.error('Error hiding column:', errorText);
          // Don't throw error here - we still want sync to work even if hiding column fails
          console.log('Will continue with sync despite error hiding column');
        } else {
          console.log('Successfully hid the "Referred By" column');
        }
      }
    } catch (error) {
      console.error('Error checking/creating sheet:', error);
      throw error;
    }

    // Determine the next empty row
    const rangeResponse = await fetch(
      `${GOOGLE_SHEETS_API_URL}${SPREADSHEET_ID}/values/${SHEET_NAME}!A:A`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      }
    );

    if (!rangeResponse.ok) {
      const errorText = await rangeResponse.text();
      console.error('Error getting range data:', errorText);
      throw new Error(`Failed to get range data: ${errorText}`);
    }

    const rangeData = await rangeResponse.json();
    const nextRow = (rangeData.values?.length || 0) + 1;
    console.log(`Next empty row is ${nextRow}`);

    // Get existing email addresses from the sheet to avoid duplicates
    const emailsResponse = await fetch(
      `${GOOGLE_SHEETS_API_URL}${SPREADSHEET_ID}/values/${SHEET_NAME}!C:C`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      }
    );

    if (!emailsResponse.ok) {
      const errorText = await emailsResponse.text();
      console.error('Error getting email data:', errorText);
      throw new Error(`Failed to get email data: ${errorText}`);
    }

    const emailsData = await emailsResponse.json();
    // Convert to lowercase for case-insensitive comparison and skip header
    const existingEmails = new Set(
      (emailsData.values || [])
        .slice(1) // Skip header row
        .map((row: any) => row[0]?.toLowerCase())
        .filter(Boolean)
    );
    
    console.log(`Found ${existingEmails.size} existing emails in the sheet`);

    // Filter out entries that already exist in the sheet
    const newRows = rows.filter(row => {
      const email = row[2]?.toLowerCase(); // Email is at index 2
      return !existingEmails.has(email);
    });

    console.log(`After filtering duplicates, will sync ${newRows.length} new entries`);

    if (newRows.length === 0) {
      // No new entries to add after filtering duplicates
      const now = new Date();
      try {
        const { error: syncUpdateError } = await supabaseClient
          .from(SYNC_METADATA_TABLE)
          .upsert(
            { 
              id: 'google_sheets_sync', 
              last_sync_time: now.toISOString(),
              entries_synced: 0,
              total_entries_synced: syncMetadataRecord?.total_entries_synced || 0,
              is_automated: isAutomated,
              last_sync_type: isAutomated ? 'automated' : 'manual'
            },
            { onConflict: 'id' }
          );

        if (syncUpdateError) {
          console.error('Error updating sync metadata:', syncUpdateError);
        } else {
          console.log('Successfully updated sync metadata (no new entries after duplicate check)');
        }
      } catch (error) {
        console.error('Error handling sync metadata:', error);
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No new entries to sync (all entries already exist in sheet)',
          sheet_url: `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/edit#gid=${sheetId}`,
          is_automated: isAutomated
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Append only new entries to the sheet
    const appendResponse = await fetch(
      `${GOOGLE_SHEETS_API_URL}${SPREADSHEET_ID}/values/${SHEET_NAME}!A${nextRow}:I${nextRow + newRows.length - 1}?valueInputOption=RAW`,
      {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          values: newRows
        })
      }
    );

    if (!appendResponse.ok) {
      const errorText = await appendResponse.text();
      console.error('Error appending data:', errorText);
      throw new Error(`Failed to append data: ${errorText}`);
    }

    console.log(`Successfully appended ${newRows.length} rows to the sheet`);

    // Update the sync metadata with the latest timestamp
    const now = new Date();
    try {
      const totalEntriesSynced = (syncMetadataRecord?.total_entries_synced || 0) + newRows.length;
      
      // First, make sure the table exists by calling the function
      console.log('Making sure sheets_sync_metadata table exists');
      try {
        await supabaseClient.rpc('create_sheets_sync_metadata_table');
        console.log('Called create_sheets_sync_metadata_table function');
      } catch (createTableError) {
        console.error('Error calling create_sheets_sync_metadata_table function:', createTableError);
        // Continue anyway, as the table might already exist
      }
      
      // Use upsert to handle both insert and update cases
      console.log('Updating sync metadata with:', {
        id: 'google_sheets_sync', 
        last_sync_time: now.toISOString(),
        entries_synced: newRows.length,
        total_entries_synced: totalEntriesSynced,
        last_sync_type: isAutomated ? 'automated' : 'manual'
      });
      
      const { error: syncUpdateError } = await supabaseClient
        .from(SYNC_METADATA_TABLE)
        .upsert(
          { 
            id: 'google_sheets_sync', 
            last_sync_time: now.toISOString(),
            entries_synced: newRows.length,
            total_entries_synced: totalEntriesSynced,
            is_automated: isAutomated,
            last_sync_type: isAutomated ? 'automated' : 'manual'
          },
          { onConflict: 'id' }
        );

      if (syncUpdateError) {
        console.error('Error updating sync metadata:', syncUpdateError);
      } else {
        console.log('Successfully updated sync metadata');
      }
    } catch (error) {
      console.error('Error handling sync metadata:', error);
      // Continue with the response even if metadata update fails
    }

    // Log to the automated_sync_logs table if this was an automated sync
    if (isAutomated) {
      try {
        const { error: logError } = await supabaseClient
          .from('automated_sync_logs')
          .insert({ 
            job_name: 'daily-sheets-sync', 
            status: 'completed', 
            message: `Successfully synced ${newRows.length} entries to Google Sheets` 
          });
        
        if (logError) {
          console.error('Error logging automated sync completion:', logError);
        } else {
          console.log('Logged automated sync completion');
        }
      } catch (error) {
        console.error('Error inserting automated sync log:', error);
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Successfully synced ${newRows.length} entries to Google Sheets`,
        sheet_url: `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/edit#gid=${sheetId}`,
        is_automated: isAutomated
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in sync-to-sheets function:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      { 
        status: 500,
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      }
    );
  }
});

/**
 * Generate a JWT token for Google API authentication
 */
async function generateJWT(serviceAccountKey) {
  // Create header
  const header = {
    alg: 'RS256',
    typ: 'JWT',
    kid: serviceAccountKey.private_key_id
  };
  
  // Create claim set
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: serviceAccountKey.client_email,
    sub: serviceAccountKey.client_email,
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600, // 1 hour expiration
    scope: 'https://www.googleapis.com/auth/spreadsheets'
  };

  // Base64 encode the header and payload
  const encoder = new TextEncoder();
  const headerBase64 = btoa(JSON.stringify(header))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
  
  const payloadBase64 = btoa(JSON.stringify(payload))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
  
  // Create the content to be signed
  const signatureBase = `${headerBase64}.${payloadBase64}`;
  
  // Convert the private key from PEM format
  const pemContent = serviceAccountKey.private_key;
  const privateKey = await importPrivateKey(pemContent);
  
  // Sign the content
  const signatureBytes = await crypto.subtle.sign(
    { name: 'RSASSA-PKCS1-v1_5' },
    privateKey,
    encoder.encode(signatureBase)
  );
  
  // Convert signature to Base64URL
  const signature = arrayBufferToBase64URL(signatureBytes);
  
  // Return the complete JWT
  return `${headerBase64}.${payloadBase64}.${signature}`;
}

/**
 * Convert ArrayBuffer to Base64URL
 */
function arrayBufferToBase64URL(buffer) {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

/**
 * Import RSA private key from PEM format
 */
async function importPrivateKey(pemKey) {
  // Remove headers and newlines
  const pemContents = pemKey
    .replace('-----BEGIN PRIVATE KEY-----', '')
    .replace('-----END PRIVATE KEY-----', '')
    .replace(/\n/g, '');
  
  // Base64 decode the PEM content to get the DER
  const binaryDer = atob(pemContents);
  
  // Convert to Uint8Array
  const derBytes = new Uint8Array(binaryDer.length);
  for (let i = 0; i < binaryDer.length; i++) {
    derBytes[i] = binaryDer.charCodeAt(i);
  }
  
  // Import the key
  return await crypto.subtle.importKey(
    'pkcs8',
    derBytes.buffer,
    {
      name: 'RSASSA-PKCS1-v1_5',
      hash: { name: 'SHA-256' }
    },
    false,
    ['sign']
  );
}
