import { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { ArrowLeft, Save, Send, CheckCircle } from 'lucide-react';

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
  const [noUpdate, setNoUpdate] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [isDirty, setIsDirty] = useState(false);

  const { data: assignment } = useQuery({
    queryKey: ['newsletter-assignment', cycleId, department, user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('newsletter_assignments')
        .select('*, template:template_id(*)')
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

  useEffect(() => {
    if (existingSubmission) {
      setTitle(existingSubmission.title || '');
      setContent(existingSubmission.content || '');
      setNoUpdate(existingSubmission.no_update_this_month || false);
    }
  }, [existingSubmission]);

  // Auto-save every 30 seconds
  useEffect(() => {
    if (!isDirty || !assignment?.id) return;
    const timer = setTimeout(() => {
      saveSubmission.mutate({ status: 'draft', silent: true });
      setIsDirty(false);
    }, 30000);
    return () => clearTimeout(timer);
  }, [title, content, noUpdate, isDirty, assignment?.id]);

  const saveSubmission = useMutation({
    mutationFn: async ({ status, silent }: { status: 'draft' | 'submitted'; silent?: boolean }) => {
      const submissionData = {
        cycle_id: cycleId,
        assignment_id: assignment?.id,
        contributor_id: user?.id,
        department,
        title,
        content,
        status,
        no_update_this_month: noUpdate,
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

      if (assignment?.id && status === 'submitted') {
        await supabase
          .from('newsletter_assignments')
          .update({ status: 'submitted', submitted_at: new Date().toISOString() })
          .eq('id', assignment.id);
      }
      return { silent };
    },
    onSuccess: ({ silent }, { status }) => {
      queryClient.invalidateQueries({ queryKey: ['newsletter-assignments'] });
      queryClient.invalidateQueries({ queryKey: ['newsletter-submission'] });
      setLastSaved(new Date());
      if (!silent) {
        toast.success(status === 'submitted' ? 'Submission sent!' : 'Draft saved');
        if (status === 'submitted') onSuccess();
      }
    },
    onError: () => toast.error('Failed to save submission'),
  });

  const handleSaveDraft = () => {
    saveSubmission.mutate({ status: 'draft' });
    setIsDirty(false);
  };

  const handleSubmit = () => {
    if (noUpdate) {
      if (confirm('Submit "No update this month"?')) {
        saveSubmission.mutate({ status: 'submitted' });
      }
      return;
    }
    if (!title.trim() || !content.trim()) {
      toast.error('Please fill in both title and content');
      return;
    }
    if (confirm('Submit your contribution? You cannot edit after submission.')) {
      saveSubmission.mutate({ status: 'submitted' });
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
                Target: {assignment?.word_count || 200} words • Current: {wordCount} words
              </p>
            </div>
            <div className="flex items-center gap-4">
              {lastSaved && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <CheckCircle className="h-3 w-3" />
                  <span>Saved {lastSaved.toLocaleTimeString()}</span>
                </div>
              )}
              <Button variant="ghost" size="sm" onClick={onCancel}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {existingSubmission?.status === 'submitted' ? (
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
              <p className="text-sm text-green-800 dark:text-green-200">
                ✓ Submission completed on {new Date(existingSubmission.submitted_at!).toLocaleDateString()}
              </p>
            </div>
          ) : (
            <>
              <div className="flex items-center space-x-2 bg-muted/50 p-3 rounded-lg">
                <Switch
                  id="no-update"
                  checked={noUpdate}
                  onCheckedChange={(checked) => {
                    setNoUpdate(checked);
                    setIsDirty(true);
                  }}
                />
                <Label htmlFor="no-update">No update this month</Label>
              </div>

              {!noUpdate && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="title">Title *</Label>
                    <Input
                      id="title"
                      value={title}
                      onChange={(e) => {
                        setTitle(e.target.value);
                        setIsDirty(true);
                      }}
                      placeholder="Enter title"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="content">Content *</Label>
                    <Textarea
                      id="content"
                      value={content}
                      onChange={(e) => {
                        setContent(e.target.value);
                        setIsDirty(true);
                      }}
                      placeholder="Write your content..."
                      rows={15}
                    />
                  </div>
                </>
              )}

              <div className="flex gap-2 justify-end pt-4 border-t">
                <Button variant="outline" onClick={handleSaveDraft} disabled={saveSubmission.isPending}>
                  <Save className="h-4 w-4 mr-2" />
                  Save Draft
                </Button>
                <Button onClick={handleSubmit} disabled={saveSubmission.isPending || (noUpdate ? false : !title || !content)}>
                  <Send className="h-4 w-4 mr-2" />
                  Submit
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
