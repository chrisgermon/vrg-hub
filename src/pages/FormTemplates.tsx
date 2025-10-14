import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { FormBuilder } from '@/components/form-builder/FormBuilder';
import { FormTemplate, FormField } from '@/types/form-builder';
import { Plus, Edit, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useNavigate } from 'react-router-dom';

export default function FormTemplates() {
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [selectedTemplate, setSelectedTemplate] = useState<FormTemplate | null>(null);
  const [isBuilderOpen, setIsBuilderOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data: templates, isLoading } = useQuery({
    queryKey: ['form-templates', profile?.company_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('form_templates')
        .select('*')
        .eq('company_id', profile?.company_id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []).map(row => ({
        ...row,
        fields: (row.fields as any) as FormField[],
        settings: (row.settings as any) || {},
      })) as FormTemplate[];
    },
    enabled: !!profile?.company_id,
  });

  const saveMutation = useMutation({
    mutationFn: async (template: Partial<FormTemplate>) => {
      const data: any = {
        company_id: profile?.company_id,
        name: template.name,
        description: template.description,
        form_type: template.form_type || 'custom',
        department: template.department,
        sub_department: template.sub_department,
        fields: template.fields || [],
        settings: template.settings || {},
        is_active: template.is_active,
        updated_by: profile?.user_id,
      };

      if (selectedTemplate?.id) {
        const { error } = await supabase
          .from('form_templates')
          .update(data)
          .eq('id', selectedTemplate.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('form_templates')
          .insert({ ...data, created_by: profile?.user_id });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['form-templates'] });
      queryClient.invalidateQueries({ queryKey: ['form-template'] });
      toast.success('Form template saved successfully');
      setIsBuilderOpen(false);
      setSelectedTemplate(null);
    },
    onError: (error) => {
      toast.error('Failed to save form template');
      console.error(error);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('form_templates')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['form-templates'] });
      toast.success('Form template deleted');
      setDeleteId(null);
    },
    onError: () => {
      toast.error('Failed to delete form template');
    },
  });

  if (isBuilderOpen) {
    return (
      <div className="h-screen p-6">
        <FormBuilder
          template={selectedTemplate || undefined}
          onSave={(template) => saveMutation.mutate(template)}
          onCancel={() => {
            setIsBuilderOpen(false);
            setSelectedTemplate(null);
          }}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Form Templates</h1>
          <p className="text-muted-foreground">
            Create and manage custom request forms
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => navigate('/form-templates/seed')}
          >
            Import Existing Forms
          </Button>
          <Button onClick={() => setIsBuilderOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            New Template
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div>Loading templates...</div>
      ) : templates?.length === 0 ? (
        <Card className="p-12 text-center">
          <p className="text-muted-foreground mb-4">
            No form templates yet. Create your first one!
          </p>
          <Button onClick={() => setIsBuilderOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Create Template
          </Button>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {templates?.map((template) => (
            <Card key={template.id} className="p-6">
              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold">{template.name}</h3>
                  {template.description && (
                    <p className="text-sm text-muted-foreground mt-1">
                      {template.description}
                    </p>
                  )}
                  <div className="flex gap-2 mt-2 text-xs text-muted-foreground">
                    <span className="capitalize">{template.form_type}</span>
                    <span>•</span>
                    <span>{template.fields.length} fields</span>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => {
                      setSelectedTemplate(template);
                      setIsBuilderOpen(true);
                    }}
                  >
                    <Edit className="w-4 h-4 mr-1" />
                    Edit
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setDeleteId(template.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Form Template</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure? This will permanently delete this form template.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteId && deleteMutation.mutate(deleteId)}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
