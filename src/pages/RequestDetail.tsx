import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Loader2, Mail, X, UserCog, Edit, Reply } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { formatRequestId, formatRequestIdShort } from '@/lib/requestUtils';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { RequestActivityFeed } from '@/components/requests/RequestActivityFeed';
import { RequestUpdateForm } from '@/components/requests/RequestUpdateForm';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { CloseRequestDialog } from '@/components/requests/CloseRequestDialog';
import { ReassignDialog } from '@/components/requests/ReassignDialog';
import { EditRequestDialog } from '@/components/requests/EditRequestDialog';
import { useAuth } from '@/hooks/useAuth';
import { CCEmailsManager } from '@/components/requests/CCEmailsManager';
import DOMPurify from 'dompurify';

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
  cc_emails?: string[];
};

export default function RequestDetail() {
  const { requestNumber, id, identifier } = useParams<{ requestNumber?: string; id?: string; identifier?: string }>();
  const navigate = useNavigate();
  const requestParam = identifier || requestNumber || id;
  
  const { user, userRole } = useAuth();
  const [closeDialogOpen, setCloseDialogOpen] = useState(false);
  const [reassignDialogOpen, setReassignDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  const isManagerOrAdmin = ['manager', 'marketing_manager', 'tenant_admin', 'super_admin'].includes(userRole || '');

  // Query to find request by the formatted ID or UUID
  const { data: request, isLoading, error } = useQuery<UnifiedRequest | null>({
    queryKey: ['request-by-identifier', requestParam],
    queryFn: async (): Promise<UnifiedRequest | null> => {
      if (!requestParam) return null;

      // Check if it's a UUID (starts with a hex pattern)
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(requestParam);

      // Extract numeric part from identifiers like VRG-23, vrg-00023, etc.
      const numberMatch = requestParam.match(/(\d+)/);
      const targetNumber = numberMatch ? parseInt(numberMatch[1], 10) : NaN;
      
      const { data: ticket, error: ticketError } = await supabase
        .from('tickets')
        .select(`*`)
        .eq(isUUID ? 'id' : 'request_number', isUUID ? requestParam : targetNumber)
        .maybeSingle();

      if (ticket) {
        const [requesterRes, assignedRes, typeRes, categoryRes, brandRes, locationRes] = await Promise.all([
          ticket.user_id ? supabase.from('profiles').select('full_name, email').eq('id', ticket.user_id).maybeSingle() : Promise.resolve({ data: null } as any),
          ticket.assigned_to ? supabase.from('profiles').select('full_name, email').eq('id', ticket.assigned_to).maybeSingle() : Promise.resolve({ data: null } as any),
          (ticket as any).request_type_id ? supabase.from('request_types').select('name').eq('id', (ticket as any).request_type_id).maybeSingle() : Promise.resolve({ data: null } as any),
          (ticket as any).category_id ? supabase.from('request_categories').select('name').eq('id', (ticket as any).category_id).maybeSingle() : Promise.resolve({ data: null } as any),
          (ticket as any).brand_id ? supabase.from('brands').select('display_name').eq('id', (ticket as any).brand_id).maybeSingle() : Promise.resolve({ data: null } as any),
          (ticket as any).location_id ? supabase.from('locations').select('name').eq('id', (ticket as any).location_id).maybeSingle() : Promise.resolve({ data: null } as any),
        ]);

        return {
          ...ticket,
          type: 'department' as const,
          profile: requesterRes.data || undefined,
          assigned_profile: assignedRes.data || undefined,
          request_type: typeRes.data || undefined,
          category: categoryRes.data || undefined,
          brands: brandRes.data ? { display_name: (brandRes.data as any).display_name } : undefined,
          locations: locationRes.data ? { name: (locationRes.data as any).name } : undefined,
        } as any;
      }

      // Fallback to old hardware_requests table
      if (isUUID) {
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

          let assignedProfile: { full_name: string; email: string } | null = null;
          if (hwRequest.assigned_to) {
            const { data: ap } = await supabase
              .from('profiles')
              .select('full_name, email')
              .eq('id', hwRequest.assigned_to)
              .maybeSingle();
            assignedProfile = ap;
          }
          
          return ({ 
            ...hwRequest, 
            type: 'hardware' as const, 
            profile: profile || undefined,
            assigned_profile: assignedProfile || undefined,
          } as any);
        }
      } else {
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

          let assignedProfile: { full_name: string; email: string } | null = null;
          if (hwRequest.assigned_to) {
            const { data: ap } = await supabase
              .from('profiles')
              .select('full_name, email')
              .eq('id', hwRequest.assigned_to)
              .maybeSingle();
            assignedProfile = ap;
          }
          
          return ({ 
            ...hwRequest, 
            type: 'hardware' as const, 
            profile: profile || undefined,
            assigned_profile: assignedProfile || undefined,
          } as any);
        }
      }

      return null;
    },
    enabled: !!requestParam,
  });

  // Redirect UUID-based URLs to pretty request-number URLs when available
  useEffect(() => {
    if (!request || !requestParam) return;
    const hasNum = (request as any).request_number;
    const isUuidPath = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(requestParam);
    if (hasNum && isUuidPath) {
      const pretty = `/request/${formatRequestIdShort((request as any).request_number).toLowerCase()}`;
      navigate(pretty, { replace: true });
    }
  }, [request, requestParam, navigate]);

  const canEdit = isManagerOrAdmin || user?.id === request?.user_id;

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      inbox: 'default',
      open: 'default',
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

  // Helper to detect if content is HTML
  const isHTML = (str: string) => /<[a-z][\s\S]*>/i.test(str);

  // Get the primary content to display (prefer description, avoid duplicates)
  const getPrimaryContent = () => {
    const desc = request.description?.trim();
    const justification = request.business_justification?.trim();
    
    // If both exist and are the same (or one is HTML version of the other), show only one
    if (desc && justification) {
      // Strip HTML tags for comparison
      const descStripped = desc.replace(/<[^>]*>/g, '').trim();
      const justStripped = justification.replace(/<[^>]*>/g, '').trim();
      
      if (descStripped === justStripped) {
        // They're the same content, prefer the one with HTML
        return isHTML(desc) ? desc : (isHTML(justification) ? justification : desc);
      }
    }
    
    // Return whichever exists
    return desc || justification || '';
  };

  const primaryContent = getPrimaryContent();
  const shouldRenderAsHTML = isHTML(primaryContent);

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
            {canEdit && (
              <Button variant="outline" size="sm" onClick={() => setEditDialogOpen(true)}>
                <Edit className="w-4 h-4 mr-2" />
                Edit Request
              </Button>
            )}
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => {
                document.getElementById('update-form')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
              }}
            >
              <Reply className="w-4 h-4 mr-2" />
              Reply
            </Button>
            <Button variant="outline" size="sm" onClick={() => setCloseDialogOpen(true)}>
              <X className="w-4 h-4 mr-2" />
              Close with Response
            </Button>
            <Button variant="outline" size="sm" onClick={() => setReassignDialogOpen(true)}>
              <UserCog className="w-4 h-4 mr-2" />
              Re-Assign
            </Button>
          </div>
        </div>
      </div>

      {/* Dialogs */}
      <EditRequestDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        request={request}
      />
      
      <CloseRequestDialog
        open={closeDialogOpen}
        onOpenChange={setCloseDialogOpen}
        requestId={request.id}
        requestType={request.type}
      />
      
      <ReassignDialog
        open={reassignDialogOpen}
        onOpenChange={setReassignDialogOpen}
        requestId={request.id}
        requestType={request.type}
        onSuccess={() => {
          // Query will be invalidated by the dialog itself
        }}
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
                  </div>

                  {primaryContent && (
                    <div className="bg-muted/50 p-4 rounded-lg">
                      {shouldRenderAsHTML ? (
                        <div 
                          className="text-sm prose prose-sm max-w-none dark:prose-invert"
                          dangerouslySetInnerHTML={{ 
                            __html: DOMPurify.sanitize(primaryContent) 
                          }}
                        />
                      ) : (
                        <div className="text-sm whitespace-pre-wrap">
                          {primaryContent}
                        </div>
                      )}
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
                </div>
              </CardContent>
            </Card>

            {/* Update Form */}
            <div id="update-form">
              <RequestUpdateForm requestId={request.id} />
            </div>
          </div>

          {/* Right Sidebar: Ticket Information */}
          <div className="space-y-4">
            {/* Ticket Information */}
            <Card>
              <CardContent className="p-4 space-y-3">
                <h3 className="font-semibold">Request Information</h3>
                
                <div>
                  <p className="text-xs text-muted-foreground">Request ID</p>
                  <p className="text-sm font-mono">{request.request_number ? formatRequestId(request.request_number) : 'N/A'}</p>
                </div>

                <div>
                  <p className="text-xs text-muted-foreground">Date Reported</p>
                  <p className="text-sm">{format(new Date(request.created_at), 'dd/MM/yyyy h:mm a')}</p>
                </div>

                <div>
                  <p className="text-xs text-muted-foreground">Request Type</p>
                  <p className="text-sm">{(request as any).request_type?.name || 'General Request'}</p>
                </div>

                <div>
                  <p className="text-xs text-muted-foreground">Category</p>
                  <p className="text-sm">{(request as any).category?.name || 'N/A'}</p>
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
                  <p className="text-xs text-muted-foreground">Assigned To</p>
                  {(request as any).assigned_profile ? (
                    <div className="flex items-center gap-2 mt-1">
                      <Avatar className="h-6 w-6">
                        <AvatarFallback className="text-xs bg-purple-500 text-white">
                          {(request as any).assigned_profile.full_name?.substring(0, 2).toUpperCase() || 'NA'}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm">{(request as any).assigned_profile.full_name || 'Assigned'}</span>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">Unassigned</p>
                  )}
                </div>

                <Separator />

                <CCEmailsManager
                  requestId={request.id}
                  requestType={request.type}
                  currentEmails={request.cc_emails || []}
                />
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

                {/* Client Notes removed to avoid duplication with main description */}
              </CardContent>
            </Card>

            {/* Activity Feed */}
            <RequestActivityFeed requestId={request.id} />
          </div>
        </div>
      </div>
    </div>
  );
}
