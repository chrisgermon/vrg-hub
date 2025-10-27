import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { Loader2, X, StickyNote, UserCog } from 'lucide-react';
import { formatAUDateTimeFull } from '@/lib/dateUtils';
import { RequestStatus } from '@/types/request';
import { RequestComments } from './RequestComments';
import { formatRequestId } from '@/lib/requestUtils';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { format } from 'date-fns';
import { CloseRequestDialog } from './CloseRequestDialog';
import { PrivateNoteDialog } from './PrivateNoteDialog';
import { ReassignDialog } from './ReassignDialog';

interface Request {
  id: string;
  request_number?: number;
  user_id: string;
  title: string;
  description?: string;
  business_justification: string;
  status: RequestStatus;
  priority: string;
  brand_id?: string;
  location_id?: string;
  total_amount?: number;
  currency: string;
  created_at: string;
  updated_at: string;
  brands?: { display_name: string };
  locations?: { name: string };
}

interface RequestDetailProps {
  requestId?: string;
}

export function RequestDetail({ requestId: propRequestId }: RequestDetailProps) {
  const { id: paramId } = useParams<{ id: string }>();
  const id = propRequestId || paramId;
  const [request, setRequest] = useState<Request | null>(null);
  const [loading, setLoading] = useState(true);
  const [closeDialogOpen, setCloseDialogOpen] = useState(false);
  const [noteDialogOpen, setNoteDialogOpen] = useState(false);
  const [reassignDialogOpen, setReassignDialogOpen] = useState(false);
  const { toast } = useToast();
  const { userRole } = useAuth();
  const navigate = useNavigate();

  const isManagerOrAdmin = ['manager', 'marketing_manager', 'tenant_admin', 'super_admin'].includes(userRole || '');

  useEffect(() => {
    if (id) {
      loadRequest();
    }
  }, [id]);

  const loadRequest = async () => {
    try {
      const { data, error } = await supabase
        .from('hardware_requests')
        .select(`
          *,
          request_number,
          brands:brand_id(display_name),
          locations:location_id(name)
        `)
        .eq('id', id)
        .single();

      if (error) throw error;
      setRequest(data as any);
    } catch (error) {
      console.error('Error loading request:', error);
      toast({
        title: 'Error',
        description: 'Failed to load request',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    );
  }

  if (!request) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          Request not found
        </CardContent>
      </Card>
    );
  }

  const getStatusBadge = (status: RequestStatus) => {
    const variants: Record<string, { variant: any; label: string }> = {
      draft: { variant: 'secondary', label: 'Draft' },
      submitted: { variant: 'default', label: 'Submitted' },
      pending_manager_approval: { variant: 'warning', label: 'Pending Manager' },
      pending_admin_approval: { variant: 'warning', label: 'Pending Admin' },
      approved: { variant: 'success', label: 'Approved' },
      declined: { variant: 'destructive', label: 'Declined' },
      ordered: { variant: 'default', label: 'Ordered' },
      delivered: { variant: 'success', label: 'Delivered' },
      cancelled: { variant: 'destructive', label: 'Cancelled' },
      completed: { variant: 'success', label: 'Completed' },
    };

    const config = variants[status] || variants.draft;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const getPriorityBadge = (priority: string) => {
    const variants: Record<string, any> = {
      low: 'secondary',
      medium: 'default',
      high: 'warning',
      urgent: 'destructive',
    };

    return <Badge variant={variants[priority] || 'default'}>{priority}</Badge>;
  };

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Action Buttons Bar */}
      <div className="border-b bg-background mb-4">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center gap-2 overflow-x-auto">
            <Button variant="outline" size="sm" onClick={() => setCloseDialogOpen(true)}>
              <X className="w-4 h-4 mr-2" />
              Close with Response
            </Button>
            <Button variant="outline" size="sm" onClick={() => setNoteDialogOpen(true)}>
              <StickyNote className="w-4 h-4 mr-2" />
              Private Note
            </Button>
            <Button variant="outline" size="sm" onClick={() => setReassignDialogOpen(true)}>
              <UserCog className="w-4 h-4 mr-2" />
              Re-Assign
            </Button>
          </div>
        </div>
      </div>

      {/* Dialogs */}
      <CloseRequestDialog
        open={closeDialogOpen}
        onOpenChange={setCloseDialogOpen}
        requestId={request.id}
        requestType="hardware"
        onSuccess={loadRequest}
      />
      
      <PrivateNoteDialog
        open={noteDialogOpen}
        onOpenChange={setNoteDialogOpen}
        requestId={request.id}
        onSuccess={loadRequest}
      />
      
      <ReassignDialog
        open={reassignDialogOpen}
        onOpenChange={setReassignDialogOpen}
        requestId={request.id}
        requestType="hardware"
        onSuccess={loadRequest}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Email-style Message View */}
        <div className="lg:col-span-2 space-y-4">
          {/* Ticket Header */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-start gap-4 mb-4">
                <Avatar className="h-12 w-12">
                  <AvatarFallback className="bg-primary text-primary-foreground">
                    VR
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <div>
                      <h3 className="font-semibold text-lg">Requester</h3>
                      <p className="text-sm text-muted-foreground">First User Email</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(request.created_at), 'dd/MM/yyyy h:mm a')}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-sm text-muted-foreground">To:</span>
                    <span className="text-sm">support@crowdit.com.au</span>
                  </div>
                </div>
              </div>

              <Separator className="my-4" />

              {/* Request Number */}
              {request.request_number && (
                <div className="mb-4">
                  <span className="font-mono text-sm font-semibold">
                    [{formatRequestId(request.request_number)}]
                  </span>
                </div>
              )}

              {/* Ticket Content */}
              <div className="space-y-4">
                <div>
                  <h2 className="text-xl font-semibold mb-2">{request.title}</h2>
                  {request.description && (
                    <p className="text-muted-foreground whitespace-pre-wrap">{request.description}</p>
                  )}
                </div>

                {request.business_justification && (
                  <div className="bg-muted/50 p-4 rounded-lg">
                    <div className="text-sm whitespace-pre-wrap">
                      {request.business_justification}
                    </div>
                  </div>
                )}

                <div className="flex gap-4 text-sm">
                  {request.brands?.display_name && (
                    <div>
                      <span className="font-medium">Brand: </span>
                      <span>{request.brands.display_name}</span>
                    </div>
                  )}
                  {request.locations?.name && (
                    <div>
                      <span className="font-medium">Location: </span>
                      <span>{request.locations.name}</span>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Comments/Activity Section */}
          <RequestComments requestId={request.id} requestType="hardware" />
        </div>

        {/* Right Sidebar: Ticket Information */}
        <div className="space-y-4">
          {/* Request Information */}
          <Card>
            <CardContent className="p-4 space-y-3">
              <h3 className="font-semibold">Request Information</h3>
              
              <div>
                <p className="text-xs text-muted-foreground">Date Reported</p>
                <p className="text-sm">{format(new Date(request.created_at), 'dd/MM/yyyy h:mm a')}</p>
              </div>

              <div>
                <p className="text-xs text-muted-foreground">Request Type</p>
                <p className="text-sm">Hardware Request</p>
              </div>

              <div>
                <p className="text-xs text-muted-foreground">Status</p>
                {getStatusBadge(request.status)}
              </div>

              <div>
                <p className="text-xs text-muted-foreground">Priority</p>
                {getPriorityBadge(request.priority)}
              </div>

              {request.total_amount && (
                <div>
                  <p className="text-xs text-muted-foreground">Total Amount</p>
                  <p className="text-sm font-semibold">{request.currency} {request.total_amount.toFixed(2)}</p>
                </div>
              )}

              <div>
                <p className="text-xs text-muted-foreground">Team</p>
                <p className="text-sm">Support</p>
              </div>

              <div>
                <p className="text-xs text-muted-foreground">Assigned Agent</p>
                <div className="flex items-center gap-2 mt-1">
                  <Avatar className="h-6 w-6">
                    <AvatarFallback className="text-xs bg-purple-500 text-white">AA</AvatarFallback>
                  </Avatar>
                  <span className="text-sm">Auto Assigned</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* End-User Details */}
          <Card>
            <CardContent className="p-4 space-y-3">
              <h3 className="font-semibold">End-User Details</h3>
              
              {request.brands?.display_name && (
                <div>
                  <p className="text-xs text-muted-foreground">Site</p>
                  <p className="text-sm text-primary">{request.brands.display_name}</p>
                </div>
              )}

              {request.locations?.name && (
                <div>
                  <p className="text-xs text-muted-foreground">Contact Address</p>
                  <p className="text-sm">{request.locations.name}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
