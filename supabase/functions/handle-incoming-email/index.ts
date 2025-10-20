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
    console.log('[handle-incoming-email] Message-Id:', emailData['Message-Id']);

    // Extract request number from subject (VRG-00001 format)
    const requestNumberMatch = emailData.subject?.match(/VRG-(\d{5})/);
    let requestId: string | null = null;

    if (requestNumberMatch) {
      const requestNumber = parseInt(requestNumberMatch[1], 10);
      console.log('[handle-incoming-email] Found request number:', requestNumber);

      // Look up the request by request_number
      const { data: request, error: requestError } = await supabase
        .from('hardware_requests')
        .select('id, user_id, title, request_number')
        .eq('request_number', requestNumber)
        .single();

      if (requestError) {
        console.error('[handle-incoming-email] Error finding request:', requestError);
      } else if (request) {
        requestId = request.id;
        console.log('[handle-incoming-email] Found request:', request.id);
      }
    } else {
      console.log('[handle-incoming-email] No request number found in subject');
    }

    // If we found a request, add the email as a comment
    if (requestId) {
      const content = emailData['stripped-text'] || emailData['body-plain'] || '';
      const contentHtml = emailData['body-html'] || null;

      const { error: commentError } = await supabase
        .from('request_comments')
        .insert({
          request_id: requestId,
          user_id: null, // External email
          author_name: emailData.sender || 'Unknown',
          author_email: emailData.sender || '',
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

      // Notify the request owner
      const { data: request } = await supabase
        .from('hardware_requests')
        .select('user_id, title, request_number')
        .eq('id', requestId)
        .single();

      if (request?.user_id) {
        const { data: ownerProfile } = await supabase
          .from('profiles')
          .select('email, full_name')
          .eq('id', request.user_id)
          .single();

        if (ownerProfile?.email) {
          // Send notification email
          await supabase.functions.invoke('send-notification-email', {
            body: {
              to: ownerProfile.email,
              subject: `Update on Request VRG-${String(request.request_number).padStart(5, '0')}`,
              template: 'request_comment_reply',
              data: {
                requestId: requestId,
                requestNumber: `VRG-${String(request.request_number).padStart(5, '0')}`,
                requestTitle: request.title,
                requesterName: ownerProfile.full_name || ownerProfile.email,
                commenterName: emailData.sender || 'External User',
                commentText: content.substring(0, 500),
                requestUrl: `https://crowdhub.app/request/VRG-${String(request.request_number).padStart(5, '0')}`,
              },
            },
          });
        }
      }
    } else {
      // Create a new request from email (optional feature)
      console.log('[handle-incoming-email] No matching request found, email logged only');
      
      // You could create a new request here or log to a separate table
      // For now, we'll just acknowledge receipt
    }

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
