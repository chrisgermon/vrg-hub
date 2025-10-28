import { useState, useEffect } from 'react';
import { DndContext, DragEndEvent, closestCenter } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { FormField, FormBuilderProps, FieldType } from '@/types/form-builder';
import { FieldPalette } from './FieldPalette';
import { SortableField } from './SortableField';
import { FieldEditor } from './FieldEditor';
import { NotificationSettings } from './NotificationSettings';
import { ApprovalSettings } from './ApprovalSettings';
import { Save, X, Bell } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';

export function FormBuilder({ template, onSave, onCancel }: FormBuilderProps) {
  const [name, setName] = useState(template?.name || '');
  const [description, setDescription] = useState(template?.description || '');
  const [department, setDepartment] = useState(template?.department || '');
  const [subDepartment, setSubDepartment] = useState(template?.sub_department || '');
  const [requestTypeId, setRequestTypeId] = useState<string>(template?.settings?.request_type_id || '');
  const [categoryName, setCategoryName] = useState(template?.settings?.category_name || '');
  const [categorySlug, setCategorySlug] = useState(template?.settings?.category_slug || '');
  const [requestTypes, setRequestTypes] = useState<Array<{id: string; name: string}>>([]);
  const [fields, setFields] = useState<FormField[]>(template?.fields || []);
  const [selectedField, setSelectedField] = useState<FormField | null>(null);
  const [isActive, setIsActive] = useState(template?.is_active ?? true);
  const [notificationUserIds, setNotificationUserIds] = useState<string[]>(
    template?.settings?.notification_user_ids || []
  );
  const [notificationLevel, setNotificationLevel] = useState<'all' | 'new_only' | 'updates_only'>(
    template?.settings?.notification_level || 'all'
  );
  const [enableSmsNotifications, setEnableSmsNotifications] = useState(
    template?.settings?.enable_sms_notifications ?? false
  );
  const [requireApproval, setRequireApproval] = useState(
    template?.settings?.require_approval ?? false
  );
  const [approverId, setApproverId] = useState<string | null>(
    template?.settings?.approver_id || null
  );

  useEffect(() => {
    const fetchRequestTypes = async () => {
      const { data } = await supabase
        .from('request_types')
        .select('id, name')
        .eq('is_active', true)
        .order('name');
      if (data) setRequestTypes(data);
    };
    fetchRequestTypes();
  }, []);

  // Load existing category data if template is linked to a category
  useEffect(() => {
    if (template?.id) {
      const fetchCategory = async () => {
        const { data } = await supabase
          .from('request_categories')
          .select('request_type_id, name, slug')
          .eq('form_template_id', template.id)
          .maybeSingle();
        
        if (data) {
          setRequestTypeId(data.request_type_id);
          setCategoryName(data.name);
          setCategorySlug(data.slug);
        }
      };
      fetchCategory();
    }
  }, [template?.id]);

  const handleAddField = (type: FieldType) => {
    const newField: FormField = {
      id: `field_${Date.now()}`,
      type,
      label: `New ${type} field`,
      required: false,
      order: fields.length,
    };
    setFields([...fields, newField]);
    setSelectedField(newField);
  };

  const handleUpdateField = (updatedField: FormField) => {
    setFields(fields.map(f => f.id === updatedField.id ? updatedField : f));
    setSelectedField(updatedField);
  };

  const handleDeleteField = (fieldId: string) => {
    setFields(fields.filter(f => f.id !== fieldId));
    if (selectedField?.id === fieldId) {
      setSelectedField(null);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = fields.findIndex(f => f.id === active.id);
    const newIndex = fields.findIndex(f => f.id === over.id);

    const newFields = [...fields];
    const [movedField] = newFields.splice(oldIndex, 1);
    newFields.splice(newIndex, 0, movedField);

    // Update order property
    const reorderedFields = newFields.map((field, index) => ({
      ...field,
      order: index,
    }));

    setFields(reorderedFields);
  };

  const handleSave = () => {
    onSave({
      name,
      description,
      department,
      sub_department: subDepartment || undefined,
      fields: fields.map((field, index) => ({ ...field, order: index })),
      is_active: isActive,
      settings: {
        notification_user_ids: notificationUserIds,
        notification_level: notificationLevel,
        enable_sms_notifications: enableSmsNotifications,
        require_approval: requireApproval,
        approver_id: approverId,
        request_type_id: requestTypeId || undefined,
        category_name: categoryName || undefined,
        category_slug: categorySlug || undefined,
      },
    });
  };

  return (
    <div className="flex gap-6 h-full">
      {/* Left Panel - Form Settings */}
      <Card className="w-80 p-6 space-y-6">
        <div>
          <h3 className="text-lg font-semibold mb-4">Form Settings</h3>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="form-name">Form Name</Label>
              <Input
                id="form-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Hardware Request Form"
              />
            </div>

            <div>
              <Label htmlFor="form-request-type">Request Type (Optional)</Label>
              <Select value={requestTypeId} onValueChange={setRequestTypeId}>
                <SelectTrigger id="form-request-type">
                  <SelectValue placeholder="Select request type..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">None</SelectItem>
                  {requestTypes.map((type) => (
                    <SelectItem key={type.id} value={type.id}>
                      {type.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">
                Link this form to a request type to create a category option
              </p>
            </div>

            {requestTypeId && (
              <>
                <div>
                  <Label htmlFor="category-name">Category Name</Label>
                  <Input
                    id="category-name"
                    value={categoryName}
                    onChange={(e) => {
                      setCategoryName(e.target.value);
                      // Auto-generate slug from name
                      setCategorySlug(e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''));
                    }}
                    placeholder="e.g., Cleaning, IT Support"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    This will appear as a clickable category in the request form
                  </p>
                </div>

                <div>
                  <Label htmlFor="category-slug">Category Slug</Label>
                  <Input
                    id="category-slug"
                    value={categorySlug}
                    onChange={(e) => setCategorySlug(e.target.value)}
                    placeholder="e.g., cleaning, it-support"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    URL-friendly version (auto-generated from name)
                  </p>
                </div>
              </>
            )}

            <div>
              <Label htmlFor="form-description">Description</Label>
              <Textarea
                id="form-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Brief description of this form"
                rows={3}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="form-active">Active</Label>
              <Switch
                id="form-active"
                checked={isActive}
                onCheckedChange={setIsActive}
              />
            </div>
          </div>
        </div>

        <Separator />

        <div>
          <div className="flex items-center gap-2 mb-4">
            <Bell className="w-4 h-4" />
            <h3 className="text-lg font-semibold">Notification Settings</h3>
          </div>
          <NotificationSettings
            notificationUserIds={notificationUserIds}
            notificationLevel={notificationLevel}
            enableSmsNotifications={enableSmsNotifications}
            onNotificationUserIdsChange={setNotificationUserIds}
            onNotificationLevelChange={setNotificationLevel}
            onEnableSmsNotificationsChange={setEnableSmsNotifications}
          />
        </div>

        <Separator />

        <div>
          <ApprovalSettings
            requireApproval={requireApproval}
            approverId={approverId}
            onRequireApprovalChange={setRequireApproval}
            onApproverIdChange={setApproverId}
          />
        </div>

        <Separator />

        <div>
          <h4 className="font-medium mb-3">Add Field</h4>
          <FieldPalette onAddField={handleAddField} />
        </div>

        <div className="flex gap-2 pt-4 border-t">
          <Button onClick={handleSave} className="flex-1">
            <Save className="w-4 h-4 mr-2" />
            Save Form
          </Button>
          <Button variant="outline" onClick={onCancel}>
            <X className="w-4 h-4" />
          </Button>
        </div>
      </Card>

      {/* Middle Panel - Form Preview */}
      <Card className="flex-1 p-6">
        <h3 className="text-lg font-semibold mb-4">Form Fields</h3>
        
        {fields.length === 0 ? (
          <div className="text-center text-muted-foreground py-12">
            Add fields from the left panel to build your form
          </div>
        ) : (
          <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={fields.map(f => f.id)} strategy={verticalListSortingStrategy}>
              <div className="space-y-3">
                {fields.map((field) => (
                  <SortableField
                    key={field.id}
                    field={field}
                    isSelected={selectedField?.id === field.id}
                    onSelect={() => setSelectedField(field)}
                    onDelete={() => handleDeleteField(field.id)}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </Card>

      {/* Right Panel - Field Editor */}
      {selectedField && (
        <Card className="w-96 p-6">
          <FieldEditor
            field={selectedField}
            onUpdate={handleUpdateField}
            onClose={() => setSelectedField(null)}
          />
        </Card>
      )}
    </div>
  );
}
