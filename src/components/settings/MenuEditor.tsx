import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, Plus, X, GripVertical } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

type UserRole = 'requester' | 'manager' | 'marketing_manager' | 'tenant_admin' | 'super_admin' | 'marketing';

interface MenuItem {
  key: string;
  label: string;
  type: 'common' | 'category' | 'item' | 'admin' | 'settings' | 'help' | 'heading';
  parentKey?: string;
}

interface MenuConfig {
  id?: string;
  role: UserRole;
  item_key: string;
  item_type: string;
  parent_key?: string;
  is_visible: boolean;
  sort_order: number;
  custom_heading_label?: string;
}

interface MenuHeading {
  id: string;
  heading_key: string;
  label: string;
  sort_order: number;
  is_active: boolean;
}

interface SortableItemProps {
  id: string;
  config: MenuConfig | MenuHeading;
  isHeading: boolean;
  isVisible: boolean;
  label: string;
  onToggle: () => void;
  onRemove?: () => void;
}

function SortableItem({ id, config, isHeading, isVisible, label, onToggle, onRemove }: SortableItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center justify-between p-3 border rounded-lg bg-card"
    >
      <div className="flex items-center gap-3 flex-1">
        <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing">
          <GripVertical className="h-5 w-5 text-muted-foreground" />
        </div>
        <Switch
          checked={isVisible}
          onCheckedChange={onToggle}
        />
        <div className="flex flex-col">
          <span className={!isVisible ? 'text-muted-foreground' : ''}>
            {label}
          </span>
          <span className="text-xs text-muted-foreground">
            {isHeading ? 'Global Sub-Heading' : (config as MenuConfig).item_type}
          </span>
        </div>
      </div>
      {onRemove && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onRemove}
        >
          <X className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}

const DEFAULT_MENU_ITEMS: MenuItem[] = [
  { key: 'users', label: 'Users', type: 'category' },
  { key: 'users-management', label: 'User Management', type: 'item', parentKey: 'users' },
  { key: 'users-new-account', label: 'New User Account', type: 'item', parentKey: 'users' },
  { key: 'users-new-offboarding', label: 'User Offboarding', type: 'item', parentKey: 'users' },
  { key: 'equipment', label: 'Equipment', type: 'category' },
  { key: 'equipment-approvals', label: 'Pending Approvals', type: 'item', parentKey: 'equipment' },
  { key: 'equipment-requests', label: 'All Requests', type: 'item', parentKey: 'equipment' },
  { key: 'equipment-new-request', label: 'New Hardware Request', type: 'item', parentKey: 'equipment' },
  { key: 'equipment-new-toner', label: 'New Toner Request', type: 'item', parentKey: 'equipment' },
  { key: 'equipment-catalog', label: 'Hardware Catalog', type: 'item', parentKey: 'equipment' },
  { key: 'marketing', label: 'Marketing', type: 'category' },
  { key: 'marketing-new-request', label: 'New Marketing Request', type: 'item', parentKey: 'marketing' },
  { key: 'documentation', label: 'Documentation', type: 'category' },
  { key: 'documentation-modality', label: 'Modality Details', type: 'item', parentKey: 'documentation' },
  { key: 'admin-system', label: 'System Admin', type: 'admin' },
  { key: 'admin-audit', label: 'Audit Log', type: 'admin' },
  { key: 'settings', label: 'Settings', type: 'settings' },
  { key: 'help', label: 'Help Guide', type: 'help' },
];

export function MenuEditor() {
  const [selectedRole, setSelectedRole] = useState<UserRole>('requester');
  const [menuConfigs, setMenuConfigs] = useState<MenuConfig[]>([]);
  const [globalHeadings, setGlobalHeadings] = useState<MenuHeading[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [newHeadingLabel, setNewHeadingLabel] = useState('');
  const [addHeadingOpen, setAddHeadingOpen] = useState(false);
  const { toast } = useToast();

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    loadMenuConfigs();
    loadGlobalHeadings();
  }, [selectedRole]);

  const loadGlobalHeadings = async () => {
    try {
      const { data, error } = await supabase
        .from('menu_headings')
        .select('*')
        .order('sort_order');

      if (error) throw error;
      setGlobalHeadings(data || []);
    } catch (error) {
      console.error('Error loading headings:', error);
    }
  };

  const loadMenuConfigs = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('menu_configurations')
        .select('*')
        .eq('role', selectedRole)
        .order('sort_order');

      if (error) throw error;

      // If no configs exist for this role, create defaults
      if (!data || data.length === 0) {
        const defaults = DEFAULT_MENU_ITEMS.map((item, index) => ({
          role: selectedRole,
          item_key: item.key,
          item_type: item.type,
          is_visible: true,
          sort_order: index,
        }));
        setMenuConfigs(defaults);
      } else {
        setMenuConfigs(data);
      }
    } catch (error) {
      console.error('Error loading menu configs:', error);
      toast({
        title: 'Error',
        description: 'Failed to load menu configurations',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleVisibility = (itemKey: string) => {
    setMenuConfigs(prev =>
      prev.map(config =>
        config.item_key === itemKey
          ? { ...config, is_visible: !config.is_visible }
          : config
      )
    );
  };

  const getItemLabel = (config: MenuConfig) => {
    if (config.item_type === 'heading' && config.custom_heading_label) {
      return config.custom_heading_label;
    }
    return DEFAULT_MENU_ITEMS.find(item => item.key === config.item_key)?.label || config.item_key;
  };

  const addHeading = async () => {
    if (!newHeadingLabel.trim()) return;

    try {
      const { error } = await supabase
        .from('menu_headings')
        .insert({
          heading_key: `heading-${Date.now()}`,
          label: newHeadingLabel.trim(),
          sort_order: globalHeadings.length,
          is_active: true,
        });

      if (error) throw error;

      await loadGlobalHeadings();
      setNewHeadingLabel('');
      setAddHeadingOpen(false);
      
      toast({
        title: 'Success',
        description: 'Heading added successfully',
      });
    } catch (error) {
      console.error('Error adding heading:', error);
      toast({
        title: 'Error',
        description: 'Failed to add heading',
        variant: 'destructive',
      });
    }
  };

  const removeHeading = async (id: string) => {
    try {
      const { error } = await supabase
        .from('menu_headings')
        .delete()
        .eq('id', id);

      if (error) throw error;

      await loadGlobalHeadings();
      
      toast({
        title: 'Success',
        description: 'Heading removed successfully',
      });
    } catch (error) {
      console.error('Error removing heading:', error);
      toast({
        title: 'Error',
        description: 'Failed to remove heading',
        variant: 'destructive',
      });
    }
  };

  const toggleHeadingVisibility = async (id: string) => {
    const heading = globalHeadings.find(h => h.id === id);
    if (!heading) return;

    try {
      const { error } = await supabase
        .from('menu_headings')
        .update({ is_active: !heading.is_active })
        .eq('id', id);

      if (error) throw error;

      setGlobalHeadings(prev =>
        prev.map(h => h.id === id ? { ...h, is_active: !h.is_active } : h)
      );
    } catch (error) {
      console.error('Error toggling heading:', error);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id) return;

    const activeId = active.id.toString();
    const overId = over.id.toString();

    // Check if dragging menu items or headings
    const isActiveHeading = activeId.startsWith('heading-') || globalHeadings.some(h => h.id === activeId);
    const isOverHeading = overId.startsWith('heading-') || globalHeadings.some(h => h.id === overId);

    if (isActiveHeading && isOverHeading) {
      // Reorder headings
      const oldIndex = globalHeadings.findIndex(h => h.id === activeId);
      const newIndex = globalHeadings.findIndex(h => h.id === overId);
      
      const reordered = arrayMove(globalHeadings, oldIndex, newIndex).map((h, i) => ({
        ...h,
        sort_order: i,
      }));
      
      setGlobalHeadings(reordered);
    } else if (!isActiveHeading && !isOverHeading) {
      // Reorder menu items
      const oldIndex = menuConfigs.findIndex(c => c.item_key === activeId);
      const newIndex = menuConfigs.findIndex(c => c.item_key === overId);
      
      const reordered = arrayMove(menuConfigs, oldIndex, newIndex).map((c, i) => ({
        ...c,
        sort_order: i,
      }));
      
      setMenuConfigs(reordered);
    }
  };

  const saveAllConfigs = async () => {
    setSaving(true);
    try {
      // Save menu configs
      await supabase
        .from('menu_configurations')
        .delete()
        .eq('role', selectedRole);

      await supabase
        .from('menu_configurations')
        .insert(menuConfigs);

      // Save global headings
      const headingUpdates = globalHeadings.map(h =>
        supabase
          .from('menu_headings')
          .update({ sort_order: h.sort_order, is_active: h.is_active })
          .eq('id', h.id)
      );

      await Promise.all(headingUpdates);

      toast({
        title: 'Success',
        description: 'Menu configuration saved successfully',
      });
    } catch (error) {
      console.error('Error saving:', error);
      toast({
        title: 'Error',
        description: 'Failed to save configuration',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Menu Editor</CardTitle>
        <CardDescription>
          Customize menu visibility and order for each role. Drag to reorder items.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label>Select Role</Label>
          <Select value={selectedRole} onValueChange={(value) => setSelectedRole(value as UserRole)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="requester">Requester</SelectItem>
              <SelectItem value="manager">Manager</SelectItem>
              <SelectItem value="tenant_admin">Tenant Admin</SelectItem>
              <SelectItem value="super_admin">Super Admin</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex justify-between items-center">
          <Dialog open={addHeadingOpen} onOpenChange={setAddHeadingOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add Global Sub-Heading
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Global Sub-Heading</DialogTitle>
                <DialogDescription>
                  Create a text label that appears for all user roles
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="heading-label">Heading Label</Label>
                  <Input
                    id="heading-label"
                    placeholder="e.g., Marketing"
                    value={newHeadingLabel}
                    onChange={(e) => setNewHeadingLabel(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && addHeading()}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button onClick={addHeading} disabled={!newHeadingLabel.trim()}>
                  Add Heading
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Global Headings Section */}
            {globalHeadings.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-medium text-sm text-muted-foreground uppercase">
                  Global Sub-Headings (Drag to reorder)
                </h4>
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd}
                >
                  <SortableContext
                    items={globalHeadings.map(h => h.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    <div className="space-y-2">
                      {globalHeadings.map((heading) => (
                        <SortableItem
                          key={heading.id}
                          id={heading.id}
                          config={heading}
                          isHeading={true}
                          isVisible={heading.is_active}
                          label={heading.label}
                          onToggle={() => toggleHeadingVisibility(heading.id)}
                          onRemove={() => removeHeading(heading.id)}
                        />
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>
              </div>
            )}

            {/* Role-Specific Menu Items Section */}
            <div className="space-y-2">
              <h4 className="font-medium text-sm text-muted-foreground uppercase">
                Menu Items for {selectedRole} (Drag to reorder)
              </h4>
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={menuConfigs.map(c => c.item_key)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="space-y-2">
                    {menuConfigs.map((config) => (
                      <SortableItem
                        key={config.item_key}
                        id={config.item_key}
                        config={config}
                        isHeading={false}
                        isVisible={config.is_visible}
                        label={getItemLabel(config)}
                        onToggle={() => toggleVisibility(config.item_key)}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            </div>
          </div>
        )}

        <div className="flex justify-end">
          <Button onClick={saveAllConfigs} disabled={saving || loading}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Configuration
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
