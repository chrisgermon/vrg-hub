import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { FileText, Users, Calendar, Eye } from 'lucide-react';
import { CycleManagement } from './CycleManagement';
import { SubmissionPreview } from './SubmissionPreview';

export function EditorDashboard() {
  const [selectedSubmissionId, setSelectedSubmissionId] = useState<string | null>(null);

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

  const { data: recentSubmissions = [] } = useQuery({
    queryKey: ['newsletter-submissions-recent'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('newsletter_submissions')
        .select('id, title, department, status, submitted_at, contributor_id')
        .order('submitted_at', { ascending: false })
        .limit(10);
      if (error) throw error;

      // Fetch contributor names separately
      const contributorIds = [...new Set(data?.map(s => s.contributor_id).filter(Boolean))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', contributorIds);

      const profileMap = new Map(profiles?.map(p => [p.id, p.full_name]) || []);

      return data?.map(s => ({
        ...s,
        contributor_name: profileMap.get(s.contributor_id) || 'Unknown',
      })) || [];
    },
  });

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (selectedSubmissionId) {
    return (
      <SubmissionPreview 
        submissionId={selectedSubmissionId} 
        onClose={() => setSelectedSubmissionId(null)} 
      />
    );
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
              {recentSubmissions.length === 0 ? (
                <p className="text-center py-8 text-muted-foreground">
                  No submissions yet
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Title</TableHead>
                      <TableHead>Contributor</TableHead>
                      <TableHead>Department</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Submitted</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recentSubmissions.map((submission: any) => (
                      <TableRow key={submission.id}>
                        <TableCell className="font-medium">{submission.title}</TableCell>
                        <TableCell>{submission.contributor_name}</TableCell>
                        <TableCell>{submission.department}</TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              submission.status === 'approved'
                                ? 'default'
                                : submission.status === 'submitted'
                                ? 'secondary'
                                : 'outline'
                            }
                          >
                            {submission.status.replace('_', ' ')}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {submission.submitted_at
                            ? new Date(submission.submitted_at).toLocaleDateString()
                            : '-'}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedSubmissionId(submission.id)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
