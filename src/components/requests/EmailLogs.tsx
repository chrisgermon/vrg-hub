import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { CheckCircle, XCircle, Clock, Mail, RefreshCw as RefreshCwIcon, ChevronLeft, ChevronRight, FileText, Copy, Eye } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatAUDateTimeFull } from "@/lib/dateUtils";
import { toast } from "sonner";

interface EmailLog {
  id: string;
  request_id?: string;
  marketing_request_id?: string;
  user_account_request_id?: string;
  recipient_email: string;
  email_type: string;
  subject: string;
  sent_at: string;
  status: string;
  error_message?: string | null;
  metadata?: any;
}

interface EmailLogsProps {
  requestId?: string;
  marketingRequestId?: string;
  userAccountRequestId?: string;
}

const getEmailTypeLabel = (type: string) => {
  const labels: Record<string, string> = {
    request_submitted: 'Request Submitted',
    request_approved: 'Request Approved',
    request_declined: 'Request Declined',
    request_ordered: 'Request Ordered',
    marketing_request_submitted: 'Marketing Request Submitted',
    user_account_request_submitted: 'User Account Request',
  };
  return labels[type] || type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
};

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'sent':
      return <CheckCircle className="w-4 h-4 text-emerald-600" />;
    case 'failed':
      return <XCircle className="w-4 h-4 text-red-600" />;
    case 'pending':
      return <Clock className="w-4 h-4 text-yellow-600" />;
    default:
      return <Mail className="w-4 h-4 text-muted-foreground" />;
  }
};

const getStatusBadge = (status: string) => {
  switch (status) {
    case 'sent':
      return <Badge className="bg-emerald-500">Sent</Badge>;
    case 'failed':
      return <Badge variant="destructive">Failed</Badge>;
    case 'pending':
      return <Badge variant="secondary">Pending</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
};

export function EmailLogs({ requestId, marketingRequestId, userAccountRequestId }: EmailLogsProps) {
  const [emails, setEmails] = useState<EmailLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(true);
  const [resendingId, setResendingId] = useState<string | null>(null);
  const [selectedEmailIndex, setSelectedEmailIndex] = useState<number>(-1);
  const [dialogOpen, setDialogOpen] = useState(false);

  const selectedEmail = selectedEmailIndex >= 0 ? emails[selectedEmailIndex] : null;

  const handleViewEmail = (email: EmailLog) => {
    const index = emails.findIndex(e => e.id === email.id);
    setSelectedEmailIndex(index);
    setDialogOpen(true);
  };

  const handleNext = () => {
    if (selectedEmailIndex < emails.length - 1) {
      setSelectedEmailIndex(selectedEmailIndex + 1);
    }
  };

  const handlePrevious = () => {
    if (selectedEmailIndex > 0) {
      setSelectedEmailIndex(selectedEmailIndex - 1);
    }
  };

  useEffect(() => {
    fetchEmailLogs();
  }, [requestId, marketingRequestId, userAccountRequestId]);

  const fetchEmailLogs = async () => {
    try {
      setLoading(true);
      
      let query = supabase
        .from('email_logs')
        .select('*')
        .order('sent_at', { ascending: false });

      if (requestId) {
        // Match either legacy request_id or new department_request_id
        query = query.or(`request_id.eq.${requestId},department_request_id.eq.${requestId}`);
      } else if (marketingRequestId) {
        query = query.eq('marketing_request_id', marketingRequestId);
      } else if (userAccountRequestId) {
        query = query.eq('user_account_request_id', userAccountRequestId);
      } else {
        setLoading(false);
        return;
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching email logs:', error);
      } else if ((!data || data.length === 0) && requestId) {
        // Fallback for older logs that didn't set request_id: match by metadata.request_id
        const { data: metaMatches, error: metaErr } = await supabase
          .from('email_logs')
          .select('*')
          .filter('metadata->>request_id', 'eq', requestId)
          .order('sent_at', { ascending: false });
        if (metaErr) {
          console.error('Error fetching email logs by metadata:', metaErr);
        } else {
          setEmails(metaMatches || []);
        }
      } else {
        setEmails(data || []);
      }
    } catch (error) {
      console.error('Error in fetchEmailLogs:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleResendEmail = async (emailLogId: string) => {
    try {
      setResendingId(emailLogId);
      
      const { error } = await supabase.functions.invoke('resend-notification-email', {
        body: { emailLogId },
      });

      if (error) throw error;

      toast.success('Email resent successfully');
      fetchEmailLogs();
    } catch (error) {
      console.error('Error resending email:', error);
      toast.error('Failed to resend email');
    } finally {
      setResendingId(null);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="w-5 h-5" />
            Email Notifications
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground">Loading email logs...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-primary/20">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors bg-primary/5">
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Mail className="w-5 h-5 text-primary" />
                Email Notifications
                {emails.length > 0 && (
                  <Badge variant="outline" className="ml-2 bg-primary/10">
                    {emails.length}
                  </Badge>
                )}
              </div>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={fetchEmailLogs}>
                  <RefreshCwIcon className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="sm">
                  {isOpen ? 'Hide' : 'Show'} Details
                </Button>
              </div>
            </CardTitle>
          </CardHeader>
        </CollapsibleTrigger>
        
        <CollapsibleContent>
          <CardContent>
            {emails.length === 0 ? (
              <div className="text-sm text-muted-foreground text-center py-4">
                No email notifications sent for this request yet.
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-4 p-4 bg-muted/20 rounded-lg">
                  <div className="text-center">
                    <div className="text-lg font-semibold text-emerald-600">
                      {emails.filter(e => e.status === 'sent').length}
                    </div>
                    <div className="text-xs text-muted-foreground">Sent</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-semibold text-red-600">
                      {emails.filter(e => e.status === 'failed').length}
                    </div>
                    <div className="text-xs text-muted-foreground">Failed</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-semibold text-yellow-600">
                      {emails.filter(e => e.status === 'pending').length}
                    </div>
                    <div className="text-xs text-muted-foreground">Pending</div>
                  </div>
                </div>

                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Type</TableHead>
                      <TableHead>Recipient</TableHead>
                      <TableHead>Subject</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Sent At</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {emails.map((email) => (
                      <TableRow key={email.id}>
                        <TableCell className="font-medium">
                          {getEmailTypeLabel(email.email_type)}
                        </TableCell>
                        <TableCell>{email.recipient_email}</TableCell>
                        <TableCell className="max-w-xs truncate">
                          {email.subject}
                          {email.error_message && (
                            <div className="text-xs text-red-600 mt-1">
                              Error: {email.error_message}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>{getStatusBadge(email.status)}</TableCell>
                        <TableCell>{formatAUDateTimeFull(email.sent_at)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex gap-2 justify-end">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleViewEmail(email)}
                              title="View details"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleResendEmail(email.id)}
                              disabled={resendingId === email.id}
                              title="Resend email"
                            >
                              <RefreshCwIcon className={`h-4 w-4 ${resendingId === email.id ? 'animate-spin' : ''}`} />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>

      {/* Detail Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          {selectedEmail && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center justify-between">
                  <span>Email Details</span>
                  <div className="flex items-center gap-2 text-sm font-normal text-muted-foreground">
                    <span>{selectedEmailIndex + 1} of {emails.length}</span>
                  </div>
                </DialogTitle>
              </DialogHeader>
              
              <div className="space-y-6">
                {/* Basic Information */}
                <div>
                  <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                    <Mail className="w-4 h-4" />
                    Email Information
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-muted-foreground">Recipient Email</p>
                      <p className="text-sm font-mono">{selectedEmail.recipient_email}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-muted-foreground">Sent At</p>
                      <p className="text-sm">
                        {formatAUDateTimeFull(selectedEmail.sent_at)}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-muted-foreground">Email Type</p>
                      <Badge variant="outline">
                        {getEmailTypeLabel(selectedEmail.email_type)}
                      </Badge>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-muted-foreground">Status</p>
                      <div className="flex items-center gap-2">
                        {getStatusIcon(selectedEmail.status)}
                        {getStatusBadge(selectedEmail.status)}
                      </div>
                    </div>
                    <div className="col-span-2 space-y-1">
                      <p className="text-xs font-medium text-muted-foreground">Subject</p>
                      <p className="text-sm">{selectedEmail.subject}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-muted-foreground">Email Log ID</p>
                      <p className="text-sm font-mono break-all">{selectedEmail.id}</p>
                    </div>
                  </div>
                </div>

                {/* Related Request IDs */}
                {(selectedEmail.request_id || selectedEmail.marketing_request_id || selectedEmail.user_account_request_id) && (
                  <div>
                    <h3 className="text-sm font-semibold mb-3">Related Request IDs</h3>
                    <div className="grid grid-cols-1 gap-3">
                      {selectedEmail.request_id && (
                        <div className="p-3 rounded-lg border bg-muted/50">
                          <p className="text-xs font-medium text-muted-foreground mb-1">Hardware Request ID</p>
                          <p className="text-sm font-mono break-all">{selectedEmail.request_id}</p>
                        </div>
                      )}
                      {selectedEmail.marketing_request_id && (
                        <div className="p-3 rounded-lg border bg-muted/50">
                          <p className="text-xs font-medium text-muted-foreground mb-1">Marketing Request ID</p>
                          <p className="text-sm font-mono break-all">{selectedEmail.marketing_request_id}</p>
                        </div>
                      )}
                      {selectedEmail.user_account_request_id && (
                        <div className="p-3 rounded-lg border bg-muted/50">
                          <p className="text-xs font-medium text-muted-foreground mb-1">User Account Request ID</p>
                          <p className="text-sm font-mono break-all">{selectedEmail.user_account_request_id}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Error Message */}
                {selectedEmail.error_message && (
                  <div className="p-4 rounded-lg border border-red-200 bg-red-50 dark:bg-red-950/20 dark:border-red-800">
                    <h3 className="text-sm font-semibold mb-2 text-red-700 dark:text-red-400">Error Details</h3>
                    <p className="text-sm text-red-600 dark:text-red-300 font-mono whitespace-pre-wrap">
                      {selectedEmail.error_message}
                    </p>
                  </div>
                )}

                {/* Metadata */}
                {selectedEmail.metadata && Object.keys(selectedEmail.metadata).length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                      <FileText className="w-4 h-4" />
                      Email Metadata
                    </h3>
                    <ScrollArea className="h-64 rounded-md border bg-muted/50 p-4">
                      <pre className="text-xs font-mono whitespace-pre-wrap break-all">
                        {JSON.stringify(selectedEmail.metadata, null, 2)}
                      </pre>
                    </ScrollArea>
                  </div>
                )}

                {/* Full Raw JSON */}
                <div>
                  <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    Complete Raw Data
                  </h3>
                  <ScrollArea className="h-64 rounded-md border bg-muted/50 p-4">
                    <pre className="text-xs font-mono whitespace-pre-wrap break-all">
                      {JSON.stringify(selectedEmail, null, 2)}
                    </pre>
                  </ScrollArea>
                </div>

                {/* Navigation and Actions */}
                <div className="flex justify-between items-center gap-2 pt-4 border-t">
                  <Button
                    variant="outline"
                    onClick={handlePrevious}
                    disabled={selectedEmailIndex === 0}
                  >
                    <ChevronLeft className="w-4 h-4 mr-2" />
                    Previous
                  </Button>
                  
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      onClick={() => handleResendEmail(selectedEmail.id)}
                      disabled={resendingId === selectedEmail.id}
                    >
                      <RefreshCwIcon className={`w-4 h-4 mr-2 ${resendingId === selectedEmail.id ? 'animate-spin' : ''}`} />
                      Resend
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => {
                        navigator.clipboard.writeText(JSON.stringify(selectedEmail, null, 2));
                        toast.success('Copied to clipboard');
                      }}
                    >
                      <Copy className="w-4 h-4 mr-2" />
                      Copy JSON
                    </Button>
                  </div>

                  <Button
                    variant="outline"
                    onClick={handleNext}
                    disabled={selectedEmailIndex === emails.length - 1}
                  >
                    Next
                    <ChevronRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
}
