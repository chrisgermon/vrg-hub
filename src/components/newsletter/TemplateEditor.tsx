import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Trash2, GripVertical } from "lucide-react";

interface Section {
  key: string;
  label: string;
  required: boolean;
  max_chars: number;
}

interface TemplateEditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template?: {
    id: string;
    department: string;
    display_name: string;
    description: string;
    sections: Section[];
  };
  onSave: (data: {
    department: string;
    display_name: string;
    description: string;
    sections: Section[];
  }) => Promise<void>;
}

export function TemplateEditor({
  open,
  onOpenChange,
  template,
  onSave,
}: TemplateEditorProps) {
  const [department, setDepartment] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [description, setDescription] = useState("");
  const [sections, setSections] = useState<Section[]>([
    {
      key: "",
      label: "",
      required: true,
      max_chars: 1500,
    },
  ]);
  const [saving, setSaving] = useState(false);

  // Load template data when dialog opens or template changes
  useEffect(() => {
    if (open && template) {
      setDepartment(template.department || "");
      setDisplayName(template.display_name || "");
      setDescription(template.description || "");
      setSections(template.sections && template.sections.length > 0 ? template.sections : [
        {
          key: "",
          label: "",
          required: true,
          max_chars: 1500,
        },
      ]);
    } else if (open && !template) {
      // Reset for new template
      setDepartment("");
      setDisplayName("");
      setDescription("");
      setSections([
        {
          key: "",
          label: "",
          required: true,
          max_chars: 1500,
        },
      ]);
    }
  }, [open, template]);

  const addSection = () => {
    setSections([
      ...sections,
      {
        key: "",
        label: "",
        required: false,
        max_chars: 1500,
      },
    ]);
  };

  const removeSection = (index: number) => {
    setSections(sections.filter((_, i) => i !== index));
  };

  const updateSection = (index: number, field: keyof Section, value: any) => {
    const newSections = [...sections];
    newSections[index] = { ...newSections[index], [field]: value };
    setSections(newSections);
  };

  const generateKey = (label: string): string => {
    return label.toLowerCase().replace(/[^a-z0-9]+/g, "_");
  };

  const handleSave = async () => {
    try {
      setSaving(true);

      // Validate
      if (!department || !displayName) {
        alert("Please fill in department and display name");
        return;
      }

      // Auto-generate keys if empty
      const processedSections = sections.map((section) => ({
        ...section,
        key: section.key || generateKey(section.label),
      }));

      await onSave({
        department,
        display_name: displayName,
        description,
        sections: processedSections,
      });

      onOpenChange(false);
    } catch (error) {
      console.error("Error saving template:", error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {template ? "Edit Template" : "Create New Template"}
          </DialogTitle>
          <DialogDescription>
            Configure the department submission template with custom sections
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Basic Info */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Department Key *</Label>
              <Input
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                placeholder="e.g., IT, HR, Marketing"
                disabled={!!template}
              />
              <p className="text-xs text-muted-foreground">
                Unique identifier (cannot be changed after creation)
              </p>
            </div>

            <div className="space-y-2">
              <Label>Display Name *</Label>
              <Input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="e.g., IT – Newsletter Submission"
              />
            </div>

            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Add instructions for contributors..."
                rows={2}
              />
            </div>
          </div>

          {/* Sections */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-base font-semibold">Sections</Label>
              <Button type="button" variant="outline" size="sm" onClick={addSection}>
                <Plus className="h-4 w-4 mr-2" />
                Add Section
              </Button>
            </div>

            <div className="space-y-3">
              {sections.map((section, index) => (
                <Card key={index}>
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-center gap-2">
                      <GripVertical className="h-4 w-4 text-muted-foreground" />
                      <div className="flex-1 grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <Label className="text-xs">Section Label *</Label>
                          <Input
                            value={section.label}
                            onChange={(e) =>
                              updateSection(index, "label", e.target.value)
                            }
                            placeholder="e.g., System performance"
                            className="h-9"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Max Characters</Label>
                          <Input
                            type="number"
                            value={section.max_chars}
                            onChange={(e) =>
                              updateSection(index, "max_chars", parseInt(e.target.value))
                            }
                            className="h-9"
                          />
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeSection(index)}
                        disabled={sections.length === 1}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>

                    <div className="flex items-center gap-2 ml-6">
                      <Switch
                        checked={section.required}
                        onCheckedChange={(checked) =>
                          updateSection(index, "required", checked)
                        }
                      />
                      <Label className="text-sm font-normal cursor-pointer">
                        Required field
                      </Label>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : "Save Template"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
