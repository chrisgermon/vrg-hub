import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Bell, Calendar, Clock, Mail, Phone, Smartphone, X, Check } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { formatAUDate, formatAUDateLong, formatAUDateTimeFull } from "@/lib/dateUtils";
import { toast } from "sonner";
import { SmsLogsViewer } from "@/components/reminders/SmsLogsViewer";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ReminderDashboard } from "@/components/reminders/ReminderDashboard";
import { ReminderCalendar } from "@/components/reminders/ReminderCalendar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function Reminders() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<'all' | 'active' | 'completed'>('active');

  // Fetch in-app notifications
  const { data: inAppNotifications } = useQuery({
    queryKey: ['in-app-notifications'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('reminder_notifications')
        .select(`
          *,
          reminders(title, description, reminder_date)
        `)
        .eq('notification_type', 'in_app')
        .eq('status', 'sent')
        .order('sent_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      return data;
    },
    refetchInterval: 60000, // Refetch every minute
  });

  const { data: reminders, isLoading } = useQuery({
    queryKey: ['reminders', filter],
    queryFn: async () => {
      let query = supabase
        .from('reminders')
        .select('*')
        .order('reminder_date', { ascending: true });

      if (filter !== 'all') {
        query = query.eq('status', filter);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data;
    },
  });

  const { data: upcomingReminders } = useQuery({
    queryKey: ['upcoming-reminders'],
    queryFn: async () => {
      const today = new Date();
      const nextWeek = new Date(today);
      nextWeek.setDate(today.getDate() + 7);

      const { data, error } = await supabase
        .from('reminders')
        .select('*')
        .eq('is_active', true)
        .eq('status', 'active')
        .gte('reminder_date', today.toISOString())
        .lte('reminder_date', nextWeek.toISOString())
        .order('reminder_date', { ascending: true })
        .limit(5);

      if (error) throw error;
      return data;
    },
  });

  const getDaysUntil = (date: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Normalize to start of day
    const reminderDate = new Date(date);
    reminderDate.setHours(0, 0, 0, 0); // Normalize to start of day
    const diffTime = reminderDate.getTime() - today.getTime();
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const getReminderTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      license_expiration: 'bg-chart-1',
      event: 'bg-chart-2',
      certification: 'bg-chart-3',
      contract: 'bg-chart-4',
      subscription: 'bg-chart-5',
      general: 'bg-muted',
    };
    return colors[type] || 'bg-primary';
  };

  const handleTestReminder = async () => {
    try {
      const { error } = await supabase.functions.invoke('check-reminders');
      if (error) throw error;
      toast.success('Reminder check triggered successfully');
    } catch (error: any) {
      toast.error('Failed to trigger reminder check: ' + error.message);
    }
  };

  const handleDismissNotification = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('reminder_notifications')
        .update({ status: 'read' })
        .eq('id', notificationId);
      
      if (error) throw error;
      
      queryClient.invalidateQueries({ queryKey: ['in-app-notifications'] });
      toast.success('Notification dismissed');
    } catch (error: any) {
      toast.error('Failed to dismiss notification: ' + error.message);
    }
  };

  const getDaysMessage = (daysUntil: number) => {
    if (daysUntil === 0) return 'Today';
    if (daysUntil === 1) return 'Tomorrow';
    if (daysUntil < 0) return `${Math.abs(daysUntil)} days ago`;
    return `in ${daysUntil} days`;
  };

  return (
    <div className="container-responsive py-6 space-y-6">
      {/* In-App Notifications */}
      {inAppNotifications && inAppNotifications.length > 0 && (
        <div className="space-y-2">
          {inAppNotifications.slice(0, 3).map((notification) => {
            const reminder = notification.reminders as any;
            const reminderDate = new Date(reminder?.reminder_date);
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            reminderDate.setHours(0, 0, 0, 0);
            const daysUntil = Math.round((reminderDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
            
            return (
              <Alert key={notification.id} className="border-l-4 border-l-primary">
                <Bell className="h-4 w-4" />
                <AlertDescription className="flex items-center justify-between">
                  <div className="flex-1">
                    <strong>{reminder?.title}</strong> is {getDaysMessage(daysUntil)}
                    {reminder?.description && <span className="text-muted-foreground"> - {reminder.description}</span>}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDismissNotification(notification.id)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </AlertDescription>
              </Alert>
            );
          })}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Reminders</h1>
          <p className="text-muted-foreground">
            Manage your reminders for licenses, events, and more
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleTestReminder} variant="outline">
            Test Reminder Check
          </Button>
          <Button onClick={() => navigate('/reminders/new')}>
            <Plus className="h-4 w-4 mr-2" />
            New Reminder
          </Button>
        </div>
      </div>

      {/* Tabs for Dashboard and List View */}
      <Tabs defaultValue="dashboard" className="space-y-6">
        <TabsList>
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="calendar">Calendar</TabsTrigger>
          <TabsTrigger value="list">List</TabsTrigger>
          <TabsTrigger value="logs">Logs</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="space-y-6">
          <ReminderDashboard />
        </TabsContent>

        <TabsContent value="calendar">
          <ReminderCalendar />
        </TabsContent>

        <TabsContent value="list" className="space-y-6">
      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Upcoming (7 days)</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{upcomingReminders?.length || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Reminders</CardTitle>
            <Bell className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {reminders?.filter(r => r.status === 'active').length || 0}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">This Month</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {reminders?.filter(r => {
                const date = new Date(r.reminder_date);
                const now = new Date();
                return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
              }).length || 0}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Upcoming Reminders */}
      {upcomingReminders && upcomingReminders.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Upcoming This Week</CardTitle>
            <CardDescription>Reminders in the next 7 days</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {upcomingReminders.map((reminder) => {
              const daysUntil = getDaysUntil(reminder.reminder_date);
              const channels = reminder.notification_channels as { email?: boolean; sms?: boolean; in_app?: boolean };

              return (
                <div
                  key={reminder.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 cursor-pointer transition-colors"
                  onClick={() => navigate(`/reminders/${reminder.id}`)}
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-2 h-12 rounded ${getReminderTypeColor(reminder.reminder_type)}`} />
                    <div>
                      <h3 className="font-semibold">{reminder.title}</h3>
                      <p className="text-sm text-muted-foreground">{reminder.description}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant={daysUntil === 0 ? 'destructive' : daysUntil <= 3 ? 'default' : 'secondary'}>
                          {daysUntil === 0 ? 'Today' : daysUntil === 1 ? 'Tomorrow' : `${daysUntil} days`}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {formatAUDateTimeFull(reminder.reminder_date)}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {channels.email && <Mail className="h-4 w-4 text-muted-foreground" />}
                    {channels.sms && <Smartphone className="h-4 w-4 text-muted-foreground" />}
                    {channels.in_app && <Bell className="h-4 w-4 text-muted-foreground" />}
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Filter Tabs */}
      <div className="flex gap-2">
        <Button
          variant={filter === 'all' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilter('all')}
        >
          All
        </Button>
        <Button
          variant={filter === 'active' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilter('active')}
        >
          Active
        </Button>
        <Button
          variant={filter === 'completed' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilter('completed')}
        >
          Completed
        </Button>
      </div>


      {/* All Reminders List */}
      <Card>
        <CardHeader>
          <CardTitle>All Reminders</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-muted-foreground text-center py-8">Loading reminders...</p>
          ) : !reminders || reminders.length === 0 ? (
            <div className="text-center py-8">
              <Bell className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground mb-4">No reminders found</p>
              <Button onClick={() => navigate('/reminders/new')}>
                <Plus className="h-4 w-4 mr-2" />
                Create Your First Reminder
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {reminders.map((reminder) => {
                const daysUntil = getDaysUntil(reminder.reminder_date);
                const channels = reminder.notification_channels as { email?: boolean; sms?: boolean; in_app?: boolean };

                return (
                  <div
                    key={reminder.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 cursor-pointer transition-colors"
                    onClick={() => navigate(`/reminders/${reminder.id}`)}
                  >
                    <div className="flex items-center gap-4 flex-1">
                      <div className={`w-2 h-12 rounded ${getReminderTypeColor(reminder.reminder_type)}`} />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold">{reminder.title}</h3>
                          <Badge variant="outline" className="text-xs">
                            {reminder.reminder_type.replace('_', ' ')}
                          </Badge>
                          {reminder.is_recurring && (
                            <Badge variant="secondary" className="text-xs">
                              Recurring
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">{reminder.description}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-sm text-muted-foreground">
                            📅 {formatAUDateTimeFull(reminder.reminder_date)}
                          </span>
                          {reminder.status === 'active' && daysUntil >= 0 && (
                            <Badge variant={daysUntil === 0 ? 'destructive' : daysUntil <= 3 ? 'default' : 'secondary'}>
                              {daysUntil === 0 ? 'Today' : daysUntil === 1 ? 'Tomorrow' : `${daysUntil} days`}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {channels.email && <Mail className="h-4 w-4 text-muted-foreground" />}
                      {channels.sms && <Smartphone className="h-4 w-4 text-muted-foreground" />}
                      {channels.in_app && <Bell className="h-4 w-4 text-muted-foreground" />}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
        </TabsContent>

        <TabsContent value="logs">
          <SmsLogsViewer />
        </TabsContent>
      </Tabs>
    </div>
  );
}
