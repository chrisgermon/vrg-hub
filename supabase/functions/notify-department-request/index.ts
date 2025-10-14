import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface NotificationRequest {
  requestId: string;
  action: 'submitted' | 'updated' | 'completed' | 'cancelled';
  userId?: string;
  notes?: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('[notify-department-request] Function invoked');
    const { requestId, action, userId, notes }: NotificationRequest = await req.json();
    console.log('[notify-department-request] Payload:', { requestId, action, userId });
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get request details
    console.log('[notify-department-request] Fetching request details...');
    const { data: requestData, error: requestError } = await supabase
      .from('department_requests')
      .select('*')
      .eq('id', requestId)
      .single();

    if (requestError || !requestData) {
      console.error('[notify-department-request] Failed to fetch request:', requestError);
      throw new Error(`Failed to fetch request: ${requestError?.message}`);
    }
    
    console.log('[notify-department-request] Request data:', {
      request_number: requestData.request_number,
      department: requestData.department,
      company_id: requestData.company_id
    });

    // Get requester profile
    console.log('[notify-department-request] Fetching requester profile...');
    const { data: requesterProfile, error: requesterError } = await supabase
      .from('profiles')
      .select('name, email')
      .eq('user_id', requestData.user_id)
      .single();

    if (requesterError || !requesterProfile) {
      console.error('[notify-department-request] Failed to fetch requester:', requesterError);
      throw new Error(`Failed to fetch requester profile: ${requesterError?.message}`);
    }
    
    console.log('[notify-department-request] Requester:', requesterProfile.email);

    let emailData;
    let recipientEmail;
    let subject;

    switch (action) {
      case 'submitted': {
        console.log('[notify-department-request] Action: submitted');
        // Get assigned users for this department who should receive notifications
        console.log('[notify-department-request] Calling get_assigned_users_for_department RPC...');
        const { data: assignedUsers, error: rpcError } = await supabase
          .rpc('get_assigned_users_for_department', {
            p_company_id: requestData.company_id,
            p_department: requestData.department,
            p_sub_department: requestData.sub_department
          });
        
        if (rpcError) {
          console.error('[notify-department-request] RPC error:', rpcError);
        }
        console.log('[notify-department-request] Assigned users count:', assignedUsers?.length || 0);

        if (assignedUsers && assignedUsers.length > 0) {
          // Filter users who should receive notifications
          const notificationUsers = assignedUsers.filter((u: any) => u.receive_notifications);
          console.log('[notify-department-request] Users to notify:', notificationUsers.length);

          for (const user of notificationUsers) {
            console.log('[notify-department-request] Sending email to:', user.email);
            recipientEmail = user.email;
            subject = `New ${requestData.department.replace('_', ' ')} Request: ${requestData.title}`;

            emailData = {
              requestTitle: requestData.title,
              requestNumber: requestData.request_number,
              requestId: requestData.id,
              requestUrl: `https://crowdhub.app/requests?request=${requestData.id}`,
              requesterName: requesterProfile.name,
              department: requestData.department.replace('_', ' '),
              subDepartment: requestData.sub_department,
              priority: requestData.priority,
              description: requestData.description,
              assigneeName: user.name,
            };

            const emailResult = await supabase.functions.invoke('send-notification-email', {
              body: {
                to: recipientEmail,
                subject,
                template: 'department_request_submitted',
                data: emailData,
              },
            });
            
            console.log('[notify-department-request] Email result:', emailResult.error ? 'FAILED' : 'SUCCESS');

            // Log the email
            const { error: logError } = await supabase
              .from('email_logs')
              .insert({
                recipient_email: recipientEmail,
                email_type: 'department_request_submitted',
                subject: subject,
                request_type: null,
                department_request_id: requestData.id,
                status: (emailResult as any).error ? 'failed' : 'sent',
                error_message: (emailResult as any).error?.message || null,
                metadata: {
                  request_id: requestData.id,
                  request_number: requestData.request_number,
                  assignee_name: user.name,
                  requester_name: requesterProfile.name,
                  department: requestData.department,
                },
              });
            if (logError) {
              console.error('[notify-department-request] Failed to insert email_logs:', logError);
            }

            // Log to audit_logs
            const { error: auditError } = await supabase
              .from('audit_logs')
              .insert({
                user_id: requestData.user_id,
                user_email: recipientEmail,
                action: 'email_sent',
                table_name: 'email_logs',
                record_id: requestData.id,
                new_data: {
                  email_type: 'department_request_submitted',
                  subject: subject,
                  status: (emailResult as any).error ? 'failed' : 'sent',
                  recipient: recipientEmail
                }
              });
            if (auditError) {
              console.error('[notify-department-request] Failed to insert audit_logs:', auditError);
            }
          }
        } else {
          console.log('[notify-department-request] No assigned users, falling back to managers...');
          // Fallback: notify managers/admins if no specific assignments
          const { data: managers } = await supabase
            .from('user_roles')
            .select('user_id, role')
            .eq('company_id', requestData.company_id)
            .in('role', ['manager', 'tenant_admin', 'super_admin']);

          if (managers && managers.length > 0) {
            const managerIds = managers.map((m: any) => m.user_id).filter(Boolean);

            const { data: managerProfiles } = await supabase
              .from('profiles')
              .select('user_id, name, email')
              .in('user_id', managerIds);

            if (managerProfiles && managerProfiles.length > 0) {
              for (const m of managerProfiles) {
                recipientEmail = m.email;
                subject = `New ${requestData.department.replace('_', ' ')} Request: ${requestData.title}`;
                console.log('[notify-department-request] Sending email to manager:', recipientEmail);
                emailData = {
                  requestTitle: requestData.title,
                  requestNumber: requestData.request_number,
                  requestId: requestData.id,
                  requestUrl: `https://crowdhub.app/requests?request=${requestData.id}`,
                  requesterName: requesterProfile.name,
                  department: requestData.department.replace('_', ' '),
                  subDepartment: requestData.sub_department,
                  priority: requestData.priority,
                  description: requestData.description,
                  managerName: m.name,
                };

                const emailResult = await supabase.functions.invoke('send-notification-email', {
                  body: {
                    to: recipientEmail,
                    subject,
                    template: 'department_request_submitted',
                    data: emailData,
                  },
                });

                // Log the email
                const { error: logError2 } = await supabase
                  .from('email_logs')
                  .insert({
                    recipient_email: recipientEmail,
                    email_type: 'department_request_submitted',
                    subject: subject,
                    request_type: null,
                    department_request_id: requestData.id,
                    status: (emailResult as any).error ? 'failed' : 'sent',
                    error_message: (emailResult as any).error?.message || null,
                    metadata: {
                      request_id: requestData.id,
                      request_number: requestData.request_number,
                      manager_name: m.name,
                      requester_name: requesterProfile.name,
                      department: requestData.department,
                    },
                  });
                if (logError2) {
                  console.error('[notify-department-request] Failed to insert email_logs (manager fallback):', logError2);
                }
              }
            }
          }
        }
        break;
      }

      default:
        console.log(`Action ${action} not yet implemented for department requests`);
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("[notify-department-request] ERROR:", error);
    console.error("[notify-department-request] Stack:", error.stack);
    return new Response(
      JSON.stringify({ error: error.message, details: error.stack }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
