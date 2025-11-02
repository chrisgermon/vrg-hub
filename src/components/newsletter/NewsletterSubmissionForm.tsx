import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { ArrowLeft, Save, Send } from 'lucide-react';

export function NewsletterSubmissionForm({
  cycleId,
  department,
  onSuccess,
  onCancel,
}: {
  cycleId: string;
  department: string;
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');

  const { data: assignment } = useQuery({
    queryKey: ['newsletter-assignment', cycleId, department, user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('newsletter_assignments')
        .select('*')
        .eq('cycle_id', cycleId)
        .eq('department', department)
        .eq('contributor_id', user?.id)
        .single();
      if (error) throw error;
      return data;
    },
  });

  const { data: existingSubmission } = useQuery({
    queryKey: ['newsletter-submission', assignment?.id],
    queryFn: async () => {
      if (!assignment?.id) return null;
      const { data, error } = await supabase
        .from('newsletter_submissions')
        .select('*')
        .eq('assignment_id', assignment.id)
        .single();
      if (error && error.code !== 'PGRST116') throw error;
      return data;
    },
    enabled: !!assignment?.id,
  });

  const saveSubmission = useMutation({
    mutationFn: async (status: 'draft' | 'submitted') => {
      const submissionData = {
        cycle_id: cycleId,
        assignment_id: assignment?.id,
        contributor_id: user?.id,
        department,
        title,
        content,
        status,
        submitted_at: status === 'submitted' ? new Date().toISOString() : null,
      };

      if (existingSubmission) {
        const { error } = await supabase
          .from('newsletter_submissions')
          .update(submissionData)
          .eq('id', existingSubmission.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('newsletter_submissions')
          .insert(submissionData);
        if (error) throw error;
      }

      // Update assignment status
      if (assignment?.id && status === 'submitted') {
        await supabase
          .from('newsletter_assignments')
          .update({ status: 'completed', submitted_at: new Date().toISOString() })
          .eq('id', assignment.id);
      }
    },
    onSuccess: (_, status) => {
      queryClient.invalidateQueries({ queryKey: ['newsletter-assignments'] });
      queryClient.invalidateQueries({ queryKey: ['newsletter-submission'] });
      toast.success(status === 'submitted' ? 'Submission sent!' : 'Draft saved');
      if (status === 'submitted') {
        onSuccess();
      }
    },
    onError: () => toast.error('Failed to save submission'),
  });

  // Load existing submission
  useState(() => {
    if (existingSubmission) {
      setTitle(existingSubmission.title || '');
      setContent(existingSubmission.content || '');
    }
  });

  const handleSaveDraft = () => saveSubmission.mutate('draft');
  const handleSubmit = () => {
    if (!title.trim() || !content.trim()) {
      toast.error('Please fill in both title and content');
      return;
    }
    if (confirm('Submit your newsletter contribution? You will not be able to edit it after submission.')) {
      saveSubmission.mutate('submitted');
    }
  };

  const wordCount = content.trim().split(/\s+/).filter(Boolean).length;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Newsletter Submission - {department}</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Target word count: {assignment?.word_count || 200} words • Current: {wordCount} words
              </p>
            </div>
            <Button variant="ghost" size="sm" onClick={onCancel}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Article Title *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter a catchy title for your article"
              disabled={existingSubmission?.status === 'submitted'}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="content">Content *</Label>
            <Textarea
              id="content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Write your newsletter contribution here..."
              rows={15}
              disabled={existingSubmission?.status === 'submitted'}
            />
          </div>
          {existingSubmission?.status !== 'submitted' && (
            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                onClick={handleSaveDraft}
                disabled={saveSubmission.isPending || !title.trim() || !content.trim()}
              >
                <Save className="h-4 w-4 mr-2" />
                Save Draft
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={saveSubmission.isPending || !title.trim() || !content.trim()}
              >
                <Send className="h-4 w-4 mr-2" />
                Submit
              </Button>
            </div>
          )}
          {existingSubmission?.status === 'submitted' && (
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
              <p className="text-sm text-green-800 dark:text-green-200">
                ✓ Submission completed on {new Date(existingSubmission.submitted_at!).toLocaleDateString()}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
