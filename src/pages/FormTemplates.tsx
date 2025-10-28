import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { FormBuilder } from '@/components/form-builder/FormBuilder';
import { FormTemplate } from '@/types/form-builder';
import { Plus, Edit, Trash2, Loader2, Sparkles } from 'lucide-react';
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
import { Info } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

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
      const { data: templatesData, error } = await supabase
        .from('form_templates')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch request type names for templates that have them
      const requestTypeIds = (templatesData || [])
        .map(t => {
          const settings = t.settings as any;
          return settings?.request_type_id;
        })
        .filter(Boolean);

      let requestTypesMap: Record<string, string> = {};
      if (requestTypeIds.length > 0) {
        const { data: requestTypesData } = await supabase
          .from('request_types')
          .select('id, name')
          .in('id', requestTypeIds);

        if (requestTypesData) {
          requestTypesMap = requestTypesData.reduce((acc, rt) => {
            acc[rt.id] = rt.name;
            return acc;
          }, {} as Record<string, string>);
        }
      }

      // Attach request type names to templates
      const enrichedTemplates = (templatesData || []).map(t => {
        const settings = t.settings as any;
        return {
          ...t,
          request_type_name: settings?.request_type_id 
            ? requestTypesMap[settings.request_type_id] 
            : null
        };
      });

      setTemplates(enrichedTemplates as any);
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
      // Check for duplicate names (excluding current template if editing)
      const { data: existingTemplates } = await supabase
        .from('form_templates')
        .select('id, name')
        .eq('name', templateData.name!)
        .neq('id', editingTemplate?.id || '00000000-0000-0000-0000-000000000000');

      if (existingTemplates && existingTemplates.length > 0) {
        toast({
          title: 'Error',
          description: 'A form template with this name already exists',
          variant: 'destructive',
        });
        return;
      }

      let templateId = editingTemplate?.id;

      if (editingTemplate) {
        const updateData: any = {
          name: templateData.name!,
          description: templateData.description,
          fields: templateData.fields as any,
          is_active: templateData.is_active,
          settings: templateData.settings,
        };
        
        // Only include form_type and department_id if they are set
        if (templateData.form_type) {
          updateData.form_type = templateData.form_type;
        }
        if (templateData.department_id) {
          updateData.department_id = templateData.department_id;
        }

        const { error } = await supabase
          .from('form_templates')
          .update(updateData)
          .eq('id', editingTemplate.id);

        if (error) throw error;

        toast({
          title: 'Success',
          description: 'Form template updated successfully',
        });
      } else {
        const { data: newTemplate, error } = await supabase
          .from('form_templates')
          .insert({
            name: templateData.name!,
            description: templateData.description,
            form_type: templateData.form_type as 'department_request' | 'hardware_request' | 'toner_request' | 'user_account_request' | 'general',
            department_id: templateData.department_id,
            fields: templateData.fields as any,
            is_active: templateData.is_active ?? true,
            settings: templateData.settings,
          })
          .select()
          .single();

        if (error) throw error;
        templateId = newTemplate.id;

        toast({
          title: 'Success',
          description: 'Form template created successfully',
        });
      }

      // If request type and category info provided, create/update request category
      const requestTypeId = templateData.settings?.request_type_id;
      const categoryName = templateData.settings?.category_name;
      const categorySlug = templateData.settings?.category_slug;

      if (requestTypeId && categoryName && categorySlug && templateId) {
        // Check if category already exists
        const { data: existingCategory } = await supabase
          .from('request_categories')
          .select('id')
          .eq('request_type_id', requestTypeId)
          .eq('slug', categorySlug)
          .maybeSingle();

        if (existingCategory) {
          // Update existing category
          const { error: catError } = await supabase
            .from('request_categories')
            .update({
              name: categoryName,
              form_template_id: templateId,
            })
            .eq('id', existingCategory.id);

          if (catError) throw catError;
        } else {
          // Create new category
          const { error: catError } = await supabase
            .from('request_categories')
            .insert({
              request_type_id: requestTypeId,
              name: categoryName,
              slug: categorySlug,
              form_template_id: templateId,
              is_active: true,
            });

          if (catError) throw catError;
        }
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
    if (!confirm('Are you sure you want to delete this form template? This will also remove its category link.')) return;

    try {
      // First delete any associated request categories
      const { error: categoryError } = await supabase
        .from('request_categories')
        .delete()
        .eq('form_template_id', id);

      if (categoryError) throw categoryError;

      // Then delete the form template
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
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Request Forms & Categories</h1>
        <p className="text-muted-foreground mt-2">
          Create custom forms that become categories under request types
        </p>
      </div>

      <Alert className="mb-6">
        <Info className="h-4 w-4" />
        <AlertDescription>
          Each form template you create can be linked to a Request Type (like "IT Service Desk"). 
          When linked, the form becomes a clickable category option for that request type. 
          Parent request types don't have their own forms - only their categories do.
        </AlertDescription>
      </Alert>

      <div className="flex justify-between items-center mb-6 gap-2">
        {isAdmin && (
          <>
            <Button onClick={() => setIsCreating(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Create Form
            </Button>
            <Button variant="outline" onClick={() => window.location.href = '/form-templates/assign'}>
              <Sparkles className="w-4 h-4 mr-2" />
              AI Assign Categories
            </Button>
          </>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Form Templates</CardTitle>
        </CardHeader>
        <CardContent>
          {templates.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No form templates found. Create your first form to get started.
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Form Name</TableHead>
                    <TableHead>Request Type</TableHead>
                    <TableHead>Category Name</TableHead>
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
                      <TableCell>
                        {(template as any).request_type_name || (
                          <span className="text-muted-foreground italic">Not linked</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {template.settings?.category_name || (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
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
