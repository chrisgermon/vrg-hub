import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function sendEmail(to: string, subject: string, html: string) {
  const mailgunDomain = Deno.env.get('MAILGUN_DOMAIN')!;
  const mailgunApiKey = Deno.env.get('MAILGUN_API_KEY')!;
  
  const formData = new FormData();
  formData.append('from', `Newsletter System <newsletter@${mailgunDomain}>`);
  formData.append('to', to);
  formData.append('subject', subject);
  formData.append('html', html);
  
  const response = await fetch(
    `https://api.mailgun.net/v3/${mailgunDomain}/messages`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${btoa(`api:${mailgunApiKey}`)}`,
      },
      body: formData,
    }
  );
  
  if (!response.ok) {
    const error = await response.text();
    console.error('Mailgun error:', error);
    throw new Error(`Failed to send email: ${error}`);
  }
  
  return response.json();
}

interface CycleCreatedRequest {
  cycleId: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { cycleId }: CycleCreatedRequest = await req.json();

    console.log('Notifying assignments for new cycle:', cycleId);

    // Get cycle details
    const { data: cycle, error: cycleError } = await supabase
      .from('newsletter_cycles')
      .select('*')
      .eq('id', cycleId)
      .single();

    if (cycleError) throw cycleError;

    // Get all department assignments
    const { data: assignments, error: assignmentsError } = await supabase
      .from('department_assignments')
      .select('department, assignee_ids');

    if (assignmentsError) throw assignmentsError;

    const dueDate = new Date(cycle.due_at).toLocaleDateString();
    let emailsSent = 0;
    let emailsFailed = 0;

    // Notify all assigned users
    for (const assignment of assignments || []) {
      if (!assignment.assignee_ids?.length) continue;

      // Get user profiles
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, email, name')
        .in('user_id', assignment.assignee_ids);

      for (const profile of profiles || []) {
        const emailSubject = `New Newsletter Cycle: ${cycle.month}`;
        const emailBody = `
          <h2>New Newsletter Cycle Created</h2>
          <p>Hello ${profile.name},</p>
          <p>A new newsletter cycle for <strong>${cycle.month}</strong> has been created.</p>
          <p>Department: <strong>${assignment.department}</strong></p>
          <p>Due Date: <strong>${dueDate}</strong></p>
          <p>Please prepare and submit your content before the due date.</p>
          <p><a href="${supabaseUrl}/newsletter-submit">Submit your content here</a></p>
          <br>
          <p><em>You will receive weekly reminders until the submission is due.</em></p>
        `;

        try {
          await sendEmail(profile.email, emailSubject, emailBody);
          console.log(`Sent notification to ${profile.email} for ${assignment.department}`);
          emailsSent++;

          // Log notification
          await supabase.from('newsletter_reminder_logs').insert({
            cycle_id: cycleId,
            department: assignment.department,
            user_id: profile.user_id,
            channel: 'email',
            type: 'cycle_created',
            metadata: {
              cycle_month: cycle.month,
              due_date: cycle.due_at,
              email_sent: true,
            },
          });
        } catch (err: any) {
          console.error(`Failed to send email to ${profile.email}:`, err);
          emailsFailed++;
          
          await supabase.from('newsletter_reminder_logs').insert({
            cycle_id: cycleId,
            department: assignment.department,
            user_id: profile.user_id,
            channel: 'email',
            type: 'cycle_created',
            metadata: {
              cycle_month: cycle.month,
              due_date: cycle.due_at,
              email_sent: false,
              error: err.message,
            },
          });
        }
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        emailsSent,
        emailsFailed,
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error('Error notifying cycle creation:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
