import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CommentNotificationRequest {
  commentId: string;
  requestId: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { commentId, requestId }: CommentNotificationRequest = await req.json();

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get the comment details
    const { data: comment, error: commentError } = await supabase
      .from('request_comments')
      .select('user_id, author_name, author_email, content, is_internal')
      .eq('id', commentId)
      .single();

    if (commentError || !comment) {
      throw new Error(`Failed to fetch comment: ${commentError?.message}`);
    }

    // Don't send emails for internal notes
    if (comment.is_internal) {
      console.log('[notify-comment] Skipping email for internal note');
      return new Response(JSON.stringify({ success: true, skipped: true }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Get request details (currently only hardware_requests)
    const { data: requestData, error: requestError } = await supabase
      .from('hardware_requests')
      .select('user_id, title, request_number')
      .eq('id', requestId)
      .single();

    if (requestError || !requestData) {
      throw new Error(`Failed to fetch request: ${requestError?.message}`);
    }

    // Get requester profile
    const { data: requesterProfile, error: requesterError } = await supabase
      .from('profiles')
      .select('full_name, email')
      .eq('id', requestData.user_id)
      .single();

    if (requesterError || !requesterProfile) {
      throw new Error(`Failed to fetch requester profile: ${requesterError?.message}`);
    }

    // Send email notification
    const recipientEmail = requesterProfile.email;
    const requestNumber = requestData.request_number ? `VRG-${String(requestData.request_number).padStart(5, '0')}` : requestId.substring(0, 8);
    const subject = `Update on Request ${requestNumber}`;
    
    const emailData = {
      requestTitle: requestData.title || 'Your Request',
      requestId: requestId,
      requestNumber: requestNumber,
      requestUrl: `https://crowdhub.app/request/${requestNumber}`,
      requesterName: requesterProfile.full_name || requesterProfile.email,
      commenterName: comment.author_name,
      commentText: comment.content,
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

    // Log the email
    const logData = {
      request_id: requestId,
      recipient_email: recipientEmail,
      email_type: 'request_comment_reply',
      subject: subject,
      status: (emailResult as any).error ? 'failed' : 'sent',
      error_message: (emailResult as any).error?.message || null,
      metadata: {
        commenter_name: comment.author_name,
        requester_name: requesterProfile.full_name,
        comment_id: commentId,
        request_number: requestNumber,
      },
    };

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
