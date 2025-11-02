import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Plus, Edit, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { TemplateEditor } from './TemplateEditor';

interface NewsletterTemplate {
  id: string;
  name: string;
  description?: string;
  content_structure: any;
  is_active: boolean;
  created_at: string;
}

export function TemplateManagement() {
  const [editorOpen, setEditorOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<NewsletterTemplate | undefined>();
  const queryClient = useQueryClient();

  const { data: templates = [], isLoading } = useQuery({
    queryKey: ['newsletter-templates'],
    queryFn: async () => {
      // For now, return mock data since table doesn't exist yet
      // This can be connected to a real table later
      return [
        {
          id: '1',
          name: 'Monthly Newsletter Template',
          description: 'Standard template for monthly newsletters',
          content_structure: { sections: ['header', 'departments', 'footer'] },
          is_active: true,
          created_at: new Date().toISOString(),
        },
      ] as NewsletterTemplate[];
    },
  });

  const handleEdit = (template: NewsletterTemplate) => {
    setSelectedTemplate(template);
    setEditorOpen(true);
  };

  const handleCreate = () => {
    setSelectedTemplate(undefined);
    setEditorOpen(true);
  };

  const handleSave = async (templateData: any) => {
    try {
      // TODO: Implement actual save when table is created
      toast.success('Template functionality coming soon');
      setEditorOpen(false);
    } catch (error) {
      toast.error('Failed to save template');
    }
  };

  if (isLoading) return <div>Loading...</div>;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Newsletter Templates</CardTitle>
          <Button onClick={handleCreate}>
            <Plus className="h-4 w-4 mr-2" />
            New Template
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="mb-4 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
          <p className="text-sm text-blue-800 dark:text-blue-200">
            Template management is available for organizing newsletter layouts and structures.
            Create reusable templates for consistent newsletter formatting.
          </p>
        </div>
        
        {templates.length === 0 ? (
          <p className="text-center py-8 text-muted-foreground">
            No templates yet. Create your first template to get started.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {templates.map((template) => (
                <TableRow key={template.id}>
                  <TableCell className="font-medium">{template.name}</TableCell>
                  <TableCell>{template.description || '-'}</TableCell>
                  <TableCell>
                    <Badge variant={template.is_active ? 'default' : 'secondary'}>
                      {template.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                  <TableCell>{new Date(template.created_at).toLocaleDateString()}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="sm" onClick={() => handleEdit(template)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          if (confirm('Delete this template?')) {
                            toast.info('Delete functionality coming soon');
                          }
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        <TemplateEditor
          open={editorOpen}
          onOpenChange={setEditorOpen}
          template={selectedTemplate}
          onSave={handleSave}
        />
      </CardContent>
    </Card>
  );
}
