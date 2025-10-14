import { NewsFeedModule } from "../NewsFeedModule";
import { PendingApprovalsWidget } from "../PendingApprovalsWidget";
import { RequestMetrics } from "@/components/requests/RequestMetrics";
import { Office365QuickLinks } from "@/components/Office365QuickLinks";
import { SuperAdminStats } from "@/components/SuperAdminStats";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Bell, Clock, Users, TrendingUp, Link } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useCompanyContext } from "@/contexts/CompanyContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { formatAUDate } from "@/lib/dateUtils";
import { RequestStatusBadge } from "@/components/requests/RequestStatusBadge";
import * as LucideIcons from "lucide-react";
import type { Widget } from "./types";
import { DynamicHero } from "../DynamicHero";

interface WidgetRendererProps {
  widget: Widget;
  isEditor?: boolean;
}

export function WidgetRenderer({ widget, isEditor = false }: WidgetRendererProps) {
  const { user, company } = useAuth();
  const { selectedCompany } = useCompanyContext();
  const navigate = useNavigate();

  switch (widget.type) {
    case "dynamic-hero":
      return <DynamicHero config={widget.config} />;
    case "welcome":
      const office365Apps = widget.config.office365Apps || [
        { name: "Outlook", icon: "Mail", url: "https://outlook.office.com", color: "text-blue-600" },
        { name: "Teams", icon: "Users", url: "https://teams.microsoft.com", color: "text-purple-600" },
        { name: "OneDrive", icon: "Cloud", url: "https://onedrive.live.com", color: "text-blue-500" },
        { name: "SharePoint", icon: "Share2", url: "https://www.office.com/launch/sharepoint", color: "text-teal-600" },
        { name: "Word", icon: "FileText", url: "https://www.office.com/launch/word", color: "text-blue-700" },
        { name: "Excel", icon: "Sheet", url: "https://www.office.com/launch/excel", color: "text-green-600" },
        { name: "PowerPoint", icon: "Presentation", url: "https://www.office.com/launch/powerpoint", color: "text-orange-600" },
      ];
      
      return (
        <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent rounded-lg p-4 md:p-5 border border-border h-full flex flex-col">
          <div className="flex items-start justify-between gap-4 flex-1">
            <div className="flex-1">
              <h1 className="text-xl md:text-3xl font-bold text-foreground mb-1">
                {widget.config.title || `Welcome back, ${user?.user_metadata?.full_name || "User"}`}
              </h1>
              <p className="text-sm md:text-base text-muted-foreground mb-4">
                {widget.config.subtitle || new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              </p>
              
              {/* Office 365 Quick Access */}
              <div className="flex flex-wrap gap-2 mt-3">
                {office365Apps.map((app, index) => {
                  const IconComponent = (LucideIcons as any)[app.icon];
                  return (
                    <Button
                      key={index}
                      variant="outline"
                      size="sm"
                      className="h-9 gap-2 bg-background/50 hover:bg-background hover:text-foreground"
                      asChild={!isEditor}
                    >
                      {isEditor ? (
                        <div className="flex items-center gap-2">
                          {IconComponent && <IconComponent className={`h-4 w-4 ${app.color}`} />}
                          <span className="text-xs">{app.name}</span>
                        </div>
                      ) : (
                        <a href={app.url} target="_blank" rel="noopener noreferrer">
                          {IconComponent && <IconComponent className={`h-4 w-4 ${app.color}`} />}
                          <span className="text-xs">{app.name}</span>
                        </a>
                      )}
                    </Button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      );

    case "quick-actions":
      const actions = widget.config.actions || [
        { icon: "FileText", label: "New Request", href: "/new-request", color: "text-blue-600" },
        { icon: "Calendar", label: "My Schedule", href: "/schedule", color: "text-green-600" },
      ];
      return (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold">{widget.config.title || "Quick Actions"}</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {actions.map((action: any, index: number) => {
              const IconComponent = (LucideIcons as any)[action.icon];
              return (
                <Button
                  key={index}
                  variant="outline"
                  className="h-20 flex-col gap-2"
                  asChild={!isEditor}
                >
                  {isEditor ? (
                    <div>
                      {IconComponent && <IconComponent className={`h-5 w-5 ${action.color}`} />}
                      <span className="text-xs">{action.label}</span>
                    </div>
                  ) : (
                    <a href={action.href}>
                      {IconComponent && <IconComponent className={`h-5 w-5 ${action.color}`} />}
                      <span className="text-xs">{action.label}</span>
                    </a>
                  )}
                </Button>
              );
            })}
          </div>
        </div>
      );

    case "news-feed":
      return <NewsFeedModule title={widget.config.title || "Latest News"} maxItems={widget.config.maxItems || 5} />;

    case "notifications": {
      const { data: notifications, isLoading: notificationsLoading } = useQuery({
        queryKey: ["unread-notifications", user?.id],
        queryFn: async () => {
          if (!user?.id) return [];
          
          const { data, error } = await supabase
            .from('notifications')
            .select('*')
            .eq('user_id', user.id)
            .eq('is_read', false)
            .order('created_at', { ascending: false })
            .limit(widget.config.maxItems || 5);

          if (error) throw error;
          return data || [];
        },
        enabled: Boolean(user?.id) && !isEditor,
      });

      return (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              {widget.config.title || "Notifications"}
              {!isEditor && notifications && notifications.length > 0 && (
                <span className="ml-auto bg-primary text-primary-foreground text-xs font-bold px-2 py-1 rounded-full">
                  {notifications.length}
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {notificationsLoading ? (
              <div className="text-center py-6 text-sm text-muted-foreground">Loading...</div>
            ) : !notifications || notifications.length === 0 ? (
              <div className="text-center py-6 text-sm text-muted-foreground">
                <Bell className="h-8 w-8 mx-auto mb-2 opacity-20" />
                <p>No unread notifications</p>
              </div>
            ) : (
              <div className="space-y-3">
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className="p-3 bg-muted/30 rounded-lg border hover:bg-muted/50 transition-all cursor-pointer"
                    onClick={() => {
                      if (notification.reference_url) {
                        navigate(notification.reference_url);
                      }
                    }}
                  >
                    <div className="flex items-start gap-2">
                      <Bell className="h-4 w-4 mt-0.5 text-primary" />
                      <div className="flex-1">
                        <p className="font-medium text-sm">{notification.title}</p>
                        <p className="text-xs text-muted-foreground mt-1">{notification.message}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {formatAUDate(notification.created_at)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      );
    }

    case "recent-activity":
      return (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              {widget.config.title || "Recent Activity"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8 text-muted-foreground">
              <p className="text-sm">No recent activity</p>
            </div>
          </CardContent>
        </Card>
      );

    case "quick-links":
      const links = widget.config.links || [
        { label: "My Requests", href: "/requests" },
        { label: "Documentation", href: "/documentation" },
        { label: "Help & Support", href: "/help" },
      ];
      return (
        <Card>
          <CardHeader>
            <CardTitle>{widget.config.title || "Quick Links"}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {links.map((link: any, index: number) => (
                <Button
                  key={index}
                  variant="ghost"
                  className="w-full justify-start"
                  asChild={!isEditor}
                >
                  {isEditor ? <div>{link.label}</div> : <a href={link.href}>{link.label}</a>}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      );

    case "company-info":
      return (
        <Card>
          <CardHeader>
            <CardTitle>{widget.config.title || "Organization"}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <p className="font-medium">{company?.name || "Your Company"}</p>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Users className="h-4 w-4" />
                <span>Your team workspace</span>
              </div>
            </div>
          </CardContent>
        </Card>
      );

    case "text-block":
      return (
        <Card>
          <CardHeader>
            {widget.config.title && <CardTitle>{widget.config.title}</CardTitle>}
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              {widget.config.content || "Add custom text content here"}
            </p>
          </CardContent>
        </Card>
      );

    case "stats-card":
      return (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingUp className="h-4 w-4" />
              {widget.config.title || "Statistics"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{widget.config.value || "0"}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {widget.config.description || "Total count"}
            </p>
          </CardContent>
        </Card>
      );

    case "pending-approvals":
      return <PendingApprovalsWidget title={widget.config.title || "Pending Approvals"} />;

    case "request-metrics":
      return <RequestMetrics />;

    case "office365-links":
      return <Office365QuickLinks />;

    case "super-admin-stats":
      return <SuperAdminStats />;

    case "recent-requests": {
      // Fetch recent requests
      const { data: recentRequests, isLoading } = useQuery({
        queryKey: ["recent-requests", user?.id, selectedCompany?.id],
        queryFn: async () => {
          if (!user?.id) return [];
          
          let query = supabase
            .from('hardware_requests')
            .select('id, title, description, status, total_amount, currency, created_at');
          
          query = query.eq('user_id', user.id);
          
          const { data, error } = await query
            .order('created_at', { ascending: false })
            .limit(widget.config.maxItems || 5);

          if (error) throw error;
          return data || [];
        },
        enabled: Boolean(user?.id) && !isEditor,
      });

      return (
        <Card>
          <CardHeader>
            <CardTitle>{widget.config.title || "My Recent Requests"}</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">Loading...</div>
            ) : (recentRequests || []).length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>No requests yet</p>
                <Button onClick={() => navigate('/requests/new')} variant="outline" size="sm" className="mt-4">
                  Create Your First Request
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {(recentRequests || []).map((request) => (
                  <div 
                    key={request.id} 
                    className="flex items-center justify-between p-4 bg-muted/30 rounded-lg border hover:bg-muted/50 transition-all cursor-pointer"
                    onClick={() => navigate(`/requests`)}
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="font-semibold">{request.title}</span>
                        <RequestStatusBadge status={request.status} size="sm" />
                      </div>
                      <p className="text-sm text-muted-foreground">{request.description || 'No description'}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatAUDate(request.created_at)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-lg">
                        {request.total_amount ? `$${Number(request.total_amount).toLocaleString()}` : '-'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      );
    }

    default:
      return <div>Unknown widget type</div>;
  }
}
