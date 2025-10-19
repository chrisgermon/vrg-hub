import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { formatRequestId } from '@/lib/requestUtils';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function RequestDetail() {
  const { requestNumber } = useParams<{ requestNumber: string }>();
  const navigate = useNavigate();

  // Query to find request by the formatted ID
  const { data: request, isLoading, error } = useQuery({
    queryKey: ['request-by-number', requestNumber],
    queryFn: async () => {
      if (!requestNumber) return null;

      // Convert VRG-XXXX format back to UUID prefix
      const prefix = requestNumber.replace('VRG-', '').toLowerCase();
      
      // Search for requests where UUID starts with this prefix
      const { data, error } = await supabase
        .from('hardware_requests')
        .select(`
          *,
          brands:brand_id(display_name),
          locations:location_id(name)
        `)
        .ilike('id', `${prefix}%`)
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      if (!data) return null;

      // Fetch user profile separately
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, email')
        .eq('id', data.user_id)
        .maybeSingle();

      return { ...data, profile };
    },
    enabled: !!requestNumber,
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
            Request {requestNumber} not found. It may have been deleted or you may not have permission to view it.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

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

      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <h1 className="text-3xl font-bold">{request.title}</h1>
          <Badge variant={getStatusColor(request.status) as any}>
            {getStatusLabel(request.status)}
          </Badge>
        </div>
        <p className="text-muted-foreground">Request {formatRequestId(request.id)}</p>
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">Request ID</p>
              <p className="font-mono">{formatRequestId(request.id)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Title</p>
              <p>{request.title}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Description</p>
              <p>{request.description || 'N/A'}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Status</p>
              <Badge variant={getStatusColor(request.status) as any}>
                {getStatusLabel(request.status)}
              </Badge>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Priority</p>
              <p className="uppercase">{request.priority}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Requester</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">Name</p>
              <p>{request.profile?.full_name || 'N/A'}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Email</p>
              <p>{request.profile?.email || 'N/A'}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Location</p>
              <p>{request.locations?.name || 'N/A'}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Brand</p>
              <p>{request.brands?.display_name || 'N/A'}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Business Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">Business Justification</p>
              <p>{request.business_justification}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Clinic Name</p>
              <p>{request.clinic_name || 'N/A'}</p>
            </div>
            {request.total_amount && (
              <div>
                <p className="text-sm text-muted-foreground">Total Amount</p>
                <p>{request.currency} {request.total_amount.toLocaleString()}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {(request.manager_approved_at || request.admin_approved_at || request.declined_at) && (
          <Card>
            <CardHeader>
              <CardTitle>Approval Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {request.manager_approved_at && (
                <div>
                  <p className="text-sm text-muted-foreground">Manager Approved</p>
                  <p>{format(new Date(request.manager_approved_at), 'PPpp')}</p>
                </div>
              )}
              {request.manager_approval_notes && (
                <div>
                  <p className="text-sm text-muted-foreground">Manager Notes</p>
                  <p>{request.manager_approval_notes}</p>
                </div>
              )}
              {request.admin_approved_at && (
                <div>
                  <p className="text-sm text-muted-foreground">Admin Approved</p>
                  <p>{format(new Date(request.admin_approved_at), 'PPpp')}</p>
                </div>
              )}
              {request.admin_approval_notes && (
                <div>
                  <p className="text-sm text-muted-foreground">Admin Notes</p>
                  <p>{request.admin_approval_notes}</p>
                </div>
              )}
              {request.declined_at && (
                <>
                  <div>
                    <p className="text-sm text-muted-foreground">Declined</p>
                    <p>{format(new Date(request.declined_at), 'PPpp')}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Decline Reason</p>
                    <p>{request.decline_reason || 'N/A'}</p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Timeline</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">Created</p>
              <p>{format(new Date(request.created_at), 'PPpp')}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Last Updated</p>
              <p>{format(new Date(request.updated_at), 'PPpp')}</p>
            </div>
            {request.expected_delivery_date && (
              <div>
                <p className="text-sm text-muted-foreground">Expected Delivery</p>
                <p>{format(new Date(request.expected_delivery_date), 'PP')}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
