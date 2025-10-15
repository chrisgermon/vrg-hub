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

    // Send SMS via Notifyre API (try multiple recipient payload shapes on v20220711)
    const apiVersion = '20220711';
    const smsUrl = `https://api.notifyre.com/${apiVersion}/sms/send`;
    const fromNumber = Deno.env.get('NOTIFYRE_SMS_FROM') || undefined;

    const recipientShapes = [
      [{ type: 'toNumber', value: phoneNumber }],
      [{ type: 'phoneNumber', value: phoneNumber }],
      [{ type: 'number', value: phoneNumber }],
      [phoneNumber],
    ];

    let smsResult: any = null;
    let lastError: any = null;

    for (const recipients of recipientShapes) {
      try {
        const payload: any = {
          body: message,
          recipients,
          ...(fromNumber ? { from: fromNumber } : {}),
          scheduledDate: null,
          addUnsubscribeLink: false,
          callbackUrl: '',
          metadata: { source: 'send-sms-reminder' },
          callbackFormat: 'notifyre',
          apiVersion,
          campaignName: 'Reminders',
        };

        console.log('Notifyre SMS request:', {
          url: smsUrl,
          to: phoneNumber,
          messageLength: message?.length,
          hasFrom: !!fromNumber,
          recipientsShape: recipients,
        });

        const response = await fetch(smsUrl, {
          method: 'POST',
          headers: {
            'x-api-token': notifyreApiKey,
            'Accept': 'application/json',
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

        smsResult = await response.json();
        console.log('SMS sent successfully:', smsResult);
        break;
      } catch (err) {
        lastError = err;
        console.warn('Notifyre attempt failed:', (err as any)?.message);
      }
    }

    if (!smsResult) {
      throw lastError || new Error('Failed to send SMS after all attempts');
    }

    // Log the notification only when we have a valid reminder_id (UUID)
    const isUuid = typeof reminderId === 'string' && /^[0-9a-fA-F-]{36}$/.test(reminderId);
    if (isUuid) {
      const { error: logError } = await supabase
        .from('reminder_notifications')
        .insert({
          reminder_id: reminderId,
          notification_type: 'sms',
          status: 'sent',
          recipient: phoneNumber,
          metadata: { notifyre_response: smsResult, source: 'send-sms-reminder' },
        });
      if (logError) {
        console.error('Error logging notification:', logError);
      }
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

        const isUuid = typeof requestBody.reminderId === 'string' && /^[0-9a-fA-F-]{36}$/.test(requestBody.reminderId);
        const failurePayload: any = {
          notification_type: 'sms',
          status: 'failed',
          recipient: requestBody.phoneNumber,
          error_message: error.message,
          metadata: { source: 'send-sms-reminder' },
        };
        if (isUuid) failurePayload.reminder_id = requestBody.reminderId;

        if (isUuid) {
          await supabase
            .from('reminder_notifications')
            .insert(failurePayload);
        }
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
