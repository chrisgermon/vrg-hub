import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { RichTextEditor } from '@/components/ui/rich-text-editor';
import { toast } from 'sonner';
import { CheckCircle, Send } from 'lucide-react';
import { useDepartmentTemplate } from '@/lib/newsletterDepartments';

interface SectionData {
  section: string;
  content: string;
  isRequired: boolean;
}

export function NewsletterSubmissionForm({ 
  assignmentId, 
  cycleId, 
  department,
  onSuccess,
  onCancel
}: { 
  assignmentId: string; 
  cycleId: string; 
  department: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [sectionsData, setSectionsData] = useState<SectionData[]>([]);
  const [noUpdateThisMonth, setNoUpdateThisMonth] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  // Fetch department template sections from database
  const { data: departmentTemplate, isLoading: templateLoading } = useDepartmentTemplate(department);

  // Initialize sections data from template
  useEffect(() => {
    if (departmentTemplate?.sections) {
      const sections = departmentTemplate.sections as any[];
      const initialSections = sections.map(section => ({
        section: section.key,
        content: '',
        isRequired: section.isRequired,
      }));
      setSectionsData(initialSections);
    }
  }, [departmentTemplate]);

  const { data: assignment } = useQuery({
    queryKey: ['newsletter-assignment', assignmentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('newsletter_assignments')
        .select('*, cycle:newsletter_cycles(*)')
        .eq('id', assignmentId)
        .single();
      if (error) throw error;
      return data;
    },
  });

  const { data: existingSubmission, isLoading } = useQuery({
    queryKey: ['newsletter-submission', assignmentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('newsletter_submissions')
        .select('*')
        .eq('assignment_id', assignmentId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (existingSubmission) {
      setNoUpdateThisMonth(existingSubmission.no_update_this_month || false);
      
      if (existingSubmission.sections_data) {
        setSectionsData(existingSubmission.sections_data as unknown as SectionData[]);
      }
    }
  }, [existingSubmission]);

  const saveSubmission = useMutation({
    mutationFn: async ({ status }: { status: string }) => {
      // Generate default title from department and cycle
      const defaultTitle = assignment?.cycle?.name 
        ? `${department} - ${assignment.cycle.name}`
        : `${department} Submission`;

      const submissionData = {
        assignment_id: assignmentId,
        cycle_id: cycleId,
        contributor_id: user?.id,
        department,
        title: defaultTitle,
        content: '', // Keep for backward compatibility
        sections_data: sectionsData as any,
        no_update_this_month: noUpdateThisMonth,
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

      if (status === 'submitted') {
        await supabase
          .from('newsletter_assignments')
          .update({ 
            status: 'submitted',
            submitted_at: new Date().toISOString()
          })
          .eq('id', assignmentId);
      }
    },
    onSuccess: (_, { status }) => {
      queryClient.invalidateQueries({ queryKey: ['newsletter-submission', assignmentId] });
      queryClient.invalidateQueries({ queryKey: ['newsletter-assignments'] });
      setLastSaved(new Date());
      toast.success(status === 'submitted' ? 'Submission sent!' : 'Draft saved');
      if (status === 'submitted' && onSuccess) {
        onSuccess();
      }
    },
    onError: (error: Error) => {
      toast.error(`Failed to save: ${error.message}`);
    },
  });

  const handleSectionChange = (sectionKey: string, content: string) => {
    setSectionsData(prev => 
      prev.map(section => 
        section.section === sectionKey 
          ? { ...section, content }
          : section
      )
    );
  };

  const handleSaveDraft = () => {
    saveSubmission.mutate({ status: 'draft' });
  };

  const handleSubmit = () => {
    const requiredSections = sectionsData.filter(s => s.isRequired);
    const missingRequired = requiredSections.filter(s => !s.content.trim());
    
    if (missingRequired.length > 0 && !noUpdateThisMonth) {
      const sectionNames = missingRequired
        .map(s => departmentSections.find(ds => ds.key === s.section)?.name)
        .join(', ');
      toast.error(`Please fill in required sections: ${sectionNames}`);
      return;
    }

    if (confirm('Submit your contribution? You cannot edit after submission.')) {
      saveSubmission.mutate({ status: 'submitted' });
    }
  };

  if (isLoading || templateLoading) {
    return <div className="text-center py-8">Loading...</div>;
  }

  if (!departmentTemplate) {
    return <div className="text-center py-8">Department template not found</div>;
  }

  const departmentSections = (departmentTemplate.sections as any[]) || [];

  if (existingSubmission?.status === 'submitted') {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
          <h3 className="text-xl font-semibold mb-2">Submission Complete</h3>
          <p className="text-muted-foreground">
            Your contribution has been submitted and is under review.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Newsletter Submission - {department}</CardTitle>
            </div>
            <div className="flex items-center gap-4">
              {lastSaved && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <CheckCircle className="h-3 w-3" />
                  <span>Saved {lastSaved.toLocaleTimeString()}</span>
                </div>
              )}
              <Button
                variant="outline"
                onClick={handleSaveDraft}
                disabled={saveSubmission.isPending}
              >
                Save Draft
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={saveSubmission.isPending}
              >
                <Send className="h-4 w-4 mr-2" />
                Submit
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="no-update"
              checked={noUpdateThisMonth}
              onCheckedChange={(checked) => setNoUpdateThisMonth(checked as boolean)}
              disabled={existingSubmission?.status === 'submitted'}
            />
            <label
              htmlFor="no-update"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              No updates this month
            </label>
          </div>

          {!noUpdateThisMonth && (
            <div className="space-y-6">
              {departmentSections.map((section: any) => {
                const sectionData = sectionsData.find(s => s.section === section.key);
                return (
                  <div key={section.key} className="space-y-2">
                    <Label htmlFor={section.key}>
                      {section.name} {section.isRequired && <span className="text-destructive">*</span>}
                    </Label>
                    <RichTextEditor
                      value={sectionData?.content || ''}
                      onChange={(content) => handleSectionChange(section.key, content)}
                      placeholder={`Enter ${section.name.toLowerCase()}...`}
                      disabled={existingSubmission?.status === 'submitted'}
                    />
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
