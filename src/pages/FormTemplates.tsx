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

interface CategoryWithForm {
  id: string;
  name: string;
  slug: string;
  request_type_id: string;
  request_type_name: string;
  form_template_id: string | null;
  form_template?: FormTemplate | null;
}

export default function FormTemplates() {
  const [categories, setCategories] = useState<CategoryWithForm[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingTemplate, setEditingTemplate] = useState<FormTemplate | null>(null);
  const [editingCategory, setEditingCategory] = useState<CategoryWithForm | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const { toast } = useToast();
  const { userRole } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  const isAdmin = userRole === 'tenant_admin' || userRole === 'super_admin';

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      // Fetch all categories with their request types
      const { data: categoriesData, error: categoriesError } = await supabase
        .from('request_categories')
        .select(`
          id,
          name,
          slug,
          request_type_id,
          form_template_id,
          request_types(name)
        `)
        .eq('is_active', true)
        .order('request_types(name)', { ascending: true })
        .order('sort_order', { ascending: true });

      if (categoriesError) throw categoriesError;

      // Fetch all form templates
      const { data: templatesData, error: templatesError } = await supabase
        .from('form_templates')
        .select('*');

      if (templatesError) throw templatesError;

      // Create a map of templates by ID
      const templatesMap = (templatesData || []).reduce((acc, t) => {
        acc[t.id] = {
          ...t,
          fields: (t.fields as any) || [],
        } as FormTemplate;
        return acc;
      }, {} as Record<string, FormTemplate>);

      // Enrich categories with form template data
      const enrichedCategories = (categoriesData || []).map(cat => ({
        id: cat.id,
        name: cat.name,
        slug: cat.slug,
        request_type_id: cat.request_type_id,
        request_type_name: (cat.request_types as any)?.name || 'Unknown',
        form_template_id: cat.form_template_id,
        form_template: cat.form_template_id ? templatesMap[cat.form_template_id] : null,
      }));

      setCategories(enrichedCategories);
    } catch (error) {
      console.error('Error loading categories:', error);
      toast({
        title: 'Error',
        description: 'Failed to load categories',
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
      setEditingCategory(null);
      setIsCreating(false);
      loadCategories();
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

      loadCategories();
    } catch (error) {
      console.error('Error deleting template:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete form template',
        variant: 'destructive',
      });
    }
  };

  const handleCreateFormForCategory = (category: CategoryWithForm) => {
    setEditingCategory(category);
    setIsCreating(true);
  };

  const handleEditFormForCategory = (category: CategoryWithForm) => {
    if (category.form_template) {
      setEditingTemplate(category.form_template);
      setEditingCategory(category);
    }
  };

  if (isCreating || editingTemplate) {
    // Pre-populate form with category info if creating/editing for a specific category
    const initialTemplate = editingTemplate || (editingCategory ? {
      settings: {
        request_type_id: editingCategory.request_type_id,
        category_name: editingCategory.name,
        category_slug: editingCategory.slug,
      }
    } : undefined);

    return (
      <div className="container mx-auto p-6">
        <FormBuilder
          template={initialTemplate as any}
          onSave={handleSave}
          onCancel={() => {
            setEditingTemplate(null);
            setEditingCategory(null);
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

  // Group categories by request type
  const categoriesByType = categories.reduce((acc, cat) => {
    if (!acc[cat.request_type_name]) {
      acc[cat.request_type_name] = [];
    }
    acc[cat.request_type_name].push(cat);
    return acc;
  }, {} as Record<string, CategoryWithForm[]>);

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Request Forms & Categories</h1>
        <p className="text-muted-foreground mt-2">
          Create and manage forms for each request category
        </p>
      </div>

      <Alert className="mb-6">
        <Info className="h-4 w-4" />
        <AlertDescription>
          Each category needs a form. Create or edit forms for categories to make them functional for users submitting requests.
        </AlertDescription>
      </Alert>

      {Object.entries(categoriesByType).map(([typeName, typeCategories]) => (
        <Card key={typeName} className="mb-6">
          <CardHeader>
            <CardTitle>{typeName}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Category Name</TableHead>
                    <TableHead>Form Name</TableHead>
                    <TableHead>Fields</TableHead>
                    <TableHead>Status</TableHead>
                    {isAdmin && <TableHead className="text-right">Actions</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {typeCategories.map((category) => (
                    <TableRow key={category.id}>
                      <TableCell className="font-medium">{category.name}</TableCell>
                      <TableCell>
                        {category.form_template ? (
                          category.form_template.name
                        ) : (
                          <span className="text-muted-foreground italic">No form created</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {category.form_template?.fields?.length || 0}
                      </TableCell>
                      <TableCell>
                        {category.form_template ? (
                          <Badge variant={category.form_template.is_active ? 'success' : 'secondary'}>
                            {category.form_template.is_active ? 'Active' : 'Inactive'}
                          </Badge>
                        ) : (
                          <Badge variant="outline">Not configured</Badge>
                        )}
                      </TableCell>
                      {isAdmin && (
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            {category.form_template ? (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleEditFormForCategory(category)}
                              >
                                <Edit className="w-4 h-4 mr-2" />
                                Edit Form
                              </Button>
                            ) : (
                              <Button
                                size="sm"
                                onClick={() => handleCreateFormForCategory(category)}
                              >
                                <Plus className="w-4 h-4 mr-2" />
                                Create Form
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
