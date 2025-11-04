import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { NewsFeedModule } from "@/components/home/NewsFeedModule";
import { PendingApprovalsWidget } from "@/components/home/PendingApprovalsWidget";
import { Button } from "@/components/ui/button";
import { 
  FileText, 
  Calendar, 
  Users, 
  TrendingUp,
  Package,
  Megaphone,
  UserPlus,
  Printer,
  Bell
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompanyFeatures } from "@/hooks/useCompanyFeatures";
import { usePermissions } from "@/hooks/usePermissions";
import { Badge } from "@/components/ui/badge";

export default function Home() {
  const { user, company } = useAuth();
  const navigate = useNavigate();
  const { isFeatureEnabled } = useCompanyFeatures();
  const { hasPermission } = usePermissions();

  // Dashboard stats
  const { data: stats } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      const [hardwareReq, marketingReq, kbPages, profiles] = await Promise.all([
        supabase.from('hardware_requests').select('id', { count: 'exact', head: true }),
        supabase.from('marketing_requests').select('id', { count: 'exact', head: true }),
        supabase.from('kb_pages').select('id', { count: 'exact', head: true }),
        supabase.from('profiles').select('id', { count: 'exact', head: true }),
      ]);

      return {
        hardwareRequests: hardwareReq.count || 0,
        marketingRequests: marketingReq.count || 0,
        kbPages: kbPages.count || 0,
        users: profiles.count || 0,
      };
    },
  });

  // Recent activity
  const { data: recentActivity } = useQuery({
    queryKey: ['recent-activity'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('hardware_requests')
        .select('id, title, status, created_at')
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) throw error;
      return data || [];
    },
  });

  const quickActions = [
    {
      icon: FileText,
      label: "New Request",
      description: "Submit a new request",
      href: "/requests/new",
    },
  ];

  return (
    <div className="flex-1 space-y-6 md:space-y-8 p-4 md:p-6 lg:p-8 mb-16 sm:mb-20 md:mb-24 max-w-7xl mx-auto">
      {/* Hero Section with Quick Action */}
      <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-primary via-primary/95 to-primary/85 p-8 md:p-12 text-white shadow-xl">
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex-1">
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-3">
              Welcome back, {user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User'}
            </h1>
            <p className="text-base md:text-lg text-white/90 max-w-2xl mb-6 md:mb-0">
              {company?.name || 'CrowdHub'} - Your central hub for all requests and services
            </p>
          </div>
          <Button
            size="lg"
            variant="secondary"
            className="shadow-lg hover:shadow-xl transition-all duration-200 bg-white text-primary hover:bg-white/90 font-semibold px-8 py-6 text-lg"
            onClick={() => navigate('/requests/new')}
          >
            <FileText className="mr-2 h-5 w-5" />
            New Request
          </Button>
        </div>
        <div className="absolute top-0 right-0 w-64 h-64 md:w-96 md:h-96 bg-white/10 rounded-full -mr-24 md:-mr-32 -mt-24 md:-mt-32 blur-3xl" />
        <div className="absolute bottom-0 left-0 w-48 h-48 md:w-64 md:h-64 bg-white/5 rounded-full -ml-16 md:-ml-20 -mb-16 md:-mb-20 blur-3xl" />
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        {isFeatureEnabled('hardware_requests') && (
          <Card className="rounded-xl shadow-md hover:shadow-xl transition-all duration-300 border-l-4 border-l-primary">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Hardware Requests
              </CardTitle>
              <div className="p-2 rounded-lg bg-primary/10">
                <Package className="h-5 w-5 text-primary" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-foreground">{stats?.hardwareRequests || 0}</div>
              <p className="text-xs text-muted-foreground mt-1">Total submitted</p>
            </CardContent>
          </Card>
        )}

        {isFeatureEnabled('marketing_requests') && (
          <Card className="rounded-xl shadow-md hover:shadow-xl transition-all duration-300 border-l-4 border-l-secondary">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Marketing Requests
              </CardTitle>
              <div className="p-2 rounded-lg bg-secondary/10">
                <Megaphone className="h-5 w-5 text-secondary" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-foreground">{stats?.marketingRequests || 0}</div>
              <p className="text-xs text-muted-foreground mt-1">Active campaigns</p>
            </CardContent>
          </Card>
        )}

        {isFeatureEnabled('knowledge_base') && (
          <Card className="rounded-xl shadow-md hover:shadow-xl transition-all duration-300 border-l-4 border-l-accent">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Knowledge Base
              </CardTitle>
              <div className="p-2 rounded-lg bg-accent/10">
                <FileText className="h-5 w-5 text-accent-foreground" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-foreground">{stats?.kbPages || 0}</div>
              <p className="text-xs text-muted-foreground mt-1">Articles available</p>
            </CardContent>
          </Card>
        )}

        <Card className="rounded-xl shadow-md hover:shadow-xl transition-all duration-300 border-l-4 border-l-muted">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Team Members
            </CardTitle>
            <div className="p-2 rounded-lg bg-muted">
              <Users className="h-5 w-5 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground">{stats?.users || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">Active users</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* News Feed - Takes 2 columns on large screens */}
        <div className="lg:col-span-2">
          <NewsFeedModule title="Latest News" maxItems={5} />
        </div>

        {/* Sidebar Content */}
        <div className="space-y-6">
          {/* Pending Approvals (if user has permission) */}
          {hasPermission('approve_requests') ? (
            <PendingApprovalsWidget title="Pending Approvals" />
          ) : (
            <Card className="rounded-xl shadow-md hover:shadow-lg transition-shadow duration-200">
              <CardHeader>
                <CardTitle className="text-xl font-bold flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-primary" />
                  Quick Tips
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-start gap-3 p-3 rounded-lg bg-accent/50 hover:bg-accent/70 transition-colors">
                  <FileText className="h-5 w-5 mt-0.5 text-primary flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium">Submit Requests</p>
                    <p className="text-xs text-muted-foreground">Track all your requests in one place</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 rounded-lg bg-accent/50 hover:bg-accent/70 transition-colors">
                  <Users className="h-5 w-5 mt-0.5 text-primary flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium">Team Directory</p>
                    <p className="text-xs text-muted-foreground">Find and connect with colleagues</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 rounded-lg bg-accent/50 hover:bg-accent/70 transition-colors">
                  <FileText className="h-5 w-5 mt-0.5 text-primary flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium">Knowledge Base</p>
                    <p className="text-xs text-muted-foreground">Access help articles and guides</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Recent Activity */}
      {recentActivity && recentActivity.length > 0 && (
        <Card className="rounded-xl shadow-md hover:shadow-lg transition-shadow duration-200">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-2xl font-bold flex items-center gap-2">
                <TrendingUp className="h-6 w-6 text-primary" />
                Recent Activity
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/requests')}
                className="text-primary hover:text-primary/80"
              >
                View All
              </Button>
            </div>
            <p className="text-sm text-muted-foreground mt-1">Latest requests from your organization</p>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentActivity.map((request) => (
                <div
                  key={request.id}
                  className="flex items-center justify-between p-3 rounded-lg hover:bg-accent/50 transition-colors cursor-pointer"
                  onClick={() => navigate(`/requests/${request.id}`)}
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{request.title}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(request.created_at).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric'
                      })}
                    </p>
                  </div>
                  <Badge variant="outline" className="text-xs ml-2 capitalize">
                    {request.status.replace(/_/g, ' ')}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
