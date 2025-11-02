import { useQuery } from '@tanstack/react-query';
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

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (selectedAssignment) {
    return (
      <NewsletterSubmissionForm
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
          {assignments.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">
              No assignments yet
            </p>
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
                        {assignment.topic && (
                          <p className="text-sm">Topic: {assignment.topic}</p>
                        )}
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
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}