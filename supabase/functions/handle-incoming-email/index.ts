import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface IncomingEmail {
  sender: string;
  recipient: string;
  subject: string;
  'body-plain': string;
  'body-html'?: string;
  'stripped-text'?: string;
  'Message-Id': string;
  'In-Reply-To'?: string;
  'References'?: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('[handle-incoming-email] Processing incoming email');

    // Parse form data from Mailgun
    const formData = await req.formData();
    const emailData: Partial<IncomingEmail> = {};
    
    for (const [key, value] of formData.entries()) {
      if (typeof value === 'string') {
        emailData[key as keyof IncomingEmail] = value;
      }
    }

    console.log('[handle-incoming-email] Email from:', emailData.sender);
    console.log('[handle-incoming-email] Subject:', emailData.subject);
    console.log('[handle-incoming-email] To:', emailData.recipient);
    console.log('[handle-incoming-email] Message-Id:', emailData['Message-Id']);

    // Extract request number from multiple sources (To, Reply-To, Subject)
    let requestNumber: number | null = null;
    let requestId: string | null = null;
    let requestType: 'hardware' | 'department' | null = null;

    // Try To address first (reply+VRG-00001@domain.com)
    const toMatch = emailData.recipient?.match(/reply\+VRG-(\d{5})/i);
    if (toMatch) {
      requestNumber = parseInt(toMatch[1], 10);
      console.log('[handle-incoming-email] Found request number in To address:', requestNumber);
    }

    // Fallback to subject line
    if (!requestNumber) {
      const subjectMatch = emailData.subject?.match(/VRG-(\d{5})/i);
      if (subjectMatch) {
        requestNumber = parseInt(subjectMatch[1], 10);
        console.log('[handle-incoming-email] Found request number in subject:', requestNumber);
      }
    }

    if (requestNumber) {
      // Try hardware_requests first
      const { data: hardwareRequest, error: hwError } = await supabase
        .from('hardware_requests')
        .select('id, user_id, title, request_number, assigned_to, status, email_thread_id')
        .eq('request_number', requestNumber)
        .single();

      if (hardwareRequest) {
        requestId = hardwareRequest.id;
        requestType = 'hardware';
        console.log('[handle-incoming-email] Found hardware request:', hardwareRequest.id);
      } else {
        // Try department_requests
        const { data: deptRequest, error: deptError } = await supabase
          .from('department_requests')
          .select('id, user_id, title, request_number, assigned_to, status, email_thread_id')
          .eq('request_number', requestNumber)
          .single();

        if (deptRequest) {
          requestId = deptRequest.id;
          requestType = 'department';
          console.log('[handle-incoming-email] Found department request:', deptRequest.id);
        }
      }
    }

    if (!requestId || !requestType) {
      console.log('[handle-incoming-email] No matching request found');
      return new Response(
        JSON.stringify({ success: true, message: 'No matching request found' }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        }
      );
    }

    // Fetch the full request details
    const tableName = requestType === 'hardware' ? 'hardware_requests' : 'department_requests';
    const { data: request, error: requestError } = await supabase
      .from(tableName)
      .select('*')
      .eq('id', requestId)
      .single();

    if (!request) {
      throw new Error('Request not found after initial lookup');
    }

    const content = emailData['stripped-text'] || emailData['body-plain'] || '';
    const contentHtml = emailData['body-html'] || null;
    const senderEmail = emailData.sender?.toLowerCase() || '';

    // Check if sender is the assigned user
    let senderUserId: string | null = null;
    const { data: senderProfile } = await supabase
      .from('profiles')
      .select('id, email')
      .eq('email', senderEmail)
      .single();

    if (senderProfile) {
      senderUserId = senderProfile.id;
    }

    const isAssignedUser = senderUserId && request.assigned_to === senderUserId;
    const isRequester = senderUserId && request.user_id === senderUserId;

    console.log('[handle-incoming-email] Sender:', senderEmail, 'Is assigned:', isAssignedUser, 'Is requester:', isRequester);

    // Parse status keywords from email content
    const lowerContent = content.toLowerCase();
    let newStatus: string | null = null;

    const statusKeywords = [
      { keywords: ['approved', 'approve'], status: 'approved' },
      { keywords: ['declined', 'reject', 'deny'], status: 'declined' },
      { keywords: ['completed', 'done', 'resolved', 'close'], status: 'completed' },
      { keywords: ['on hold', 'waiting', 'hold'], status: 'on_hold' },
      { keywords: ['in progress', 'working', 'started'], status: 'in_progress' },
      { keywords: ['awaiting information', 'need info', 'need more info'], status: 'awaiting_information' },
    ];

    for (const { keywords, status } of statusKeywords) {
      if (keywords.some(kw => lowerContent.includes(kw))) {
        newStatus = status;
        console.log(`[handle-incoming-email] Detected status keyword: ${status}`);
        break;
      }
    }

    // Update status if keyword found and user is authorized
    if (newStatus && isAssignedUser && newStatus !== request.status) {
      console.log(`[handle-incoming-email] Updating status from ${request.status} to ${newStatus}`);
      
      const { error: updateError } = await supabase
        .from(tableName)
        .update({ status: newStatus })
        .eq('id', requestId);

      if (updateError) {
        console.error('[handle-incoming-email] Error updating status:', updateError);
      } else {
        console.log('[handle-incoming-email] Status updated successfully');
      }
    } else if (newStatus && !isAssignedUser) {
      console.log('[handle-incoming-email] Status keyword found but user not authorized to change status');
    }

    // Add comment
    const { error: commentError } = await supabase
      .from('request_comments')
      .insert({
        request_id: requestId,
        user_id: senderUserId,
        author_name: emailData.sender || 'Unknown',
        author_email: senderEmail,
        content: content,
        content_html: contentHtml,
        is_internal: false,
        email_message_id: emailData['Message-Id'],
      });

    if (commentError) {
      console.error('[handle-incoming-email] Error creating comment:', commentError);
      throw commentError;
    }

    console.log('[handle-incoming-email] Comment added to request:', requestId);

    // Track email message for threading
    await supabase.from('email_message_tracking').insert({
      request_id: requestId,
      request_type: requestType,
      message_id: emailData['Message-Id'] || '',
      in_reply_to: emailData['In-Reply-To'] || null,
      references: emailData['References'] || null,
      from_email: senderEmail,
      to_email: emailData.recipient || '',
      subject: emailData.subject || '',
      direction: 'inbound',
    });

    // Send notifications via notify-ticket-event
    if (newStatus) {
      await supabase.functions.invoke('notify-ticket-event', {
        body: {
          requestId,
          requestType,
          eventType: 'status_changed',
          actorId: senderUserId,
          oldValue: request.status,
          newValue: newStatus,
        },
      });
    }

    // Always send comment notification
    await supabase.functions.invoke('notify-ticket-event', {
      body: {
        requestId,
        requestType,
        eventType: 'commented',
        actorId: senderUserId,
        commentText: content.substring(0, 500),
      },
    });

    return new Response(
      JSON.stringify({ success: true, message: 'Email processed' }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error('[handle-incoming-email] ERROR:', error);
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
