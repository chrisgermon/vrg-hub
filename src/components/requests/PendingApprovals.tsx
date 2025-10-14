import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { CheckCircle, XCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface PendingApprovalsProps {
  refreshTrigger?: number;
}

export function PendingApprovals({ refreshTrigger }: PendingApprovalsProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const { data: pendingRequests = [], isLoading } = useQuery({
    queryKey: ['pending-approvals', user?.id, refreshTrigger],
    queryFn: async () => {
      const { data: requests, error } = await supabase
        .from('hardware_requests')
        .select('*')
        .in('status', ['pending_manager_approval', 'pending_admin_approval'])
        .order('created_at', { ascending: false});

      if (error) throw error;
      if (!requests) return [];

      // Fetch related data
      const userIds = [...new Set(requests.map(r => r.user_id))];
      const brandIds = [...new Set(requests.map(r => r.brand_id).filter(Boolean))];
      const locationIds = [...new Set(requests.map(r => r.location_id).filter(Boolean))];

      const [profiles, brands, locations] = await Promise.all([
        userIds.length > 0 ? supabase.from('profiles').select('id, full_name, email').in('id', userIds) : { data: [] },
        brandIds.length > 0 ? supabase.from('brands').select('id, name').in('id', brandIds) : { data: [] },
        locationIds.length > 0 ? supabase.from('locations').select('id, name').in('id', locationIds) : { data: [] },
      ]);

      // Map the data
      return requests.map(request => ({
        ...request,
        requester: profiles.data?.find(p => p.id === request.user_id),
        brand: brands.data?.find(b => b.id === request.brand_id),
        location: locations.data?.find(l => l.id === request.location_id),
      }));
    },
    enabled: !!user?.id,
  });

  const updateRequestStatus = useMutation({
    mutationFn: async ({ requestId, status, notes }: { requestId: string; status: string; notes?: string }) => {
      const { error } = await supabase
        .from('hardware_requests')
        .update({
          status,
          [`${status.includes('admin') ? 'admin' : 'manager'}_approval_notes`]: notes,
          [`${status.includes('admin') ? 'admin' : 'manager'}_approved_at`]: status.includes('approved') ? new Date().toISOString() : null,
        })
        .eq('id', requestId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending-approvals'] });
      toast.success('Request updated');
    },
    onError: (error) => {
      toast.error('Failed to update request');
      console.error(error);
    },
  });

  const handleApprove = (requestId: string) => {
    const request = pendingRequests.find(r => r.id === requestId);
    if (!request) return;

    const newStatus = request.status === 'pending_manager_approval' 
      ? 'pending_admin_approval' 
      : 'approved';

    updateRequestStatus.mutate({ requestId, status: newStatus });
  };

  const handleDecline = (requestId: string) => {
    updateRequestStatus.mutate({ 
      requestId, 
      status: 'declined',
      notes: 'Request declined'
    });
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Pending Approvals</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Loading...</p>
        </CardContent>
      </Card>
    );
  }

  if (pendingRequests.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Pending Approvals</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">No pending approvals</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Pending Approvals ({pendingRequests.length})</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {pendingRequests.map((request) => (
            <div key={request.id} className="border rounded-lg p-4 space-y-3">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <h4 className="font-medium">{request.title}</h4>
                  <p className="text-sm text-muted-foreground">
                    Requested by: {request.requester?.full_name || request.requester?.email}
                  </p>
                  {request.brand && (
                    <p className="text-sm text-muted-foreground">
                      Brand: {request.brand.name}
                    </p>
                  )}
                  {request.location && (
                    <p className="text-sm text-muted-foreground">
                      Location: {request.location.name}
                    </p>
                  )}
                </div>
                <Badge variant={request.priority === 'high' ? 'destructive' : 'secondary'}>
                  {request.priority}
                </Badge>
              </div>

              {request.description && (
                <p className="text-sm">{request.description}</p>
              )}

              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={() => handleApprove(request.id)}
                  disabled={updateRequestStatus.isPending}
                >
                  <CheckCircle className="h-4 w-4 mr-1" />
                  Approve
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => handleDecline(request.id)}
                  disabled={updateRequestStatus.isPending}
                >
                  <XCircle className="h-4 w-4 mr-1" />
                  Decline
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => navigate(`/requests/${request.id}`)}
                >
                  View Details
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}