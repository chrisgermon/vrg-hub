import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { DynamicFormRenderer } from '@/components/form-builder/DynamicFormRenderer';
import { FormTemplate } from '@/types/form-builder';

interface TemplatedDepartmentRequestFormProps {
  department: string;
  departmentLabel: string;
}

export function TemplatedDepartmentRequestForm({
  department,
  departmentLabel,
}: TemplatedDepartmentRequestFormProps) {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [template, setTemplate] = useState<FormTemplate | null>(null);
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    loadTemplate();
  }, [department]);

  const loadTemplate = async () => {
    try {
      const { data, error } = await supabase
        .from('form_templates')
        .select('*')
        .eq('department', department)
        .eq('is_active', true)
        .maybeSingle();

      if (error) throw error;
      
      setTemplate(data as any);
    } catch (error) {
      console.error('Error loading template:', error);
      toast({
        title: 'Error',
        description: 'Failed to load request form',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (formData: Record<string, any>) => {
    if (!user) {
      toast({
        title: 'Error',
        description: 'You must be logged in to submit a request',
        variant: 'destructive',
      });
      return;
    }

    setSubmitting(true);

    try {
      // Extract title from form data or use department name
      const title = formData.title || `${departmentLabel} Request`;
      const description = formData.description || JSON.stringify(formData);

      const { data: request, error } = await supabase
        .from('hardware_requests')
        .insert({
          title,
          description,
          business_justification: `${departmentLabel} request via form template`,
          user_id: user.id,
          status: 'submitted',
          priority: formData.priority || 'medium',
          currency: 'USD',
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Your request has been submitted successfully',
      });

      navigate(`/requests/${request.id}`);
    } catch (error) {
      console.error('Error submitting request:', error);
      toast({
        title: 'Error',
        description: 'Failed to submit request. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  if (!template) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>No Template Available</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            No form template is currently configured for {departmentLabel} requests.
            Please contact an administrator to set up a form template.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{template.name || `${departmentLabel} Request`}</CardTitle>
        {template.description && (
          <p className="text-sm text-muted-foreground mt-2">{template.description}</p>
        )}
      </CardHeader>
      <CardContent>
        <DynamicFormRenderer
          template={template}
          onSubmit={handleSubmit}
          isSubmitting={submitting}
        />
      </CardContent>
    </Card>
  );
}
