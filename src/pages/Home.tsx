import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { NewsFeedModule } from "@/components/home/NewsFeedModule";
import { QuickLinksModule } from "@/components/home/QuickLinksModule";
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
  Bell,
  Plus
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompanyFeatures } from "@/hooks/useCompanyFeatures";
import { usePermissions } from "@/hooks/usePermissions";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

export default function Home() {
  const { user, company, userRole } = useAuth();
  const navigate = useNavigate();
  const { isFeatureEnabled } = useCompanyFeatures();
  const { hasPermission } = usePermissions();

  // Dashboard stats
  const { data: stats, isLoading: isLoadingStats } = useQuery({
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

  // Quick links - fetch all links (not user-specific)
  const { data: quickLinks = [], refetch: refetchQuickLinks } = useQuery({
    queryKey: ['quick-links'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('quick_links')
        .select('*')
        .order('position', { ascending: true });

      if (error) throw error;
      return data?.map(link => ({
        id: link.id,
        title: link.title,
        url: link.url,
        icon: link.icon || undefined
      })) || [];
    },
  });

  const handleQuickLinksUpdate = async (links: any[]) => {
    // Only super_admins can update quick links
    if (userRole !== 'super_admin') return;
    
    // Delete all existing links
    await supabase.from('quick_links').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    
    // Insert new links with positions
    if (links.length > 0) {
      const linksToInsert = links.map((link, index) => ({
        title: link.title,
        url: link.url,
        icon: link.icon || null,
        position: index,
        company_id: company?.id || null,
        user_id: null
      }));
      
      await supabase.from('quick_links').insert(linksToInsert);
    }
    
    refetchQuickLinks();
  };

  const quickActions = [
    {
      icon: FileText,
      label: "New Request",
      description: "Submit a new request",
      href: "/requests/new",
    },
  ];

  return (
    <div className="flex-1 space-y-4 md:space-y-6 p-4 md:p-6 max-w-7xl mx-auto">
      {/* Hero Section with Quick Action */}
      <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-primary via-primary/95 to-primary/85 p-6 md:p-8 text-white shadow-xl">
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex-1">
            <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold mb-2">
              Welcome back, {user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User'}
            </h1>
          </div>
          <Button
            size="lg"
            variant="secondary"
            className="shadow-lg hover:shadow-xl transition-all duration-200 bg-white text-primary hover:bg-white/90 font-semibold"
            onClick={() => navigate('/requests/new')}
          >
            <FileText className="mr-2 h-5 w-5" />
            New Request
          </Button>
          {userRole === 'super_admin' && (
            <Button
              size="lg"
              variant="outline"
              className="shadow-lg hover:shadow-xl transition-all duration-200 bg-white/90 hover:bg-white font-semibold"
              onClick={() => navigate('/pages/edit')}
            >
              <Plus className="mr-2 h-5 w-5" />
              New Page
            </Button>
          )}
        </div>
        <div className="absolute top-0 right-0 w-64 h-64 md:w-96 md:h-96 bg-white/10 rounded-full -mr-24 md:-mr-32 -mt-24 md:-mt-32 blur-3xl" />
        <div className="absolute bottom-0 left-0 w-48 h-48 md:w-64 md:h-64 bg-white/5 rounded-full -ml-16 md:-ml-20 -mb-16 md:-mb-20 blur-3xl" />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 md:gap-6">
        {/* Quick Links - Takes 2 columns (40% width) */}
        <div className="lg:col-span-2">
          <QuickLinksModule 
            title="Quick Links" 
            links={quickLinks}
            isEditing={userRole === 'super_admin'}
            onUpdate={handleQuickLinksUpdate}
          />
        </div>

        {/* News Feed - Takes 3 columns (60% width) */}
        <div className="lg:col-span-3">
          <NewsFeedModule title="News" maxItems={5} />
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
