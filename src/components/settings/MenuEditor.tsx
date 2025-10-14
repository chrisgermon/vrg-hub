import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { ChevronUp, ChevronDown, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

type UserRole = 'requester' | 'manager' | 'marketing_manager' | 'tenant_admin' | 'super_admin' | 'marketing';

interface MenuItem {
  key: string;
  label: string;
  type: 'common' | 'category' | 'item' | 'admin' | 'settings' | 'help';
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
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadMenuConfigs();
  }, [selectedRole]);

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
          parent_key: item.parentKey,
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

  const saveMenuConfigs = async () => {
    setSaving(true);
    try {
      // Delete existing configs for this role
      await supabase
        .from('menu_configurations')
        .delete()
        .eq('role', selectedRole);

      // Insert new configs
      const { error } = await supabase
        .from('menu_configurations')
        .insert(menuConfigs);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Menu configuration saved successfully',
      });
    } catch (error) {
      console.error('Error saving menu configs:', error);
      toast({
        title: 'Error',
        description: 'Failed to save menu configurations',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
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

  const moveItem = (itemKey: string, direction: 'up' | 'down') => {
    const index = menuConfigs.findIndex(c => c.item_key === itemKey);
    if (index === -1) return;

    const newConfigs = [...menuConfigs];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;

    if (targetIndex < 0 || targetIndex >= newConfigs.length) return;

    [newConfigs[index], newConfigs[targetIndex]] = [newConfigs[targetIndex], newConfigs[index]];

    // Update sort_order
    newConfigs.forEach((config, i) => {
      config.sort_order = i;
    });

    setMenuConfigs(newConfigs);
  };

  const getItemLabel = (itemKey: string) => {
    return DEFAULT_MENU_ITEMS.find(item => item.key === itemKey)?.label || itemKey;
  };

  const groupedItems = menuConfigs.reduce((acc, config) => {
    const type = config.item_type;
    if (!acc[type]) acc[type] = [];
    acc[type].push(config);
    return acc;
  }, {} as Record<string, MenuConfig[]>);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Menu Editor</CardTitle>
        <CardDescription>
          Customize menu visibility and order for each role
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

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(groupedItems).map(([type, items]) => (
              <div key={type} className="space-y-2">
                <h4 className="font-medium text-sm text-muted-foreground uppercase">
                  {type === 'common' ? 'Common Items' : 
                   type === 'category' ? 'Categories' :
                   type === 'item' ? 'Category Items' :
                   type === 'admin' ? 'Admin Items' :
                   type === 'settings' ? 'Settings' : 'Help'}
                </h4>
                <div className="space-y-2">
                  {items.map((config, index) => (
                    <div
                      key={config.item_key}
                      className="flex items-center justify-between p-3 border rounded-lg bg-card"
                    >
                      <div className="flex items-center gap-3 flex-1">
                        <Switch
                          checked={config.is_visible}
                          onCheckedChange={() => toggleVisibility(config.item_key)}
                        />
                        <span className={!config.is_visible ? 'text-muted-foreground' : ''}>
                          {getItemLabel(config.item_key)}
                        </span>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => moveItem(config.item_key, 'up')}
                          disabled={index === 0}
                        >
                          <ChevronUp className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => moveItem(config.item_key, 'down')}
                          disabled={index === items.length - 1}
                        >
                          <ChevronDown className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="flex justify-end">
          <Button onClick={saveMenuConfigs} disabled={saving || loading}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Configuration
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}