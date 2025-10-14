import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Bell, Check, Newspaper, FileText, UserPlus, ShoppingCart, CheckCheck } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  reference_url: string | null;
  reference_id: string | null;
  is_read: boolean;
  created_at: string;
  read_at: string | null;
}

export default function Notifications() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ['all-notifications', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase
        .from('notifications')
        .select('id, type, title, message, reference_url, reference_id, is_read, created_at, read_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return (data || []) as unknown as Notification[];
    },
    enabled: !!user?.id,
  });

  const unreadCount = notifications.filter(n => !n.is_read).length;

  const markAsReadMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq('id', notificationId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-notifications', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['notifications', user?.id] });
    },
    onError: () => {
      toast.error("Failed to mark notification as read");
    }
  });

  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id) return;
      
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq('user_id', user.id)
        .eq('is_read', false);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-notifications', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['notifications', user?.id] });
      toast.success("All notifications marked as read");
    },
    onError: () => {
      toast.error("Failed to mark all notifications as read");
    }
  });

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.is_read) {
      markAsReadMutation.mutate(notification.id);
    }
    
    if (notification.reference_url) {
      navigate(notification.reference_url);
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'news_article':
        return <Newspaper className="h-5 w-5 text-blue-500" />;
      case 'hardware_request':
        return <ShoppingCart className="h-5 w-5 text-green-500" />;
      case 'marketing_request':
        return <FileText className="h-5 w-5 text-purple-500" />;
      case 'user_account_request':
        return <UserPlus className="h-5 w-5 text-orange-500" />;
      default:
        return <Bell className="h-5 w-5" />;
    }
  };

  return (
    <div className="container-responsive py-4 md:py-8 space-y-4 md:space-y-8">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">Notifications</h1>
          <p className="text-sm md:text-base text-muted-foreground">
            Stay updated with all your notifications
          </p>
        </div>
        {unreadCount > 0 && (
          <Button
            onClick={() => markAllAsReadMutation.mutate()}
            disabled={markAllAsReadMutation.isPending}
            variant="outline"
            className="w-full md:w-auto"
          >
            <CheckCheck className="h-4 w-4 mr-2" />
            Mark all as read ({unreadCount})
          </Button>
        )}
      </div>

      <div className="space-y-3">
        {isLoading ? (
          <Card className="p-6 md:p-8 text-center">
            <p className="text-muted-foreground">Loading notifications...</p>
          </Card>
        ) : notifications.length === 0 ? (
          <Card className="p-6 md:p-12 text-center">
            <Bell className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-base md:text-lg font-medium mb-2">No notifications</p>
            <p className="text-sm text-muted-foreground">
              You're all caught up! Check back later for updates.
            </p>
          </Card>
        ) : (
          notifications.map((notification) => (
            <Card 
              key={notification.id}
              className={`p-4 md:p-6 cursor-pointer transition-colors hover:bg-accent/50 ${
                !notification.is_read ? 'bg-accent/30 border-primary/20' : ''
              }`}
              onClick={() => handleNotificationClick(notification)}
            >
              <div className="flex items-start gap-3 md:gap-4">
                <div className="mt-0.5 flex-shrink-0">
                  {getIcon(notification.type)}
                </div>
                <div className="flex-1 min-w-0 space-y-2">
                  <div className="flex flex-col md:flex-row md:items-center gap-2">
                    <p className="font-semibold text-base">{notification.title}</p>
                    {!notification.is_read && (
                      <Badge variant="default" className="w-fit">New</Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {notification.message}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                  </p>
                </div>
                {!notification.is_read && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      markAsReadMutation.mutate(notification.id);
                    }}
                    disabled={markAsReadMutation.isPending}
                    className="flex-shrink-0"
                  >
                    <Check className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
