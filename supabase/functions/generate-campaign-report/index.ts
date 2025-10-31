import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ReportRequest {
  recipientEmail: string;
  timeframe: 'this_week' | 'last_week' | 'this_month' | 'last_month';
}

interface Campaign {
  id: string;
  web_id: number;
  settings: {
    title: string;
    subject_line: string;
  };
  status: string;
  emails_sent: number;
  send_time?: string;
  report_summary?: {
    opens?: number;
    unique_opens?: number;
    clicks?: number;
    subscriber_clicks?: number;
  };
}

interface FaxCampaign {
  id: string;
  campaign_name: string;
  total_recipients: number;
  delivered_count: number;
  failed_count: number;
  pending_count: number;
  sent_at: string;
}

const getDateRange = (timeframe: string) => {
  const now = new Date();
  const startDate = new Date();
  const endDate = new Date();

  switch (timeframe) {
    case 'this_week':
      // Start of this week (Monday)
      const dayOfWeek = now.getDay();
      const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
      startDate.setDate(now.getDate() + diffToMonday);
      startDate.setHours(0, 0, 0, 0);
      endDate.setHours(23, 59, 59, 999);
      break;

    case 'last_week':
      // Start of last week (Monday)
      const lastWeekStart = new Date(now);
      const daysToLastMonday = (now.getDay() === 0 ? 7 : now.getDay()) + 6;
      lastWeekStart.setDate(now.getDate() - daysToLastMonday);
      lastWeekStart.setHours(0, 0, 0, 0);
      startDate.setTime(lastWeekStart.getTime());
      
      // End of last week (Sunday)
      endDate.setTime(lastWeekStart.getTime());
      endDate.setDate(lastWeekStart.getDate() + 6);
      endDate.setHours(23, 59, 59, 999);
      break;

    case 'this_month':
      startDate.setDate(1);
      startDate.setHours(0, 0, 0, 0);
      endDate.setHours(23, 59, 59, 999);
      break;

    case 'last_month':
      startDate.setMonth(now.getMonth() - 1);
      startDate.setDate(1);
      startDate.setHours(0, 0, 0, 0);
      endDate.setMonth(now.getMonth());
      endDate.setDate(0);
      endDate.setHours(23, 59, 59, 999);
      break;

    default:
      startDate.setDate(now.getDate() - 7);
      startDate.setHours(0, 0, 0, 0);
  }

  return { startDate: startDate.toISOString(), endDate: endDate.toISOString() };
};

const formatDate = (dateStr: string) => {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-AU', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Australia/Melbourne'
  });
};

const getTimeframeLabel = (timeframe: string) => {
  const labels: Record<string, string> = {
    this_week: "This Week",
    last_week: "Last Week",
    this_month: "This Month",
    last_month: "Last Month"
  };
  return labels[timeframe] || "Custom Range";
};

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const mailgunApiKey = Deno.env.get('MAILGUN_API_KEY')!;
    const mailgunDomain = Deno.env.get('MAILGUN_DOMAIN')!;
    const mailchimpApiKey = Deno.env.get('MAILCHIMP_API_KEY');

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { recipientEmail, timeframe }: ReportRequest = await req.json();
    console.log('[generate-campaign-report] Generating report for:', recipientEmail, 'Timeframe:', timeframe);

    if (!recipientEmail) {
      return new Response(
        JSON.stringify({ success: false, message: 'Recipient email is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { startDate, endDate } = getDateRange(timeframe);
    console.log('[generate-campaign-report] Date range:', startDate, 'to', endDate);

    // Fetch fax campaigns from database
    const { data: faxCampaigns, error: faxError } = await supabase
      .from('notifyre_fax_campaigns')
      .select('*')
      .gte('sent_at', startDate)
      .lte('sent_at', endDate)
      .order('sent_at', { ascending: false });

    if (faxError) {
      console.error('[generate-campaign-report] Error fetching fax campaigns:', faxError);
    }

    const faxData = (faxCampaigns || []) as FaxCampaign[];

    // Fetch email campaigns from Mailchimp API
    let emailData: Campaign[] = [];
    
    if (mailchimpApiKey) {
      try {
        const mailchimpData = await supabase.functions.invoke('fetch-mailchimp-campaigns');
        if (mailchimpData.data?.campaigns) {
          // Filter campaigns by date range
          emailData = (mailchimpData.data.campaigns as Campaign[]).filter(campaign => {
            if (!campaign.send_time) return false;
            const sendDate = new Date(campaign.send_time);
            return sendDate >= new Date(startDate) && sendDate <= new Date(endDate);
          });
        }
      } catch (error) {
        console.error('[generate-campaign-report] Error fetching Mailchimp campaigns:', error);
      }
    }

    console.log(`[generate-campaign-report] Found ${emailData.length} email campaigns and ${faxData.length} fax campaigns`);

    // Calculate totals
    const totalEmailsSent = emailData.reduce((sum, c) => sum + c.emails_sent, 0);
    const totalEmailOpens = emailData.reduce((sum, c) => sum + (c.report_summary?.unique_opens || 0), 0);
    const totalEmailClicks = emailData.reduce((sum, c) => sum + (c.report_summary?.subscriber_clicks || 0), 0);
    
    const totalFaxesSent = faxData.reduce((sum, c) => sum + c.total_recipients, 0);
    const totalFaxesDelivered = faxData.reduce((sum, c) => sum + c.delivered_count, 0);
    const totalFaxesFailed = faxData.reduce((sum, c) => sum + c.failed_count, 0);

    const emailOpenRate = totalEmailsSent > 0 ? ((totalEmailOpens / totalEmailsSent) * 100).toFixed(1) : '0';
    const emailClickRate = totalEmailsSent > 0 ? ((totalEmailClicks / totalEmailsSent) * 100).toFixed(1) : '0';
    const faxDeliveryRate = totalFaxesSent > 0 ? ((totalFaxesDelivered / totalFaxesSent) * 100).toFixed(1) : '0';

    // Build email campaigns table
    let emailCampaignsHtml = '';
    if (emailData.length > 0) {
      emailCampaignsHtml = `
        <h2 style="color: #1f2937; font-size: 20px; font-weight: 600; margin: 24px 0 16px 0;">Email Campaigns</h2>
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px; background: white; border-radius: 8px; overflow: hidden;">
          <thead>
            <tr style="background: #f3f4f6;">
              <th style="padding: 12px; text-align: left; border-bottom: 2px solid #e5e7eb; font-weight: 600; color: #374151;">Campaign</th>
              <th style="padding: 12px; text-align: left; border-bottom: 2px solid #e5e7eb; font-weight: 600; color: #374151;">Subject</th>
              <th style="padding: 12px; text-align: center; border-bottom: 2px solid #e5e7eb; font-weight: 600; color: #374151;">Sent</th>
              <th style="padding: 12px; text-align: center; border-bottom: 2px solid #e5e7eb; font-weight: 600; color: #374151;">Opens</th>
              <th style="padding: 12px; text-align: center; border-bottom: 2px solid #e5e7eb; font-weight: 600; color: #374151;">Clicks</th>
              <th style="padding: 12px; text-align: left; border-bottom: 2px solid #e5e7eb; font-weight: 600; color: #374151;">Date</th>
            </tr>
          </thead>
          <tbody>
            ${emailData.map(campaign => `
              <tr style="border-bottom: 1px solid #f3f4f6;">
                <td style="padding: 12px; color: #1f2937;">${campaign.settings.title || 'Untitled'}</td>
                <td style="padding: 12px; color: #6b7280;">${campaign.settings.subject_line}</td>
                <td style="padding: 12px; text-align: center; color: #1f2937; font-weight: 500;">${campaign.emails_sent.toLocaleString()}</td>
                <td style="padding: 12px; text-align: center; color: #059669; font-weight: 500;">${campaign.report_summary?.unique_opens || 0}</td>
                <td style="padding: 12px; text-align: center; color: #2563eb; font-weight: 500;">${campaign.report_summary?.subscriber_clicks || 0}</td>
                <td style="padding: 12px; color: #6b7280;">${campaign.send_time ? formatDate(campaign.send_time) : 'Not sent'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      `;
    }

    // Build fax campaigns table
    let faxCampaignsHtml = '';
    if (faxData.length > 0) {
      faxCampaignsHtml = `
        <h2 style="color: #1f2937; font-size: 20px; font-weight: 600; margin: 24px 0 16px 0;">Fax Campaigns</h2>
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px; background: white; border-radius: 8px; overflow: hidden;">
          <thead>
            <tr style="background: #f3f4f6;">
              <th style="padding: 12px; text-align: left; border-bottom: 2px solid #e5e7eb; font-weight: 600; color: #374151;">Campaign</th>
              <th style="padding: 12px; text-align: center; border-bottom: 2px solid #e5e7eb; font-weight: 600; color: #374151;">Recipients</th>
              <th style="padding: 12px; text-align: center; border-bottom: 2px solid #e5e7eb; font-weight: 600; color: #374151;">Delivered</th>
              <th style="padding: 12px; text-align: center; border-bottom: 2px solid #e5e7eb; font-weight: 600; color: #374151;">Failed</th>
              <th style="padding: 12px; text-align: center; border-bottom: 2px solid #e5e7eb; font-weight: 600; color: #374151;">Pending</th>
              <th style="padding: 12px; text-align: left; border-bottom: 2px solid #e5e7eb; font-weight: 600; color: #374151;">Date</th>
            </tr>
          </thead>
          <tbody>
            ${faxData.map(campaign => `
              <tr style="border-bottom: 1px solid #f3f4f6;">
                <td style="padding: 12px; color: #1f2937;">${campaign.campaign_name}</td>
                <td style="padding: 12px; text-align: center; color: #1f2937; font-weight: 500;">${campaign.total_recipients}</td>
                <td style="padding: 12px; text-align: center; color: #059669; font-weight: 500;">${campaign.delivered_count}</td>
                <td style="padding: 12px; text-align: center; color: #dc2626; font-weight: 500;">${campaign.failed_count}</td>
                <td style="padding: 12px; text-align: center; color: #d97706; font-weight: 500;">${campaign.pending_count}</td>
                <td style="padding: 12px; color: #6b7280;">${formatDate(campaign.sent_at)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      `;
    }

    // Build summary HTML
    const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Marketing Campaign Report</title>
        </head>
        <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f9fafb;">
          <div style="max-width: 900px; margin: 0 auto; padding: 32px 16px;">
            <div style="background: white; border-radius: 12px; padding: 32px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
              <h1 style="color: #1f2937; font-size: 28px; font-weight: 700; margin: 0 0 8px 0;">Marketing Campaign Report</h1>
              <p style="color: #6b7280; font-size: 16px; margin: 0 0 32px 0;">
                ${getTimeframeLabel(timeframe)} • Generated on ${formatDate(new Date().toISOString())}
              </p>

              <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; margin-bottom: 32px;">
                <div style="background: #f0fdf4; border-radius: 8px; padding: 16px;">
                  <div style="color: #16a34a; font-size: 14px; font-weight: 600; margin-bottom: 4px;">Email Campaigns</div>
                  <div style="color: #15803d; font-size: 32px; font-weight: 700;">${emailData.length}</div>
                  <div style="color: #16a34a; font-size: 12px; margin-top: 4px;">${totalEmailsSent.toLocaleString()} emails sent</div>
                </div>

                <div style="background: #eff6ff; border-radius: 8px; padding: 16px;">
                  <div style="color: #2563eb; font-size: 14px; font-weight: 600; margin-bottom: 4px;">Open Rate</div>
                  <div style="color: #1e40af; font-size: 32px; font-weight: 700;">${emailOpenRate}%</div>
                  <div style="color: #2563eb; font-size: 12px; margin-top: 4px;">${totalEmailOpens.toLocaleString()} unique opens</div>
                </div>

                <div style="background: #fef3c7; border-radius: 8px; padding: 16px;">
                  <div style="color: #d97706; font-size: 14px; font-weight: 600; margin-bottom: 4px;">Fax Campaigns</div>
                  <div style="color: #b45309; font-size: 32px; font-weight: 700;">${faxData.length}</div>
                  <div style="color: #d97706; font-size: 12px; margin-top: 4px;">${totalFaxesSent.toLocaleString()} faxes sent</div>
                </div>

                <div style="background: #f5f3ff; border-radius: 8px; padding: 16px;">
                  <div style="color: #7c3aed; font-size: 14px; font-weight: 600; margin-bottom: 4px;">Delivery Rate</div>
                  <div style="color: #6d28d9; font-size: 32px; font-weight: 700;">${faxDeliveryRate}%</div>
                  <div style="color: #7c3aed; font-size: 12px; margin-top: 4px;">${totalFaxesDelivered.toLocaleString()} delivered</div>
                </div>
              </div>

              ${emailCampaignsHtml}
              ${faxCampaignsHtml}

              ${emailData.length === 0 && faxData.length === 0 ? `
                <div style="text-align: center; padding: 48px 16px; color: #6b7280;">
                  <p style="font-size: 18px; margin: 0;">No campaigns found for the selected timeframe.</p>
                </div>
              ` : ''}

              <div style="margin-top: 32px; padding-top: 24px; border-top: 2px solid #f3f4f6; color: #9ca3af; font-size: 14px;">
                <p style="margin: 0;">This report was generated automatically from your CrowdHub Marketing Campaigns.</p>
              </div>
            </div>
          </div>
        </body>
      </html>
    `;

    // Send email via Mailgun
    const formData = new FormData();
    formData.append("from", `CrowdHub Marketing <marketing@${mailgunDomain}>`);
    formData.append("to", recipientEmail);
    formData.append("subject", `Marketing Campaign Report - ${getTimeframeLabel(timeframe)}`);
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
      console.error('[generate-campaign-report] Mailgun error:', mailgunResponse.status, errorText);
      throw new Error(`Failed to send email: ${errorText}`);
    }

    const emailResult = await mailgunResponse.json();
    console.log('[generate-campaign-report] Email sent successfully:', emailResult);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Report sent successfully',
        stats: {
          emailCampaigns: emailData.length,
          faxCampaigns: faxData.length,
          totalEmailsSent,
          totalFaxesSent
        }
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[generate-campaign-report] Error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        message: error.message || 'Failed to generate report' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
