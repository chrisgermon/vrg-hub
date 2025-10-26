import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { Loader2, ArrowLeft, Building2, MapPin } from 'lucide-react';
import { formatAUDateTimeFull } from '@/lib/dateUtils';
import { RequestStatus } from '@/types/request';
import { RequestActivity } from './RequestActivity';
import { formatRequestId } from '@/lib/requestUtils';

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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Button variant="outline" onClick={() => navigate('/requests')}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Requests
        </Button>
        {request.request_number && (
          <span className="font-mono text-sm text-muted-foreground">
            {formatRequestId(request.request_number)}
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content - Left Side */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <div className="space-y-4">
                <div>
                  <CardTitle className="text-2xl mb-2">{request.title}</CardTitle>
                  <div className="flex gap-2 flex-wrap">
                    {getStatusBadge(request.status)}
                    {getPriorityBadge(request.priority)}
                  </div>
                </div>

                {(request.brands || request.locations) && (
                  <div className="flex gap-4 flex-wrap pt-2 border-t">
                    {request.brands && (
                      <div className="flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm font-medium">{request.brands.display_name}</span>
                      </div>
                    )}
                    {request.locations && (
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm">{request.locations.name}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {request.description && (
                <div>
                  <h3 className="font-semibold mb-2">Description</h3>
                  <p className="text-muted-foreground whitespace-pre-wrap">{request.description}</p>
                </div>
              )}

              {request.business_justification && (
                <div>
                  <h3 className="font-semibold mb-2">Details</h3>
                  <div className="text-sm text-muted-foreground whitespace-pre-wrap bg-muted/50 p-4 rounded-lg">
                    {request.business_justification}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Activity Section */}
          <RequestActivity requestId={request.id} requestType="hardware" />
        </div>

        {/* Sidebar - Right Side */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Request Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-1">Created</h4>
                <p className="text-sm">
                  {formatAUDateTimeFull(request.created_at)}
                </p>
              </div>

              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-1">Last Updated</h4>
                <p className="text-sm">
                  {formatAUDateTimeFull(request.updated_at)}
                </p>
              </div>

              {request.total_amount && (
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-1">Total Amount</h4>
                  <p className="text-sm font-semibold">
                    {request.currency} {request.total_amount.toFixed(2)}
                  </p>
                </div>
              )}

              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-1">Priority</h4>
                <div>{getPriorityBadge(request.priority)}</div>
              </div>

              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-1">Current Status</h4>
                <div>{getStatusBadge(request.status)}</div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
