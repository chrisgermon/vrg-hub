import React, { useState, useEffect } from 'react';
import { formatAUDate, formatAUDateTime } from '@/lib/dateUtils';
import { Download, FileText, Package, DollarSign, Calendar, User, Clock, Check, X, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { RequestStatusBadge } from './RequestStatusBadge';
import { EmailLogs } from './EmailLogs';
import { RequestActivity } from './RequestActivity';
import type { HardwareRequest, RequestItem, RequestAttachment, RequestStatusHistory, RequestStatus } from '@/types/request';

interface RequestDetailProps {
  requestId: string;
  onEdit?: () => void;
}

export function RequestDetail({ requestId, onEdit }: RequestDetailProps) {
  const [request, setRequest] = useState<HardwareRequest | null>(null);
  const [items, setItems] = useState<RequestItem[]>([]);
  const [attachments, setAttachments] = useState<RequestAttachment[]>([]);
  const [statusHistory, setStatusHistory] = useState<RequestStatusHistory[]>([]);
  const [companyLogo, setCompanyLogo] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [notes, setNotes] = useState('');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { toast } = useToast();
  const { user, userRole } = useAuth();

  useEffect(() => {
    fetchRequestDetails();
  }, [requestId]);

  const fetchRequestDetails = async () => {
    setLoading(true);
    try {
      // Fetch request
      const { data: requestData, error: requestError } = await supabase
        .from('hardware_requests')
        .select('*')
        .eq('id', requestId)
        .single();

      if (requestError) throw requestError;
      setRequest(requestData);

      // Fetch items
      const { data: itemsData, error: itemsError } = await supabase
        .from('request_items')
        .select('*')
        .eq('request_id', requestId)
        .order('created_at');

      if (itemsError) throw itemsError;
      setItems(itemsData || []);

      // Fetch attachments
      const { data: attachmentsData, error: attachmentsError } = await supabase
        .from('request_attachments')
        .select('*')
        .eq('request_id', requestId)
        .order('created_at');

      if (attachmentsError) throw attachmentsError;
      setAttachments(attachmentsData || []);

      // Fetch status history
      const { data: historyData, error: historyError } = await supabase
        .from('request_status_history')
        .select('*')
        .eq('request_id', requestId)
        .order('created_at', { ascending: false });

      if (historyError) throw historyError;
      setStatusHistory(historyData || []);

      // Fetch company logo
      const { data: companyData } = await supabase
        .from('companies')
        .select('logo_url')
        .eq('id', requestData.company_id)
        .single();
      
      if (companyData?.logo_url) {
        setCompanyLogo(companyData.logo_url);
      }

    } catch (error: any) {
      console.error('Error fetching request details:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch request details',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const downloadAttachment = async (attachment: RequestAttachment) => {
    try {
      const { data, error } = await supabase.storage
        .from('request-attachments')
        .download(attachment.file_path);

      if (error) throw error;

      // Create download link
      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = attachment.file_name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: 'Success',
        description: 'File downloaded successfully',
      });
    } catch (error: any) {
      console.error('Error downloading file:', error);
      toast({
        title: 'Error',
        description: 'Failed to download file',
        variant: 'destructive',
      });
    }
  };

  const handleStatusUpdate = async (newStatus: RequestStatus, notes?: string) => {
    if (!request || !user) return;

    // Prevent self-approval
    if ((newStatus === 'approved' || newStatus === 'declined') && request.user_id === user.id) {
      toast({
        title: 'Error',
        description: 'You cannot approve or decline your own request',
        variant: 'destructive',
      });
      return;
    }

    setActionLoading(true);
    try {
      const updates: any = { 
        status: newStatus,
        updated_at: new Date().toISOString()
      };

      // Set appropriate fields based on status and user role
      if (newStatus === 'approved') {
        if (userRole === 'manager') {
          updates.manager_id = user.id;
          updates.manager_approved_at = new Date().toISOString();
          updates.manager_approval_notes = notes;
        } else if (userRole === 'tenant_admin' || userRole === 'super_admin') {
          updates.admin_id = user.id;
          updates.admin_approved_at = new Date().toISOString();
          updates.admin_approval_notes = notes;
        }
      } else if (newStatus === 'declined') {
        updates.declined_by = user.id;
        updates.declined_at = new Date().toISOString();
        updates.decline_reason = notes;
      }

      const { error } = await supabase
        .from('hardware_requests')
        .update(updates)
        .eq('id', request.id);

      if (error) throw error;

      // Manually insert status history record
      const { error: historyError } = await supabase
        .from('request_status_history')
        .insert({
          request_id: request.id,
          status: newStatus,
          changed_by: user.id,
          notes: notes || `Status changed to ${newStatus}`
        } as any);

      if (historyError) {
        console.error('Failed to log status history:', historyError);
        // Don't fail the status update if history logging fails
      }

      // Send email notification
      const notificationAction = newStatus === 'approved' ? 'approved' : 
                                newStatus === 'declined' ? 'declined' : 
                                newStatus === 'ordered' ? 'ordered' : null;

      if (notificationAction) {
        try {
          await supabase.functions.invoke('notify-request-update', {
            body: {
              requestId: request.id,
              action: notificationAction,
              userId: user.id,
              notes: notes
            }
          });
        } catch (emailError) {
          console.error('Failed to send email notification:', emailError);
          // Don't fail the status update if email fails
        }
      }

      toast({
        title: "Success",
        description: `Request ${newStatus} successfully`,
      });

      // Refresh the request data
      fetchRequestDetails();
      setNotes('');
    } catch (error) {
      console.error('Error updating request:', error);
      toast({
        title: "Error",
        description: "Failed to update request status",
        variant: "destructive",
      });
    } finally {
      setActionLoading(false);
    }
  };

  const canApprove = () => {
    if (!request || !userRole) return false;
    // Prevent self-approval
    if (request.user_id === user?.id) return false;
    return (
      ['manager', 'tenant_admin', 'super_admin'].includes(userRole) &&
      ['submitted', 'pending_manager_approval', 'pending_admin_approval'].includes(request.status)
    );
  };

  const canMarkOrdered = () => {
    if (!request || !userRole) return false;
    return (
      ['tenant_admin', 'super_admin'].includes(userRole) &&
      request.status === 'approved'
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-muted-foreground">Loading request details...</div>
      </div>
    );
  }

  if (!request) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-muted-foreground">Request not found</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Compact Request Header */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                {(request as any).request_number && (
                  <code className="text-xs font-mono bg-muted px-2 py-1 rounded border">
                    {(request as any).request_number}
                  </code>
                )}
                <CardTitle className="text-xl">{request.title}</CardTitle>
                {(request as any).from_email && (
                  <Badge variant="outline" className="gap-1">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    Email Request
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <RequestStatusBadge status={request.status} />
                  {(userRole === 'manager' || userRole === 'tenant_admin' || userRole === 'super_admin') && (
                    <Select
                      value={request.status}
                      onValueChange={(value: RequestStatus) => {
                        if (value !== request.status) {
                          handleStatusUpdate(value);
                        }
                      }}
                    >
                      <SelectTrigger className="w-[180px] h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="draft">Draft</SelectItem>
                        <SelectItem value="submitted">Submitted</SelectItem>
                        <SelectItem value="pending_manager_approval">Pending Manager</SelectItem>
                        <SelectItem value="pending_admin_approval">Pending Admin</SelectItem>
                        <SelectItem value="approved">Approved</SelectItem>
                        <SelectItem value="declined">Declined</SelectItem>
                        <SelectItem value="ordered">Ordered</SelectItem>
                        <SelectItem value="delivered">Delivered</SelectItem>
                        <SelectItem value="cancelled">Cancelled</SelectItem>
                        <SelectItem value="inbox">Inbox</SelectItem>
                        <SelectItem value="in_progress">In Progress</SelectItem>
                        <SelectItem value="awaiting_information">Awaiting Info</SelectItem>
                        <SelectItem value="on_hold">On Hold</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                </div>
                <Badge variant={request.priority === 'urgent' ? 'destructive' : 'secondary'} className="text-xs">
                  {request.priority.toUpperCase()}
                </Badge>
              </div>
            </div>
            <div className="flex gap-2">
              <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
                <SheetTrigger asChild>
                  <Button variant="outline" size="sm">
                    <User className="h-4 w-4 mr-2" />
                    Requester Info
                  </Button>
                </SheetTrigger>
                <SheetContent className="w-[400px] sm:w-[540px] overflow-y-auto">
                  <SheetHeader>
                    <SheetTitle>Request Information</SheetTitle>
                  </SheetHeader>
                  <div className="mt-6 space-y-6">
                    {companyLogo && (
                      <div>
                        <img src={companyLogo} alt="Company Logo" className="h-10 object-contain" />
                      </div>
                    )}
                    
                    <div className="space-y-4">
                      <div>
                        <h4 className="text-sm font-medium text-muted-foreground mb-1">Request Number</h4>
                        <code className="text-sm font-mono bg-muted px-2 py-1 rounded">
                          {(request as any).request_number || 'N/A'}
                        </code>
                      </div>

                      <div>
                        <h4 className="text-sm font-medium text-muted-foreground mb-1">Status</h4>
                        <RequestStatusBadge status={request.status} />
                      </div>

                      <div>
                        <h4 className="text-sm font-medium text-muted-foreground mb-1">Priority</h4>
                        <Badge variant={request.priority === 'urgent' ? 'destructive' : 'secondary'}>
                          {request.priority.toUpperCase()}
                        </Badge>
                      </div>

                      {request.clinic_name && (
                        <div>
                          <h4 className="text-sm font-medium text-muted-foreground mb-1">Location</h4>
                          <p className="text-sm">{request.clinic_name}</p>
                        </div>
                      )}

                      <div>
                        <h4 className="text-sm font-medium text-muted-foreground mb-1">Total Amount</h4>
                        <p className="text-sm font-semibold">
                          ${request.total_amount?.toFixed(2) || '0.00'} {request.currency}
                        </p>
                      </div>

                      {request.expected_delivery_date && (
                        <div>
                          <h4 className="text-sm font-medium text-muted-foreground mb-1">Expected Delivery</h4>
                          <p className="text-sm">{formatAUDate(request.expected_delivery_date)}</p>
                        </div>
                      )}

                      <div>
                        <h4 className="text-sm font-medium text-muted-foreground mb-1">Created</h4>
                        <p className="text-sm">{formatAUDateTime(request.created_at)}</p>
                      </div>

                      {(request as any).from_email && (
                        <div>
                          <Badge variant="outline" className="gap-1">
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                            </svg>
                            Created via Email
                          </Badge>
                        </div>
                      )}
                    </div>
                  </div>
                </SheetContent>
              </Sheet>

              <Button variant="outline" size="sm" onClick={fetchRequestDetails}>
                <RefreshCw className="h-4 w-4" />
              </Button>
              {onEdit && (
                (userRole === 'tenant_admin' || ['draft', 'submitted'].includes(request.status))
              ) && (
                <Button onClick={onEdit} size="sm">Edit</Button>
              )}
              {canApprove() && (
                <>
                  <Button 
                    onClick={() => handleStatusUpdate('approved', notes)}
                    disabled={actionLoading}
                    variant="approve"
                    size="sm"
                  >
                    <Check className="w-4 h-4 mr-2" />
                    Approve
                  </Button>
                  <Button 
                    onClick={() => handleStatusUpdate('declined', notes)}
                    disabled={actionLoading}
                    variant="decline"
                    size="sm"
                  >
                    <X className="w-4 h-4 mr-2" />
                    Decline
                  </Button>
                </>
              )}
              {canMarkOrdered() && (
                <Button 
                  onClick={() => handleStatusUpdate('ordered', notes)}
                  disabled={actionLoading}
                  variant="premium"
                  size="sm"
                >
                  Mark as Ordered
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 pt-0">
          {request.description && (
            <div className="bg-muted/50 rounded-lg p-4 border-l-4 border-primary">
              <h4 className="font-semibold text-base mb-3 flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Description
              </h4>
              <div 
                className="prose prose-sm max-w-none text-foreground"
                dangerouslySetInnerHTML={{ __html: request.description }}
              />
            </div>
          )}

          <div className="bg-accent/30 rounded-lg p-4 border">
            <h4 className="font-semibold text-base mb-3">Business Justification</h4>
            <p className="text-foreground leading-relaxed">{request.business_justification}</p>
          </div>

          {(canApprove() || canMarkOrdered()) && (
            <div>
              <label className="block text-sm font-medium mb-2">
                {canApprove() ? 'Approval/Decline Notes' : 'Order Notes'} (Optional)
              </label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add notes about your decision..."
                className="resize-none"
                rows={3}
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Email Notifications - Moved up for better visibility */}
      <EmailLogs requestId={requestId} />

      {/* Request Items */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="w-5 h-5" />
            Request Items
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Item</TableHead>
                <TableHead>Vendor</TableHead>
                <TableHead>Model</TableHead>
                <TableHead>Qty</TableHead>
                <TableHead>Unit Price</TableHead>
                <TableHead>Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium">{item.name}</div>
                      {item.description && (
                        <div className="text-sm text-muted-foreground">{item.description}</div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>{item.vendor || '-'}</TableCell>
                  <TableCell>{item.model_number || '-'}</TableCell>
                  <TableCell>{item.quantity}</TableCell>
                  <TableCell>${item.unit_price?.toFixed(2) || '0.00'}</TableCell>
                  <TableCell>${item.total_price?.toFixed(2) || '0.00'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Attachments */}
      {attachments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Attachments
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {attachments.map((attachment) => (
                <div key={attachment.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <FileText className="w-4 h-4 text-muted-foreground" />
                    <div>
                      <div className="font-medium">{attachment.file_name}</div>
                      <div className="text-sm text-muted-foreground">
                        {attachment.file_size && `${(attachment.file_size / 1024 / 1024).toFixed(2)} MB`}
                        {attachment.attachment_type !== 'general' && ` • ${attachment.attachment_type}`}
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => downloadAttachment(attachment)}
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Download
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Status History */}
      {statusHistory.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Status History
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {statusHistory.map((history, index) => (
                <div key={history.id}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <RequestStatusBadge status={history.status} />
                      <span className="text-sm text-muted-foreground">
                        {formatAUDateTime(history.created_at)}
                      </span>
                    </div>
                  </div>
                  {history.notes && (
                    <p className="text-sm text-muted-foreground mt-1 ml-6">{history.notes}</p>
                  )}
                  {index < statusHistory.length - 1 && <Separator className="mt-4" />}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Activity Tabs Section */}
      <RequestActivity requestId={requestId} requestType="hardware" />
    </div>
  );
}