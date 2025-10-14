import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileText, Plus, Edit, Trash2, Check, X } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { TemplateEditor } from "./TemplateEditor";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface Section {
  key: string;
  label: string;
  required: boolean;
  max_chars: number;
}

interface Template {
  id: string;
  department: string;
  display_name: string;
  description: string;
  sections: Section[];
  is_active: boolean;
  created_at: string;
}

export function TemplateManagement() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<Template | undefined>();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [templateToDelete, setTemplateToDelete] = useState<string | null>(null);

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from("newsletter_templates")
        .select("*")
        .eq("is_active", true)
        .order("department");

      if (error) throw error;
      setTemplates((data || []).map(t => ({
        ...t,
        sections: Array.isArray(t.sections) ? t.sections as unknown as Section[] : []
      })));
    } catch (error: any) {
      console.error("Error loading templates:", error);
      toast({
        title: "Error",
        description: "Failed to load templates",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveTemplate = async (data: {
    department: string;
    display_name: string;
    description: string;
    sections: Section[];
  }) => {
    try {
      if (editingTemplate) {
        // Update existing
        const { error } = await supabase
          .from("newsletter_templates")
          .update({
            display_name: data.display_name,
            description: data.description,
            sections: data.sections as any,
          })
          .eq("id", editingTemplate.id);

        if (error) throw error;
        toast({
          title: "Success",
          description: "Template updated successfully",
        });
      } else {
        // Create new
        const { error } = await supabase
          .from("newsletter_templates")
          .insert([{
            ...data,
            sections: data.sections as any,
          }]);

        if (error) throw error;
        toast({
          title: "Success",
          description: "Template created successfully",
        });
      }

      loadTemplates();
      setEditorOpen(false);
      setEditingTemplate(undefined);
    } catch (error: any) {
      console.error("Error saving template:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to save template",
        variant: "destructive",
      });
    }
  };

  const handleDeleteTemplate = async () => {
    if (!templateToDelete) return;

    try {
      const { error } = await supabase
        .from("newsletter_templates")
        .update({ is_active: false })
        .eq("id", templateToDelete);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Template deleted successfully",
      });
      
      loadTemplates();
    } catch (error: any) {
      console.error("Error deleting template:", error);
      toast({
        title: "Error",
        description: "Failed to delete template",
        variant: "destructive",
      });
    } finally {
      setDeleteDialogOpen(false);
      setTemplateToDelete(null);
    }
  };

  const openEditor = (template?: Template) => {
    setEditingTemplate(template);
    setEditorOpen(true);
  };

  const confirmDelete = (templateId: string) => {
    setTemplateToDelete(templateId);
    setDeleteDialogOpen(true);
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Newsletter Templates</CardTitle>
              <CardDescription>
                Configure submission templates for different departments
              </CardDescription>
            </div>
            <Button onClick={() => openEditor()}>
              <Plus className="h-4 w-4 mr-2" />
              New Template
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {templates.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No templates configured yet</p>
              <Button variant="outline" className="mt-4" onClick={() => openEditor()}>
                Create Your First Template
              </Button>
            </div>
          ) : (
            <div className="grid gap-4">
              {templates.map((template) => (
                <Card key={template.id} className="relative">
                  <CardHeader>
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <CardTitle className="text-lg">{template.display_name}</CardTitle>
                        <CardDescription className="mt-1">
                          {template.description}
                        </CardDescription>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary">
                          <FileText className="h-3 w-3 mr-1" />
                          {template.sections.length} sections
                        </Badge>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditor(template)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => confirmDelete(template.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-muted-foreground">Sections:</p>
                      <div className="flex flex-wrap gap-2">
                        {template.sections.map((section, index) => (
                          <Badge key={index} variant="outline" className="text-xs">
                            {section.label}
                            {section.required && (
                              <span className="text-destructive ml-1">*</span>
                            )}
                            <span className="text-muted-foreground ml-1">
                              ({section.max_chars} chars)
                            </span>
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <TemplateEditor
        open={editorOpen}
        onOpenChange={setEditorOpen}
        template={editingTemplate}
        onSave={handleSaveTemplate}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Template</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this template? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteTemplate}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}