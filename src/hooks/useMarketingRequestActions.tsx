import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export const useMarketingRequestActions = () => {
  const { toast } = useToast();

  const approveMarketingRequest = async (
    requestId: string,
    userId: string,
    userName: string,
    notes?: string
  ) => {
    try {
      // Get request details
      const { data: request, error: fetchError } = await supabase
        .from('marketing_requests')
        .select('*')
        .eq('id', requestId)
        .single();

      if (fetchError) throw fetchError;

      // Get requester profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('name, email')
        .eq('user_id', request.user_id)
        .single();

      // Update request status
      const { error: updateError } = await supabase
        .from('marketing_requests')
        .update({
          status: 'approved',
          admin_id: userId,
          admin_approved_at: new Date().toISOString(),
          admin_approval_notes: notes || null,
        })
        .eq('id', requestId);

      if (updateError) throw updateError;

      // Add status history
      await supabase
        .from('marketing_request_status_history')
        .insert({
          request_id: requestId,
          status: 'approved',
          changed_by: userId,
          notes: notes || 'Request approved',
        });

      // Send email notification to requester
      if (profile?.email) {
        await supabase.functions.invoke('send-notification-email', {
          body: {
            to: profile.email,
            subject: `Marketing Request Approved: ${request.title}`,
            template: 'marketing_request_approved',
            data: {
              requestTitle: request.title,
              requestId: request.id,
              requesterName: profile.name || profile.email,
              adminName: userName,
              requestType: request.request_type,
              brand: request.brand,
              clinic: request.clinic,
            },
          },
        });

        // Log email
        await supabase
          .from('email_logs')
          .insert({
            marketing_request_id: requestId,
            request_type: 'marketing',
            email_type: 'marketing_request_approved',
            recipient_email: profile.email,
            subject: `Marketing Request Approved: ${request.title}`,
            status: 'sent',
          });
      }

      toast({
        title: 'Success',
        description: 'Marketing request approved successfully',
      });

      return true;
    } catch (error: any) {
      console.error('Error approving marketing request:', error);
      toast({
        title: 'Error',
        description: 'Failed to approve request',
        variant: 'destructive',
      });
      return false;
    }
  };

  const declineMarketingRequest = async (
    requestId: string,
    userId: string,
    userName: string,
    reason?: string
  ) => {
    try {
      // Get request details
      const { data: request, error: fetchError } = await supabase
        .from('marketing_requests')
        .select('*')
        .eq('id', requestId)
        .single();

      if (fetchError) throw fetchError;

      // Get requester profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('name, email')
        .eq('user_id', request.user_id)
        .single();

      // Update request status
      const { error: updateError } = await supabase
        .from('marketing_requests')
        .update({
          status: 'declined',
          declined_by: userId,
          declined_at: new Date().toISOString(),
          decline_reason: reason || null,
        })
        .eq('id', requestId);

      if (updateError) throw updateError;

      // Add status history
      await supabase
        .from('marketing_request_status_history')
        .insert({
          request_id: requestId,
          status: 'declined',
          changed_by: userId,
          notes: reason || 'Request declined',
        });

      // Send email notification to requester
      if (profile?.email) {
        await supabase.functions.invoke('send-notification-email', {
          body: {
            to: profile.email,
            subject: `Marketing Request Declined: ${request.title}`,
            template: 'marketing_request_declined',
            data: {
              requestTitle: request.title,
              requestId: request.id,
              requesterName: profile.name || profile.email,
              adminName: userName,
              requestType: request.request_type,
              declineReason: reason,
            },
          },
        });

        // Log email
        await supabase
          .from('email_logs')
          .insert({
            marketing_request_id: requestId,
            request_type: 'marketing',
            email_type: 'marketing_request_declined',
            recipient_email: profile.email,
            subject: `Marketing Request Declined: ${request.title}`,
            status: 'sent',
          });
      }

      toast({
        title: 'Success',
        description: 'Marketing request declined',
      });

      return true;
    } catch (error: any) {
      console.error('Error declining marketing request:', error);
      toast({
        title: 'Error',
        description: 'Failed to decline request',
        variant: 'destructive',
      });
      return false;
    }
  };

  return {
    approveMarketingRequest,
    declineMarketingRequest,
  };
};
