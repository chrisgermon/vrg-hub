import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SendNowRequest {
  reminderId: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { reminderId }: SendNowRequest = await req.json();

    if (!reminderId) {
      return new Response(JSON.stringify({ error: 'reminderId is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Fetch the reminder
    const { data: reminder, error: reminderError } = await supabase
      .from('reminders')
      .select('*')
      .eq('id', reminderId)
      .maybeSingle();

    if (reminderError) throw reminderError;
    if (!reminder) {
      return new Response(JSON.stringify({ error: 'Reminder not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch user profile (fallback for contact details)
    let userProfile: any = null;
    if (reminder.user_id) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('email, phone, full_name')
        .eq('id', reminder.user_id)
        .maybeSingle();
      userProfile = profile;
    }

    const channels = (reminder.notification_channels || {}) as {
      email?: boolean; sms?: boolean; in_app?: boolean
    };

    // Build message (force send "now"/"today")
    const daysMessage = 'Today';
    const message = `Reminder: ${reminder.title}${reminder.description ? ' - ' + reminder.description : ''} is ${daysMessage}!`;

    const results: Record<string, any> = {};

    // Email
    if (channels.email) {
      const emailTo = reminder.email || userProfile?.email;
      if (emailTo) {
        try {
          const { data, error } = await supabase.functions.invoke('send-email-reminder', {
            body: {
              reminderId: reminder.id,
              email: emailTo,
              subject: `Reminder: ${reminder.title} ${daysMessage}`,
              message,
              reminderTitle: reminder.title,
              reminderDate: reminder.reminder_date,
            },
          });
          if (error) {
            results.email = { ok: false, error: error.message };
          } else {
            results.email = { ok: true, data };
          }
        } catch (e: any) {
          results.email = { ok: false, error: e.message };
        }
      } else {
        results.email = { ok: false, error: 'No email available' };
      }
    }

    // SMS
    if (channels.sms) {
      const phoneNumber = reminder.phone_number || userProfile?.phone;
      if (phoneNumber) {
        try {
          const { data, error } = await supabase.functions.invoke('send-sms-reminder', {
            body: {
              reminderId: reminder.id,
              phoneNumber,
              message,
            },
          });
          if (error) {
            results.sms = { ok: false, error: error.message };
          } else {
            results.sms = { ok: true, data };
          }
        } catch (e: any) {
          results.sms = { ok: false, error: e.message };
        }
      } else {
        results.sms = { ok: false, error: 'No phone number available' };
      }
    }

    // In-app notification (log directly)
    if (channels.in_app) {
      try {
        const { error: inAppError } = await supabase
          .from('reminder_notifications')
          .insert({
            reminder_id: reminder.id,
            notification_type: 'in_app',
            status: 'sent',
            days_before: null, // manual send
            metadata: {
              message,
              reminder_title: reminder.title,
              reminder_date: reminder.reminder_date,
              source: 'send-reminder-now'
            },
          });
        if (inAppError) throw inAppError;
        results.in_app = { ok: true };
      } catch (e: any) {
        results.in_app = { ok: false, error: e.message };
      }
    }

    return new Response(
      JSON.stringify({ success: true, results }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Error in send-reminder-now:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
};

serve(handler);
