import React, { useState, useEffect } from 'react';
import { formatAUDateLong, formatAUDateTimeFull } from '@/lib/dateUtils';
import { Download, Calendar, Repeat, FileText, Mail, Phone, Globe, CheckCircle2, MessageSquare } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { RequestStatusBadge } from '@/components/requests/RequestStatusBadge';
import { RequestActivity } from '@/components/requests/RequestActivity';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';

interface MarketingRequestDetailProps {
  requestId: string;
}

export function MarketingRequestDetail({ requestId }: MarketingRequestDetailProps) {
  const [request, setRequest] = useState<any>(null);
  const [attachments, setAttachments] = useState<any[]>([]);
  const [emailLogs, setEmailLogs] = useState<any[]>([]);
  const [companyLogo, setCompanyLogo] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
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
    setLoading(true);
    try {
      const { data: requestData, error: requestError } = await supabase
        .from('marketing_requests')
        .select('*')
        .eq('id', requestId)
        .single();

      if (requestError) throw requestError;
      setRequest(requestData);

      const { data: attachmentsData, error: attachmentsError } = await supabase
        .from('marketing_request_attachments')
        .select('*')
        .eq('request_id', requestId)
        .order('created_at');

      if (attachmentsError) throw attachmentsError;
      setAttachments(attachmentsData || []);

      // Fetch email logs for this marketing request
      const { data: emailLogsData, error: emailLogsError } = await supabase
        .from('email_logs')
        .select('*')
        .eq('marketing_request_id', requestId)
        .order('created_at', { ascending: false });

      if (!emailLogsError && emailLogsData) {
        setEmailLogs(emailLogsData);
      }

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

  const downloadAttachment = async (attachment: any) => {
    try {
      const { data, error } = await supabase.storage
        .from('marketing-requests')
        .download(attachment.file_path);

      if (error) throw error;

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

  const markAsComplete = async () => {
    if (!isSuperAdmin) return;

    setIsUpdating(true);
    try {
      const { error } = await supabase
        .from('marketing_requests')
        .update({ 
          status: 'delivered',
          updated_at: new Date().toISOString()
        })
        .eq('id', requestId);

      if (error) throw error;

      // Add status history
      await supabase
        .from('marketing_request_status_history')
        .insert({
          request_id: requestId,
          status: 'delivered',
          changed_by: user!.id,
          notes: 'Marked as complete by admin'
        });

      toast({
        title: 'Success',
        description: 'Marketing request marked as complete',
      });

      // Refresh the request details
      fetchRequestDetails();
    } catch (error: any) {
      console.error('Error marking request as complete:', error);
      toast({
        title: 'Error',
        description: 'Failed to mark request as complete',
        variant: 'destructive',
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const getRequestTypeIcon = (type: string) => {
    switch (type) {
      case 'fax_blast':
        return <Phone className="w-5 h-5" />;
      case 'email_blast':
        return <Mail className="w-5 h-5" />;
      case 'website_update':
        return <Globe className="w-5 h-5" />;
      default:
        return <FileText className="w-5 h-5" />;
    }
  };

  const getRequestTypeLabel = (type: string) => {
    switch (type) {
      case 'fax_blast':
        return 'Fax Blast';
      case 'email_blast':
        return 'Email Blast';
      case 'website_update':
        return 'Website Update';
      default:
        return type;
    }
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

  const recipientListAttachment = attachments.find(a => a.attachment_type === 'recipient_list');
  const documentAttachments = attachments.filter(a => a.attachment_type === 'document');

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          {companyLogo && (
            <div className="mb-4">
              <img src={companyLogo} alt="Company Logo" className="h-12 object-contain" />
            </div>
          )}
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-3">
                {(request as any).request_number && (
                  <code className="text-sm font-mono bg-muted px-3 py-1 rounded border">
                    {(request as any).request_number}
                  </code>
                )}
                {getRequestTypeIcon(request.request_type)}
                <CardTitle>{request.title}</CardTitle>
                {(request as any).from_email && (
                  <Badge variant="outline" className="gap-1">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    Email Request
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline">{getRequestTypeLabel(request.request_type)}</Badge>
                <RequestStatusBadge status={request.status} />
                <Badge variant={
                  request.priority === 'urgent' ? 'destructive' :
                  request.priority === 'high' ? 'default' :
                  'secondary'
                }>
                  {request.priority}
                </Badge>
              </div>
            </div>
            {isSuperAdmin && request.status !== 'delivered' && request.status !== 'declined' && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="default" size="sm" disabled={isUpdating}>
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    Mark as Complete
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Mark request as complete?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will mark the marketing request as delivered/completed. This action can be reversed by updating the status later if needed.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={markAsComplete}>
                      Confirm
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {request.description && (
            <div className="bg-muted/50 rounded-lg p-4 border-l-4 border-primary">
              <h3 className="text-base font-semibold mb-3 flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Description
              </h3>
              <p className="text-foreground leading-relaxed whitespace-pre-wrap">{request.description}</p>
            </div>
          )}

          <div className="bg-accent/30 rounded-lg p-4 border">
            <h3 className="text-base font-semibold mb-3">Business Justification</h3>
            <p className="text-foreground leading-relaxed whitespace-pre-wrap">{request.business_justification}</p>
          </div>

          {request.request_type === 'website_update' && request.website_update_details && (
            <div>
              <h3 className="text-sm font-medium mb-2">Website Update Details</h3>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{request.website_update_details}</p>
            </div>
          )}

          <Separator />

          {/* Scheduling Information */}
          {(request.scheduled_send_date || request.is_recurring) && (
            <>
              <div>
                <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Scheduling
                </h3>
                <div className="space-y-2">
                  {request.scheduled_send_date && (
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-muted-foreground">Send Date:</span>
                      <span>{formatAUDateLong(request.scheduled_send_date)}</span>
                      {request.scheduled_send_time && (
                        <span className="text-muted-foreground">at {request.scheduled_send_time}</span>
                      )}
                    </div>
                  )}
                  {request.is_recurring && (
                    <div className="flex items-center gap-2 text-sm">
                      <Repeat className="w-4 h-4 text-muted-foreground" />
                      <span>Recurring: {request.recurrence_frequency}</span>
                      {request.recurrence_end_date && (
                        <span className="text-muted-foreground">
                          until {formatAUDateLong(request.recurrence_end_date)}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
              <Separator />
            </>
          )}

          {/* Recipient List */}
          {recipientListAttachment && (
            <>
              <div>
                <h3 className="text-sm font-medium mb-3">Recipient List</h3>
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <FileText className="w-4 h-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">{recipientListAttachment.file_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {(recipientListAttachment.file_size / 1024).toFixed(2)} KB
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => downloadAttachment(recipientListAttachment)}
                  >
                    <Download className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              <Separator />
            </>
          )}

          {/* Documents */}
          {(documentAttachments.length > 0 || (request.document_urls && request.document_urls.length > 0)) && (
            <>
              <div>
                <h3 className="text-sm font-medium mb-3">Documents</h3>
                <div className="space-y-2">
                  {documentAttachments.map((attachment: any) => (
                    <div key={attachment.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <FileText className="w-4 h-4 text-muted-foreground" />
                        <div>
                          <p className="text-sm font-medium">{attachment.file_name}</p>
                          <p className="text-xs text-muted-foreground">
                            {(attachment.file_size / 1024).toFixed(2)} KB
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => downloadAttachment(attachment)}
                      >
                        <Download className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                  {request.document_urls && request.document_urls.map((url: string, index: number) => (
                    <div key={index} className="flex items-center gap-3 p-3 border rounded-lg">
                      <Globe className="w-4 h-4 text-muted-foreground" />
                      <a
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-primary hover:underline"
                      >
                        {url}
                      </a>
                    </div>
                  ))}
                </div>
              </div>
              <Separator />
            </>
          )}

          {/* Email Logs */}
          {emailLogs.length > 0 && (
            <>
              <div>
                <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
                  <Mail className="w-4 h-4" />
                  Email Communication Logs
                </h3>
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date/Time</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Recipient</TableHead>
                        <TableHead>Subject</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {emailLogs.map((log) => (
                        <TableRow key={log.id}>
                          <TableCell className="text-sm">
                            {formatAUDateTimeFull(log.sent_at)}
                          </TableCell>
                          <TableCell className="text-sm">
                            <Badge variant="outline">
                              {log.email_type.replace(/_/g, ' ')}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm">
                            {log.recipient_email}
                          </TableCell>
                          <TableCell className="text-sm">
                            {log.subject}
                          </TableCell>
                          <TableCell>
                            <Badge variant={
                              log.status === 'sent' ? 'default' :
                              log.status === 'failed' ? 'destructive' :
                              'secondary'
                            }>
                              {log.status}
                            </Badge>
                            {log.error_message && (
                              <p className="text-xs text-destructive mt-1">
                                {log.error_message}
                              </p>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
              <Separator />
            </>
          )}

          {/* Timestamps */}
          <div className="text-sm text-muted-foreground">
            <p>Created: {formatAUDateTimeFull(request.created_at)}</p>
            <p>Last updated: {formatAUDateTimeFull(request.updated_at)}</p>
          </div>
        </CardContent>
      </Card>

      {/* Activity Section */}
      <RequestActivity requestId={request.id} requestType="marketing" />
    </div>
  );
}