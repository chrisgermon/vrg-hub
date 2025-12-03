import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Bell, Calendar, Clock, Mail, Smartphone, Upload, FileSpreadsheet, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { formatAUDateTimeFull } from "@/lib/dateUtils";
import { toast } from "sonner";
import { SmsLogsViewer } from "@/components/reminders/SmsLogsViewer";
import { ReminderDashboard, ReminderFilter } from "@/components/reminders/ReminderDashboard";
import { ReminderCalendar } from "@/components/reminders/ReminderCalendar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ReminderBulkImport } from "@/components/reminders/ReminderBulkImport";
import { ReminderReportExport } from "@/components/reminders/ReminderReportExport";
import { Dialog, DialogContent } from "@/components/ui/dialog";

export default function Reminders() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [activeFilter, setActiveFilter] = useState<ReminderFilter>({ status: 'active' });
  const [activeTab, setActiveTab] = useState('dashboard');
  const [showBulkImport, setShowBulkImport] = useState(false);
  const [showReportExport, setShowReportExport] = useState(false);

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
    refetchInterval: 60000,
  });

  const { data: reminders, isLoading } = useQuery({
    queryKey: ['reminders', activeFilter],
    queryFn: async () => {
      let query = supabase
        .from('reminders')
        .select('*')
        .order('reminder_date', { ascending: true });

      // Apply status filter
      if (activeFilter.status && activeFilter.status !== 'all') {
        query = query.eq('status', activeFilter.status);
      }

      // Apply category filter
      if (activeFilter.category) {
        query = query.eq('reminder_type', activeFilter.category);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Apply timeframe filter client-side
      if (activeFilter.timeframe && data) {
        const now = new Date();
        now.setHours(0, 0, 0, 0);
        const oneWeek = new Date(now);
        oneWeek.setDate(oneWeek.getDate() + 7);
        const oneMonth = new Date(now);
        oneMonth.setMonth(oneMonth.getMonth() + 1);

        return data.filter(r => {
          const date = new Date(r.reminder_date);
          date.setHours(0, 0, 0, 0);

          switch (activeFilter.timeframe) {
            case 'expired':
              return date < now;
            case 'week':
              return date >= now && date <= oneWeek;
            case 'month':
              return date > oneWeek && date <= oneMonth;
            default:
              return true;
          }
        });
      }

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
    today.setHours(0, 0, 0, 0);
    const reminderDate = new Date(date);
    reminderDate.setHours(0, 0, 0, 0);
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

  const handleFilterClick = (filter: ReminderFilter) => {
    setActiveFilter(filter);
    setActiveTab('list');
  };

  const clearFilters = () => {
    setActiveFilter({ status: 'active' });
  };

  const getFilterDescription = () => {
    const parts: string[] = [];
    
    if (activeFilter.status && activeFilter.status !== 'all') {
      parts.push(activeFilter.status.charAt(0).toUpperCase() + activeFilter.status.slice(1));
    }
    
    if (activeFilter.category) {
      const categoryLabels: Record<string, string> = {
        license_expiration: 'License Expiration',
        event: 'Events',
        certification: 'Certifications',
        contract: 'Contracts',
        subscription: 'Subscriptions',
        general: 'General',
      };
      parts.push(categoryLabels[activeFilter.category] || activeFilter.category);
    }
    
    if (activeFilter.timeframe) {
      const timeframeLabels: Record<string, string> = {
        expired: 'Expired/Past Due',
        week: 'Due in 1 Week',
        month: 'Due in 1 Month',
      };
      parts.push(timeframeLabels[activeFilter.timeframe] || activeFilter.timeframe);
    }
    
    return parts.length > 0 ? parts.join(' • ') : 'All Reminders';
  };

  const hasActiveFilters = activeFilter.category || activeFilter.timeframe || (activeFilter.status && activeFilter.status !== 'active');

  return (
    <div className="container-responsive py-6 space-y-6">
      {/* Bulk Import Dialog */}
      <Dialog open={showBulkImport} onOpenChange={setShowBulkImport}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-auto">
          <ReminderBulkImport onClose={() => setShowBulkImport(false)} />
        </DialogContent>
      </Dialog>

      {/* Report Export Dialog */}
      <Dialog open={showReportExport} onOpenChange={setShowReportExport}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-auto">
          <ReminderReportExport onClose={() => setShowReportExport(false)} />
        </DialogContent>
      </Dialog>

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold">Reminders</h1>
          <p className="text-muted-foreground">
            Manage your reminders for licenses, events, and more
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button onClick={() => setShowBulkImport(true)} variant="outline">
            <Upload className="h-4 w-4 mr-2" />
            Bulk Import
          </Button>
          <Button onClick={() => setShowReportExport(true)} variant="outline">
            <FileSpreadsheet className="h-4 w-4 mr-2" />
            Reports
          </Button>
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
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList>
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="calendar">Calendar</TabsTrigger>
          <TabsTrigger value="list">List</TabsTrigger>
          <TabsTrigger value="logs">Logs</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="space-y-6">
          <ReminderDashboard onFilterClick={handleFilterClick} />
        </TabsContent>

        <TabsContent value="calendar">
          <ReminderCalendar />
        </TabsContent>

        <TabsContent value="list" className="space-y-6">
          {/* Active Filter Display */}
          {hasActiveFilters && (
            <Card className="bg-primary/5 border-primary/20">
              <CardContent className="py-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">Filtered:</span>
                    <Badge variant="secondary">{getFilterDescription()}</Badge>
                  </div>
                  <Button variant="ghost" size="sm" onClick={clearFilters}>
                    <X className="h-4 w-4 mr-1" />
                    Clear Filters
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

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
                <CardTitle className="text-sm font-medium">Showing</CardTitle>
                <Bell className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{reminders?.length || 0}</div>
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
          {!hasActiveFilters && upcomingReminders && upcomingReminders.length > 0 && (
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
              variant={!activeFilter.status || activeFilter.status === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setActiveFilter({ ...activeFilter, status: 'all' })}
            >
              All
            </Button>
            <Button
              variant={activeFilter.status === 'active' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setActiveFilter({ ...activeFilter, status: 'active' })}
            >
              Active
            </Button>
            <Button
              variant={activeFilter.status === 'completed' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setActiveFilter({ ...activeFilter, status: 'completed' })}
            >
              Completed
            </Button>
            <Button
              variant={activeFilter.status === 'archived' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setActiveFilter({ ...activeFilter, status: 'archived' })}
            >
              Archived
            </Button>
          </div>


          {/* All Reminders List */}
          <Card>
            <CardHeader>
              <CardTitle>{getFilterDescription()}</CardTitle>
              <CardDescription>{reminders?.length || 0} reminder(s) found</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <p className="text-muted-foreground text-center py-8">Loading reminders...</p>
              ) : !reminders || reminders.length === 0 ? (
                <div className="text-center py-8">
                  <Bell className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground mb-4">No reminders found matching your filters</p>
                  {hasActiveFilters && (
                    <Button variant="outline" onClick={clearFilters}>
                      Clear Filters
                    </Button>
                  )}
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
                              {reminder.status === 'active' && (
                                <Badge variant={daysUntil < 0 ? 'destructive' : daysUntil === 0 ? 'destructive' : daysUntil <= 3 ? 'default' : 'secondary'}>
                                  {daysUntil < 0 ? `${Math.abs(daysUntil)} days overdue` : daysUntil === 0 ? 'Today' : daysUntil === 1 ? 'Tomorrow' : `${daysUntil} days`}
                                </Badge>
                              )}
                              {reminder.status === 'completed' && (
                                <Badge variant="outline" className="text-green-600">Completed</Badge>
                              )}
                              {reminder.status === 'archived' && (
                                <Badge variant="outline" className="text-muted-foreground">Archived</Badge>
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
