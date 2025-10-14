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

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { reminderId, phoneNumber, message }: SMSReminderRequest = await req.json();

    console.log('Sending SMS reminder:', { reminderId, phoneNumber });

    // Get Notifyre API key from secrets
    const notifyreApiKey = Deno.env.get('NOTIFYRE_API_KEY');
    
    if (!notifyreApiKey) {
      throw new Error('Notifyre API key not configured');
    }

    // Send SMS via Notifyre API
    const notifyreResponse = await fetch('https://api.notifyre.com/v1/sms/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${notifyreApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: phoneNumber,
        message: message,
        from: 'Reminders', // Can be configured
      }),
    });

    const notifyreData = await notifyreResponse.json();

    if (!notifyreResponse.ok) {
      throw new Error(`Notifyre API error: ${JSON.stringify(notifyreData)}`);
    }

    // Log the notification
    const { error: logError } = await supabase
      .from('reminder_notifications')
      .insert({
        reminder_id: reminderId,
        notification_type: 'sms',
        status: 'sent',
        recipient: phoneNumber,
        metadata: { notifyre_response: notifyreData },
      });

    if (logError) {
      console.error('Error logging notification:', logError);
    }

    console.log('SMS sent successfully:', notifyreData);

    return new Response(
      JSON.stringify({ success: true, data: notifyreData }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error: any) {
    console.error('Error in send-sms-reminder:', error);

    // Log failed notification
    try {
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      );

      const { reminderId, phoneNumber } = await req.json();

      await supabase
        .from('reminder_notifications')
        .insert({
          reminder_id: reminderId,
          notification_type: 'sms',
          status: 'failed',
          recipient: phoneNumber,
          error_message: error.message,
        });
    } catch (logError) {
      console.error('Error logging failed notification:', logError);
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
