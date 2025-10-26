import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Loader2,
  Eye,
  Clock,
  CheckCircle,
  XCircle,
  Package,
  Search,
  ArrowUpDown,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { formatAUDate } from '@/lib/dateUtils';
import { useAuth } from '@/hooks/useAuth';
import { RequestStatus } from '@/types/request';
import { formatRequestIdShort, formatRequestId } from '@/lib/requestUtils';
import { useToast } from '@/hooks/use-toast';

interface Request {
  id: string;
  request_number?: number;
  title: string;
  status: RequestStatus;
  priority: string;
  created_at: string;
  user_id: string;
  manager_id?: string | null;
  admin_id?: string | null;
}

interface RequestsListProps {
  onRequestSelect?: (requestId: string) => void;
  selectedRequestId?: string | null;
  filterType?: 'all' | 'my-requests' | 'pending';
}

interface RequestQueryResult {
  items: Request[];
  total: number;
}

export function RequestsList({ onRequestSelect, selectedRequestId, filterType = 'all' }: RequestsListProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'date' | 'priority' | 'status'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(0);
  const navigate = useNavigate();
  const { user, userRole } = useAuth();
  const { toast } = useToast();

  const pageSize = 25;

  useEffect(() => {
    setPage(0);
  }, [filterType, user?.id, userRole]);

  const isManagerOrAdmin = useMemo(
    () => ['manager', 'marketing_manager', 'tenant_admin', 'super_admin'].includes(userRole || ''),
    [userRole]
  );

  const {
    data,
    isLoading,
    isFetching,
    refetch,
  } = useQuery<RequestQueryResult>({
    queryKey: [
      'hardware-requests',
      {
        filterType,
        userId: user?.id ?? null,
        role: userRole,
        searchQuery,
        sortBy,
        sortOrder,
        page,
        pageSize,
      },
    ],
    queryFn: async () => {
      if (filterType === 'my-requests' && !user?.id) {
        return { items: [], total: 0 };
      }

      if (filterType === 'pending' && !isManagerOrAdmin) {
        return { items: [], total: 0 };
      }

      const from = page * pageSize;
      const to = from + pageSize - 1;

      let query = supabase
        .from('hardware_requests')
        .select('id, request_number, title, status, priority, created_at, user_id, manager_id, admin_id', { count: 'exact' });

      if (filterType === 'my-requests' && user?.id) {
        query = query.eq('user_id', user.id);
      } else if (filterType === 'pending' && isManagerOrAdmin) {
        query = query.in('status', ['submitted', 'pending_manager_approval', 'pending_admin_approval']);
      }

      const trimmedQuery = searchQuery.trim();
      if (trimmedQuery) {
        const sanitized = trimmedQuery.replace(/,/g, '');
        const orFilters: string[] = [
          `title.ilike.%${sanitized}%`,
          `status.ilike.%${sanitized}%`,
          `priority.ilike.%${sanitized}%`,
        ];

        const numericSearch = Number.parseInt(sanitized.replace(/[^0-9]/g, ''), 10);
        if (!Number.isNaN(numericSearch)) {
          orFilters.push(`request_number.eq.${numericSearch}`);
        }

        query = query.or(orFilters.join(','));
      }

      const sortColumnMap: Record<typeof sortBy, string> = {
        date: 'created_at',
        priority: 'priority',
        status: 'status',
      };

      query = query.order(sortColumnMap[sortBy], { ascending: sortOrder === 'asc' });

      const { data: results, error, count } = await query.range(from, to);

      if (error) {
        throw error;
      }

      return {
        items: (results as Request[]) ?? [],
        total: count ?? ((results as Request[])?.length ?? 0),
      };
    },
    keepPreviousData: true,
    onError: (error: any) => {
      console.error('Error loading requests:', error);
      toast({
        title: 'Failed to load requests',
        description: error.message ?? 'An unexpected error occurred while fetching requests.',
        variant: 'destructive',
      });
    },
  });

  const requests = data?.items ?? [];
  const total = data?.total ?? 0;
  const pageCount = total > 0 ? Math.ceil(total / pageSize) : 1;

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

  if (isLoading && !data) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  const title =
    filterType === 'my-requests'
      ? 'My Requests'
      : filterType === 'pending'
        ? 'Pending Approval'
        : 'All Requests';

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by title, ID, status, or priority..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPage(0);
              }}
              className="pl-9"
            />
          </div>
          <div className="flex gap-2">
            <Select
              value={sortBy}
              onValueChange={(value: any) => {
                setSortBy(value);
                setPage(0);
              }}
            >
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
              onClick={() => {
                setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                setPage(0);
              }}
              title={`Sort ${sortOrder === 'asc' ? 'descending' : 'ascending'}`}
            >
              <ArrowUpDown className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => refetch()}
              disabled={isFetching}
              title="Refresh requests"
            >
              <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>

        {requests.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            {searchQuery ? 'No requests match your search.' : 'No requests found. Create your first request to get started.'}
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Assigned To</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {requests.map((request) => {
                  const requestNum = request.request_number
                    ? formatRequestId(request.request_number)
                    : `request-${request.id}`;

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
                      <TableCell className="font-mono text-xs">
                        {request.request_number ? formatRequestIdShort(request.request_number) : 'N/A'}
                      </TableCell>
                      <TableCell className="font-medium">{request.title}</TableCell>
                      <TableCell>{getStatusBadge(request.status)}</TableCell>
                      <TableCell>{getPriorityBadge(request.priority)}</TableCell>
                      <TableCell>{request.manager_id || request.admin_id ? 'Assigned' : '-'}</TableCell>
                      <TableCell>{formatAUDate(new Date(request.created_at))}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(event) => {
                            event.stopPropagation();
                            if (onRequestSelect) {
                              onRequestSelect(request.id);
                            } else {
                              navigate(`/request/${requestNum}`);
                            }
                          }}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}

        {total > pageSize && (
          <div className="flex items-center justify-between mt-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((prev) => Math.max(prev - 1, 0))}
              disabled={page === 0 || isFetching}
            >
              <ChevronLeft className="mr-2 h-4 w-4" />
              Previous
            </Button>
            <div className="text-sm text-muted-foreground">
              Page {page + 1} of {pageCount}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((prev) => Math.min(prev + 1, pageCount - 1))}
              disabled={page >= pageCount - 1 || isFetching}
            >
              Next
              <ChevronRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
