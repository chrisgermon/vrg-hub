import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface NotifyTicketEventRequest {
  requestId: string;
  requestType: string;
  eventType: 'created' | 'assigned' | 'reassigned' | 'status_changed' | 'commented' | 'escalated' | 'resolved';
  actorId?: string;
  oldValue?: string;
  newValue?: string;
  commentText?: string;
}

async function sendEmailWithRetry(
  mailgunApiKey: string,
  mailgunDomain: string,
  to: string,
  subject: string,
  html: string,
  supabase: any,
  ticketId: string,
  recipientId: string,
  eventType: string,
  maxRetries = 3
): Promise<boolean> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const formData = new FormData();
      formData.append('from', `Requests Portal <noreply@${mailgunDomain}>`);
      formData.append('to', to);
      formData.append('subject', subject);
      formData.append('html', html);

      const response = await fetch(
        `https://api.mailgun.net/v3/${mailgunDomain}/messages`,
        {
          method: 'POST',
          headers: {
            Authorization: `Basic ${btoa(`api:${mailgunApiKey}`)}`,
          },
          body: formData,
        }
      );

      if (response.ok) {
        await supabase.from('email_notifications').insert({
          ticket_id: ticketId,
          recipient_user_id: recipientId,
          event_type: eventType,
          subject: subject,
          sent_at: new Date().toISOString(),
        });
        
        console.log(`✅ Email sent to ${to} on attempt ${attempt}`);
        return true;
      } else {
        const errorText = await response.text();
        console.error(`❌ Attempt ${attempt} failed:`, errorText);
        
        if (attempt === maxRetries) {
          throw new Error(errorText);
        }
      }
    } catch (error) {
      console.error(`❌ Attempt ${attempt} error:`, error);
      
      if (attempt < maxRetries) {
        const delay = 1000 * Math.pow(2, attempt - 1);
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        await supabase.from('email_notifications').insert({
          ticket_id: ticketId,
          recipient_user_id: recipientId,
          event_type: eventType,
          subject: subject,
          error: `Failed after ${maxRetries} attempts: ${error instanceof Error ? error.message : String(error)}`,
        });
        return false;
      }
    }
  }
  
  return false;
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

    // Collect recipients - now tracking both email and user info for in-app notifications
    const recipients: Set<string> = new Set();
    const inAppRecipients: Map<string, { userId: string; companyId: string }> = new Map();

    // Helper to add recipient with in-app info
    const addRecipient = async (userId: string, email?: string) => {
      if (email) {
        recipients.add(email);
      }
      // Get company_id for in-app notification
      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id, email')
        .eq('id', userId)
        .maybeSingle();

      if (profile?.company_id) {
        inAppRecipients.set(userId, {
          userId,
          companyId: profile.company_id
        });
        if (!email && profile.email) {
          recipients.add(profile.email);
        }
      }
    };

    // Always notify the requester (unless they are the actor)
    const requesterEmail = request.profiles?.email;
    if (requesterEmail && actorId !== request.user_id) {
      recipients.add(requesterEmail);
      await addRecipient(request.user_id, requesterEmail);
    }

    // Notify assigned user (unless they are the actor)
    if (request.assigned_to && actorId !== request.assigned_to) {
      const { data: assignedProfile } = await supabase
        .from('profiles')
        .select('email, company_id')
        .eq('id', request.assigned_to)
        .single();
      if (assignedProfile?.email) {
        recipients.add(assignedProfile.email);
        if (assignedProfile.company_id) {
          inAppRecipients.set(request.assigned_to, {
            userId: request.assigned_to,
            companyId: assignedProfile.company_id
          });
        }
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
            .select('email, company_id')
            .eq('id', watcher.user_id)
            .maybeSingle();

          if (watcherProfile?.email) {
            recipients.add(watcherProfile.email);
            if (watcherProfile.company_id) {
              inAppRecipients.set(watcher.user_id, {
                userId: watcher.user_id,
                companyId: watcherProfile.company_id
              });
            }
          }
        }
      }
    }

    // Add CC emails to recipients (these are email-only, no in-app)
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
                .select('email, company_id')
                .eq('id', userId)
                .maybeSingle();

              if (assigneeProfile?.email) {
                recipients.add(assigneeProfile.email);
                if (assigneeProfile.company_id) {
                  inAppRecipients.set(userId, {
                    userId,
                    companyId: assigneeProfile.company_id
                  });
                }
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

    // Create in-app notifications for all recipients with user IDs
    const requestNumber = request.request_number
      ? `VRG-${String(request.request_number).padStart(5, '0')}`
      : (request.reference_code || requestId.substring(0, 8));

    let inAppTitle = '';
    let inAppMessage = '';

    switch (eventType) {
      case 'created':
        inAppTitle = 'New Request Created';
        inAppMessage = `New request ${requestNumber}: ${request.title || request.subject || 'Untitled'}`;
        break;
      case 'assigned':
        inAppTitle = 'Request Assigned to You';
        inAppMessage = `You have been assigned to ${requestNumber}`;
        break;
      case 'reassigned':
        inAppTitle = 'Request Reassigned';
        inAppMessage = `Request ${requestNumber} has been reassigned`;
        break;
      case 'status_changed':
        inAppTitle = 'Request Status Updated';
        inAppMessage = `Request ${requestNumber} is now ${newValue || 'updated'}`;
        break;
      case 'commented':
        inAppTitle = 'New Comment';
        inAppMessage = `${actorName} commented on ${requestNumber}`;
        break;
      case 'resolved':
        inAppTitle = 'Request Completed';
        inAppMessage = `Request ${requestNumber} has been completed`;
        break;
      case 'escalated':
        inAppTitle = '⚠️ Request Escalated';
        inAppMessage = `Request ${requestNumber} has been escalated`;
        break;
      default:
        inAppTitle = 'Request Update';
        inAppMessage = `Update on request ${requestNumber}`;
    }

    const inAppPromises = Array.from(inAppRecipients.values()).map(async (recipient) => {
      try {
        const { error: notifError } = await supabase.from('notifications').insert({
          user_id: recipient.userId,
          company_id: recipient.companyId,
          type: 'ticket',
          title: inAppTitle,
          message: inAppMessage,
          reference_id: requestId,
          reference_url: `/request/${requestNumber}`,
        });

        if (notifError) {
          console.error(`[notify-ticket-event] Error creating in-app notification for ${recipient.userId}:`, notifError);
        } else {
          console.log(`[notify-ticket-event] Created in-app notification for ${recipient.userId}`);
        }
      } catch (error) {
        console.error(`[notify-ticket-event] Failed to create in-app notification for ${recipient.userId}:`, error);
      }
    });

    await Promise.all(inAppPromises);

    console.log(`[notify-ticket-event] Created ${inAppRecipients.size} in-app notifications`);

    return new Response(
      JSON.stringify({
        success: true,
        notified: recipients.size,
        inAppNotifications: inAppRecipients.size
      }),
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

Deno.serve(handler);
