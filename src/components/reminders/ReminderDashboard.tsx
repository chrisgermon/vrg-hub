import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, AlertTriangle, CheckCircle2, Bell, Archive, XCircle } from "lucide-react";

interface ReminderDashboardProps {
  onFilterClick: (filterType: 'all' | 'active' | 'completed') => void;
}

export function ReminderDashboard({ onFilterClick }: ReminderDashboardProps) {
  const { data: stats } = useQuery({
    queryKey: ['reminder-stats'],
    queryFn: async () => {
      const { data: reminders, error } = await supabase
        .from('reminders')
        .select('*');

      if (error) throw error;

      const now = new Date();
      now.setHours(0, 0, 0, 0);

      const oneWeek = new Date(now);
      oneWeek.setDate(oneWeek.getDate() + 7);

      const oneMonth = new Date(now);
      oneMonth.setMonth(oneMonth.getMonth() + 1);

      const expired = reminders?.filter(r => {
        const date = new Date(r.reminder_date);
        date.setHours(0, 0, 0, 0);
        return date < now && r.status === 'active';
      }).length || 0;

      const completed = reminders?.filter(r => r.status === 'completed').length || 0;
      
      const upcoming = reminders?.filter(r => {
        const date = new Date(r.reminder_date);
        date.setHours(0, 0, 0, 0);
        return date >= now && r.status === 'active';
      }).length || 0;

      const inOneWeek = reminders?.filter(r => {
        const date = new Date(r.reminder_date);
        date.setHours(0, 0, 0, 0);
        return date >= now && date <= oneWeek && r.status === 'active';
      }).length || 0;

      const inOneMonth = reminders?.filter(r => {
        const date = new Date(r.reminder_date);
        date.setHours(0, 0, 0, 0);
        return date > oneWeek && date <= oneMonth && r.status === 'active';
      }).length || 0;

      const total = reminders?.filter(r => r.is_active).length || 0;
      const inactive = reminders?.filter(r => !r.is_active).length || 0;
      const archived = reminders?.filter(r => r.status === 'archived').length || 0;
      const pendingAction = expired; // Expired items need action

      const compliance = total > 0 ? Math.round(((total - expired) / total) * 100) : 100;

      // Category breakdown
      const byCategory = reminders?.reduce((acc, r) => {
        const type = r.reminder_type || 'general';
        if (!acc[type]) {
          acc[type] = { expired: 0, pastDue: 0, inWeek: 0, inMonth: 0, total: 0 };
        }
        
        const date = new Date(r.reminder_date);
        date.setHours(0, 0, 0, 0);
        
        acc[type].total++;
        
        if (date < now && r.status === 'active') {
          acc[type].expired++;
          acc[type].pastDue++;
        } else if (date >= now && date <= oneWeek && r.status === 'active') {
          acc[type].inWeek++;
        } else if (date > oneWeek && date <= oneMonth && r.status === 'active') {
          acc[type].inMonth++;
        }
        
        return acc;
      }, {} as Record<string, { expired: number; pastDue: number; inWeek: number; inMonth: number; total: number }>);

      return {
        expired,
        completed,
        upcoming,
        compliance,
        pendingAction,
        inProcess: 0, // Can be enhanced based on workflow states
        inOneWeek,
        inOneMonth,
        total,
        archived,
        inactive,
        byCategory: byCategory || {},
      };
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const categoryIcons: Record<string, any> = {
    license_expiration: AlertTriangle,
    event: Calendar,
    certification: CheckCircle2,
    contract: Clock,
    subscription: Bell,
    general: Bell,
  };

  const categoryLabels: Record<string, string> = {
    license_expiration: 'License Expiration',
    event: 'Events',
    certification: 'Certifications',
    contract: 'Contracts',
    subscription: 'Subscriptions',
    general: 'General',
  };

  return (
    <div className="space-y-6">
      {/* Main Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card 
          className="border-l-4 border-l-destructive cursor-pointer hover:bg-accent/50 transition-colors"
          onClick={() => onFilterClick('active')}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Expired Items</CardTitle>
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{stats?.expired || 0}</div>
          </CardContent>
        </Card>

        <Card 
          className="border-l-4 border-l-primary cursor-pointer hover:bg-accent/50 transition-colors"
          onClick={() => onFilterClick('completed')}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.completed || 0}</div>
          </CardContent>
        </Card>

        <Card 
          className="border-l-4 border-l-muted-foreground cursor-pointer hover:bg-accent/50 transition-colors"
          onClick={() => onFilterClick('active')}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Upcoming</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.upcoming || 0}</div>
          </CardContent>
        </Card>

        <Card className={`border-l-4 ${(stats?.compliance || 0) < 50 ? 'border-l-destructive' : (stats?.compliance || 0) < 80 ? 'border-l-warning' : 'border-l-success'}`}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Compliance</CardTitle>
            <Badge variant={(stats?.compliance || 0) < 50 ? 'destructive' : 'default'}>
              {stats?.compliance || 0}%
            </Badge>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.compliance || 0}%</div>
          </CardContent>
        </Card>
      </div>

      {/* Secondary Stats */}
      <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Pending Action</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold text-warning">{stats?.pendingAction || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">In Process</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">{stats?.inProcess || 0}</div>
          </CardContent>
        </Card>

        <Card className="bg-warning/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">in 1 Week</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">{stats?.inOneWeek || 0}</div>
          </CardContent>
        </Card>

        <Card className="bg-accent/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">in 1 Month</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">{stats?.inOneMonth || 0}</div>
          </CardContent>
        </Card>

        <Card className="bg-primary/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Items</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">{stats?.total || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Archived</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold text-muted-foreground">{stats?.archived || 0}</div>
          </CardContent>
        </Card>
      </div>

      {/* Category Breakdown Table */}
      <Card>
        <CardHeader>
          <CardTitle>Category Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4 font-medium">Category</th>
                  <th className="text-center py-3 px-4 font-medium">Expired</th>
                  <th className="text-center py-3 px-4 font-medium">Past Due</th>
                  <th className="text-center py-3 px-4 font-medium">In 1 Week</th>
                  <th className="text-center py-3 px-4 font-medium">In 1 Month</th>
                  <th className="text-center py-3 px-4 font-medium">Total</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(stats?.byCategory || {}).map(([type, counts]) => {
                  const Icon = categoryIcons[type] || Bell;
                  return (
                    <tr key={type} className="border-b hover:bg-accent/50">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <Icon className="h-4 w-4" />
                          <span>{categoryLabels[type] || type}</span>
                        </div>
                      </td>
                      <td className="text-center py-3 px-4">
                        {counts.expired > 0 ? (
                          <Badge variant="destructive">{counts.expired}</Badge>
                        ) : (
                          <span className="text-muted-foreground">{counts.expired}</span>
                        )}
                      </td>
                      <td className="text-center py-3 px-4">
                        {counts.pastDue > 0 ? (
                          <Badge variant="destructive">{counts.pastDue}</Badge>
                        ) : (
                          <span className="text-muted-foreground">{counts.pastDue}</span>
                        )}
                      </td>
                      <td className="text-center py-3 px-4">
                        {counts.inWeek > 0 ? (
                          <Badge variant="default">{counts.inWeek}</Badge>
                        ) : (
                          <span className="text-muted-foreground">{counts.inWeek}</span>
                        )}
                      </td>
                      <td className="text-center py-3 px-4">
                        {counts.inMonth > 0 ? (
                          <Badge variant="secondary">{counts.inMonth}</Badge>
                        ) : (
                          <span className="text-muted-foreground">{counts.inMonth}</span>
                        )}
                      </td>
                      <td className="text-center py-3 px-4 font-medium">{counts.total}</td>
                    </tr>
                  );
                })}
                <tr className="border-t-2 font-semibold">
                  <td className="py-3 px-4">Total</td>
                  <td className="text-center py-3 px-4">{stats?.expired || 0}</td>
                  <td className="text-center py-3 px-4">{stats?.expired || 0}</td>
                  <td className="text-center py-3 px-4">{stats?.inOneWeek || 0}</td>
                  <td className="text-center py-3 px-4">{stats?.inOneMonth || 0}</td>
                  <td className="text-center py-3 px-4">{stats?.total || 0}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
