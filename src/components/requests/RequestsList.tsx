import React, { useState, useEffect } from 'react';
import { formatAUDate } from '@/lib/dateUtils';
import { Eye, Edit, Trash2, FileText, Clock, CheckCircle, XCircle, RefreshCw, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ResizableTable, ResizableTableHeader, ResizableTableBody, ResizableTableRow, ResizableTableHead, ResizableTableCell } from '@/components/ui/table-resizable';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import type { HardwareRequest, RequestStatus, RequestPriority } from '@/types/request';

interface RequestsListProps {
  onEdit?: (request: HardwareRequest) => void;
  onView?: (request: HardwareRequest) => void;
  showAllRequests?: boolean; // For managers/admins to see all requests
}

export function RequestsList({ onEdit, onView, showAllRequests = false }: RequestsListProps) {
  const [requests, setRequests] = useState<HardwareRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortColumn, setSortColumn] = useState<string>('created');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const { toast } = useToast();
  const { profile, userRole } = useAuth();

  useEffect(() => {
    fetchRequests();
  }, [profile, showAllRequests]);

  const fetchRequests = async () => {
    if (!profile) return;

    setLoading(true);
    try {
      let query = supabase
        .from('hardware_requests')
        .select('*');

      // If not showing all requests, filter to user's own requests
      if (!showAllRequests) {
        query = query.eq('user_id', profile.user_id);
      } else if (userRole !== 'super_admin') {
        // For managers/tenant_admins, show company requests only
        query = query.eq('company_id', profile.company_id);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;
      setRequests(data || []);
    } catch (error: any) {
      console.error('Error fetching requests:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch requests',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: RequestStatus) => {
    const statusConfig = {
      draft: { variant: 'secondary' as const, icon: FileText, label: 'Draft' },
      submitted: { variant: 'outline' as const, icon: Clock, label: 'Submitted' },
      pending_manager_approval: { variant: 'secondary' as const, icon: Clock, label: 'Pending Manager' },
      pending_admin_approval: { variant: 'secondary' as const, icon: Clock, label: 'Pending Admin' },
      approved: { variant: 'default' as const, icon: CheckCircle, label: 'Approved' },
      declined: { variant: 'destructive' as const, icon: XCircle, label: 'Declined' },
      ordered: { variant: 'default' as const, icon: CheckCircle, label: 'Ordered' },
      delivered: { variant: 'default' as const, icon: CheckCircle, label: 'Delivered' },
      cancelled: { variant: 'destructive' as const, icon: XCircle, label: 'Cancelled' },
    };

    const config = statusConfig[status];
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className="w-3 h-3" />
        {config.label}
      </Badge>
    );
  };

  const getPriorityBadge = (priority: RequestPriority) => {
    const priorityConfig = {
      low: { variant: 'outline' as const, label: 'Low' },
      medium: { variant: 'secondary' as const, label: 'Medium' },
      high: { variant: 'default' as const, label: 'High' },
      urgent: { variant: 'destructive' as const, label: 'Urgent' },
    };

    const config = priorityConfig[priority];
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const handleDelete = async (requestId: string) => {
    if (!confirm('Are you sure you want to delete this request?')) return;

    try {
      const { error } = await supabase
        .from('hardware_requests')
        .delete()
        .eq('id', requestId);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Request deleted successfully',
      });

      fetchRequests(); // Refresh the list
    } catch (error: any) {
      console.error('Error deleting request:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete request',
        variant: 'destructive',
      });
    }
  };

  const canEdit = (request: HardwareRequest) => {
    // Users can edit their own draft/submitted requests
    if (request.user_id === profile?.user_id && ['draft', 'submitted'].includes(request.status)) {
      return true;
    }
    return false;
  };

  const canDelete = (request: HardwareRequest) => {
    // Users can delete their own draft requests
    return request.user_id === profile?.user_id && request.status === 'draft';
  };

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  const getSortIcon = (column: string) => {
    if (sortColumn !== column) {
      return <ArrowUpDown className="ml-2 h-4 w-4 inline opacity-0 group-hover:opacity-50" />;
    }
    return sortDirection === 'asc' 
      ? <ArrowUp className="ml-2 h-4 w-4 inline" />
      : <ArrowDown className="ml-2 h-4 w-4 inline" />;
  };

  const sortedRequests = [...requests].sort((a, b) => {
    let aVal: any;
    let bVal: any;

    switch (sortColumn) {
      case 'title':
        aVal = a.title.toLowerCase();
        bVal = b.title.toLowerCase();
        break;
      case 'status':
        aVal = a.status;
        bVal = b.status;
        break;
      case 'priority':
        const priorityOrder = { urgent: 4, high: 3, medium: 2, low: 1 };
        aVal = priorityOrder[a.priority as keyof typeof priorityOrder] || 0;
        bVal = priorityOrder[b.priority as keyof typeof priorityOrder] || 0;
        break;
      case 'amount':
        aVal = a.total_amount || 0;
        bVal = b.total_amount || 0;
        break;
      case 'created':
        aVal = new Date(a.created_at).getTime();
        bVal = new Date(b.created_at).getTime();
        break;
      default:
        return 0;
    }

    if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
    if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="text-muted-foreground">Loading requests...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>
            {showAllRequests ? 'All Hardware Requests' : 'My Hardware Requests'}
          </CardTitle>
          <Button variant="outline" size="sm" onClick={fetchRequests}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {requests.length === 0 ? (
          <div className="text-center py-8">
            <FileText className="mx-auto h-12 w-12 text-muted-foreground" />
            <h3 className="mt-4 text-lg font-medium">No requests found</h3>
            <p className="mt-2 text-muted-foreground">
              {showAllRequests 
                ? 'No hardware requests have been submitted yet.'
                : "You haven't created any hardware requests yet."
              }
            </p>
          </div>
        ) : (
          <>
            {/* Mobile Card View */}
            <div className="show-mobile space-y-3">
              {sortedRequests.map((request) => (
                <div key={request.id} className="border rounded-lg p-4 space-y-3">
                  <div>
                    <div className="font-medium mb-1">{request.title}</div>
                    {request.description && (
                      <div className="text-sm text-muted-foreground line-clamp-2">
                        {request.description}
                      </div>
                    )}
                  </div>
                  
                  <div className="flex flex-wrap gap-2">
                    {getStatusBadge(request.status)}
                    {getPriorityBadge(request.priority)}
                  </div>
                  
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">Amount:</span>
                    <span className="font-medium">
                      {request.total_amount 
                        ? `$${request.total_amount.toFixed(2)} ${request.currency}`
                        : 'TBD'
                      }
                    </span>
                  </div>
                  
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">Created:</span>
                    <span>{formatAUDate(request.created_at)}</span>
                  </div>
                  
                  <div className="flex items-center gap-2 pt-2 border-t">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 touch-target"
                      onClick={() => onView?.(request)}
                    >
                      <Eye className="w-4 h-4 mr-2" />
                      View
                    </Button>
                    
                    {canEdit(request) && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="touch-target"
                        onClick={() => onEdit?.(request)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                    )}

                    {canDelete(request) && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="touch-target"
                        onClick={() => handleDelete(request.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop Table View */}
            <div className="hide-mobile overflow-x-auto rounded-lg border">
              <ResizableTable storageKey="hardware-requests-table">
                <ResizableTableHeader>
                  <ResizableTableRow>
                    <ResizableTableHead 
                      columnId="title" 
                      minWidth={200} 
                      maxWidth={500}
                      className="cursor-pointer hover:bg-muted/50 group"
                      onClick={() => handleSort('title')}
                    >
                      Title{getSortIcon('title')}
                    </ResizableTableHead>
                    <ResizableTableHead 
                      columnId="status" 
                      minWidth={120} 
                      maxWidth={200}
                      className="cursor-pointer hover:bg-muted/50 group"
                      onClick={() => handleSort('status')}
                    >
                      Status{getSortIcon('status')}
                    </ResizableTableHead>
                    <ResizableTableHead 
                      columnId="priority" 
                      minWidth={100} 
                      maxWidth={150}
                      className="cursor-pointer hover:bg-muted/50 group"
                      onClick={() => handleSort('priority')}
                    >
                      Priority{getSortIcon('priority')}
                    </ResizableTableHead>
                    <ResizableTableHead 
                      columnId="amount" 
                      minWidth={120} 
                      maxWidth={200}
                      className="cursor-pointer hover:bg-muted/50 group"
                      onClick={() => handleSort('amount')}
                    >
                      Amount{getSortIcon('amount')}
                    </ResizableTableHead>
                    <ResizableTableHead 
                      columnId="created" 
                      minWidth={120} 
                      maxWidth={200}
                      className="cursor-pointer hover:bg-muted/50 group"
                      onClick={() => handleSort('created')}
                    >
                      Created{getSortIcon('created')}
                    </ResizableTableHead>
                    <ResizableTableHead columnId="actions" minWidth={120} maxWidth={200}>Actions</ResizableTableHead>
                  </ResizableTableRow>
                </ResizableTableHeader>
                <ResizableTableBody>
                  {sortedRequests.map((request) => (
                    <ResizableTableRow key={request.id}>
                      <ResizableTableCell>
                        <div>
                          <div className="font-medium">{request.title}</div>
                          {request.description && (
                            <div className="text-sm text-muted-foreground line-clamp-1">
                              {request.description}
                            </div>
                          )}
                        </div>
                      </ResizableTableCell>
                      <ResizableTableCell>{getStatusBadge(request.status)}</ResizableTableCell>
                      <ResizableTableCell>{getPriorityBadge(request.priority)}</ResizableTableCell>
                      <ResizableTableCell>
                        {request.total_amount 
                          ? `$${request.total_amount.toFixed(2)} ${request.currency}`
                          : 'TBD'
                        }
                      </ResizableTableCell>
                      <ResizableTableCell>
                        {formatAUDate(request.created_at)}
                      </ResizableTableCell>
                      <ResizableTableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onView?.(request)}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          
                          {canEdit(request) && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => onEdit?.(request)}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                          )}

                          {canDelete(request) && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(request.id)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </ResizableTableCell>
                    </ResizableTableRow>
                  ))}
                </ResizableTableBody>
              </ResizableTable>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}