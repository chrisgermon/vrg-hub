import { useState } from 'react';
import { ChevronLeft, ChevronRight, Clock, Bell, FileText, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Link } from 'react-router-dom';
import { formatAUDate } from '@/lib/dateUtils';

export function RightSidebar() {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const { user, userRole } = useAuth();

  // Fetch pending approvals
  const { data: pendingApprovals = [] } = useQuery({
    queryKey: ['pending-approvals', user?.id],
    queryFn: async () => {
      if (!user?.id || !['manager', 'marketing_manager', 'tenant_admin', 'super_admin'].includes(userRole || '')) {
        return [];
      }

      const { data, error } = await supabase
        .from('hardware_requests')
        .select('id, title, status, priority, created_at')
        .in('status', ['submitted', 'manager_approved'])
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id && ['manager', 'marketing_manager', 'tenant_admin', 'super_admin'].includes(userRole || ''),
  });

  // Fetch recent requests
  const { data: recentRequests = [] } = useQuery({
    queryKey: ['recent-requests', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from('hardware_requests')
        .select('id, title, status, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });

  // Fetch system announcements
  const { data: announcements = [] } = useQuery({
    queryKey: ['system-announcements'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('news_articles')
        .select('id, title, published_at')
        .eq('is_published', true)
        .order('published_at', { ascending: false })
        .limit(3);

      if (error) throw error;
      return data || [];
    },
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'submitted':
        return 'bg-blue-100 text-blue-800';
      case 'manager_approved':
        return 'bg-yellow-100 text-yellow-800';
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'declined':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (isCollapsed) {
    return (
      <div className="w-12 border-l bg-card shadow-sm flex flex-col items-center pt-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsCollapsed(false)}
          className="w-8 h-8"
        >
          <ChevronLeft className="w-4 h-4" />
        </Button>
      </div>
    );
  }

  return (
    <aside className="w-80 border-l bg-card shadow-sm flex flex-col">
      <div className="h-16 border-b flex items-center justify-between px-4">
        <h2 className="font-semibold text-sm">Quick View</h2>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsCollapsed(true)}
          className="w-8 h-8"
        >
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4">
          {/* User Shortcuts */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <FileText className="w-4 h-4" />
                Quick Actions
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Link to="/requests">
                <Button variant="outline" size="sm" className="w-full justify-start">
                  <FileText className="w-4 h-4 mr-2" />
                  My Requests
                </Button>
              </Link>
              {['manager', 'marketing_manager', 'tenant_admin', 'super_admin'].includes(userRole || '') && (
                <Link to="/approvals">
                  <Button variant="outline" size="sm" className="w-full justify-start">
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Approvals
                  </Button>
                </Link>
              )}
            </CardContent>
          </Card>

          {/* Pending Approvals */}
          {pendingApprovals.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  Pending Approvals
                  <Badge variant="secondary" className="ml-auto">
                    {pendingApprovals.length}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {pendingApprovals.map((request: any) => (
                  <Link key={request.id} to={`/requests/${request.id}`}>
                    <div className="p-2 rounded-md hover:bg-accent cursor-pointer transition-colors">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-xs font-medium line-clamp-2">{request.title}</p>
                        <Badge variant="secondary" className={`text-xs shrink-0 ${getStatusColor(request.status)}`}>
                          {request.status.replace('_', ' ')}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatAUDate(request.created_at)}
                      </p>
                    </div>
                  </Link>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Recent Activity */}
          {recentRequests.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Recent Requests
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {recentRequests.map((request: any) => (
                  <Link key={request.id} to={`/requests/${request.id}`}>
                    <div className="p-2 rounded-md hover:bg-accent cursor-pointer transition-colors">
                      <p className="text-xs font-medium line-clamp-2">{request.title}</p>
                      <div className="flex items-center justify-between mt-1">
                        <p className="text-xs text-muted-foreground">
                          {formatAUDate(request.created_at)}
                        </p>
                        <Badge variant="secondary" className={`text-xs ${getStatusColor(request.status)}`}>
                          {request.status.replace('_', ' ')}
                        </Badge>
                      </div>
                    </div>
                  </Link>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Announcements */}
          {announcements.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Bell className="w-4 h-4" />
                  Latest Announcements
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {announcements.map((announcement: any) => (
                  <Link key={announcement.id} to={`/article/${announcement.id}`}>
                    <div className="p-2 rounded-md hover:bg-accent cursor-pointer transition-colors">
                      <p className="text-xs font-medium line-clamp-2">{announcement.title}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatAUDate(announcement.published_at)}
                      </p>
                    </div>
                  </Link>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      </ScrollArea>
    </aside>
  );
}
