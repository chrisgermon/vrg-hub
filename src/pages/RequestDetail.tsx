import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Loader2, Mail, X, StickyNote, UserCog } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { formatRequestId } from '@/lib/requestUtils';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { RequestComments } from '@/components/requests/RequestComments';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { CloseRequestDialog } from '@/components/requests/CloseRequestDialog';
import { PrivateNoteDialog } from '@/components/requests/PrivateNoteDialog';
import { ReassignDialog } from '@/components/requests/ReassignDialog';

type UnifiedRequest = {
  id: string;
  request_number?: number;
  title?: string;
  description?: string;
  status: string;
  priority?: string;
  created_at: string;
  updated_at: string;
  user_id: string;
  department?: string;
  form_data?: Record<string, any>;
  business_justification?: string;
  clinic_name?: string;
  total_amount?: number;
  currency?: string;
  expected_delivery_date?: string;
  manager_approved_at?: string;
  manager_approval_notes?: string;
  admin_approved_at?: string;
  admin_approval_notes?: string;
  declined_at?: string;
  decline_reason?: string;
  locations?: { name: string };
  brands?: { display_name: string };
  profile?: { full_name: string; email: string };
  type: 'hardware' | 'department';
};

export default function RequestDetail() {
  const { requestNumber, id } = useParams<{ requestNumber?: string; id?: string }>();
  const navigate = useNavigate();
  const requestParam = requestNumber || id;
  
  const [closeDialogOpen, setCloseDialogOpen] = useState(false);
  const [noteDialogOpen, setNoteDialogOpen] = useState(false);
  const [reassignDialogOpen, setReassignDialogOpen] = useState(false);

  // Query to find request by the formatted ID or UUID
  const { data: request, isLoading, error } = useQuery<UnifiedRequest | null>({
    queryKey: ['request-by-identifier', requestParam],
    queryFn: async (): Promise<UnifiedRequest | null> => {
      if (!requestParam) return null;

      // Check if it's a UUID (starts with a hex pattern)
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(requestParam);

      if (isUUID) {
        // Direct UUID lookup - try department_requests first
        const { data: deptRequest } = await supabase
          .from('department_requests' as any)
          .select('*')
          .eq('id', requestParam)
          .maybeSingle();

        if (deptRequest) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name, email')
            .eq('id', (deptRequest as any).user_id)
            .maybeSingle();
          
          return { 
            ...(deptRequest as any), 
            type: 'department' as const, 
            profile: profile || undefined 
          } as UnifiedRequest;
        }

        // Try hardware_requests
        const { data: hwRequest } = await supabase
          .from('hardware_requests')
          .select(`
            *,
            request_number,
            brands:brand_id(display_name),
            locations:location_id(name)
          `)
          .eq('id', requestParam)
          .maybeSingle();

        if (hwRequest) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name, email')
            .eq('id', hwRequest.user_id)
            .maybeSingle();
          
          return { 
            ...hwRequest, 
            type: 'hardware' as const, 
            profile: profile || undefined 
          };
        }

        return null;
      }

      // Format VRG-##### lookup
      const numericPart = requestParam.replace('VRG-', '');
      const targetNumber = parseInt(numericPart, 10);
      
      // Try hardware requests by request_number
      const { data: hwRequest } = await supabase
        .from('hardware_requests')
        .select(`
          *,
          request_number,
          brands:brand_id(display_name),
          locations:location_id(name)
        `)
        .eq('request_number', targetNumber)
        .maybeSingle();

      if (hwRequest) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name, email')
          .eq('id', hwRequest.user_id)
          .maybeSingle();
        
        return { 
          ...hwRequest, 
          type: 'hardware' as const, 
          profile: profile || undefined 
        };
      }

      return null;
    },
    enabled: !!requestParam,
  });

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      draft: 'secondary',
      submitted: 'default',
      manager_approved: 'default',
      approved: 'success',
      ordered: 'default',
      delivered: 'success',
      declined: 'destructive',
    };
    return colors[status] || 'default';
  };

  const getStatusLabel = (status: string) => {
    return status
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !request) {
    return (
      <div className="container max-w-4xl mx-auto py-8">
        <Button
          variant="ghost"
          onClick={() => navigate('/requests')}
          className="mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Requests
        </Button>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Request {requestParam} not found. It may have been deleted or you may not have permission to view it.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const isDepartmentRequest = request.type === 'department';

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Header with Back Button */}
      <div className="border-b bg-background">
        <div className="container mx-auto px-4 py-4">
          <Button
            variant="ghost"
            onClick={() => navigate('/requests')}
            size="sm"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Requests
          </Button>
        </div>
      </div>

      {/* Action Buttons Bar */}
      <div className="border-b bg-background">
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
        requestType={request.type}
      />
      
      <PrivateNoteDialog
        open={noteDialogOpen}
        onOpenChange={setNoteDialogOpen}
        requestId={request.id}
      />
      
      <ReassignDialog
        open={reassignDialogOpen}
        onOpenChange={setReassignDialogOpen}
        requestId={request.id}
        requestType={request.type}
      />

      {/* Main Content Area */}
      <div className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Email-style Message View */}
          <div className="lg:col-span-2 space-y-4">
            {/* Ticket Header */}
            <Card>
              <CardContent className="p-6">
                <div className="flex items-start gap-4 mb-4">
                  <Avatar className="h-12 w-12">
                    <AvatarFallback className="bg-primary text-primary-foreground">
                      {request.profile?.full_name?.substring(0, 2).toUpperCase() || 'VR'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <div>
                        <h3 className="font-semibold text-lg">{request.profile?.full_name || 'Unknown User'}</h3>
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
                      <span className="text-sm">{request.profile?.email || 'support@crowdit.com.au'}</span>
                    </div>
                  </div>
                </div>

                <Separator className="my-4" />

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
                        {(() => {
                          try {
                            const parsed = JSON.parse(request.business_justification);
                            if (parsed.form_data) {
                              return (
                                <div className="space-y-2">
                                  {Object.entries(parsed.form_data as Record<string, any>).map(([key, value]) => (
                                    <div key={key}>
                                      <span className="font-medium capitalize">{key.replace(/_/g, ' ')}: </span>
                                      <span>{String(value)}</span>
                                    </div>
                                  ))}
                                </div>
                              );
                            }
                            return <pre className="text-sm">{JSON.stringify(parsed, null, 2)}</pre>;
                          } catch {
                            return <p>{request.business_justification}</p>;
                          }
                        })()}
                      </div>
                    </div>
                  )}

                  {!isDepartmentRequest && request.clinic_name && (
                    <div className="text-sm">
                      <span className="font-medium">Clinic: </span>
                      <span>{request.clinic_name}</span>
                    </div>
                  )}

                  {!isDepartmentRequest && (
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
                  )}

                  {isDepartmentRequest && request.department && (
                    <div className="text-sm">
                      <span className="font-medium">Department: </span>
                      <span>{request.department}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Comments/Activity Section */}
            <RequestComments requestId={request.id} requestType={request.type} />
          </div>

          {/* Right Sidebar: Ticket Information */}
          <div className="space-y-4">
            {/* Ticket Information */}
            <Card>
              <CardContent className="p-4 space-y-3">
                <h3 className="font-semibold">Ticket Information</h3>
                
                <div>
                  <p className="text-xs text-muted-foreground">Date Reported</p>
                  <p className="text-sm">{format(new Date(request.created_at), 'dd/MM/yyyy h:mm a')}</p>
                </div>

                <div>
                  <p className="text-xs text-muted-foreground">Ticket Type</p>
                  <p className="text-sm capitalize">{request.type || 'Incident'}</p>
                </div>

                <div>
                  <p className="text-xs text-muted-foreground">Workflow</p>
                  <p className="text-sm">*None*</p>
                </div>

                <div>
                  <p className="text-xs text-muted-foreground">Status</p>
                  <Badge variant={getStatusColor(request.status) as any} className="mt-1">
                    {getStatusLabel(request.status)}
                  </Badge>
                </div>

                <div>
                  <p className="text-xs text-muted-foreground">Priority</p>
                  <Badge variant="outline" className="mt-1 uppercase">
                    {request.priority}
                  </Badge>
                </div>

                {request.total_amount && (
                  <div>
                    <p className="text-xs text-muted-foreground">Total Amount</p>
                    <p className="text-sm font-semibold">{request.currency} {request.total_amount.toLocaleString()}</p>
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
                      <AvatarFallback className="text-xs bg-purple-500 text-white">AM</AvatarFallback>
                    </Avatar>
                    <span className="text-sm">Auto Assigned</span>
                  </div>
                </div>

                <div>
                  <p className="text-xs text-muted-foreground">Category</p>
                  <p className="text-sm">{isDepartmentRequest ? request.department : 'Hardware Request'}</p>
                </div>
              </CardContent>
            </Card>

            {/* End-User Details */}
            <Card>
              <CardContent className="p-4 space-y-3">
                <h3 className="font-semibold">End-User Details</h3>
                
                <div>
                  <p className="text-xs text-muted-foreground">Client</p>
                  <p className="text-sm text-primary">{request.profile?.full_name || 'Unknown'}</p>
                </div>

                {!isDepartmentRequest && request.brands?.display_name && (
                  <div>
                    <p className="text-xs text-muted-foreground">Site</p>
                    <p className="text-sm text-primary">{request.brands.display_name}</p>
                  </div>
                )}

                <div>
                  <p className="text-xs text-muted-foreground">Email Address</p>
                  <p className="text-sm">{request.profile?.email || 'N/A'}</p>
                </div>

                {!isDepartmentRequest && request.locations?.name && (
                  <div>
                    <p className="text-xs text-muted-foreground">Contact Address</p>
                    <p className="text-sm">{request.locations.name}</p>
                  </div>
                )}

                <div>
                  <p className="text-xs text-muted-foreground">Client Notes</p>
                  <div className="text-sm bg-muted/50 p-2 rounded mt-1 min-h-[80px]">
                    {request.description || 'No notes'}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
