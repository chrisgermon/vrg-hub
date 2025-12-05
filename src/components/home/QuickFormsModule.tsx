import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, Settings, ExternalLink, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

interface QuickForm {
  id: string;
  name: string;
  url: string;
}

interface QuickFormsModuleProps {
  isAdmin?: boolean;
}

const DEFAULT_FORMS: QuickForm[] = [
  { id: "1", name: "Ultrasound worksheets", url: "" },
  { id: "2", name: "Quick forms", url: "" },
  { id: "3", name: "Attendance certificate", url: "" },
];

export function QuickFormsModule({ isAdmin = false }: QuickFormsModuleProps) {
  const [forms, setForms] = useState<QuickForm[]>(DEFAULT_FORMS);
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [editingForms, setEditingForms] = useState<QuickForm[]>([]);
  const [newFormName, setNewFormName] = useState("");

  useEffect(() => {
    const saved = localStorage.getItem('quick-forms');
    if (saved) {
      try {
        setForms(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to parse saved quick forms');
      }
    }
  }, []);

  const handleOpenForm = (url: string, name: string) => {
    if (!url) {
      toast.info(`URL not configured for ${name}`);
      return;
    }
    window.open(url, '_blank');
  };

  const handleOpenConfig = () => {
    setEditingForms([...forms]);
    setIsConfigOpen(true);
  };

  const handleUpdateForm = (id: string, field: 'name' | 'url', value: string) => {
    setEditingForms(editingForms.map(f => f.id === id ? { ...f, [field]: value } : f));
  };

  const handleAddForm = () => {
    if (!newFormName.trim()) return;
    setEditingForms([...editingForms, {
      id: Date.now().toString(),
      name: newFormName,
      url: ""
    }]);
    setNewFormName("");
  };

  const handleRemoveForm = (id: string) => {
    setEditingForms(editingForms.filter(f => f.id !== id));
  };

  const handleSaveConfig = () => {
    setForms(editingForms);
    localStorage.setItem('quick-forms', JSON.stringify(editingForms));
    toast.success("Quick forms updated");
    setIsConfigOpen(false);
  };

  return (
    <>
      <Card className="h-full rounded-xl shadow-sm border border-primary/20">
        <CardHeader className="pb-2 flex flex-row items-center justify-between">
          <CardTitle className="text-sm font-semibold text-primary flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Quick Forms
          </CardTitle>
          {isAdmin && (
            <Button onClick={handleOpenConfig} size="sm" variant="ghost" className="h-6 w-6 p-0">
              <Settings className="h-3 w-3" />
            </Button>
          )}
        </CardHeader>
        <CardContent className="pt-0">
          <div className="space-y-1">
            {forms.map((form) => (
              <button
                key={form.id}
                onClick={() => handleOpenForm(form.url, form.name)}
                className="w-full text-left px-2 py-1.5 text-xs text-primary hover:bg-primary/5 rounded transition-colors flex items-center justify-between group"
              >
                <span>{form.name}</span>
                {form.url && (
                  <ExternalLink className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                )}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      <Dialog open={isConfigOpen} onOpenChange={setIsConfigOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Configure Quick Forms</DialogTitle>
            <DialogDescription>Add links to frequently used forms and documents</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-4 max-h-[50vh] overflow-y-auto">
            {editingForms.map((form) => (
              <div key={form.id} className="flex items-start gap-2 p-2 border rounded-lg">
                <div className="flex-1 space-y-2">
                  <Input
                    value={form.name}
                    onChange={(e) => handleUpdateForm(form.id, 'name', e.target.value)}
                    placeholder="Form name"
                    className="text-sm"
                  />
                  <Input
                    value={form.url}
                    onChange={(e) => handleUpdateForm(form.id, 'url', e.target.value)}
                    placeholder="URL"
                    className="text-sm"
                  />
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 text-destructive"
                  onClick={() => handleRemoveForm(form.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
            <div className="flex items-center gap-2 pt-2">
              <Input
                value={newFormName}
                onChange={(e) => setNewFormName(e.target.value)}
                placeholder="New form name..."
                className="text-sm"
              />
              <Button size="sm" onClick={handleAddForm} disabled={!newFormName.trim()}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsConfigOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveConfig}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
