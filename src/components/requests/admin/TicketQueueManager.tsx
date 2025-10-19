import { useState } from 'react';
import { Search, Filter, AlertCircle, Clock, CheckCircle2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useTickets, useRequestTypes } from '@/hooks/useTicketingSystem';
import { formatDistanceToNow } from 'date-fns';

const STATUS_COLORS = {
  new: 'bg-blue-500',
  in_progress: 'bg-yellow-500',
  waiting: 'bg-orange-500',
  resolved: 'bg-green-500',
  closed: 'bg-gray-500',
  cancelled: 'bg-red-500',
};

const PRIORITY_COLORS = {
  low: 'bg-gray-400',
  normal: 'bg-blue-400',
  high: 'bg-orange-400',
  urgent: 'bg-red-500',
};

export function TicketQueueManager() {
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [requestTypeFilter, setRequestTypeFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const { data: requestTypes } = useRequestTypes();
  const { data: tickets, isLoading } = useTickets({
    status: statusFilter !== 'all' ? statusFilter : undefined,
    priority: priorityFilter !== 'all' ? priorityFilter : undefined,
    request_type_id: requestTypeFilter !== 'all' ? requestTypeFilter : undefined,
  });

  const filteredTickets = tickets?.filter(ticket => 
    searchQuery === '' || 
    ticket.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
    ticket.reference_code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const stats = {
    total: tickets?.length || 0,
    new: tickets?.filter(t => t.status === 'new').length || 0,
    in_progress: tickets?.filter(t => t.status === 'in_progress').length || 0,
    resolved: tickets?.filter(t => t.status === 'resolved').length || 0,
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold">Ticket Queue</h3>
        <p className="text-sm text-muted-foreground">View and manage all support requests</p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Tickets</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">New</CardTitle>
            <div className={`h-3 w-3 rounded-full ${STATUS_COLORS.new}`} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.new}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">In Progress</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.in_progress}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Resolved</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.resolved}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4">
        <div className="flex-1 min-w-[200px]">
          <Input
            placeholder="Search tickets..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="new">New</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="waiting">Waiting</SelectItem>
            <SelectItem value="resolved">Resolved</SelectItem>
            <SelectItem value="closed">Closed</SelectItem>
          </SelectContent>
        </Select>
        <Select value={priorityFilter} onValueChange={setPriorityFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Priority" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Priority</SelectItem>
            <SelectItem value="low">Low</SelectItem>
            <SelectItem value="normal">Normal</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="urgent">Urgent</SelectItem>
          </SelectContent>
        </Select>
        <Select value={requestTypeFilter} onValueChange={setRequestTypeFilter}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Request Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {requestTypes?.map(rt => (
              <SelectItem key={rt.id} value={rt.id}>{rt.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Tickets List */}
      <div className="space-y-3">
        {isLoading ? (
          <Card>
            <CardContent className="pt-6 text-center text-muted-foreground">
              Loading tickets...
            </CardContent>
          </Card>
        ) : filteredTickets && filteredTickets.length > 0 ? (
          filteredTickets.map((ticket) => (
            <Card key={ticket.id} className="hover:shadow-md transition-shadow cursor-pointer">
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="font-mono text-xs">
                        {ticket.reference_code}
                      </Badge>
                      <div className={`h-2 w-2 rounded-full ${STATUS_COLORS[ticket.status as keyof typeof STATUS_COLORS]}`} />
                      <span className="text-xs text-muted-foreground capitalize">{ticket.status.replace('_', ' ')}</span>
                    </div>
                    <h4 className="font-medium">{ticket.subject}</h4>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span>{ticket.request_type?.name}</span>
                      <span>•</span>
                      <span>{ticket.request_type?.department?.name}</span>
                      {ticket.assigned_user_id && (
                        <>
                          <span>•</span>
                          <span>Assigned to user {ticket.assigned_user_id.slice(0, 8)}...</span>
                        </>
                      )}
                      {ticket.assigned_team && !ticket.assigned_user_id && (
                        <>
                          <span>•</span>
                          <span>Team: {ticket.assigned_team.name}</span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <Badge className={PRIORITY_COLORS[ticket.priority as keyof typeof PRIORITY_COLORS]}>
                      {ticket.priority}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(ticket.created_at), { addSuffix: true })}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <Filter className="mx-auto h-12 w-12 text-muted-foreground" />
                <h3 className="mt-4 text-lg font-semibold">No tickets found</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  Try adjusting your filters or search query
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
