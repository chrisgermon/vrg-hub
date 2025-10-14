import React, { useState, useEffect } from 'react';
import { formatAUDate } from '@/lib/dateUtils';
import { Check, X, Eye, Clock, DollarSign, AlertTriangle, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useCompanyContext } from '@/contexts/CompanyContext';
import { RequestDetail } from './RequestDetail';
import { RequestStatusBadge } from './RequestStatusBadge';
import type { HardwareRequest } from '@/types/request';

interface PendingApprovalsProps {
  refreshTrigger?: number;
}

export function PendingApprovals({ refreshTrigger }: PendingApprovalsProps) {
  const [pendingRequests, setPendingRequests] = useState<HardwareRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [viewingRequest, setViewingRequest] = useState<HardwareRequest | null>(null);
  const [approvalNotes, setApprovalNotes] = useState('');
  const [showApprovalDialog, setShowApprovalDialog] = useState(false);
  const [approvalAction, setApprovalAction] = useState<'approve' | 'decline' | null>(null);
  const [selectedRequest, setSelectedRequest] = useState<HardwareRequest | null>(null);
  const { toast } = useToast();
  const { profile, userRole } = useAuth();
  const { selectedCompany } = useCompanyContext();

  useEffect(() => {
    fetchPendingRequests();
  }, [profile, refreshTrigger, selectedCompany]);

  const fetchPendingRequests = async () => {
    if (!profile) return;

    setLoading(true);
    try {
      let statusFilters: Array<'submitted' | 'pending_manager_approval' | 'pending_admin_approval'> = [];
      
      if (userRole === 'manager') {
        statusFilters = ['submitted', 'pending_manager_approval'];
      } else if (userRole === 'tenant_admin') {
        statusFilters = ['submitted', 'pending_manager_approval', 'pending_admin_approval'];
      } else if (userRole === 'super_admin') {
        statusFilters = ['submitted', 'pending_manager_approval', 'pending_admin_approval'];
      }

      if (statusFilters.length === 0) {
        setPendingRequests([]);
        return;
      }

      let query = supabase
        .from('hardware_requests')
        .select('*')
        .in('status', statusFilters);

      // Filter by selected company
      const companyId = selectedCompany?.id || profile.company_id;
      if (companyId) {
        query = query.eq('company_id', companyId);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;
      setPendingRequests(data || []);
    } catch (error: any) {
      console.error('Error fetching pending requests:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch pending requests',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleApprovalAction = (request: HardwareRequest, action: 'approve' | 'decline') => {
    setSelectedRequest(request);
    setApprovalAction(action);
    setApprovalNotes('');
    setShowApprovalDialog(true);
  };

  const processApproval = async () => {
    if (!selectedRequest || !approvalAction || !profile) return;

    // Prevent self-approval
    if (selectedRequest.user_id === profile.user_id) {
      toast({
        title: 'Error',
        description: 'You cannot approve your own request',
        variant: 'destructive',
      });
      setShowApprovalDialog(false);
      return;
    }

    setProcessingId(selectedRequest.id);
    try {
      let newStatus: string;
      const updateData: any = {};

      if (approvalAction === 'approve') {
        // Determine next status based on current status and user role
        if (selectedRequest.status === 'pending_manager_approval') {
          // If manager approves, check if admin approval is needed
          if (selectedRequest.total_amount && selectedRequest.total_amount > 5000) {
            newStatus = 'pending_admin_approval';
          } else {
            newStatus = 'approved';
          }
          updateData.manager_id = profile.user_id;
          updateData.manager_approved_at = new Date().toISOString();
          updateData.manager_approval_notes = approvalNotes;
        } else if (selectedRequest.status === 'pending_admin_approval') {
          newStatus = 'approved';
          updateData.admin_id = profile.user_id;
          updateData.admin_approved_at = new Date().toISOString();
          updateData.admin_approval_notes = approvalNotes;
        } else {
          newStatus = 'approved';
        }
      } else {
        newStatus = 'declined';
        updateData.declined_by = profile.user_id;
        updateData.declined_at = new Date().toISOString();
        updateData.decline_reason = approvalNotes;
      }

      updateData.status = newStatus;

      const { error } = await supabase
        .from('hardware_requests')
        .update(updateData)
        .eq('id', selectedRequest.id);

      if (error) throw error;

      // Manually insert status history record
      const { error: historyError } = await supabase
        .from('request_status_history')
        .insert({
          request_id: selectedRequest.id,
          status: newStatus,
          changed_by: profile.user_id,
          notes: approvalNotes || `Request ${approvalAction === 'approve' ? 'approved' : 'declined'}`
        } as any);

      if (historyError) {
        console.error('Failed to log status history:', historyError);
        // Don't fail the approval if history logging fails
      }

      toast({
        title: 'Success',
        description: `Request ${approvalAction === 'approve' ? 'approved' : 'declined'} successfully`,
      });

      setShowApprovalDialog(false);
      setSelectedRequest(null);
      setApprovalAction(null);
      fetchPendingRequests(); // Refresh the list
    } catch (error: any) {
      console.error('Error processing approval:', error);
      toast({
        title: 'Error',
        description: `Failed to ${approvalAction} request`,
        variant: 'destructive',
      });
    } finally {
      setProcessingId(null);
    }
  };

  const getPriorityBadge = (priority: string) => {
    const config = {
      low: { variant: 'outline' as const, label: 'Low' },
      medium: { variant: 'secondary' as const, label: 'Medium' },
      high: { variant: 'default' as const, label: 'High' },
      urgent: { variant: 'destructive' as const, label: 'Urgent' },
    };
    const priorityConfig = config[priority as keyof typeof config];
    return <Badge variant={priorityConfig.variant}>{priorityConfig.label}</Badge>;
  };

  const requiresHighApproval = (amount?: number) => {
    return amount && amount > 5000;
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="text-muted-foreground">Loading pending approvals...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (viewingRequest) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Button variant="outline" onClick={() => setViewingRequest(null)}>
            ← Back to Pending Approvals
          </Button>
        </div>
        <RequestDetail requestId={viewingRequest.id} />
      </div>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Pending Approvals
            </CardTitle>
            <Button variant="outline" size="sm" onClick={fetchPendingRequests}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {pendingRequests.length === 0 ? (
            <div className="text-center py-8">
              <Clock className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-medium">No pending approvals</h3>
              <p className="mt-2 text-muted-foreground">
                All requests are up to date.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Request</TableHead>
                    <TableHead>Requester</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Submitted</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingRequests.map((request) => (
                    <TableRow key={request.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{request.title}</div>
                          {request.description && (
                            <div className="text-sm text-muted-foreground line-clamp-1">
                              {request.description}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {/* You could fetch user details here */}
                          User {request.user_id.slice(0, 8)}...
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getPriorityBadge(request.priority)}
                          {requiresHighApproval(request.total_amount) && (
                            <div title="High value - requires admin approval">
                              <AlertTriangle className="w-4 h-4 text-amber-500" />
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <DollarSign className="w-4 h-4 text-muted-foreground" />
                          <span>
                            {request.total_amount 
                              ? `${request.total_amount.toFixed(2)} ${request.currency}`
                              : 'TBD'
                            }
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <RequestStatusBadge status={request.status} />
                      </TableCell>
                      <TableCell>
                        {formatAUDate(request.created_at)}
                      </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setViewingRequest(request)}
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                            
                            {request.user_id !== profile?.user_id && (
                              <>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-green-600 hover:text-green-700"
                                  onClick={() => handleApprovalAction(request, 'approve')}
                                  disabled={processingId === request.id}
                                >
                                  <Check className="w-4 h-4" />
                                </Button>

                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-red-600 hover:text-red-700"
                                  onClick={() => handleApprovalAction(request, 'decline')}
                                  disabled={processingId === request.id}
                                >
                                  <X className="w-4 h-4" />
                                </Button>
                              </>
                            )}
                            {request.user_id === profile?.user_id && (
                              <span className="text-xs text-muted-foreground">Your request</span>
                            )}
                          </div>
                        </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Approval Dialog */}
      <Dialog open={showApprovalDialog} onOpenChange={setShowApprovalDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {approvalAction === 'approve' ? 'Approve' : 'Decline'} Request
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">
                {selectedRequest?.title}
              </p>
              <p className="font-medium">
                ${selectedRequest?.total_amount?.toFixed(2)} {selectedRequest?.currency}
              </p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="notes">
                {approvalAction === 'approve' ? 'Approval Notes (Optional)' : 'Decline Reason'}
              </Label>
              <Textarea
                id="notes"
                placeholder={
                  approvalAction === 'approve' 
                    ? 'Add any notes for this approval...'
                    : 'Please provide a reason for declining this request...'
                }
                value={approvalNotes}
                onChange={(e) => setApprovalNotes(e.target.value)}
              />
            </div>

            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setShowApprovalDialog(false)}>
                Cancel
              </Button>
              <Button
                onClick={processApproval}
                variant={approvalAction === 'approve' ? 'default' : 'destructive'}
                disabled={processingId !== null}
              >
                {processingId ? 'Processing...' : (approvalAction === 'approve' ? 'Approve' : 'Decline')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}