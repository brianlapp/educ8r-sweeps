
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

// This is a test function to simulate an Everflow webhook call
serve(async (_req) => {
  try {
    // Simulate a webhook call to our everflow-webhook endpoint
    const response = await fetch(
      'https://epfzraejquaxqrfmkmyx.supabase.co/functions/v1/everflow-webhook',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // Include the service role key for authentication
          'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`
        },
        body: JSON.stringify({
          referral_code: 'TEST123',
          transaction_id: 'test-' + Date.now()
        })
      }
    );

    const result = await response.json();
    console.log('Test webhook response:', result);

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Test webhook executed',
        result 
      }),
      { 
        headers: { 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Error in test webhook:', error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message 
      }),
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
})
