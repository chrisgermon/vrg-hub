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

interface AssignmentNotificationRequest {
  userId: string;
  department: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { userId, department }: AssignmentNotificationRequest = await req.json();

    console.log('Notifying user of newsletter assignment:', { userId, department });

    // Get user profile (including company_id for in-app notifications)
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, email, full_name, company_id')
      .eq('id', userId)
      .single();

    if (profileError) {
      console.error('Profile fetch error:', profileError);
      throw profileError;
    }

    if (!profile || !profile.email) {
      throw new Error('User profile or email not found');
    }

    // Check if there are active cycles for this department
    const { data: activeCycles } = await supabase
      .from('newsletter_cycles')
      .select('id, name, month, year, due_date, status')
      .in('status', ['planning', 'active'])
      .order('due_date', { ascending: true })
      .limit(3);

    let cyclesInfo = '';
    if (activeCycles && activeCycles.length > 0) {
      cyclesInfo = `
        <h3>Current/Upcoming Newsletter Cycles:</h3>
        <ul>
          ${activeCycles.map(cycle => `
            <li>
              <strong>${cycle.name}</strong> - Due: ${new Date(cycle.due_date).toLocaleDateString()} 
              (Status: ${cycle.status})
            </li>
          `).join('')}
        </ul>
      `;
    }

    const emailSubject = `Newsletter Assignment: ${department}`;
    const emailBody = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="text-align: center; padding: 20px 0;">
          <img src="https://hub.visionradiology.com.au/vision-radiology-email-logo.png" alt="Vision Radiology" style="max-width: 250px; height: auto;" />
        </div>
        
        <h2 style="color: #333;">Newsletter Department Assignment</h2>
        <p>Hello ${profile.full_name || 'there'},</p>
        
        <p>You have been assigned as a contributor for the <strong>${department}</strong> department in the Monthly Newsletter system.</p>
        
        <p>As a newsletter contributor, you will be responsible for:</p>
        <ul>
          <li>Submitting content updates for your department each month</li>
          <li>Meeting the submission deadlines for each newsletter cycle</li>
          <li>Keeping department information current and relevant</li>
        </ul>

        ${cyclesInfo}
        
        <p>You can access the newsletter system and view your assignments here:</p>
        <p><a href="https://hub.visionradiology.com.au/newsletter" style="display: inline-block; padding: 12px 24px; background-color: #4F46E5; color: white; text-decoration: none; border-radius: 6px; font-weight: bold;">Access Newsletter Portal</a></p>
        
        <p>You will receive reminders as newsletter deadlines approach.</p>
        
        <br>
        <p style="color: #666; font-size: 0.9em;">If you have questions about your newsletter assignment, please contact your administrator.</p>
      </div>
    `;

    try {
      await sendEmail(profile.email, emailSubject, emailBody);
      console.log(`Sent assignment notification to ${profile.email} for ${department}`);

      // Log notification
      const { error: logError } = await supabase
        .from('newsletter_reminder_logs')
        .insert({
          department: department,
          user_id: userId,
          channel: 'email',
          type: 'assignment_notification',
          metadata: {
            department: department,
            email_sent: true,
            sent_at: new Date().toISOString(),
          },
        });

      if (logError) {
        console.error('Failed to log notification:', logError);
      }

      // Create in-app notification
      let inAppNotificationCreated = false;
      if (profile.company_id) {
        const { error: notifError } = await supabase.from('notifications').insert({
          user_id: userId,
          company_id: profile.company_id,
          type: 'newsletter',
          title: 'Newsletter Assignment',
          message: `You have been assigned as a contributor for the ${department} department`,
          reference_url: '/newsletter',
        });

        if (notifError) {
          console.error('Error creating in-app notification:', notifError);
        } else {
          console.log('In-app notification created for:', userId);
          inAppNotificationCreated = true;
        }
      }

      return new Response(
        JSON.stringify({
          success: true,
          message: 'Assignment notification sent successfully',
          inAppNotificationCreated,
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    } catch (emailError: any) {
      console.error(`Failed to send email to ${profile.email}:`, emailError);
      
      // Log failed notification
      await supabase.from('newsletter_reminder_logs').insert({
        department: department,
        user_id: userId,
        channel: 'email',
        type: 'assignment_notification',
        metadata: {
          department: department,
          email_sent: false,
          error: emailError.message,
          attempted_at: new Date().toISOString(),
        },
      });

      throw emailError;
    }
  } catch (error: any) {
    console.error('Error sending assignment notification:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        success: false,
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
