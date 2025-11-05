import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface NotifyTicketEventRequest {
  requestId: string;
  requestType: string; // Can be request_type_id UUID or 'hardware' | 'department' for backwards compatibility
  eventType: 'created' | 'assigned' | 'reassigned' | 'status_changed' | 'commented' | 'escalated' | 'resolved';
  actorId?: string;
  oldValue?: string;
  newValue?: string;
  commentText?: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { requestId, requestType, eventType, actorId, oldValue, newValue, commentText }: NotifyTicketEventRequest = await req.json();

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log(`[notify-ticket-event] Processing ${eventType} for ${requestType} request ${requestId}`);

    // Fetch request details - try tickets table first, then fallback to specific tables
    let request: any = null;
    let ccEmails: string[] = [];
    
    const { data: ticketData } = await supabase
      .from('tickets')
      .select('*')
      .eq('id', requestId)
      .maybeSingle();

    if (ticketData) {
      // Fetch the user's profile separately
      const { data: userProfile } = await supabase
        .from('profiles')
        .select('email, full_name')
        .eq('id', ticketData.user_id)
        .maybeSingle();
      
      request = {
        ...ticketData,
        profiles: userProfile
      };
      ccEmails = ticketData.cc_emails || [];
    } else {
      const tableName = requestType === 'hardware' ? 'hardware_requests' : 'department_requests';
      const { data: requestData, error: requestError } = await supabase
        .from(tableName)
        .select('*')
        .eq('id', requestId)
        .single();

      if (requestError || !requestData) {
        throw new Error(`Request not found: ${requestError?.message}`);
      }
      
      // Fetch the user's profile separately
      const { data: userProfile } = await supabase
        .from('profiles')
        .select('email, full_name')
        .eq('id', requestData.user_id)
        .maybeSingle();
      
      request = {
        ...requestData,
        profiles: userProfile
      };
      ccEmails = requestData.cc_emails || [];
    }

    // Get actor details
    let actorName = 'System';
    if (actorId) {
      const { data: actorProfile } = await supabase
        .from('profiles')
        .select('full_name, email')
        .eq('id', actorId)
        .single();
      actorName = actorProfile?.full_name || actorProfile?.email || 'Unknown User';
    }

    // Collect recipients
    const recipients: Set<string> = new Set();
    
    // Always notify the requester (unless they are the actor)
    const requesterEmail = request.profiles?.email;
    if (requesterEmail && actorId !== request.user_id) {
      recipients.add(requesterEmail);
    }

    // Notify assigned user (unless they are the actor)
    if (request.assigned_to && actorId !== request.assigned_to) {
      const { data: assignedProfile } = await supabase
        .from('profiles')
        .select('email')
        .eq('id', request.assigned_to)
        .single();
      if (assignedProfile?.email) {
        recipients.add(assignedProfile.email);
      }
    }

    // Notify watchers (except the actor)
    const { data: watchers } = await supabase
      .from('ticket_watchers')
      .select('user_id')
      .eq('ticket_id', requestId);

    if (watchers) {
      for (const watcher of watchers) {
        if (watcher.user_id !== actorId) {
          const { data: watcherProfile } = await supabase
            .from('profiles')
            .select('email')
            .eq('id', watcher.user_id)
            .maybeSingle();
          
          if (watcherProfile?.email) {
            recipients.add(watcherProfile.email);
          }
        }
      }
    }
    
    // Add CC emails to recipients
    if (ccEmails && ccEmails.length > 0) {
      ccEmails.forEach(email => {
        if (email && email.trim()) {
          recipients.add(email.trim());
        }
      });
    }

    // Notify users assigned via request_notification_assignments
    // requestType can be a UUID (request_type_id) or 'hardware'/'department' for backwards compatibility
    const { data: notificationAssignments } = await supabase
      .from('request_notification_assignments')
      .select('assignee_ids, notification_level')
      .eq('request_type', requestType);

    if (notificationAssignments && notificationAssignments.length > 0) {
      for (const assignment of notificationAssignments) {
        // Check notification level
        const shouldNotify = 
          assignment.notification_level === 'all' ||
          (assignment.notification_level === 'new_only' && eventType === 'created') ||
          (assignment.notification_level === 'updates_only' && eventType !== 'created');

        if (shouldNotify && assignment.assignee_ids && Array.isArray(assignment.assignee_ids)) {
          for (const userId of assignment.assignee_ids) {
            if (userId !== actorId) {
              const { data: assigneeProfile } = await supabase
                .from('profiles')
                .select('email')
                .eq('id', userId)
                .maybeSingle();
              
              if (assigneeProfile?.email) {
                recipients.add(assigneeProfile.email);
              }
            }
          }
        }
      }
    }

    if (recipients.size === 0) {
      console.log('[notify-ticket-event] No recipients to notify');
      return new Response(JSON.stringify({ success: true, message: 'No recipients' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    // Determine template and subject based on event type
    let template = 'request_notification';
    let subject = '';
    let emailData: any = {
      requestId,
      requestNumber: `VRG-${String(request.request_number).padStart(5, '0')}`,
      requestTitle: request.title,
      requesterName: request.profiles?.full_name || request.profiles?.email || 'Unknown',
      actorName,
      requestUrl: `https://hub.visionradiology.com.au/request/VRG-${String(request.request_number).padStart(5, '0')}`,
    };

    switch (eventType) {
      case 'created':
        template = 'request_created';
        subject = `New Request: VRG-${String(request.request_number).padStart(5, '0')} - ${request.title}`;
        break;
      case 'assigned':
        template = 'request_assigned';
        subject = `You've been assigned to VRG-${String(request.request_number).padStart(5, '0')}`;
        break;
      case 'reassigned':
        template = 'request_reassigned';
        subject = `Request Reassigned: VRG-${String(request.request_number).padStart(5, '0')}`;
        emailData.oldAssignee = oldValue;
        emailData.newAssignee = newValue;
        break;
      case 'status_changed':
        template = 'request_status_changed';
        subject = `Status Updated: VRG-${String(request.request_number).padStart(5, '0')}`;
        emailData.oldStatus = oldValue;
        emailData.newStatus = newValue;
        break;
      case 'commented':
        template = 'request_comment_added';
        subject = `New Comment on VRG-${String(request.request_number).padStart(5, '0')}`;
        emailData.commentText = commentText || '';
        break;
      case 'resolved':
        template = 'request_resolved';
        subject = `Request Completed: VRG-${String(request.request_number).padStart(5, '0')}`;
        break;
      case 'escalated':
        template = 'request_escalated';
        subject = `ESCALATED: VRG-${String(request.request_number).padStart(5, '0')}`;
        break;
    }

    // Send notification to all recipients
    const notificationPromises = Array.from(recipients).map(async (email) => {
      try {
        const { error: emailError } = await supabase.functions.invoke('send-notification-email', {
          body: {
            to: email,
            subject,
            template,
            data: emailData,
          },
        });

        // Log the email
        await supabase.from('email_logs').insert({
          request_id: requestId,
          recipient_email: email,
          email_type: template,
          subject: subject,
          status: emailError ? 'failed' : 'sent',
          error_message: emailError?.message || null,
          metadata: {
            event_type: eventType,
            actor_name: actorName,
            request_type: requestType,
            cc_included: ccEmails.length > 0,
          },
        });

        if (emailError) {
          console.error(`[notify-ticket-event] Error sending to ${email}:`, emailError);
        } else {
          console.log(`[notify-ticket-event] Sent ${eventType} notification to ${email}`);
        }
      } catch (error) {
        console.error(`[notify-ticket-event] Failed to send to ${email}:`, error);
      }
    });

    await Promise.all(notificationPromises);

    return new Response(
      JSON.stringify({ success: true, notified: recipients.size }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error('[notify-ticket-event] ERROR:', error);
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
