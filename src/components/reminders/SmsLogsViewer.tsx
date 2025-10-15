import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { MessageSquare, CheckCircle2, XCircle, Clock, AlertCircle } from "lucide-react";
import { formatAUDateTime } from "@/lib/dateUtils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export function SmsLogsViewer() {
  const { data: notifications, isLoading } = useQuery({
    queryKey: ['reminder-notifications'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('reminder_notifications')
        .select('*, reminders(title, reminder_date)')
        .order('sent_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      return data;
    },
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'sent':
        return <CheckCircle2 className="h-4 w-4 text-green-600" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-600" />;
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-600" />;
      default:
        return <AlertCircle className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, any> = {
      sent: { variant: 'default', className: 'bg-green-500/10 text-green-600 border-green-500/20' },
      failed: { variant: 'destructive', className: 'bg-red-500/10 text-red-600 border-red-500/20' },
      pending: { variant: 'secondary', className: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20' },
    };
    const config = variants[status] || { variant: 'outline' };
    return (
      <Badge {...config} className={config.className}>
        {status}
      </Badge>
    );
  };

  const smsNotifications = notifications?.filter(n => n.notification_type === 'sms') || [];
  const emailNotifications = notifications?.filter(n => n.notification_type === 'email') || [];

  const renderNotificationTable = (notifs: any[], type: 'sms' | 'email') => {
    if (isLoading) {
      return <p className="text-center py-8 text-muted-foreground">Loading logs...</p>;
    }

    if (!notifs || notifs.length === 0) {
      return (
        <div className="text-center py-8">
          <MessageSquare className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">No {type} notifications sent yet</p>
        </div>
      );
    }

    return (
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Status</TableHead>
              <TableHead>Reminder</TableHead>
              <TableHead>Recipient</TableHead>
              <TableHead>Sent At</TableHead>
              <TableHead>Days Before</TableHead>
              <TableHead>Details</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {notifs.map((notification) => {
              const reminder = notification.reminders as any;
              return (
                <TableRow key={notification.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {getStatusIcon(notification.status)}
                      {getStatusBadge(notification.status)}
                    </div>
                  </TableCell>
                  <TableCell className="font-medium">
                    {reminder?.title || 'Unknown'}
                  </TableCell>
                  <TableCell>{notification.recipient || 'N/A'}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatAUDateTime(notification.sent_at)}
                  </TableCell>
                  <TableCell>
                    {notification.days_before !== null ? (
                      <Badge variant="outline">{notification.days_before} days</Badge>
                    ) : (
                      'N/A'
                    )}
                  </TableCell>
                  <TableCell>
                    {notification.error_message ? (
                      <span className="text-xs text-red-600">{notification.error_message}</span>
                    ) : (
                      <span className="text-xs text-muted-foreground">Success</span>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          Notification Logs
        </CardTitle>
        <CardDescription>
          Track SMS and email delivery status for reminders
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="sms" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="sms">
              SMS Logs ({smsNotifications.length})
            </TabsTrigger>
            <TabsTrigger value="email">
              Email Logs ({emailNotifications.length})
            </TabsTrigger>
          </TabsList>
          <TabsContent value="sms" className="mt-4">
            {renderNotificationTable(smsNotifications, 'sms')}
          </TabsContent>
          <TabsContent value="email" className="mt-4">
            {renderNotificationTable(emailNotifications, 'email')}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
