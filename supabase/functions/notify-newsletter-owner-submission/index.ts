import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function sendEmail(to: string, subject: string, html: string) {
  const mailgunDomain = Deno.env.get("MAILGUN_DOMAIN");
  const mailgunApiKey = Deno.env.get("MAILGUN_API_KEY");

  if (!mailgunDomain || !mailgunApiKey) {
    throw new Error("Mailgun credentials not configured");
  }

  const auth = btoa(`api:${mailgunApiKey}`);
  const body = new FormData();
  body.append("from", `Newsletter System <newsletter@${mailgunDomain}>`);
  body.append("to", to);
  body.append("subject", subject);
  body.append("html", html);

  const response = await fetch(
    `https://api.mailgun.net/v3/${mailgunDomain}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
      },
      body,
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Mailgun API error: ${error}`);
  }

  return await response.json();
}

interface SubmissionNotificationRequest {
  submissionId: string;
  cycleId: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { submissionId, cycleId }: SubmissionNotificationRequest = await req.json();

    // Fetch cycle with owner info
    const { data: cycle, error: cycleError } = await supabase
      .from('newsletter_cycles')
      .select(`
        *,
        owner:profiles!newsletter_cycles_owner_id_fkey(id, email, full_name)
      `)
      .eq('id', cycleId)
      .single();

    if (cycleError) throw cycleError;
    if (!cycle?.owner?.email) {
      console.log('No owner configured for this cycle, skipping notification');
      return new Response(JSON.stringify({ success: true, message: 'No owner to notify' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch submission details
    const { data: submission, error: submissionError } = await supabase
      .from('newsletter_submissions')
      .select(`
        *,
        contributor:profiles!newsletter_submissions_contributor_id_fkey(full_name, email),
        brand:brands(name),
        location:locations(name)
      `)
      .eq('id', submissionId)
      .single();

    if (submissionError) throw submissionError;

    // Build email
    const companyInfo = submission.brand 
      ? ` for ${submission.brand.name}${submission.location ? ` - ${submission.location.name}` : ''}`
      : '';

    const subject = `Newsletter Submission: ${submission.department}${companyInfo}`;
    
    const html = `
      <h2>New Newsletter Contribution Submitted</h2>
      <p>Hello ${cycle.owner.full_name},</p>
      <p>A new contribution has been submitted for the <strong>${cycle.name}</strong> newsletter cycle.</p>
      
      <h3>Submission Details:</h3>
      <ul>
        <li><strong>Department:</strong> ${submission.department}</li>
        ${submission.brand ? `<li><strong>Company:</strong> ${submission.brand.name}</li>` : ''}
        ${submission.location ? `<li><strong>Location:</strong> ${submission.location.name}</li>` : ''}
        <li><strong>Contributor:</strong> ${submission.contributor.full_name} (${submission.contributor.email})</li>
        <li><strong>Submitted:</strong> ${new Date(submission.submitted_at).toLocaleString()}</li>
        <li><strong>Status:</strong> ${submission.status}</li>
      </ul>
      
      <p>You can review this submission in the newsletter editor dashboard.</p>
      
      <p>Best regards,<br/>Newsletter System</p>
    `;

    // Send email
    await sendEmail(cycle.owner.email, subject, html);

    // Log notification
    await supabase
      .from('newsletter_reminder_logs')
      .insert({
        cycle_id: cycleId,
        recipient_email: cycle.owner.email,
        reminder_type: 'owner_submission_notification',
        status: 'sent',
        sent_at: new Date().toISOString(),
      });

    console.log(`Sent submission notification to cycle owner: ${cycle.owner.email}`);

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error sending owner notification:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : String(error) }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});