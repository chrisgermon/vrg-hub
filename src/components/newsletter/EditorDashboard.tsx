import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FileText, Users, Calendar } from 'lucide-react';
import { CycleManagement } from './CycleManagement';

export function EditorDashboard() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['newsletter-stats'],
    queryFn: async () => {
      const [cycles, assignments, submissions] = await Promise.all([
        supabase.from('newsletter_cycles').select('id', { count: 'exact', head: true }),
        supabase.from('newsletter_assignments').select('id', { count: 'exact', head: true }),
        supabase.from('newsletter_submissions').select('id, status').eq('status', 'submitted'),
      ]);

      return {
        totalCycles: cycles.count || 0,
        totalAssignments: assignments.count || 0,
        pendingReview: submissions.data?.length || 0,
      };
    },
  });

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Cycles</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalCycles}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Assignments</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalAssignments}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Review</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.pendingReview}</div>
            {stats?.pendingReview && stats.pendingReview > 0 && (
              <Badge variant="destructive" className="mt-2">
                Needs Attention
              </Badge>
            )}
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="cycles" className="w-full">
        <TabsList>
          <TabsTrigger value="cycles">Cycles</TabsTrigger>
          <TabsTrigger value="submissions">Recent Submissions</TabsTrigger>
        </TabsList>

        <TabsContent value="cycles">
          <CycleManagement onCycleCreated={() => {}} />
        </TabsContent>

        <TabsContent value="submissions">
          <Card>
            <CardHeader>
              <CardTitle>Recent Submissions</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">Submission review coming soon</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
