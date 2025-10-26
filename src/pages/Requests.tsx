import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Plus, RefreshCw } from 'lucide-react';
import { RequestsList } from '@/components/requests/RequestsList';
import { useAuth } from '@/hooks/useAuth';
import { usePermissions } from '@/hooks/usePermissions';
import { DetailsPanel, DetailsSection, DetailsField } from '@/components/ui/details-panel';
import { TicketQueueManager } from '@/components/requests/admin/TicketQueueManager';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { formatRequestId } from '@/lib/requestUtils';

export default function Requests() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { userRole } = useAuth();
  const { hasPermission } = usePermissions();
  const queryClient = useQueryClient();
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(id || null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const isManagerOrAdmin = ['manager', 'marketing_manager', 'tenant_admin', 'super_admin'].includes(userRole || '');
  const canViewTicketQueue = hasPermission('view_ticket_queue');

  // Fetch selected request details
  const { data: selectedRequest } = useQuery({
    queryKey: ['request', selectedRequestId],
    queryFn: async () => {
      if (!selectedRequestId) return null;
      
      // Fetch request
      const { data: request, error: requestError } = await supabase
        .from('hardware_requests')
        .select('*, request_number')
        .eq('id', selectedRequestId)
        .single();
      
      if (requestError || !request) return null;
      
      // Fetch user profile separately
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, email')
        .eq('id', request.user_id)
        .single();
      
      return { ...request, profile };
    },
    enabled: !!selectedRequestId,
  });

  const handleRequestSelect = (requestId: string) => {
    setSelectedRequestId(requestId);
    navigate(`/requests/hardware/${requestId}`, { replace: true });
  };

  const handleCloseDetails = () => {
    setSelectedRequestId(null);
    navigate('/requests', { replace: true });
  };

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

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await queryClient.invalidateQueries({ queryKey: ['request'] });
    // Give a small delay for visual feedback
    setTimeout(() => setIsRefreshing(false), 500);
  };

  return (
    <div className="flex gap-0 -m-3 md:-m-6">
      <div className="flex-1 min-w-0 p-3 md:p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold">Requests</h1>
            <p className="text-muted-foreground mt-2">
              View and manage all hardware and equipment requests
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="icon" onClick={handleRefresh} disabled={isRefreshing}>
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            </Button>
            <Button onClick={() => navigate('/requests/new')}>
              <Plus className="w-4 h-4 mr-2" />
              New Request
            </Button>
          </div>
        </div>

        <Tabs defaultValue="all" className="space-y-6">
          <TabsList>
            <TabsTrigger value="all">All Requests</TabsTrigger>
            <TabsTrigger value="my-requests">My Requests</TabsTrigger>
            {isManagerOrAdmin && <TabsTrigger value="pending">Pending Approval</TabsTrigger>}
            {canViewTicketQueue && <TabsTrigger value="ticket-queue">Ticket Queue</TabsTrigger>}
          </TabsList>

          <TabsContent value="all" className="space-y-6">
            <RequestsList onRequestSelect={handleRequestSelect} selectedRequestId={selectedRequestId} filterType="all" />
          </TabsContent>

          <TabsContent value="my-requests" className="space-y-6">
            <RequestsList onRequestSelect={handleRequestSelect} selectedRequestId={selectedRequestId} filterType="my-requests" />
          </TabsContent>

          {isManagerOrAdmin && (
            <TabsContent value="pending" className="space-y-6">
              <RequestsList onRequestSelect={handleRequestSelect} selectedRequestId={selectedRequestId} filterType="pending" />
            </TabsContent>
          )}

          {canViewTicketQueue && (
            <TabsContent value="ticket-queue" className="space-y-6">
              <TicketQueueManager />
            </TabsContent>
          )}
        </Tabs>
      </div>

      <DetailsPanel
        isOpen={!!selectedRequestId && !!selectedRequest}
        onClose={handleCloseDetails}
        title="Request Details"
      >
        {selectedRequest && (
          <div className="space-y-6">
            <DetailsSection title="Status">
              <Badge variant={getStatusColor(selectedRequest.status) as any}>
                {selectedRequest.status.replace(/_/g, ' ').toUpperCase()}
              </Badge>
            </DetailsSection>

            <DetailsSection title="Information">
              <DetailsField 
                label="Request ID" 
                value={(selectedRequest as any).request_number ? formatRequestId((selectedRequest as any).request_number) : 'N/A'} 
              />
              <DetailsField label="Title" value={selectedRequest.title} />
              <DetailsField 
                label="Priority" 
                value={<Badge variant="outline">{selectedRequest.priority}</Badge>} 
              />
              <DetailsField 
                label="Total Amount" 
                value={selectedRequest.total_amount ? `$${selectedRequest.total_amount} ${selectedRequest.currency}` : '-'} 
              />
            </DetailsSection>

            <DetailsSection title="Requester">
              <DetailsField 
                label="Name" 
                value={selectedRequest.profile?.full_name || 'Unknown'} 
              />
              <DetailsField 
                label="Email" 
                value={selectedRequest.profile?.email || '-'} 
              />
            </DetailsSection>

            <DetailsSection title="Dates">
              <DetailsField 
                label="Created" 
                value={format(new Date(selectedRequest.created_at), 'PPp')} 
              />
              {selectedRequest.expected_delivery_date && (
                <DetailsField 
                  label="Expected Delivery" 
                  value={format(new Date(selectedRequest.expected_delivery_date), 'PP')} 
                />
              )}
            </DetailsSection>

            {selectedRequest.description && (
              <DetailsSection title="Description">
                <p className="text-sm whitespace-pre-wrap">{selectedRequest.description}</p>
              </DetailsSection>
            )}

            <div className="pt-4">
              <Button 
                onClick={() => navigate(`/requests/hardware/${selectedRequestId}`)} 
                className="w-full"
              >
                View Full Details
              </Button>
            </div>
          </div>
        )}
      </DetailsPanel>
    </div>
  );
}
