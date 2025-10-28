import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, Eye, Clock, CheckCircle, XCircle, Package, Search, ArrowUpDown, RefreshCw, Inbox } from 'lucide-react';
import { formatAUDate } from '@/lib/dateUtils';
import { useAuth } from '@/hooks/useAuth';
import { formatRequestIdShort, formatRequestId } from '@/lib/requestUtils';

interface UnifiedRequest {
  id: string;
  request_number?: number;
  title: string;
  status: string;
  priority: string;
  created_at: string;
  user_id: string;
  assigned_to?: string;
  type: 'hardware' | 'ticket';
}

interface UnifiedRequestsListProps {
  filterType?: 'all' | 'my-requests' | 'pending';
}

export function UnifiedRequestsList({ filterType = 'all' }: UnifiedRequestsListProps) {
  const [requests, setRequests] = useState<UnifiedRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'date' | 'priority' | 'status'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [typeFilter, setTypeFilter] = useState<'all' | 'hardware' | 'ticket'>('all');
  const navigate = useNavigate();
  const { user, userRole } = useAuth();

  useEffect(() => {
    loadRequests();
  }, [filterType, user, typeFilter]);

  const loadRequests = async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      
      const isManagerOrAdmin = ['manager', 'marketing_manager', 'tenant_admin', 'super_admin'].includes(userRole || '');
      
      // Fetch from unified tickets table - using any to avoid deep type inference
      let queryBuilder: any = supabase
        .from('tickets')
        .select('id, request_number, title, status, priority, created_at, user_id, assigned_to, source');

      // Apply filters
      if (filterType === 'my-requests') {
        queryBuilder = queryBuilder.eq('user_id', user?.id);
      } else if (filterType === 'pending' && isManagerOrAdmin) {
        queryBuilder = queryBuilder.in('status', ['inbox', 'in_progress', 'awaiting_information', 'submitted', 'pending_manager_approval', 'pending_admin_approval']);
      }

      // Apply source filter
      if (typeFilter === 'hardware') {
        queryBuilder = queryBuilder.eq('source', 'hardware_request');
      } else if (typeFilter === 'ticket') {
        queryBuilder = queryBuilder.in('source', ['ticket', 'form']);
      }

      const { data, error } = await queryBuilder;

      if (error) throw error;

      // Tag requests based on source
      const allRequests: UnifiedRequest[] = (data || []).map((r: any) => ({
        id: r.id,
        request_number: r.request_number,
        title: r.title,
        status: r.status,
        priority: r.priority,
        created_at: r.created_at,
        user_id: r.user_id,
        assigned_to: r.assigned_to,
        type: r.source === 'hardware_request' ? ('hardware' as const) : ('ticket' as const)
      }));

      // Sort by created_at descending initially
      allRequests.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      setRequests(allRequests);
    } catch (error) {
      console.error('Error loading requests:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: any; icon: any }> = {
      draft: { variant: 'secondary', icon: Clock },
      submitted: { variant: 'default', icon: Package },
      inbox: { variant: 'default', icon: Inbox },
      in_progress: { variant: 'default', icon: Clock },
      awaiting_information: { variant: 'warning', icon: Clock },
      on_hold: { variant: 'warning', icon: Clock },
      pending_manager_approval: { variant: 'warning', icon: Clock },
      pending_admin_approval: { variant: 'warning', icon: Clock },
      approved: { variant: 'success', icon: CheckCircle },
      completed: { variant: 'success', icon: CheckCircle },
      declined: { variant: 'destructive', icon: XCircle },
      ordered: { variant: 'default', icon: Package },
      delivered: { variant: 'success', icon: CheckCircle },
      cancelled: { variant: 'destructive', icon: XCircle },
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

  const filteredAndSortedRequests = useMemo(() => {
    let filtered = [...requests];

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((request) => {
        const requestId = request.request_number ? formatRequestId(request.request_number) : '';
        return (
          request.title.toLowerCase().includes(query) ||
          requestId.toLowerCase().includes(query) ||
          request.status.toLowerCase().includes(query) ||
          request.priority.toLowerCase().includes(query)
        );
      });
    }

    filtered.sort((a, b) => {
      let comparison = 0;

      switch (sortBy) {
        case 'date':
          comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
          break;
        case 'priority': {
          const priorityOrder = { urgent: 4, high: 3, medium: 2, low: 1 };
          comparison = (priorityOrder[a.priority as keyof typeof priorityOrder] || 0) - 
                      (priorityOrder[b.priority as keyof typeof priorityOrder] || 0);
          break;
        }
        case 'status':
          comparison = a.status.localeCompare(b.status);
          break;
      }

      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return filtered;
  }, [requests, searchQuery, sortBy, sortOrder]);

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
        <div className="flex flex-col gap-4 mb-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by title, ID, status, or priority..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex gap-2">
              <Select value={typeFilter} onValueChange={(value: any) => setTypeFilter(value)}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="hardware">Hardware</SelectItem>
                  <SelectItem value="ticket">Tickets</SelectItem>
                </SelectContent>
              </Select>
              <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="date">Date Created</SelectItem>
                  <SelectItem value="priority">Priority</SelectItem>
                  <SelectItem value="status">Status</SelectItem>
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                title={`Sort ${sortOrder === 'asc' ? 'descending' : 'ascending'}`}
              >
                <ArrowUpDown className="w-4 h-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={() => loadRequests(true)}
                disabled={refreshing}
                title="Refresh requests"
              >
                <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </div>
        </div>

        {filteredAndSortedRequests.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            {searchQuery ? 'No requests match your search.' : 'No requests found. Create your first request to get started.'}
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAndSortedRequests.map((request) => {
                  const requestNum = request.request_number 
                    ? formatRequestId(request.request_number)
                    : `request-${request.id}`;
                  return (
                    <TableRow 
                      key={request.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => navigate(`/request/${requestNum}`)}
                    >
                      <TableCell className="font-mono text-xs">
                        {request.request_number ? formatRequestIdShort(request.request_number) : 'N/A'}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize">
                          {request.type}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium">{request.title}</TableCell>
                      <TableCell>{getStatusBadge(request.status)}</TableCell>
                      <TableCell>{getPriorityBadge(request.priority)}</TableCell>
                      <TableCell>{formatAUDate(request.created_at)}</TableCell>
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
