import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { FormBuilder } from '@/components/form-builder/FormBuilder';
import { FormTemplate } from '@/types/form-builder';
import { Plus, Edit, Trash2, Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

export default function FormTemplates() {
  const [templates, setTemplates] = useState<FormTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingTemplate, setEditingTemplate] = useState<FormTemplate | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const { toast } = useToast();
  const { userRole } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  const isAdmin = userRole === 'tenant_admin' || userRole === 'super_admin';

  useEffect(() => {
    loadTemplates();
  }, []);

  // Handle URL parameter for editing
  useEffect(() => {
    const editId = searchParams.get('edit');
    if (editId && templates.length > 0) {
      const templateToEdit = templates.find(t => t.id === editId);
      if (templateToEdit) {
        setEditingTemplate(templateToEdit);
        // Clear the search param after loading
        setSearchParams({});
      }
    }
  }, [searchParams, templates]);

  const loadTemplates = async () => {
    try {
      const { data, error } = await supabase
        .from('form_templates')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTemplates((data as any) || []);
    } catch (error) {
      console.error('Error loading templates:', error);
      toast({
        title: 'Error',
        description: 'Failed to load form templates',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (templateData: Partial<FormTemplate>) => {
    try {
      if (editingTemplate) {
        const { error } = await supabase
          .from('form_templates')
          .update({
            ...templateData,
            fields: templateData.fields as any,
          })
          .eq('id', editingTemplate.id);

        if (error) throw error;

        toast({
          title: 'Success',
          description: 'Form template updated successfully',
        });
      } else {
        const { error } = await supabase
          .from('form_templates')
          .insert({
            name: templateData.name!,
            description: templateData.description,
            form_type: 'department_request',
            department: templateData.department,
            fields: templateData.fields as any,
            is_active: templateData.is_active ?? true,
          });

        if (error) throw error;

        toast({
          title: 'Success',
          description: 'Form template created successfully',
        });
      }

      setEditingTemplate(null);
      setIsCreating(false);
      loadTemplates();
    } catch (error) {
      console.error('Error saving template:', error);
      toast({
        title: 'Error',
        description: 'Failed to save form template',
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this form template?')) return;

    try {
      const { error } = await supabase
        .from('form_templates')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Form template deleted successfully',
      });

      loadTemplates();
    } catch (error) {
      console.error('Error deleting template:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete form template',
        variant: 'destructive',
      });
    }
  };

  if (isCreating || editingTemplate) {
    return (
      <div className="container mx-auto p-6">
        <FormBuilder
          template={editingTemplate || undefined}
          onSave={handleSave}
          onCancel={() => {
            setEditingTemplate(null);
            setIsCreating(false);
          }}
        />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Form Templates</h1>
          <p className="text-muted-foreground mt-2">
            Create and manage custom form templates for different request types
          </p>
        </div>
        {isAdmin && (
          <Button onClick={() => setIsCreating(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Create Template
          </Button>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Available Templates</CardTitle>
        </CardHeader>
        <CardContent>
          {templates.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No form templates found. Create your first template to get started.
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Fields</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    {isAdmin && <TableHead className="text-right">Actions</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {templates.map((template) => (
                    <TableRow key={template.id}>
                      <TableCell className="font-medium">{template.name}</TableCell>
                      <TableCell>{template.department || '-'}</TableCell>
                      <TableCell>{template.fields?.length || 0}</TableCell>
                      <TableCell>
                        <Badge variant={template.is_active ? 'success' : 'secondary'}>
                          {template.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {new Date(template.created_at).toLocaleDateString()}
                      </TableCell>
                      {isAdmin && (
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setEditingTemplate(template)}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(template.id)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
