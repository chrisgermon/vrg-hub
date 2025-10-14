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

export default function Home() {
  const { user, company } = useAuth();
  const navigate = useNavigate();
  const { isFeatureEnabled } = useCompanyFeatures();
  const { hasPermission } = usePermissions();

  // Fetch unread notifications count
  const { data: unreadNotifications } = useQuery({
    queryKey: ["unread-notifications-count", user?.id],
    queryFn: async () => {
      if (!user?.id) return 0;
      
      const { count, error } = await supabase
        .from("notifications")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .is("read_at", null);

      if (error) throw error;
      return count || 0;
    },
    enabled: !!user?.id,
  });

  // Fetch recent request count
  const { data: recentRequestsCount } = useQuery({
    queryKey: ["recent-requests-count", company?.id, user?.id],
    queryFn: async () => {
      if (!company?.id || !user?.id) return 0;
      
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { count, error } = await supabase
        .from("hardware_requests")
        .select("*", { count: "exact", head: true })
        .eq("company_id", company.id)
        .eq("user_id", user.id)
        .gte("created_at", thirtyDaysAgo.toISOString());

      if (error) throw error;
      return count || 0;
    },
    enabled: !!company?.id && !!user?.id,
  });

  type FeatureKey = 
    | 'hardware_requests'
    | 'toner_requests'
    | 'user_accounts'
    | 'marketing_requests'
    | 'department_requests'
    | 'monthly_newsletter'
    | 'modality_management'
    | 'print_ordering'
    | 'front_chat'
    | 'fax_campaigns';

  const quickActions: Array<{
    icon: React.ComponentType<any>;
    label: string;
    description: string;
    href: string;
    color: string;
    bgColor: string;
    featureKey?: FeatureKey;
  }> = [
    {
      icon: FileText,
      label: "New Request",
      description: "Submit a new request",
      href: "/requests/new",
      color: "text-blue-600",
      bgColor: "bg-blue-50 dark:bg-blue-950/30",
    },
    {
      icon: Package,
      label: "Hardware Request",
      description: "Request equipment",
      href: "/hardware/new",
      color: "text-purple-600",
      bgColor: "bg-purple-50 dark:bg-purple-950/30",
      featureKey: "hardware_requests",
    },
    {
      icon: Megaphone,
      label: "Marketing Request",
      description: "Marketing campaigns",
      href: "/marketing/new",
      color: "text-pink-600",
      bgColor: "bg-pink-50 dark:bg-pink-950/30",
      featureKey: "marketing_requests",
    },
    {
      icon: Printer,
      label: "Toner Request",
      description: "Order printer supplies",
      href: "/toner/new",
      color: "text-green-600",
      bgColor: "bg-green-50 dark:bg-green-950/30",
      featureKey: "toner_requests",
    },
    {
      icon: UserPlus,
      label: "User Account",
      description: "New user account",
      href: "/user-accounts/new",
      color: "text-orange-600",
      bgColor: "bg-orange-50 dark:bg-orange-950/30",
      featureKey: "user_accounts" as const,
    },
    {
      icon: Users,
      label: "Company Directory",
      description: "View team members",
      href: "/directory",
      color: "text-cyan-600",
      bgColor: "bg-cyan-50 dark:bg-cyan-950/30",
    },
  ];

  const visibleActions = quickActions.filter(
    action => !action.featureKey || isFeatureEnabled(action.featureKey)
  );

  return (
    <div className="flex-1 space-y-4 md:space-y-6 p-3 md:p-6 lg:p-8 mb-16 sm:mb-20 md:mb-32 max-w-7xl mx-auto">
      {/* Hero Section */}
      <div className="relative rounded-xl md:rounded-2xl overflow-hidden bg-gradient-to-br from-primary via-primary/90 to-primary/80 p-6 md:p-8 lg:p-12 text-white shadow-2xl">
        <div className="relative z-10">
          <h1 className="text-2xl md:text-3xl lg:text-4xl xl:text-5xl font-bold mb-2 md:mb-3">
            Welcome back, {user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User'}
          </h1>
          <p className="text-sm md:text-base lg:text-lg xl:text-xl text-white/90 max-w-2xl">
            {company?.name || 'CrowdHub'} - Your central hub for all requests and services
          </p>
        </div>
        <div className="absolute top-0 right-0 w-48 h-48 md:w-96 md:h-96 bg-white/10 rounded-full -mr-16 md:-mr-32 -mt-16 md:-mt-32" />
        <div className="absolute bottom-0 left-0 w-32 h-32 md:w-64 md:h-64 bg-white/5 rounded-full -ml-10 md:-ml-20 -mb-10 md:-mb-20" />
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4 lg:gap-6">
        <Card className="rounded-xl md:rounded-2xl shadow-md hover:shadow-lg transition-all duration-200">
          <CardHeader className="flex flex-row items-center justify-between pb-2 p-4 md:p-6">
            <CardTitle className="text-xs md:text-sm font-medium text-muted-foreground">
              Unread Notifications
            </CardTitle>
            <Bell className="h-3 w-3 md:h-4 md:w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="p-4 md:p-6 pt-0">
            <div className="text-2xl md:text-3xl font-bold">{unreadNotifications || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Click notifications icon to view
            </p>
          </CardContent>
        </Card>

        <Card className="rounded-xl md:rounded-2xl shadow-md hover:shadow-lg transition-all duration-200">
          <CardHeader className="flex flex-row items-center justify-between pb-2 p-4 md:p-6">
            <CardTitle className="text-xs md:text-sm font-medium text-muted-foreground">
              Recent Requests
            </CardTitle>
            <TrendingUp className="h-3 w-3 md:h-4 md:w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="p-4 md:p-6 pt-0">
            <div className="text-2xl md:text-3xl font-bold">{recentRequestsCount || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">
              In the last 30 days
            </p>
          </CardContent>
        </Card>

        <Card className="rounded-xl md:rounded-2xl shadow-md hover:shadow-lg transition-all duration-200">
          <CardHeader className="flex flex-row items-center justify-between pb-2 p-4 md:p-6">
            <CardTitle className="text-xs md:text-sm font-medium text-muted-foreground">
              Quick Actions
            </CardTitle>
            <Calendar className="h-3 w-3 md:h-4 md:w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="p-4 md:p-6 pt-0">
            <div className="text-2xl md:text-3xl font-bold">{visibleActions.length}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Available shortcuts below
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions Grid */}
      <div>
        <h2 className="text-xl md:text-2xl font-bold mb-3 md:mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 md:gap-3 lg:gap-4">
          {visibleActions.map((action) => {
            const Icon = action.icon;
            return (
              <Button
                key={action.href}
                variant="outline"
                className={`h-auto flex-col gap-2 md:gap-3 p-3 md:p-4 lg:p-6 hover:shadow-lg transition-all duration-200 ${action.bgColor} border-0`}
                onClick={() => navigate(action.href)}
              >
                <div className={`p-2 md:p-3 rounded-full ${action.bgColor}`}>
                  <Icon className={`h-5 w-5 md:h-6 md:w-6 ${action.color}`} />
                </div>
                <div className="text-center">
                  <div className="font-semibold text-xs md:text-sm">{action.label}</div>
                  <div className="text-[10px] md:text-xs text-muted-foreground mt-0.5 md:mt-1 hidden sm:block">
                    {action.description}
                  </div>
                </div>
              </Button>
            );
          })}
        </div>
      </div>

      {/* Content Modules */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
        {/* News Feed */}
        <NewsFeedModule title="Latest News" maxItems={5} />

        {/* Pending Approvals (if user has permission) */}
        {hasPermission('approve_requests') && (
          <PendingApprovalsWidget title="Pending Approvals" />
        )}

        {/* Placeholder for when no approvals */}
        {!hasPermission('approve_requests') && (
          <Card className="rounded-xl md:rounded-2xl shadow-md hover:shadow-lg transition-shadow duration-200">
            <CardHeader className="p-4 md:p-6">
              <CardTitle className="text-xl md:text-2xl font-bold">Getting Started</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 md:space-y-4 p-4 md:p-6 pt-0">
              <p className="text-muted-foreground">
                Welcome to {company?.name || 'CrowdHub'}! Here are some things you can do:
              </p>
              <ul className="space-y-2 text-sm">
                <li className="flex items-start gap-2">
                  <FileText className="h-4 w-4 mt-0.5 text-primary" />
                  <span>Submit requests for hardware, marketing, and more</span>
                </li>
                <li className="flex items-start gap-2">
                  <Users className="h-4 w-4 mt-0.5 text-primary" />
                  <span>Browse the company directory to find colleagues</span>
                </li>
                <li className="flex items-start gap-2">
                  <Bell className="h-4 w-4 mt-0.5 text-primary" />
                  <span>Check notifications for updates on your requests</span>
                </li>
                <li className="flex items-start gap-2">
                  <TrendingUp className="h-4 w-4 mt-0.5 text-primary" />
                  <span>Track your request history and status</span>
                </li>
              </ul>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
