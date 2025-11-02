import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { Bell, Check, ExternalLink, Newspaper, FileText, ShoppingCart, UserPlus } from "lucide-react";
import { toast } from "sonner";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { useAuth } from "@/hooks/useAuth";

type Notification = Database["public"]["Tables"]["notifications"]["Row"];

function getNotificationIcon(type?: string | null) {
  switch (type) {
    case "news_article":
      return <Newspaper className="h-4 w-4 text-blue-500" />;
    case "hardware_request":
      return <ShoppingCart className="h-4 w-4 text-green-500" />;
    case "marketing_request":
      return <FileText className="h-4 w-4 text-purple-500" />;
    case "user_account_request":
      return <UserPlus className="h-4 w-4 text-orange-500" />;
    default:
      return <Bell className="h-4 w-4" />;
  }
}

function getNotificationBadgeClass(type?: string | null) {
  switch (type) {
    case "news_article":
      return "bg-blue-500/10 text-blue-500";
    case "hardware_request":
      return "bg-green-500/10 text-green-500";
    case "marketing_request":
      return "bg-purple-500/10 text-purple-500";
    case "user_account_request":
      return "bg-orange-500/10 text-orange-500";
    default:
      return "bg-muted";
  }
}

function getNotificationLabel(type?: string | null) {
  const labels: Record<string, string> = {
    news_article: "News",
    hardware_request: "Request",
    marketing_request: "Marketing",
    user_account_request: "User Account",
    helpdesk_ticket: "Support",
  };

  if (!type) return "Notification";
  return labels[type] || "Notification";
}

export default function Notifications() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const {
    data: notifications = [],
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ['notifications-list', user?.id],
    queryFn: async (): Promise<Notification[]> => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) {
        console.error('Failed to load notifications', error);
        toast.error('Unable to load notifications');
        throw error;
      }

      return data || [];
    },
    enabled: !!user?.id,
    refetchInterval: 60000,
  });

  const unreadCount = useMemo(
    () => notifications.filter((notification) => !notification.is_read).length,
    [notifications],
  );

  const markAsReadMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      if (!user?.id) return;

      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq('id', notificationId)
        .eq('user_id', user.id);

      if (error) {
        console.error('Failed to mark notification as read', error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications-list', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['notifications', user?.id] });
    },
    onError: () => {
      toast.error('Failed to mark notification as read');
    },
  });

  const markAsUnreadMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      if (!user?.id) return;

      const { error } = await supabase
        .from('notifications')
        .update({ is_read: false, read_at: null })
        .eq('id', notificationId)
        .eq('user_id', user.id);

      if (error) {
        console.error('Failed to mark notification as unread', error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications-list', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['notifications', user?.id] });
    },
    onError: () => {
      toast.error('Failed to mark notification as unread');
    },
  });

  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id) return;

      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq('user_id', user.id)
        .eq('is_read', false);

      if (error) {
        console.error('Failed to mark all notifications as read', error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications-list', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['notifications', user?.id] });
      toast.success('All notifications marked as read');
    },
    onError: () => {
      toast.error('Failed to mark all notifications as read');
    },
  });

  const handleNavigate = (notification: Notification) => {
    if (!notification.reference_url) return;

    if (!notification.is_read) {
      markAsReadMutation.mutate(notification.id);
    }

    navigate(notification.reference_url);
  };

  const errorMessage = error instanceof Error ? error.message : 'Something went wrong while loading notifications.';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Notifications</h1>
        <p className="text-muted-foreground">Stay on top of updates that matter to you.</p>
      </div>

      <Card>
        <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>Recent notifications</CardTitle>
            <p className="text-sm text-muted-foreground">
              {unreadCount > 0 ? `${unreadCount} unread` : 'You are all caught up'}
            </p>
          </div>
          {notifications.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => markAllAsReadMutation.mutate()}
              disabled={markAllAsReadMutation.isPending || unreadCount === 0}
              className="w-full sm:w-auto"
            >
              <Check className="mr-2 h-4 w-4" />
              Mark all as read
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="py-10 text-center text-sm text-muted-foreground">Loading notifications...</div>
          ) : isError ? (
            <Alert variant="destructive">
              <AlertTitle>Unable to load notifications</AlertTitle>
              <AlertDescription>{errorMessage}</AlertDescription>
            </Alert>
          ) : notifications.length === 0 ? (
            <Alert>
              <AlertTitle>No notifications yet</AlertTitle>
              <AlertDescription>
                We will let you know when something needs your attention.
              </AlertDescription>
            </Alert>
          ) : (
            <div className="space-y-4">
              {notifications.map((notification) => {
                const type = notification.type || notification.notification_type;
                const createdAt = notification.created_at
                  ? formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })
                  : null;

                return (
                  <div
                    key={notification.id}
                    className={`rounded-lg border p-4 transition-colors ${
                      notification.is_read ? 'bg-background' : 'bg-accent/40 border-primary/20'
                    }`}
                  >
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                      <div className={`rounded-md p-2 ${getNotificationBadgeClass(type)}`}>
                        {getNotificationIcon(type)}
                      </div>
                      <div className="flex-1 space-y-2">
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge variant="outline">{getNotificationLabel(type)}</Badge>
                            {!notification.is_read && <span className="text-xs font-medium text-primary">New</span>}
                          </div>
                          {createdAt && (
                            <span className="text-xs text-muted-foreground">{createdAt}</span>
                          )}
                        </div>
                        <div>
                          <h3 className="text-base font-semibold leading-tight">{notification.title}</h3>
                          <p className="mt-1 text-sm text-muted-foreground whitespace-pre-line">
                            {notification.message}
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-2 pt-2">
                          {notification.reference_url && (
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => handleNavigate(notification)}
                              className="flex items-center gap-2"
                            >
                              <ExternalLink className="h-4 w-4" />
                              View details
                            </Button>
                          )}
                          {!notification.is_read ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => markAsReadMutation.mutate(notification.id)}
                              disabled={markAsReadMutation.isPending}
                            >
                              Mark as read
                            </Button>
                          ) : (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => markAsUnreadMutation.mutate(notification.id)}
                              disabled={markAsUnreadMutation.isPending}
                            >
                              Mark as unread
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
