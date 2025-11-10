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
    
    // Get all active cycles
    const { data: cycles, error: cyclesError } = await supabase
      .from('newsletter_cycles')
      .select('*')
      .in('status', ['planning', 'active']);

    if (cyclesError) throw cyclesError;

    for (const cycle of cycles || []) {
      const dueDate = new Date(cycle.due_date);
      const daysUntilDue = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

      console.log(`Cycle ${cycle.name}: ${daysUntilDue} days until due`);

      let reminderType: string | null = null;

      // Determine reminder type based on days until due
      if (daysUntilDue === 7) {
        reminderType = 'weekly_7';
      } else if (daysUntilDue === 3) {
        reminderType = 'weekly_3';
      } else if (daysUntilDue === 1) {
        reminderType = 'day_before';
      } else if (daysUntilDue === 0) {
        reminderType = 'due_today';
      } else if (daysUntilDue < 0) {
        reminderType = 'overdue';
      }

      // Send reminders if needed
      if (reminderType) {
        console.log(`Sending ${reminderType} reminders for cycle ${cycle.name}`);
        
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
            
            const dueDateFormatted = new Date(cycle.due_date).toLocaleDateString();
            let emailSubject = '';
            let emailBody = '';
            
            const emailHeader = `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <div style="text-align: center; padding: 20px 0;">
                  <img src="https://hub.visionradiology.com.au/vision-radiology-email-logo.png" alt="Vision Radiology" style="max-width: 250px; height: auto;" />
                </div>
            `;
            
            const emailFooter = `
                <br>
                <p style="color: #666; font-size: 0.9em;">This is an automated reminder from the Newsletter System.</p>
              </div>
            `;
            
            if (reminderType.startsWith('weekly_')) {
              emailSubject = `Newsletter Reminder: ${cycle.name} - ${daysUntilDue} days remaining`;
              emailBody = emailHeader + `
                <h2 style="color: #333;">Newsletter Submission Reminder</h2>
                <p>Hello ${profile.name},</p>
                <p>This is a reminder that the newsletter submission for <strong>${cycle.name}</strong> is due in <strong>${daysUntilDue} days</strong> (${dueDateFormatted}).</p>
                <p>Department: <strong>${dept.department}</strong></p>
                <p>Please submit your content before the due date.</p>
                <p><a href="https://hub.visionradiology.com.au/newsletter" style="display: inline-block; padding: 12px 24px; background-color: #4F46E5; color: white; text-decoration: none; border-radius: 6px; font-weight: bold;">Submit Your Content</a></p>
              ` + emailFooter;
            } else if (reminderType === 'day_before') {
              emailSubject = `URGENT: Newsletter Due Tomorrow - ${cycle.name}`;
              emailBody = emailHeader + `
                <h2 style="color: #DC2626;">⚠️ Newsletter Due Tomorrow</h2>
                <p>Hello ${profile.name},</p>
                <p>This is an urgent reminder that the newsletter submission for <strong>${cycle.name}</strong> is due <strong>tomorrow</strong> (${dueDateFormatted}).</p>
                <p>Department: <strong>${dept.department}</strong></p>
                <p>Please submit your content as soon as possible.</p>
                <p><a href="https://hub.visionradiology.com.au/newsletter" style="display: inline-block; padding: 12px 24px; background-color: #DC2626; color: white; text-decoration: none; border-radius: 6px; font-weight: bold;">Submit Your Content Now</a></p>
              ` + emailFooter;
            } else if (reminderType === 'due_today') {
              emailSubject = `URGENT: Newsletter Due Today - ${cycle.name}`;
              emailBody = emailHeader + `
                <h2 style="color: #DC2626;">🚨 Newsletter Due Today</h2>
                <p>Hello ${profile.name},</p>
                <p>This is an urgent reminder that the newsletter submission for <strong>${cycle.name}</strong> is due <strong>today</strong> (${dueDateFormatted}).</p>
                <p>Department: <strong>${dept.department}</strong></p>
                <p>Please submit your content immediately.</p>
                <p><a href="https://hub.visionradiology.com.au/newsletter" style="display: inline-block; padding: 12px 24px; background-color: #DC2626; color: white; text-decoration: none; border-radius: 6px; font-weight: bold;">Submit Your Content Now</a></p>
              ` + emailFooter;
            } else if (reminderType === 'overdue') {
              emailSubject = `OVERDUE: Newsletter Submission - ${cycle.name}`;
              emailBody = emailHeader + `
                <h2 style="color: #991B1B;">❌ Newsletter Submission Overdue</h2>
                <p>Hello ${profile.name},</p>
                <p>The newsletter submission for <strong>${cycle.name}</strong> was due on <strong>${dueDateFormatted}</strong> and is now overdue.</p>
                <p>Department: <strong>${dept.department}</strong></p>
                <p>Please submit your content urgently.</p>
                <p><a href="https://hub.visionradiology.com.au/newsletter" style="display: inline-block; padding: 12px 24px; background-color: #991B1B; color: white; text-decoration: none; border-radius: 6px; font-weight: bold;">Submit Your Content Now</a></p>
              ` + emailFooter;
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
                  cycle_name: cycle.name,
                  due_date: cycle.due_date,
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
                  cycle_name: cycle.name,
                  due_date: cycle.due_date,
                  days_until_due: daysUntilDue,
                  email_sent: false,
                  error: err.message,
                },
              });
            }
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