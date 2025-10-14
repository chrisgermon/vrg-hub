import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Calendar, Mail, Send, AlertCircle, Clock, ChevronLeft, ChevronRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useCompanyContext } from '@/contexts/CompanyContext';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, isToday, isBefore, startOfDay, startOfWeek, endOfWeek, addDays, addWeeks, subWeeks } from 'date-fns';
import { formatAUDate } from '@/lib/dateUtils';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';

type CalendarView = 'day' | 'week' | 'month';

export default function MarketingCalendar() {
  const { company } = useAuth();
  const { selectedCompany } = useCompanyContext();
  const activeCompany = selectedCompany || company;
  const navigate = useNavigate();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<CalendarView>('month');

  const getDateRange = () => {
    if (view === 'day') {
      return { start: startOfDay(currentDate), end: startOfDay(currentDate) };
    } else if (view === 'week') {
      return { start: startOfWeek(currentDate), end: endOfWeek(currentDate) };
    } else {
      return { start: startOfMonth(currentDate), end: endOfMonth(currentDate) };
    }
  };

  const { data: scheduledRequests, isLoading } = useQuery({
    queryKey: ['marketing-calendar', activeCompany?.id, format(currentDate, 'yyyy-MM-dd'), view],
    queryFn: async () => {
      if (!activeCompany?.id) return [];

      const { start, end } = getDateRange();

      const { data, error } = await supabase
        .from('marketing_requests')
        .select(`
          id,
          title,
          request_type,
          status,
          priority,
          scheduled_send_date,
          brand,
          clinic,
          is_recurring,
          recurrence_frequency,
          profiles!marketing_requests_user_id_fkey(name, email)
        `)
        .eq('company_id', activeCompany.id)
        .not('scheduled_send_date', 'is', null)
        .gte('scheduled_send_date', start.toISOString())
        .lte('scheduled_send_date', end.toISOString())
        .order('scheduled_send_date', { ascending: true });

      if (error) throw error;
      return data;
    },
    enabled: !!activeCompany?.id,
  });

  const { data: upcomingReminders } = useQuery({
    queryKey: ['marketing-reminders', activeCompany?.id],
    queryFn: async () => {
      if (!activeCompany?.id) return [];

      const today = startOfDay(new Date());
      const { data, error } = await supabase
        .from('marketing_requests')
        .select(`
          id,
          title,
          request_type,
          scheduled_send_date,
          status,
          priority
        `)
        .eq('company_id', activeCompany.id)
        .not('scheduled_send_date', 'is', null)
        .gte('scheduled_send_date', today.toISOString())
        .in('status', ['submitted', 'approved'])
        .order('scheduled_send_date', { ascending: true })
        .limit(5);

      if (error) throw error;
      return data;
    },
    enabled: !!activeCompany?.id,
  });

  const navigatePrevious = () => {
    if (view === 'day') {
      setCurrentDate(addDays(currentDate, -1));
    } else if (view === 'week') {
      setCurrentDate(subWeeks(currentDate, 1));
    } else {
      setCurrentDate(subMonths(currentDate, 1));
    }
  };

  const navigateNext = () => {
    if (view === 'day') {
      setCurrentDate(addDays(currentDate, 1));
    } else if (view === 'week') {
      setCurrentDate(addWeeks(currentDate, 1));
    } else {
      setCurrentDate(addMonths(currentDate, 1));
    }
  };

  const getDisplayTitle = () => {
    if (view === 'day') {
      return format(currentDate, 'EEEE, MMMM d, yyyy');
    } else if (view === 'week') {
      const weekStart = startOfWeek(currentDate);
      const weekEnd = endOfWeek(currentDate);
      return `${format(weekStart, 'MMM d')} - ${format(weekEnd, 'MMM d, yyyy')}`;
    } else {
      return format(currentDate, 'MMMM yyyy');
    }
  };

  const getRequestsForDay = (day: Date) => {
    if (!scheduledRequests) return [];
    return scheduledRequests.filter(req => 
      req.scheduled_send_date && isSameDay(new Date(req.scheduled_send_date), day)
    );
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'submitted': return 'bg-blue-500';
      case 'approved': return 'bg-green-500';
      case 'delivered': return 'bg-purple-500';
      case 'declined': return 'bg-red-500';
      case 'cancelled': return 'bg-gray-500';
      default: return 'bg-gray-500';
    }
  };

  const getRequestTypeIcon = (type: string) => {
    switch (type) {
      case 'fax_blast': return Send;
      case 'email_blast': return Mail;
      default: return Mail;
    }
  };

  const isDayPast = (day: Date) => {
    return isBefore(day, startOfDay(new Date()));
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Marketing Distribution Calendar</h1>
        <p className="text-muted-foreground">
          Track and manage scheduled fax and email blasts
        </p>
      </div>

      {/* Upcoming Reminders */}
      {upcomingReminders && upcomingReminders.length > 0 && (
        <Card className="border-l-4 border-l-orange-500">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-orange-500" />
              Upcoming Distributions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {upcomingReminders.map((reminder) => {
                const daysUntil = Math.ceil(
                  (new Date(reminder.scheduled_send_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
                );
                const Icon = getRequestTypeIcon(reminder.request_type);
                
                return (
                  <div
                    key={reminder.id}
                    className="flex items-center justify-between p-3 bg-muted/50 rounded-lg hover:bg-muted cursor-pointer transition-colors"
                    onClick={() => navigate(`/requests?request=${reminder.id}`)}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="font-medium text-sm">{reminder.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatAUDate(reminder.scheduled_send_date)}
                          {daysUntil === 0 && ' • Today'}
                          {daysUntil === 1 && ' • Tomorrow'}
                          {daysUntil > 1 && ` • In ${daysUntil} days`}
                        </p>
                      </div>
                    </div>
                    <Badge variant={reminder.status === 'submitted' ? 'default' : 'secondary'}>
                      {reminder.status}
                    </Badge>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Calendar */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-4">
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              {getDisplayTitle()}
            </CardTitle>
            <div className="flex items-center gap-2">
              <ToggleGroup type="single" value={view} onValueChange={(v) => v && setView(v as CalendarView)}>
                <ToggleGroupItem value="day" aria-label="Day view">
                  Day
                </ToggleGroupItem>
                <ToggleGroupItem value="week" aria-label="Week view">
                  Week
                </ToggleGroupItem>
                <ToggleGroupItem value="month" aria-label="Month view">
                  Month
                </ToggleGroupItem>
              </ToggleGroup>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={navigatePrevious}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentDate(new Date())}
                >
                  Today
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={navigateNext}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-12 text-muted-foreground">
              Loading calendar...
            </div>
          ) : view === 'day' ? (
            <DayView 
              date={currentDate} 
              requests={scheduledRequests || []} 
              navigate={navigate}
              getRequestTypeIcon={getRequestTypeIcon}
              getStatusColor={getStatusColor}
            />
          ) : view === 'week' ? (
            <WeekView 
              date={currentDate} 
              requests={scheduledRequests || []} 
              navigate={navigate}
              getRequestTypeIcon={getRequestTypeIcon}
              getStatusColor={getStatusColor}
              getRequestsForDay={getRequestsForDay}
            />
          ) : (
            <MonthView 
              date={currentDate} 
              requests={scheduledRequests || []} 
              navigate={navigate}
              getRequestTypeIcon={getRequestTypeIcon}
              getStatusColor={getStatusColor}
              getRequestsForDay={getRequestsForDay}
            />
          )}

          {/* Legend */}
          <div className="mt-4 flex flex-wrap gap-4 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-blue-500" />
              <span>Submitted</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-green-500" />
              <span>Approved</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-purple-500" />
              <span>Delivered</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-red-500" />
              <span>Declined</span>
            </div>
            <div className="flex items-center gap-2">
              <Mail className="h-3 w-3" />
              <span>Email Blast</span>
            </div>
            <div className="flex items-center gap-2">
              <Send className="h-3 w-3" />
              <span>Fax Blast</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Day View Component
function DayView({ date, requests, navigate, getRequestTypeIcon, getStatusColor }: any) {
  const dayRequests = requests.filter((req: any) => 
    req.scheduled_send_date && isSameDay(new Date(req.scheduled_send_date), date)
  );

  return (
    <div className="border rounded-lg overflow-hidden">
      <div className="p-4 bg-muted border-b">
        <h3 className="font-semibold">{format(date, 'EEEE, MMMM d, yyyy')}</h3>
      </div>
      <div className="p-4 space-y-2">
        {dayRequests.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            No distributions scheduled for this day
          </div>
        ) : (
          dayRequests.map((req: any) => {
            const Icon = getRequestTypeIcon(req.request_type);
            return (
              <div
                key={req.id}
                className="p-3 border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => navigate(`/requests?request=${req.id}`)}
              >
                <div className="flex items-center gap-3">
                  <div className={cn("p-2 rounded", getStatusColor(req.status))}>
                    <Icon className="h-4 w-4 text-white" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">{req.title}</p>
                    <p className="text-sm text-muted-foreground">{req.brand || req.clinic}</p>
                  </div>
                  <Badge variant={req.status === 'submitted' ? 'default' : 'secondary'}>
                    {req.status}
                  </Badge>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

// Week View Component
function WeekView({ date, requests, navigate, getRequestTypeIcon, getStatusColor, getRequestsForDay }: any) {
  const weekStart = startOfWeek(date);
  const weekDays = eachDayOfInterval({ start: weekStart, end: endOfWeek(date) });

  return (
    <div className="border rounded-lg overflow-hidden">
      <div className="grid grid-cols-7 bg-muted">
        {weekDays.map((day) => (
          <div key={day.toISOString()} className="p-2 text-center border-r last:border-r-0">
            <div className="text-sm font-medium">{format(day, 'EEE')}</div>
            <div className={cn(
              "text-lg font-semibold mt-1",
              isToday(day) && "bg-primary text-primary-foreground rounded-full w-8 h-8 flex items-center justify-center mx-auto"
            )}>
              {format(day, 'd')}
            </div>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 min-h-[400px]">
        {weekDays.map((day) => {
          const dayRequests = getRequestsForDay(day);
          return (
            <div key={day.toISOString()} className="p-2 border-r border-b last:border-r-0">
              <div className="space-y-1">
                {dayRequests.map((req: any) => {
                  const Icon = getRequestTypeIcon(req.request_type);
                  return (
                    <div
                      key={req.id}
                      className={cn(
                        "text-xs p-1 rounded cursor-pointer hover:opacity-80 transition-opacity",
                        getStatusColor(req.status),
                        "text-white truncate flex items-center gap-1"
                      )}
                      onClick={() => navigate(`/requests?request=${req.id}`)}
                      title={req.title}
                    >
                      <Icon className="h-3 w-3 flex-shrink-0" />
                      <span className="truncate">{req.title}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Month View Component
function MonthView({ date, requests, navigate, getRequestTypeIcon, getStatusColor, getRequestsForDay }: any) {
  const monthStart = startOfMonth(date);
  const monthEnd = endOfMonth(date);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

  return (
    <div className="border rounded-lg overflow-hidden">
      <div className="grid grid-cols-7 bg-muted">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
          <div key={day} className="p-2 text-center text-sm font-medium border-r last:border-r-0">
            {day}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {Array.from({ length: monthStart.getDay() }).map((_, i) => (
          <div key={`empty-${i}`} className="min-h-[120px] p-2 bg-muted/30 border-r border-b" />
        ))}
        {daysInMonth.map((day) => {
          const dayRequests = getRequestsForDay(day);
          const isCurrentDay = isToday(day);
          const isPast = isBefore(day, startOfDay(new Date()));

          return (
            <div
              key={day.toISOString()}
              className={cn(
                "min-h-[120px] p-2 border-r border-b last:border-r-0 relative",
                !isSameMonth(day, date) && "bg-muted/30",
                isPast && "opacity-60",
                isCurrentDay && "bg-primary/5 border-primary/20"
              )}
            >
              <div className="flex items-center justify-between mb-1">
                <span className={cn(
                  "text-sm font-medium",
                  isCurrentDay && "bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center text-xs"
                )}>
                  {format(day, 'd')}
                </span>
                {dayRequests.length > 0 && (
                  <Badge variant="secondary" className="h-5 text-xs">
                    {dayRequests.length}
                  </Badge>
                )}
              </div>
              <div className="space-y-1">
                {dayRequests.slice(0, 3).map((req: any) => {
                  const Icon = getRequestTypeIcon(req.request_type);
                  return (
                    <div
                      key={req.id}
                      className={cn(
                        "text-xs p-1 rounded cursor-pointer hover:opacity-80 transition-opacity",
                        getStatusColor(req.status),
                        "text-white truncate flex items-center gap-1"
                      )}
                      onClick={() => navigate(`/requests?request=${req.id}`)}
                      title={req.title}
                    >
                      <Icon className="h-3 w-3 flex-shrink-0" />
                      <span className="truncate">{req.title}</span>
                    </div>
                  );
                })}
                {dayRequests.length > 3 && (
                  <div className="text-xs text-muted-foreground text-center">
                    +{dayRequests.length - 3} more
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
