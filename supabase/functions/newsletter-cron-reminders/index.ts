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

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('Running newsletter reminder cron job');

    const now = new Date();
    
    // Get all open cycles
    const { data: cycles, error: cyclesError } = await supabase
      .from('newsletter_cycles')
      .select('*')
      .in('status', ['open', 'due_soon', 'past_due']);

    if (cyclesError) throw cyclesError;

    for (const cycle of cycles || []) {
      const dueDate = new Date(cycle.due_at);
      const daysUntilDue = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

      console.log(`Cycle ${cycle.month}: ${daysUntilDue} days until due`);

      let reminderType: string | null = null;

      // Determine reminder type based on days until due
      // Weekly reminders (every 7 days until due date)
      if (daysUntilDue > 0 && daysUntilDue % 7 === 0) {
        reminderType = `weekly_${daysUntilDue}`;
      } else if (daysUntilDue === 1) {
        // Day before reminder
        reminderType = 'day_before';
      } else if (daysUntilDue === 0 && now.getHours() >= 23) {
        // End of due date
        reminderType = 'past_due';
        await supabase
          .from('newsletter_cycles')
          .update({ status: 'past_due' })
          .eq('id', cycle.id);
      } else if (daysUntilDue < 0) {
        // Overdue reminders
        reminderType = 'overdue';
      }

      // Check if it's the opening day
      const openDate = new Date(cycle.open_at);
      if (
        openDate.getDate() === now.getDate() &&
        openDate.getMonth() === now.getMonth() &&
        openDate.getFullYear() === now.getFullYear() &&
        now.getHours() === 9 // Send at 9 AM
      ) {
        reminderType = 'opening';
      }

      // Send reminders if needed
      if (reminderType) {
        console.log(`Sending ${reminderType} reminders for cycle ${cycle.month}`);
        
        // Get departments that haven't submitted
        const { data: assignments } = await supabase
          .from('department_assignments')
          .select('department, assignee_ids');

        const { data: submissions } = await supabase
          .from('newsletter_submissions')
          .select('department')
          .eq('cycle_id', cycle.id)
          .eq('status', 'submitted');

        const submittedDepts = submissions?.map(s => s.department) || [];
        const departmentsToRemind = (assignments || [])
          .filter(a => !submittedDepts.includes(a.department))
          .filter(a => a.assignee_ids?.length > 0);

        // For each department, get assignees and log reminders
        for (const dept of departmentsToRemind) {
          const { data: profiles } = await supabase
            .from('profiles')
            .select('user_id, email, name')
            .in('user_id', dept.assignee_ids);

          // Send email reminders to each user
          for (const profile of profiles || []) {
            console.log(`Sending ${reminderType} reminder to ${profile.email} - ${dept.department}`);
            
            const dueDate = new Date(cycle.due_at).toLocaleDateString();
            let emailSubject = '';
            let emailBody = '';
            
            if (reminderType.startsWith('weekly_')) {
              emailSubject = `Newsletter Reminder: ${cycle.month} - ${daysUntilDue} days remaining`;
              emailBody = `
                <h2>Newsletter Submission Reminder</h2>
                <p>Hello ${profile.name},</p>
                <p>This is a reminder that the newsletter submission for <strong>${cycle.month}</strong> is due in <strong>${daysUntilDue} days</strong> (${dueDate}).</p>
                <p>Department: <strong>${dept.department}</strong></p>
                <p>Please submit your content before the due date.</p>
                <p><a href="${Deno.env.get('SUPABASE_URL')}/newsletter-submit">Submit your content here</a></p>
              `;
            } else if (reminderType === 'day_before') {
              emailSubject = `URGENT: Newsletter Due Tomorrow - ${cycle.month}`;
              emailBody = `
                <h2>⚠️ Newsletter Due Tomorrow</h2>
                <p>Hello ${profile.name},</p>
                <p>This is an urgent reminder that the newsletter submission for <strong>${cycle.month}</strong> is due <strong>tomorrow</strong> (${dueDate}).</p>
                <p>Department: <strong>${dept.department}</strong></p>
                <p>Please submit your content as soon as possible.</p>
                <p><a href="${Deno.env.get('SUPABASE_URL')}/newsletter-submit">Submit your content here</a></p>
              `;
            }
            
            try {
              await sendEmail(profile.email, emailSubject, emailBody);
              
              await supabase.from('newsletter_reminder_logs').insert({
                cycle_id: cycle.id,
                department: dept.department,
                user_id: profile.user_id,
                channel: 'email',
                type: reminderType,
                metadata: {
                  cycle_month: cycle.month,
                  due_date: cycle.due_at,
                  days_until_due: daysUntilDue,
                  email_sent: true,
                },
              });
            } catch (err: any) {
              console.error(`Failed to send email to ${profile.email}:`, err);
              await supabase.from('newsletter_reminder_logs').insert({
                cycle_id: cycle.id,
                department: dept.department,
                user_id: profile.user_id,
                channel: 'email',
                type: reminderType,
                metadata: {
                  cycle_month: cycle.month,
                  due_date: cycle.due_at,
                  days_until_due: daysUntilDue,
                  email_sent: false,
                  error: err.message,
                },
              });
            }
          }
        }

        // For escalation, also notify editors/managers
        if (reminderType === 'escalation') {
          console.log(`Sending escalation for cycle ${cycle.month} with ${departmentsToRemind.length} pending departments`);
          
          // Get managers/admins
          const { data: managers } = await supabase
            .from('user_roles')
            .select('user_id')
            .in('role', ['manager', 'tenant_admin', 'super_admin']);

          const managerIds = managers?.map(m => m.user_id) || [];

          const { data: managerProfiles } = await supabase
            .from('profiles')
            .select('user_id, email')
            .in('user_id', managerIds);

          for (const profile of managerProfiles || []) {
            await supabase.from('newsletter_reminder_logs').insert({
              cycle_id: cycle.id,
              department: 'all',
              user_id: profile.user_id,
              channel: 'email',
              type: 'escalation',
              metadata: {
                cycle_month: cycle.month,
                pending_departments: departmentsToRemind.map(d => d.department),
              },
            });
          }
        }
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        processed: cycles?.length || 0,
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error('Error in newsletter cron:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});