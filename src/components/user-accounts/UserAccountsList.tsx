import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useCompanyContext } from '@/contexts/CompanyContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { formatAUDateLong, formatAUDateTimeFull } from '@/lib/dateUtils';
import { Eye, CheckCircle, XCircle, RefreshCw } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

export const UserAccountsList = () => {
  const { selectedCompany } = useCompanyContext();
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [isApproving, setIsApproving] = useState(false);
  const [approvalNotes, setApprovalNotes] = useState('');
  const [declineReason, setDeclineReason] = useState('');
  const [showApprovalDialog, setShowApprovalDialog] = useState(false);
  const [showDeclineDialog, setShowDeclineDialog] = useState(false);

  useEffect(() => {
    loadRequests();
  }, [selectedCompany]);

  const loadRequests = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get user's profile and role
      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('user_id', user.id)
        .single();

      const { data: roleData } = await supabase
        .from('platform_roles')
        .select('role')
        .eq('user_id', user.id)
        .maybeSingle();

      const role = roleData?.role;
      const targetCompanyId = selectedCompany?.id || profile?.company_id;

      let query = supabase
        .from('user_account_requests')
        .select(`
          *,
          requester:profiles!requested_by(name, email),
          user_account_applications(
            application:applications(name)
          )
        `)
        .order('created_at', { ascending: false });

      // Always filter by selected company (no special treatment)
      if (targetCompanyId) {
        query = query.eq('company_id', targetCompanyId);
      }

      const { data, error } = await query;

      if (error) throw error;
      setRequests(data || []);
    } catch (error: any) {
      toast.error('Failed to load requests');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!selectedRequest) return;
    
    try {
      setIsApproving(true);
      const { data: { user } } = await supabase.auth.getUser();

      const { error } = await supabase
        .from('user_account_requests')
        .update({
          status: 'approved',
          admin_id: user?.id,
          admin_approved_at: new Date().toISOString(),
          admin_approval_notes: approvalNotes
        })
        .eq('id', selectedRequest.id);

      if (error) throw error;

      // Send notification to support team
      const emailResult = await supabase.functions.invoke('notify-user-account-update', {
        body: {
          requestId: selectedRequest.id,
          action: 'approved',
          userId: user?.id,
          notes: approvalNotes
        }
      });

      console.log('Email notification result:', emailResult);

      if (emailResult.error) {
        console.error('Failed to send notification email:', emailResult.error);
        toast.error('Request approved but notification email failed to send');
      } else {
        toast.success('User account request approved and support team notified');
      }

      setShowApprovalDialog(false);
      setApprovalNotes('');
      loadRequests();
    } catch (error: any) {
      toast.error('Failed to approve request');
      console.error(error);
    } finally {
      setIsApproving(false);
    }
  };

  const handleDecline = async () => {
    if (!selectedRequest || !declineReason.trim()) {
      toast.error('Please provide a reason for declining');
      return;
    }

    try {
      setIsApproving(true);
      const { data: { user } } = await supabase.auth.getUser();

      const { error } = await supabase
        .from('user_account_requests')
        .update({
          status: 'declined',
          declined_by: user?.id,
          declined_at: new Date().toISOString(),
          decline_reason: declineReason
        })
        .eq('id', selectedRequest.id);

      if (error) throw error;

      toast.success('User account request declined');
      setShowDeclineDialog(false);
      setDeclineReason('');
      loadRequests();
    } catch (error: any) {
      toast.error('Failed to decline request');
      console.error(error);
    } finally {
      setIsApproving(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'success';
      case 'declined':
        return 'destructive';
      case 'submitted':
        return 'secondary';
      default:
        return 'secondary';
    }
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <>
      <div className="space-y-4">
        <div className="flex justify-end">
          <Button variant="outline" size="sm" onClick={loadRequests}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
        {requests.map((request) => (
          <Card key={request.id}>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle>
                    {request.first_name} {request.last_name}
                  </CardTitle>
                  <CardDescription>{request.email}</CardDescription>
                </div>
                <Badge variant={getStatusColor(request.status)}>
                  {request.status}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Department</p>
                  <p>{request.department || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Job Title</p>
                  <p>{request.job_title || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Start Date</p>
                  <p>{request.start_date ? formatAUDateLong(request.start_date) : 'N/A'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Office 365 License</p>
                  <p>{request.office365_license?.replace(/_/g, ' ') || 'N/A'}</p>
                </div>
              </div>

              {request.shared_mailboxes && request.shared_mailboxes.length > 0 && (
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Shared Mailboxes</p>
                  <div className="flex flex-wrap gap-1">
                    {request.shared_mailboxes.map((mailbox: string) => (
                      <Badge key={mailbox} variant="outline" className="text-xs">
                        {mailbox}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {request.roles && request.roles.length > 0 && (
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Roles</p>
                  <div className="flex flex-wrap gap-1">
                    {request.roles.map((role: string) => (
                      <Badge key={role} variant="outline" className="text-xs">
                        {role}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {request.user_account_applications && request.user_account_applications.length > 0 && (
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Applications</p>
                  <div className="flex flex-wrap gap-1">
                    {request.user_account_applications.map((app: any) => (
                      <Badge key={app.application.name} variant="outline" className="text-xs">
                        {app.application.name}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              <div className="pt-2">
                <p className="text-sm text-muted-foreground">Requested by</p>
                <p className="text-sm">{request.requester?.name || request.requester?.email}</p>
                <p className="text-xs text-muted-foreground">
                  {formatAUDateTimeFull(request.created_at)}
                </p>
              </div>

              {request.status === 'submitted' && (
                <div className="flex gap-2 pt-2">
                  <Button
                    size="sm"
                    variant="default"
                    onClick={() => {
                      setSelectedRequest(request);
                      setShowApprovalDialog(true);
                    }}
                  >
                    <CheckCircle className="h-4 w-4 mr-1" />
                    Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => {
                      setSelectedRequest(request);
                      setShowDeclineDialog(true);
                    }}
                  >
                    <XCircle className="h-4 w-4 mr-1" />
                    Decline
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={showApprovalDialog} onOpenChange={setShowApprovalDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approve User Account Request</DialogTitle>
            <DialogDescription>
              Approve the user account request for {selectedRequest?.first_name} {selectedRequest?.last_name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Approval Notes (Optional)</Label>
              <Textarea
                value={approvalNotes}
                onChange={(e) => setApprovalNotes(e.target.value)}
                placeholder="Add any notes about this approval..."
                rows={3}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowApprovalDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleApprove} disabled={isApproving}>
                Approve Request
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showDeclineDialog} onOpenChange={setShowDeclineDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Decline User Account Request</DialogTitle>
            <DialogDescription>
              Decline the user account request for {selectedRequest?.first_name} {selectedRequest?.last_name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Reason for Declining *</Label>
              <Textarea
                value={declineReason}
                onChange={(e) => setDeclineReason(e.target.value)}
                placeholder="Provide a reason for declining this request..."
                rows={3}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowDeclineDialog(false)}>
                Cancel
              </Button>
              <Button 
                variant="destructive" 
                onClick={handleDecline} 
                disabled={isApproving || !declineReason.trim()}
              >
                Decline Request
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};