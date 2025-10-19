import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, Eye, Clock, CheckCircle, XCircle, Package } from 'lucide-react';
import { formatAUDate } from '@/lib/dateUtils';
import { useAuth } from '@/hooks/useAuth';
import { RequestStatus } from '@/types/request';
import { formatRequestIdShort, formatRequestId } from '@/lib/requestUtils';

interface Request {
  id: string;
  title: string;
  status: RequestStatus;
  priority: string;
  created_at: string;
  user_id: string;
  total_amount?: number;
  currency: string;
}

interface RequestsListProps {
  onRequestSelect?: (requestId: string) => void;
  selectedRequestId?: string | null;
}

export function RequestsList({ onRequestSelect, selectedRequestId }: RequestsListProps) {
  const [requests, setRequests] = useState<Request[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    loadRequests();
  }, []);

  const loadRequests = async () => {
    try {
      const { data, error } = await supabase
        .from('hardware_requests')
        .select(`
          *,
          brands:brand_id(display_name),
          locations:location_id(name)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRequests((data as any) || []);
    } catch (error) {
      console.error('Error loading requests:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: RequestStatus) => {
    const variants: Record<string, { variant: any; icon: any }> = {
      draft: { variant: 'secondary', icon: Clock },
      submitted: { variant: 'default', icon: Package },
      pending_manager_approval: { variant: 'warning', icon: Clock },
      pending_admin_approval: { variant: 'warning', icon: Clock },
      approved: { variant: 'success', icon: CheckCircle },
      declined: { variant: 'destructive', icon: XCircle },
      ordered: { variant: 'default', icon: Package },
      delivered: { variant: 'success', icon: CheckCircle },
      cancelled: { variant: 'destructive', icon: XCircle },
      completed: { variant: 'success', icon: CheckCircle },
    };

    const config = variants[status] || variants.draft;
    const Icon = config.icon;

    return (
      <Badge variant={config.variant as any} className="flex items-center gap-1">
        <Icon className="w-3 h-3" />
        {status.replace(/_/g, ' ')}
      </Badge>
    );
  };

  const getPriorityBadge = (priority: string) => {
    const variants: Record<string, any> = {
      low: 'secondary',
      medium: 'default',
      high: 'warning',
      urgent: 'destructive',
    };

    return (
      <Badge variant={variants[priority] || 'default'}>
        {priority}
      </Badge>
    );
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>All Requests</CardTitle>
      </CardHeader>
      <CardContent>
        {requests.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No requests found. Create your first request to get started.
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Brand</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {requests.map((request) => {
                  const requestNum = formatRequestId(request.id);
                  return (
                    <TableRow 
                      key={request.id}
                      className={`cursor-pointer transition-colors ${selectedRequestId === request.id ? 'bg-muted' : 'hover:bg-muted/50'}`}
                      onClick={() => {
                        if (onRequestSelect) {
                          onRequestSelect(request.id);
                        } else {
                          navigate(`/request/${requestNum}`);
                        }
                      }}
                    >
                      <TableCell className="font-mono text-xs">{formatRequestIdShort(request.id)}</TableCell>
                    <TableCell className="font-medium">{request.title}</TableCell>
                    <TableCell>{(request as any).brands?.display_name || '-'}</TableCell>
                    <TableCell>{(request as any).locations?.name || '-'}</TableCell>
                    <TableCell>{getStatusBadge(request.status)}</TableCell>
                    <TableCell>{getPriorityBadge(request.priority)}</TableCell>
                    <TableCell>
                      {request.total_amount 
                        ? `${request.currency} ${request.total_amount.toFixed(2)}`
                        : '-'
                      }
                    </TableCell>
                    <TableCell>
                      {formatAUDate(request.created_at)}
                    </TableCell>
                    <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => navigate(`/request/${requestNum}`)}
                      >
                        <Eye className="w-4 h-4 mr-2" />
                        View
                      </Button>
                    </TableCell>
                  </TableRow>
                );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
