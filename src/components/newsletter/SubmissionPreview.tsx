import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { X, CheckCircle, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { useState } from 'react';

export function SubmissionPreview({ submissionId, onClose }: { submissionId: string; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [reviewNotes, setReviewNotes] = useState('');

  const { data: submission, isLoading } = useQuery({
    queryKey: ['newsletter-submission-detail', submissionId],
    queryFn: async () => {
      // Fetch submission
      const { data: submissionData, error: submissionError } = await supabase
        .from('newsletter_submissions')
        .select('*')
        .eq('id', submissionId)
        .single();
      
      if (submissionError) throw submissionError;
      
      // Fetch contributor profile
      const { data: contributorData } = await supabase
        .from('profiles')
        .select('full_name, email')
        .eq('id', submissionData.contributor_id)
        .single();
      
      // Fetch cycle
      const { data: cycleData } = await supabase
        .from('newsletter_cycles')
        .select('name, due_date')
        .eq('id', submissionData.cycle_id)
        .single();
      
      return {
        ...submissionData,
        contributor: contributorData,
        cycle: cycleData,
      };
    },
  });

  const updateSubmissionStatus = useMutation({
    mutationFn: async ({ status, notes }: { status: string; notes?: string }) => {
      const { error } = await supabase
        .from('newsletter_submissions')
        .update({
          status,
          review_notes: notes || null,
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', submissionId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['newsletter-submission-detail'] });
      queryClient.invalidateQueries({ queryKey: ['newsletter-stats'] });
      toast.success('Submission status updated');
      onClose();
    },
    onError: () => toast.error('Failed to update submission'),
  });

  if (isLoading) return <div>Loading...</div>;
  if (!submission) return <div>Submission not found</div>;

  const wordCount = submission.content?.trim().split(/\s+/).filter(Boolean).length || 0;

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>{submission.title}</CardTitle>
            <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
              <span>{submission.contributor?.full_name}</span>
              <span>•</span>
              <span>{submission.department}</span>
              <span>•</span>
              <Badge variant={submission.status === 'approved' ? 'default' : 'secondary'}>
                {submission.status}
              </Badge>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <p className="text-sm text-muted-foreground mb-2">
            Word count: {wordCount} words
          </p>
          <div className="prose prose-sm max-w-none bg-muted/30 p-4 rounded-lg">
            <p className="whitespace-pre-wrap">{submission.content}</p>
          </div>
        </div>

        {submission.status === 'submitted' && (
          <>
            <div className="space-y-2">
              <Label htmlFor="review_notes">Review Notes (Optional)</Label>
              <Textarea
                id="review_notes"
                value={reviewNotes}
                onChange={(e) => setReviewNotes(e.target.value)}
                placeholder="Add feedback or notes for the contributor..."
                rows={3}
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                onClick={() => updateSubmissionStatus.mutate({ status: 'revision_requested', notes: reviewNotes })}
                disabled={updateSubmissionStatus.isPending}
              >
                <XCircle className="h-4 w-4 mr-2" />
                Request Revision
              </Button>
              <Button
                onClick={() => updateSubmissionStatus.mutate({ status: 'approved', notes: reviewNotes })}
                disabled={updateSubmissionStatus.isPending}
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Approve
              </Button>
            </div>
          </>
        )}

        {submission.review_notes && (
          <div className="bg-muted/50 p-4 rounded-lg">
            <h4 className="font-semibold mb-2">Review Notes</h4>
            <p className="text-sm">{submission.review_notes}</p>
            {submission.reviewed_at && (
              <p className="text-xs text-muted-foreground mt-2">
                Reviewed on {new Date(submission.reviewed_at).toLocaleDateString()}
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
