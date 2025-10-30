import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ConfirmationRequest {
  ticketId: string;
  recipientEmail?: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const mailgunApiKey = Deno.env.get('MAILGUN_API_KEY')!;
    const mailgunDomain = Deno.env.get('MAILGUN_DOMAIN')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { ticketId, recipientEmail }: ConfirmationRequest = await req.json();

    console.log('[send-request-confirmation] Sending confirmation for ticket:', ticketId);

    // Fetch ticket details
    const { data: ticket, error: ticketError } = await supabase
      .from('tickets')
      .select(`
        *,
        form_template:form_template_id(name),
        department:department_id(name),
        profile:user_id(full_name, email)
      `)
      .eq('id', ticketId)
      .single();

    if (ticketError || !ticket) {
      throw new Error(`Ticket not found: ${ticketError?.message}`);
    }

    // Determine recipient email
    const toEmail = recipientEmail || 
                    ticket.metadata?.sender_email || 
                    ticket.profile?.email;

    if (!toEmail) {
      throw new Error('No recipient email found');
    }

    // Format request number
    const requestNumber = `VRG-${String(ticket.request_number).padStart(5, '0')}`;
    
    // Get the base URL for the request link
    const baseUrl = Deno.env.get('SUPABASE_URL')?.replace('/rest/v1', '') || '';
    const requestUrl = `${baseUrl.replace('supabase.co', 'lovableproject.com')}/request/${requestNumber.toLowerCase()}`;

    // Build email HTML
    const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { 
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
              line-height: 1.6;
              color: #333;
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
            }
            .header {
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              color: white;
              padding: 30px;
              border-radius: 8px 8px 0 0;
              text-align: center;
            }
            .content {
              background: #f9fafb;
              padding: 30px;
              border: 1px solid #e5e7eb;
              border-top: none;
            }
            .detail-box {
              background: white;
              padding: 20px;
              border-radius: 8px;
              margin: 20px 0;
              border: 1px solid #e5e7eb;
            }
            .detail-row {
              display: flex;
              justify-content: space-between;
              padding: 10px 0;
              border-bottom: 1px solid #f3f4f6;
            }
            .detail-row:last-child {
              border-bottom: none;
            }
            .detail-label {
              font-weight: 600;
              color: #6b7280;
            }
            .detail-value {
              color: #111827;
            }
            .button {
              display: inline-block;
              padding: 12px 24px;
              background: #667eea;
              color: white !important;
              text-decoration: none;
              border-radius: 6px;
              font-weight: 600;
              margin: 20px 0;
            }
            .footer {
              text-align: center;
              padding: 20px;
              color: #6b7280;
              font-size: 14px;
            }
            .status-badge {
              display: inline-block;
              padding: 4px 12px;
              background: #dbeafe;
              color: #1e40af;
              border-radius: 12px;
              font-size: 14px;
              font-weight: 500;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1 style="margin: 0;">Request Confirmation</h1>
            <p style="margin: 10px 0 0 0; opacity: 0.9;">Your request has been received</p>
          </div>
          
          <div class="content">
            <h2 style="margin-top: 0;">Request ${requestNumber}</h2>
            <p>Thank you for submitting your request. We've received it and our team will review it shortly.</p>
            
            <div class="detail-box">
              <h3 style="margin-top: 0;">Request Details</h3>
              
              <div class="detail-row">
                <span class="detail-label">Request Number:</span>
                <span class="detail-value"><strong>${requestNumber}</strong></span>
              </div>
              
              <div class="detail-row">
                <span class="detail-label">Title:</span>
                <span class="detail-value">${ticket.title || 'No title'}</span>
              </div>
              
              <div class="detail-row">
                <span class="detail-label">Status:</span>
                <span class="detail-value">
                  <span class="status-badge">${ticket.status.replace('_', ' ').toUpperCase()}</span>
                </span>
              </div>
              
              <div class="detail-row">
                <span class="detail-label">Priority:</span>
                <span class="detail-value">${ticket.priority?.toUpperCase() || 'MEDIUM'}</span>
              </div>
              
              ${ticket.form_template ? `
              <div class="detail-row">
                <span class="detail-label">Type:</span>
                <span class="detail-value">${ticket.form_template.name}</span>
              </div>
              ` : ''}
              
              ${ticket.department ? `
              <div class="detail-row">
                <span class="detail-label">Department:</span>
                <span class="detail-value">${ticket.department.name}</span>
              </div>
              ` : ''}
              
              ${ticket.description ? `
              <div class="detail-row" style="display: block;">
                <span class="detail-label">Description:</span>
                <p style="margin: 10px 0 0 0; color: #4b5563;">${ticket.description.substring(0, 200)}${ticket.description.length > 200 ? '...' : ''}</p>
              </div>
              ` : ''}
            </div>
            
            <div style="text-align: center;">
              <a href="${requestUrl}" class="button">View Request Details</a>
            </div>
            
            <p style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 14px;">
              You can track the progress of your request at any time by clicking the button above or replying to this email.
            </p>
          </div>
          
          <div class="footer">
            <p>This is an automated confirmation email. Please do not reply directly to this message.</p>
            <p>If you have any questions, please visit your request page or contact support.</p>
          </div>
        </body>
      </html>
    `;

    // Send email via Mailgun API
    const formData = new FormData();
    formData.append("from", `CrowdHub Support <support@${mailgunDomain}>`);
    formData.append("to", toEmail);
    formData.append("subject", `Request Confirmed - ${requestNumber}`);
    formData.append("html", emailHtml);

    const mailgunResponse = await fetch(
      `https://api.mailgun.net/v3/${mailgunDomain}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${btoa(`api:${mailgunApiKey}`)}`,
        },
        body: formData,
      }
    );

    if (!mailgunResponse.ok) {
      const errorText = await mailgunResponse.text();
      console.error('[send-request-confirmation] Mailgun API error:', mailgunResponse.status, errorText);
      throw new Error(`Failed to send email: ${errorText}`);
    }

    const emailData = await mailgunResponse.json();
    console.log('[send-request-confirmation] Email sent successfully:', emailData);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Confirmation email sent',
        emailId: emailData?.id 
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error('[send-request-confirmation] ERROR:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );
  }
};

serve(handler);
