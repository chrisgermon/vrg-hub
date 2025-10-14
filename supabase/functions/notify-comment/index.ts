import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CommentNotificationRequest {
  commentId: string;
  requestId: string;
  requestType: 'hardware' | 'marketing' | 'user_account' | 'department' | 'toner';
  commentText: string;
  isInternal: boolean;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { commentId, requestId, requestType, commentText, isInternal }: CommentNotificationRequest = await req.json();
    
    // Don't send emails for internal notes
    if (isInternal) {
      console.log('[notify-comment] Skipping email for internal note');
      return new Response(JSON.stringify({ success: true, skipped: true }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get the comment details
    const { data: commentData, error: commentError } = await supabase
      .from('request_comments')
      .select('user_id')
      .eq('id', commentId)
      .single();

    if (commentError || !commentData) {
      throw new Error(`Failed to fetch comment: ${commentError?.message}`);
    }

    // Get commenter profile
    const { data: commenterProfile, error: commenterError } = await supabase
      .from('profiles')
      .select('name, email')
      .eq('user_id', commentData.user_id)
      .single();

    if (commenterError || !commenterProfile) {
      throw new Error(`Failed to fetch commenter profile: ${commenterError?.message}`);
    }

    // Determine which table to query based on request type
    let requestData: any = null;
    let requestError: any = null;
    let requesterUserId: string | null = null;
    let requestTitle = 'Your Request';

    switch (requestType) {
      case 'hardware':
        const { data: hwData, error: hwError } = await supabase
          .from('hardware_requests')
          .select('user_id, title, company_id, request_number')
          .eq('id', requestId)
          .single();
        requestData = hwData;
        requestError = hwError;
        requesterUserId = hwData?.user_id;
        requestTitle = hwData?.title || requestTitle;
        break;

      case 'marketing':
        const { data: mktData, error: mktError } = await supabase
          .from('marketing_requests')
          .select('user_id, title, company_id, request_number')
          .eq('id', requestId)
          .single();
        requestData = mktData;
        requestError = mktError;
        requesterUserId = mktData?.user_id;
        requestTitle = mktData?.title || requestTitle;
        break;

      case 'user_account':
        const { data: uaData, error: uaError } = await supabase
          .from('user_account_requests')
          .select('requested_by, first_name, last_name, company_id')
          .eq('id', requestId)
          .single();
        requestData = uaData;
        requestError = uaError;
        requesterUserId = uaData?.requested_by;
        requestTitle = `User Account: ${uaData?.first_name} ${uaData?.last_name}`;
        break;

      case 'toner':
        const { data: tonerData, error: tonerError } = await supabase
          .from('toner_requests')
          .select('user_id, title, company_id')
          .eq('id', requestId)
          .single();
        requestData = tonerData;
        requestError = tonerError;
        requesterUserId = tonerData?.user_id;
        requestTitle = tonerData?.title || requestTitle;
        break;

      case 'department':
        const { data: deptData, error: deptError } = await supabase
          .from('department_requests')
          .select('user_id, title, company_id, request_number')
          .eq('id', requestId)
          .single();
        requestData = deptData;
        requestError = deptError;
        requesterUserId = deptData?.user_id;
        requestTitle = deptData?.title || requestTitle;
        break;
    }

    if (requestError || !requestData || !requesterUserId) {
      throw new Error(`Failed to fetch request: ${requestError?.message}`);
    }

    // Get requester profile
    const { data: requesterProfile, error: requesterError } = await supabase
      .from('profiles')
      .select('name, email')
      .eq('user_id', requesterUserId)
      .single();

    if (requesterError || !requesterProfile) {
      throw new Error(`Failed to fetch requester profile: ${requesterError?.message}`);
    }

    // Also fetch the auth user to get the primary login email
    const { data: requesterAuthUser } = await supabase.auth.admin.getUserById(requesterUserId);

    // Prefer a real user mailbox over placeholder/system emails
    const emailCandidates = [
      requesterAuthUser?.user?.email,
      (requesterAuthUser as any)?.user?.user_metadata?.email,
      requesterProfile.email,
    ].filter(Boolean) as string[];

    const selectPreferredEmail = (candidates: string[]) => {
      for (const e of candidates) {
        if (e && e.includes('@') && !e.endsWith('@system.local') && e !== 'crowdit@system.local') {
          return e;
        }
      }
      // Fallback to first available (may be system.local in dev)
      return candidates[0] || requesterProfile.email;
    };

    // Send email notification
    const recipientEmail = selectPreferredEmail(emailCandidates);
    const reqNum = (requestData as any)?.request_number || requestId;
    const subject = `[${reqNum}] New Update on Your Request: ${requestTitle}`;
    
    const emailData = {
      requestTitle: requestTitle,
      requestId: requestId,
      requestNumber: requestData.request_number || 'N/A',
      requestUrl: `https://crowdhub.app/requests?request=${requestId}`,
      requesterName: requesterProfile.name,
      commenterName: commenterProfile.name,
      commentText: commentText,
    };

    console.log('[notify-comment] Sending email to:', recipientEmail);

    const emailResult = await supabase.functions.invoke('send-notification-email', {
      body: {
        to: recipientEmail,
        subject,
        template: 'request_comment_reply',
        data: emailData,
      },
    });

    // Log the email based on request type
    const logData: any = {
      recipient_email: recipientEmail,
      email_type: 'request_comment_reply',
      subject: subject,
      status: (emailResult as any).error ? 'failed' : 'sent',
      error_message: (emailResult as any).error?.message || null,
      metadata: {
        commenter_name: commenterProfile.name,
        requester_name: requesterProfile.name,
        request_type: requestType,
        comment_id: commentId,
        request_number: requestData.request_number || 'N/A',
      },
    };

    // Set the appropriate request_id field based on type
    if (requestType === 'department') {
      logData.department_request_id = requestId;
    } else if (requestType === 'marketing') {
      logData.marketing_request_id = requestId;
    } else if (requestType === 'user_account') {
      logData.user_account_request_id = requestId;
    } else {
      logData.request_id = requestId;
    }

    await supabase.from('email_logs').insert(logData);

    if ((emailResult as any).error) {
      console.error('[notify-comment] Email send failed:', (emailResult as any).error);
      throw new Error(`Email send failed: ${(emailResult as any).error.message}`);
    }

    console.log('[notify-comment] Email sent successfully');

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("[notify-comment] Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
