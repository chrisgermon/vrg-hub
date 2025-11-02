import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FileText, Clock, CheckCircle } from 'lucide-react';
import { useState } from 'react';
import { NewsletterSubmissionForm } from './NewsletterSubmissionForm';

export function ContributorDashboard() {
  const { user } = useAuth();
  const [selectedAssignment, setSelectedAssignment] = useState<any>(null);
  const queryClient = useQueryClient();

  // Latest cycle (most recent by due date)
  const { data: latestCycle } = useQuery({
    queryKey: ['latest-newsletter-cycle'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('newsletter_cycles')
        .select('*')
        .order('due_date', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  // Department assignments for this user
  const { data: deptAssignments = [] } = useQuery({
    queryKey: ['my-department-assignments', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('department_assignments')
        .select('*')
        .contains('assignee_ids', [user?.id]);
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });

  // My newsletter assignments
  const { data: assignments = [], isLoading } = useQuery({
    queryKey: ['my-newsletter-assignments', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('newsletter_assignments')
        .select(`
          *,
          cycle:newsletter_cycles(*)
        `)
        .eq('contributor_id', user?.id)
        .order('assigned_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });

  // Create missing assignment on demand
  const createAssignment = useMutation({
    mutationFn: async (department: string) => {
      if (!latestCycle?.id || !user?.id) throw new Error('No active cycle or user');
      const { data, error } = await supabase
        .from('newsletter_assignments')
        .insert({
          cycle_id: latestCycle.id,
          contributor_id: user.id,
          department,
          status: 'in_progress',
        })
        .select(`*, cycle:newsletter_cycles(*)`)
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['my-newsletter-assignments', user?.id] });
      setSelectedAssignment(data);
    },
  });

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8">
          <p className="text-center text-muted-foreground">Loading your assignments...</p>
        </CardContent>
      </Card>
    );
  }

  const potentialDepartments = latestCycle
    ? (deptAssignments as any[])
        .map((d: any) => d.department)
        .filter((dep: string) =>
          (dep ?? '').length > 0 &&
          (assignments as any[]).every(
            (a: any) => !(a.cycle_id === latestCycle.id && a.department === dep)
          )
        )
    : [];

  if (selectedAssignment) {
    return (
      <NewsletterSubmissionForm
        assignmentId={selectedAssignment.id}
        cycleId={selectedAssignment.cycle_id}
        department={selectedAssignment.department}
        onSuccess={() => setSelectedAssignment(null)}
        onCancel={() => setSelectedAssignment(null)}
      />
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>My Newsletter Assignments</CardTitle>
          <CardDescription>
            Your assigned newsletter contributions
          </CardDescription>
        </CardHeader>
        <CardContent>
          {(assignments.length === 0 && potentialDepartments.length === 0) ? (
            <div className="text-center py-8 space-y-2">
              <p className="text-muted-foreground">
                No active assignments yet
              </p>
              <p className="text-sm text-muted-foreground">
                Assignments will appear here when an editor creates them for a newsletter cycle
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {assignments.map((assignment: any) => (
                <Card key={assignment.id}>
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between">
                      <div className="space-y-2">
                        <h3 className="font-semibold">{assignment.cycle?.name}</h3>
                        <p className="text-sm text-muted-foreground">
                          Department: {assignment.department}
                        </p>
                        <p className="text-sm text-muted-foreground flex items-center gap-2">
                          <Clock className="h-4 w-4" />
                          Due: {new Date(assignment.cycle?.due_date).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <Badge
                          variant={
                            assignment.status === 'completed'
                              ? 'success'
                              : assignment.status === 'in_progress'
                              ? 'default'
                              : 'secondary'
                          }
                        >
                          {assignment.status === 'completed' && <CheckCircle className="h-3 w-3 mr-1" />}
                          {assignment.status.replace('_', ' ')}
                        </Badge>
                        {assignment.status !== 'completed' && (
                          <Button
                            size="sm"
                            onClick={() => setSelectedAssignment(assignment)}
                          >
                            <FileText className="h-4 w-4 mr-2" />
                            {assignment.status === 'in_progress' ? 'Continue' : 'Start'}
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}

              {latestCycle && potentialDepartments.map((dept: string) => (
                <Card key={`virtual-${dept}`}>
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between">
                      <div className="space-y-2">
                        <h3 className="font-semibold">{latestCycle.name}</h3>
                        <p className="text-sm text-muted-foreground">Department: {dept}</p>
                        <p className="text-sm text-muted-foreground flex items-center gap-2">
                          <Clock className="h-4 w-4" />
                          Due: {latestCycle?.due_date ? new Date(latestCycle.due_date as any).toLocaleDateString() : 'TBA'}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <Badge variant="secondary">not started</Badge>
                        <Button
                          size="sm"
                          onClick={() => createAssignment.mutate(dept)}
                          disabled={createAssignment.isPending}
                        >
                          <FileText className="h-4 w-4 mr-2" />
                          Start
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
