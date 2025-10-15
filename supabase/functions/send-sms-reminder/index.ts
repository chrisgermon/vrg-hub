import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SMSReminderRequest {
  reminderId: string;
  phoneNumber: string;
  message: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  let requestBody: SMSReminderRequest | null = null;

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    requestBody = await req.json();
    
    if (!requestBody) {
      throw new Error('Invalid request body');
    }

    const { reminderId, phoneNumber, message } = requestBody;

    console.log('Sending SMS reminder:', { reminderId, phoneNumber });

    // Get Notifyre API key from secrets
    const notifyreApiKey = Deno.env.get('NOTIFYRE_API_KEY');
    
    if (!notifyreApiKey) {
      throw new Error('Notifyre API key not configured');
    }

    // Send SMS via Notifyre API (correct SMS endpoint)
    const smsUrl = 'https://api.notifyre.com/sms/send';
    const payload = {
      to: phoneNumber,
      message,
    };
    console.log('Notifyre SMS request:', { url: smsUrl, to: phoneNumber, messageLength: message?.length });
    const response = await fetch(smsUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${notifyreApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const raw = await response.text();
      let parsed: any = null;
      try { parsed = JSON.parse(raw); } catch { /* not JSON */ }
      const details = parsed ?? raw ?? 'Unknown error';
      throw new Error(`Notifyre API error: ${response.status} - ${typeof details === 'string' ? details : JSON.stringify(details)}`);
    }

    const smsResult = await response.json();

    console.log('SMS sent successfully:', smsResult);

    // Log the notification
    const { error: logError } = await supabase
      .from('reminder_notifications')
      .insert({
        reminder_id: reminderId,
        notification_type: 'sms',
        status: 'sent',
        recipient: phoneNumber,
        metadata: { notifyre_response: smsResult },
      });

    if (logError) {
      console.error('Error logging notification:', logError);
    }

    return new Response(
      JSON.stringify({ success: true, data: smsResult }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error: any) {
    console.error('Error in send-sms-reminder:', error);

    // Log failed notification if we have the request body
    if (requestBody) {
      try {
        const supabase = createClient(
          Deno.env.get('SUPABASE_URL') ?? '',
          Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        );

        await supabase
          .from('reminder_notifications')
          .insert({
            reminder_id: requestBody.reminderId,
            notification_type: 'sms',
            status: 'failed',
            recipient: requestBody.phoneNumber,
            error_message: error.message,
          });
      } catch (logError) {
        console.error('Error logging failed notification:', logError);
      }
    }

    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
};

serve(handler);
