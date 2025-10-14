import React, { useState, useEffect } from 'react';
import { formatAUDateLong, formatAUDateTimeFull } from '@/lib/dateUtils';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { CheckCircle, XCircle, User, KeyRound, FileText } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { RequestActivity } from '@/components/requests/RequestActivity';

interface UserAccountDetailProps {
  requestId: string;
}

export function UserAccountDetail({ requestId }: UserAccountDetailProps) {
  const [request, setRequest] = useState<any>(null);
  const [companyLogo, setCompanyLogo] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [approvalNotes, setApprovalNotes] = useState('');
  const [declineReason, setDeclineReason] = useState('');
  const [processing, setProcessing] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [completionNotes, setCompletionNotes] = useState('');
  const { toast } = useToast();
  const { user, userRole } = useAuth();

  useEffect(() => {
    fetchRequestDetails();
    checkSuperAdminStatus();
  }, [requestId, user]);

  const checkSuperAdminStatus = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('role', 'super_admin')
        .maybeSingle();

      if (!error && data) {
        setIsSuperAdmin(true);
      }
    } catch (error) {
      console.error('Error checking admin status:', error);
    }
  };

  const fetchRequestDetails = async () => {
    try {
      const { data, error } = await supabase
        .from('user_account_requests')
        .select(`
          *,
          requester:profiles!user_account_requests_requested_by_fkey(name, email),
          user_account_applications(
            application:applications(name)
          )
        `)
        .eq('id', requestId)
        .single();

      if (error) throw error;
      setRequest(data);

      // Fetch company logo
      const { data: companyData } = await supabase
        .from('companies')
        .select('logo_url')
        .eq('id', data.company_id)
        .single();
      
      if (companyData?.logo_url) {
        setCompanyLogo(companyData.logo_url);
      }
    } catch (error: any) {
      console.error('Error fetching request:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch request details',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!user) return;

    setProcessing(true);
    try {
      const { error } = await supabase
        .from('user_account_requests')
        .update({
          status: 'approved',
          admin_id: user.id,
          admin_approved_at: new Date().toISOString(),
          admin_approval_notes: approvalNotes
        })
        .eq('id', requestId);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'User account request approved successfully',
      });

      fetchRequestDetails();
    } catch (error: any) {
      console.error('Error approving request:', error);
      toast({
        title: 'Error',
        description: 'Failed to approve request',
        variant: 'destructive',
      });
    } finally {
      setProcessing(false);
    }
  };

  const handleDecline = async () => {
    if (!user || !declineReason.trim()) {
      toast({
        title: 'Error',
        description: 'Please provide a reason for declining',
        variant: 'destructive',
      });
      return;
    }

    setProcessing(true);
    try {
      const { error } = await supabase
        .from('user_account_requests')
        .update({
          status: 'declined',
          declined_by: user.id,
          declined_at: new Date().toISOString(),
          decline_reason: declineReason
        })
        .eq('id', requestId);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'User account request declined',
      });

      fetchRequestDetails();
    } catch (error: any) {
      console.error('Error declining request:', error);
      toast({
        title: 'Error',
        description: 'Failed to decline request',
        variant: 'destructive',
      });
    } finally {
      setProcessing(false);
    }
  };

  const handleMarkComplete = async () => {
    if (!isSuperAdmin || !username.trim() || !password.trim()) {
      toast({
        title: 'Error',
        description: 'Username and password are required',
        variant: 'destructive',
      });
      return;
    }

    setProcessing(true);
    try {
      const updateData: any = {
        status: 'delivered',
        updated_at: new Date().toISOString()
      };

      if (completionNotes.trim()) {
        updateData.admin_approval_notes = completionNotes;
      }

      const { error } = await supabase
        .from('user_account_requests')
        .update(updateData)
        .eq('id', requestId);

      if (error) throw error;

      toast({
        title: 'Success',
        description: `Account marked as complete. Username: ${username}`,
      });

      // Clear sensitive data
      setUsername('');
      setPassword('');
      setCompletionNotes('');
      
      fetchRequestDetails();
    } catch (error: any) {
      console.error('Error marking request as complete:', error);
      toast({
        title: 'Error',
        description: 'Failed to mark request as complete',
        variant: 'destructive',
      });
    } finally {
      setProcessing(false);
    }
  };

  const canApprove = () => {
    return (userRole === 'tenant_admin' || userRole === 'super_admin') && 
           request?.status === 'submitted';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'default';
      case 'declined':
        return 'destructive';
      case 'submitted':
        return 'secondary';
      default:
        return 'secondary';
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-muted-foreground">Loading...</div>
        </CardContent>
      </Card>
    );
  }

  if (!request) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-muted-foreground">Request not found</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          {companyLogo && (
            <div className="mb-4">
              <img src={companyLogo} alt="Company Logo" className="h-12 object-contain" />
            </div>
          )}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {(request as any).request_number && (
                <code className="text-sm font-mono bg-muted px-3 py-1 rounded border">
                  {(request as any).request_number}
                </code>
              )}
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                <User className="w-6 h-6" />
              </div>
              <div>
                <CardTitle>
                  {request.first_name} {request.last_name}
                </CardTitle>
                <CardDescription>{request.email}</CardDescription>
              </div>
              {(request as any).from_email && (
                <Badge variant="outline" className="gap-1">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  Email Request
                </Badge>
              )}
            </div>
            <Badge variant={getStatusColor(request.status)}>
              {request.status}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-muted-foreground">Department</Label>
              <p className="mt-1">{request.department || 'N/A'}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">Job Title</Label>
              <p className="mt-1">{request.job_title || 'N/A'}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">Start Date</Label>
              <p className="mt-1">
                {request.start_date ? formatAUDateLong(request.start_date) : 'N/A'}
              </p>
            </div>
            <div>
              <Label className="text-muted-foreground">Office 365 License</Label>
              <p className="mt-1">{request.office365_license?.replace(/_/g, ' ') || 'N/A'}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">Manager Name</Label>
              <p className="mt-1">{request.manager_name || 'N/A'}</p>
            </div>
          </div>

          {request.business_justification && (
            <div className="bg-muted/50 rounded-lg p-4 border-l-4 border-primary">
              <Label className="text-base font-semibold flex items-center gap-2 mb-3">
                <FileText className="w-5 h-5" />
                Business Justification
              </Label>
              <p className="text-foreground leading-relaxed whitespace-pre-wrap">{request.business_justification}</p>
            </div>
          )}

          {request.shared_mailboxes && request.shared_mailboxes.length > 0 && (
            <div>
              <Label className="text-muted-foreground mb-2">Shared Mailboxes</Label>
              <div className="flex flex-wrap gap-2">
                {request.shared_mailboxes.map((mailbox: string) => (
                  <Badge key={mailbox} variant="outline">
                    {mailbox}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {request.roles && request.roles.length > 0 && (
            <div>
              <Label className="text-muted-foreground mb-2">Roles</Label>
              <div className="flex flex-wrap gap-2">
                {request.roles.map((role: string) => (
                  <Badge key={role} variant="outline">
                    {role}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {request.user_account_applications && request.user_account_applications.length > 0 && (
            <div>
              <Label className="text-muted-foreground mb-2">Applications</Label>
              <div className="flex flex-wrap gap-2">
                {request.user_account_applications.map((app: any) => (
                  <Badge key={app.application.name} variant="outline">
                    {app.application.name}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          <div>
            <Label className="text-muted-foreground">Requested by</Label>
            <p className="mt-1">{request.requester?.name || request.requester?.email}</p>
            <p className="text-sm text-muted-foreground">
              {formatAUDateTimeFull(request.created_at)}
            </p>
          </div>

          {canApprove() && (
            <div className="space-y-4 pt-4 border-t">
              <div>
                <Label>Approval Notes (Optional)</Label>
                <Textarea
                  value={approvalNotes}
                  onChange={(e) => setApprovalNotes(e.target.value)}
                  placeholder="Add any notes about this approval..."
                  rows={3}
                  className="mt-2"
                />
              </div>
              <div>
                <Label>Decline Reason (Required if declining)</Label>
                <Textarea
                  value={declineReason}
                  onChange={(e) => setDeclineReason(e.target.value)}
                  placeholder="Provide a reason for declining this request..."
                  rows={3}
                  className="mt-2"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  variant="approve"
                  onClick={handleApprove}
                  disabled={processing}
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Approve Request
                </Button>
                <Button
                  variant="decline"
                  onClick={handleDecline}
                  disabled={processing}
                >
                  <XCircle className="w-4 h-4 mr-2" />
                  Decline Request
                </Button>
              </div>
            </div>
          )}

          {isSuperAdmin && request.status === 'approved' && (
            <div className="space-y-4 pt-4 border-t">
              <div className="flex items-center gap-2 mb-2">
                <KeyRound className="w-5 h-5" />
                <h3 className="font-medium">Mark as Complete</h3>
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                Provide the username and password details for the new account
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="username">Username *</Label>
                  <Input
                    id="username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Enter username"
                    className="mt-2"
                  />
                </div>
                <div>
                  <Label htmlFor="password">Password *</Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter password"
                    className="mt-2"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="completionNotes">Completion Notes (Optional)</Label>
                <Textarea
                  id="completionNotes"
                  value={completionNotes}
                  onChange={(e) => setCompletionNotes(e.target.value)}
                  placeholder="Add any additional notes about account setup..."
                  rows={3}
                  className="mt-2"
                />
              </div>

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button disabled={processing || !username.trim() || !password.trim()}>
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Mark as Complete
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Mark account as complete?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will mark the user account as created and delivered. Make sure you have provided the correct username and password to the requester.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleMarkComplete}>
                      Confirm
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Activity Section */}
      <RequestActivity requestId={requestId} requestType="user_account" />
    </div>
  );
}