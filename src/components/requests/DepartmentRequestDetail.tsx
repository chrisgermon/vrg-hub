import React, { useState, useEffect } from 'react';
import { formatAUDate } from '@/lib/dateUtils';
import { FileText, Calendar, MapPin, AlertCircle, Download, MessageSquare, User, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RequestActivity } from './RequestActivity';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { EmailLogs } from '@/components/requests/EmailLogs';
import { useAuth } from '@/hooks/useAuth';

interface DepartmentRequest {
  id: string;
  title: string;
  description?: string;
  department: string;
  sub_department: string;
  priority: string;
  status: string;
  location_id?: string;
  created_at: string;
  user_id: string;
  company_id: string;
  assigned_to?: string;
  assigned_at?: string;
  assigned_by?: string;
}

interface Attachment {
  id: string;
  file_name: string;
  file_path: string;
  file_size?: number;
  content_type?: string;
  created_at: string;
}

interface DepartmentRequestDetailProps {
  requestId: string;
}

export function DepartmentRequestDetail({ requestId }: DepartmentRequestDetailProps) {
  const [request, setRequest] = useState<DepartmentRequest | null>(null);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [requesterName, setRequesterName] = useState<string>('');
  const [requesterEmail, setRequesterEmail] = useState<string>('');
  const [companyName, setCompanyName] = useState<string>('');
  const [locationName, setLocationName] = useState<string>('');
  const [assignedUserName, setAssignedUserName] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [downloadingFile, setDownloadingFile] = useState<string | null>(null);
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [resendingNotifications, setResendingNotifications] = useState(false);
  const { toast } = useToast();
  const { userRole } = useAuth();

  useEffect(() => {
    fetchRequestDetails();
  }, [requestId]);

  const fetchRequestDetails = async () => {
    try {
      // Fetch department request
      const { data: requestData, error: requestError } = await supabase
        .from('department_requests')
        .select('*')
        .eq('id', requestId)
        .single();

      if (requestError) throw requestError;
      if (!requestData) {
        toast({
          title: 'Error',
          description: 'Request not found',
          variant: 'destructive',
        });
        return;
      }

      setRequest(requestData);

      // Fetch attachments
      const { data: attachmentsData, error: attachmentsError } = await supabase
        .from('request_attachments')
        .select('*')
        .eq('request_type', 'department')
        .eq('request_id', requestId)
        .order('created_at', { ascending: false });

      if (attachmentsError) {
        console.error('Error fetching attachments:', attachmentsError);
      } else {
        setAttachments(attachmentsData || []);
      }

      // Fetch requester profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('name, email')
        .eq('user_id', requestData.user_id)
        .single();

      if (profileData) {
        setRequesterName(profileData.name || '');
        setRequesterEmail(profileData.email || '');
      }

      // Fetch company name
      const { data: companyData } = await supabase
        .from('companies')
        .select('name')
        .eq('id', requestData.company_id)
        .single();

      if (companyData) {
        setCompanyName(companyData.name);
      }

      // Fetch location name if location_id exists
      if (requestData.location_id) {
        const { data: locationData } = await supabase
          .from('company_locations')
          .select('name')
          .eq('id', requestData.location_id)
          .single();

        if (locationData) {
          setLocationName(locationData.name);
        }
      }

      // Fetch assigned user name if assigned_to exists
      if (requestData.assigned_to) {
        const { data: assignedProfileData } = await supabase
          .from('profiles')
          .select('name')
          .eq('user_id', requestData.assigned_to)
          .single();

        if (assignedProfileData) {
          setAssignedUserName(assignedProfileData.name || 'Unknown User');
        }
      }
    } catch (error) {
      console.error('Error fetching request details:', error);
      toast({
        title: 'Error',
        description: 'Failed to load request details',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadAttachment = async (attachment: Attachment) => {
    setDownloadingFile(attachment.id);
    try {
      const { data, error } = await supabase.storage
        .from('request-attachments')
        .download(attachment.file_path);

      if (error) throw error;

      // Create a download link
      const url = window.URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = attachment.file_name;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: 'Success',
        description: 'File downloaded successfully',
      });
    } catch (error) {
      console.error('Error downloading file:', error);
      toast({
        title: 'Error',
        description: 'Failed to download file',
        variant: 'destructive',
      });
    } finally {
      setDownloadingFile(null);
    }
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return 'Unknown size';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'submitted': return 'bg-blue-500';
      case 'pending_manager_approval': return 'bg-yellow-500';
      case 'pending_admin_approval': return 'bg-orange-500';
      case 'approved': return 'bg-green-500';
      case 'completed': return 'bg-green-600';
      case 'declined': return 'bg-red-500';
      case 'cancelled': return 'bg-gray-500';
      default: return 'bg-gray-500';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-500';
      case 'high': return 'bg-orange-500';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  const handleStatusUpdate = async (newStatus: string) => {
    if (!request) return;

    try {
      const { error } = await supabase
        .from('department_requests')
        .update({ status: newStatus })
        .eq('id', request.id);

      if (error) throw error;

      setRequest({ ...request, status: newStatus });
      
      toast({
        title: 'Success',
        description: 'Status updated successfully',
      });

      // Refresh to get updated data
      fetchRequestDetails();
    } catch (error) {
      console.error('Error updating status:', error);
      toast({
        title: 'Error',
        description: 'Failed to update status',
        variant: 'destructive',
      });
    }
  };

  const handleResendNotifications = async () => {
    if (!request) return;
    
    setResendingNotifications(true);
    try {
      const { error } = await supabase.functions.invoke('resend-department-request-notification', {
        body: { requestId: request.id }
      });

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Notifications resent successfully',
      });
      
      // Refresh to show new email logs
      setTimeout(() => {
        fetchRequestDetails();
      }, 1000);
    } catch (error) {
      console.error('Error resending notifications:', error);
      toast({
        title: 'Error',
        description: 'Failed to resend notifications',
        variant: 'destructive',
      });
    } finally {
      setResendingNotifications(false);
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading request details...</div>;
  }

  if (!request) {
    return <div className="text-center py-8">Request not found</div>;
  }

  const departmentLabel = request.department.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase());

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                {(request as any).request_number && (
                  <code className="text-sm font-mono bg-muted px-3 py-1 rounded border">
                    {(request as any).request_number}
                  </code>
                )}
                <CardTitle className="text-2xl">{request.title}</CardTitle>
                {(request as any).from_email && (
                  <Badge variant="outline" className="gap-1">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    Email Request
                  </Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                {departmentLabel} - {request.sub_department}
              </p>
              <div className="flex items-center gap-2 mt-2">
                <Badge className={`${getStatusColor(request.status)} text-white`}>
                  {request.status.replace(/_/g, ' ')}
                </Badge>
                {(userRole === 'manager' || userRole === 'tenant_admin' || userRole === 'super_admin') && (
                  <Select
                    value={request.status}
                    onValueChange={(value: string) => {
                      if (value !== request.status) {
                        handleStatusUpdate(value);
                      }
                    }}
                  >
                    <SelectTrigger className="w-[180px] h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="submitted">Submitted</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="awaiting_information">Awaiting Info</SelectItem>
                      <SelectItem value="on_hold">On Hold</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                )}
                <Badge className={`${getPriorityColor(request.priority)} text-white`}>
                  {request.priority}
                </Badge>
              </div>
            </div>
            <Button 
              variant="outline" 
              size="sm"
              onClick={handleResendNotifications}
              disabled={resendingNotifications}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${resendingNotifications ? 'animate-spin' : ''}`} />
              Resend Notifications
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-muted-foreground">Request Details</h3>
              <div className="space-y-3">
                <div className="flex items-start gap-2">
                  <FileText className="w-4 h-4 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-xs text-muted-foreground">Category</p>
                    <p className="text-sm font-medium">{request.sub_department}</p>
                  </div>
                </div>
                {locationName && (
                  <div className="flex items-start gap-2">
                    <MapPin className="w-4 h-4 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-xs text-muted-foreground">Location</p>
                      <p className="text-sm font-medium">{locationName}</p>
                    </div>
                  </div>
                )}
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-xs text-muted-foreground">Priority</p>
                    <p className="text-sm font-medium capitalize">{request.priority}</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <Calendar className="w-4 h-4 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-xs text-muted-foreground">Submitted</p>
                    <p className="text-sm font-medium">{formatAUDate(request.created_at)}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-muted-foreground">Requester Information</h3>
              <div className="space-y-3">
                <div className="flex items-start gap-2">
                  <User className="w-4 h-4 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-xs text-muted-foreground">Name</p>
                    <p className="text-sm font-medium">{requesterName || 'N/A'}</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <MessageSquare className="w-4 h-4 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-xs text-muted-foreground">Email</p>
                    <p className="text-sm font-medium">{requesterEmail || 'N/A'}</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <FileText className="w-4 h-4 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-xs text-muted-foreground">Company</p>
                    <p className="text-sm font-medium">{companyName || 'N/A'}</p>
                  </div>
                </div>
                {assignedUserName && (
                  <div className="flex items-start gap-2">
                    <User className="w-4 h-4 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-xs text-muted-foreground">Assigned To</p>
                      <p className="text-sm font-medium">{assignedUserName}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {attachments.length > 0 && (
            <>
              <Separator className="my-6" />
              <div>
                <h3 className="text-sm font-semibold text-muted-foreground mb-3">Attachments ({attachments.length})</h3>
                <div className="space-y-2">
                  {attachments.map((attachment) => (
                    <div
                      key={attachment.id}
                      className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <FileText className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{attachment.file_name}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatFileSize(attachment.file_size)} • {formatAUDate(attachment.created_at)}
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDownloadAttachment(attachment)}
                        disabled={downloadingFile === attachment.id}
                      >
                        <Download className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Description Card */}
      {request.description && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Description
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div 
              className="prose prose-sm max-w-none dark:prose-invert"
              dangerouslySetInnerHTML={{ __html: request.description }}
            />
          </CardContent>
        </Card>
      )}

      {/* Activity Section */}
      <RequestActivity requestId={requestId} requestType="department" />

      {/* Email Logs */}
      <EmailLogs requestId={requestId} />
    </div>
  );
}
