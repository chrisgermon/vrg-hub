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
import { RequestTypeSelector } from './RequestTypeSelector';
import { IconSelector } from './IconSelector';
import { Save, X, Bell } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export function FormBuilder({ template, onSave, onCancel, categoryId }: FormBuilderProps & { categoryId?: string }) {
  const [name, setName] = useState(template?.name || '');
  const [description, setDescription] = useState(template?.description || '');
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
  
  // Category management fields
  const [requestTypeId, setRequestTypeId] = useState<string | null>(null);
  const [categoryName, setCategoryName] = useState('');
  const [categorySlug, setCategorySlug] = useState('');
  const [categoryIcon, setCategoryIcon] = useState('FileText');
  const [loadingCategory, setLoadingCategory] = useState(false);
  const { toast } = useToast();

  // Load category data if editing
  useEffect(() => {
    if (categoryId) {
      loadCategoryData(categoryId);
    }
  }, [categoryId]);

  const loadCategoryData = async (id: string) => {
    setLoadingCategory(true);
    try {
      const { data, error } = await supabase
        .from('request_categories')
        .select('request_type_id, name, slug, icon')
        .eq('id', id)
        .single();

      if (error) throw error;

      if (data) {
        setRequestTypeId(data.request_type_id);
        setCategoryName(data.name);
        setCategorySlug(data.slug);
        setCategoryIcon(data.icon || 'FileText');
      }
    } catch (error) {
      console.error('Error loading category:', error);
    } finally {
      setLoadingCategory(false);
    }
  };

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

  const handleSave = async () => {
    if (!name) {
      toast({
        title: 'Error',
        description: 'Please provide a form name',
        variant: 'destructive',
      });
      return;
    }

    if (!requestTypeId) {
      toast({
        title: 'Error',
        description: 'Please select a request type',
        variant: 'destructive',
      });
      return;
    }

    if (!categoryName) {
      toast({
        title: 'Error',
        description: 'Please provide a category name',
        variant: 'destructive',
      });
      return;
    }

    try {
      // Generate slug from category name if not provided
      const finalSlug = categorySlug || categoryName.toLowerCase().replace(/\s+/g, '-');

      // Save or update the category
      let finalCategoryId = categoryId;
      
      if (categoryId) {
        // Update existing category
        const { error: categoryError } = await supabase
          .from('request_categories')
          .update({
            name: categoryName,
            slug: finalSlug,
            icon: categoryIcon,
            request_type_id: requestTypeId,
          })
          .eq('id', categoryId);

        if (categoryError) throw categoryError;
      } else {
        // Create new category
        const { data: newCategory, error: categoryError } = await supabase
          .from('request_categories')
          .insert({
            name: categoryName,
            slug: finalSlug,
            icon: categoryIcon,
            request_type_id: requestTypeId,
            is_active: true,
          })
          .select()
          .single();

        if (categoryError) throw categoryError;
        finalCategoryId = newCategory.id;
      }

      // Now save the form with the category link
      onSave({
        name,
        description,
        fields: fields.map((field, index) => ({ ...field, order: index })),
        is_active: isActive,
        settings: {
          notification_user_ids: notificationUserIds,
          notification_level: notificationLevel,
          enable_sms_notifications: enableSmsNotifications,
          require_approval: requireApproval,
          approver_id: approverId,
        },
        categoryId: finalCategoryId,
      });
    } catch (error) {
      console.error('Error saving:', error);
      toast({
        title: 'Error',
        description: 'Failed to save form and category',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="flex gap-6 h-full">
      {/* Left Panel - Form Settings */}
      <Card className="w-80 p-6 space-y-6 overflow-y-auto max-h-screen">
        <div>
          <h3 className="text-lg font-semibold mb-4">Request Category</h3>
          
          {loadingCategory ? (
            <div className="text-sm text-muted-foreground">Loading...</div>
          ) : (
            <div className="space-y-4">
              <RequestTypeSelector
                value={requestTypeId}
                onChange={setRequestTypeId}
              />

              <div>
                <Label htmlFor="category-name">Category Name</Label>
                <Input
                  id="category-name"
                  value={categoryName}
                  onChange={(e) => {
                    setCategoryName(e.target.value);
                    // Auto-generate slug from name
                    setCategorySlug(e.target.value.toLowerCase().replace(/\s+/g, '-'));
                  }}
                  placeholder="e.g., Computer Support"
                />
              </div>

              <div>
                <Label htmlFor="category-slug">Category Slug</Label>
                <Input
                  id="category-slug"
                  value={categorySlug}
                  onChange={(e) => setCategorySlug(e.target.value)}
                  placeholder="computer-support"
                />
              </div>

              <IconSelector
                value={categoryIcon}
                onChange={setCategoryIcon}
              />
            </div>
          )}
        </div>

        <Separator />

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