import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { AlertCircle, Save, X } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface Permission {
  id: string;
  resource: string;
  action: string;
  description: string | null;
}

interface UserPermissionOverride {
  permission_id: string;
  effect: 'allow' | 'deny';
}

interface RBACUserPermissionsManagerProps {
  userId: string;
  onUpdate: () => void;
}

export function RBACUserPermissionsManager({ userId, onUpdate }: RBACUserPermissionsManagerProps) {
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [overrides, setOverrides] = useState<Map<string, 'allow' | 'deny'>>(new Map());
  const [pendingChanges, setPendingChanges] = useState<Map<string, 'allow' | 'deny' | null>>(new Map());
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchData();
  }, [userId]);

  const fetchData = async () => {
    try {
      const [permissionsRes, overridesRes] = await Promise.all([
        supabase.from('rbac_permissions').select('*').order('resource').order('action'),
        supabase.from('rbac_user_permissions').select('*').eq('user_id', userId)
      ]);

      if (permissionsRes.error) throw permissionsRes.error;
      if (overridesRes.error) throw overridesRes.error;

      setPermissions(permissionsRes.data || []);
      
      const overridesMap = new Map<string, 'allow' | 'deny'>();
      (overridesRes.data || []).forEach((override: any) => {
        if (override.effect === 'allow' || override.effect === 'deny') {
          overridesMap.set(override.permission_id, override.effect);
        }
      });
      setOverrides(overridesMap);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load permissions');
    }
  };

  const handleOverrideChange = (permissionId: string, value: string) => {
    const newPendingChanges = new Map(pendingChanges);
    if (value === 'none') {
      newPendingChanges.set(permissionId, null);
    } else {
      newPendingChanges.set(permissionId, value as 'allow' | 'deny');
    }
    setPendingChanges(newPendingChanges);
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      for (const [permissionId, effect] of pendingChanges.entries()) {
        if (effect === null) {
          await supabase
            .from('rbac_user_permissions')
            .delete()
            .eq('user_id', userId)
            .eq('permission_id', permissionId);
        } else {
          await supabase
            .from('rbac_user_permissions')
            .upsert({
              user_id: userId,
              permission_id: permissionId,
              effect
            });
        }
      }

      toast.success('Permission overrides saved');
      setPendingChanges(new Map());
      await fetchData();
      onUpdate();
    } catch (error) {
      console.error('Error saving overrides:', error);
      toast.error('Failed to save overrides');
    } finally {
      setLoading(false);
    }
  };

  const getEffectiveValue = (permissionId: string): string => {
    if (pendingChanges.has(permissionId)) {
      const pending = pendingChanges.get(permissionId);
      return pending === null ? 'none' : pending;
    }
    return overrides.get(permissionId) || 'none';
  };

  // Group permissions by resource
  const groupedPermissions = React.useMemo(() => {
    const groups = new Map<string, Permission[]>();
    permissions.forEach(perm => {
      if (!groups.has(perm.resource)) {
        groups.set(perm.resource, []);
      }
      groups.get(perm.resource)!.push(perm);
    });
    return Array.from(groups.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [permissions]);

  const hasPendingChanges = pendingChanges.size > 0;

  return (
    <div className="space-y-6">
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          User permission overrides take precedence over role-based permissions. 
          Set to "Allow" or "Deny" to override, or "None" to use role permissions.
        </AlertDescription>
      </Alert>

      <div className="space-y-4">
        {groupedPermissions.map(([resource, perms]) => (
          <div key={resource} className="border rounded-lg overflow-hidden">
            <div className="bg-muted px-4 py-3 border-b">
              <h3 className="font-semibold text-sm capitalize">
                {resource.replace(/_/g, ' ')}
              </h3>
            </div>
            <div className="divide-y">
              {perms.map((permission) => {
                const currentValue = getEffectiveValue(permission.id);
                const isPending = pendingChanges.has(permission.id);
                const currentOverride = overrides.get(permission.id);

                return (
                  <div 
                    key={permission.id} 
                    className="px-4 py-3 flex items-center justify-between hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm capitalize">
                          {permission.action.replace(/_/g, ' ')}
                        </span>
                        {isPending && (
                          <Badge variant="secondary" className="text-xs">
                            Pending
                          </Badge>
                        )}
                        {!isPending && currentOverride && (
                          <Badge 
                            variant={currentOverride === 'allow' ? 'default' : 'destructive'}
                            className="text-xs"
                          >
                            {currentOverride}
                          </Badge>
                        )}
                      </div>
                      {permission.description && (
                        <p className="text-sm text-muted-foreground">
                          {permission.description}
                        </p>
                      )}
                    </div>
                    <Select
                      value={currentValue}
                      onValueChange={(value) => handleOverrideChange(permission.id, value)}
                    >
                      <SelectTrigger className="w-[140px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">
                          <span className="text-muted-foreground">None (Role Default)</span>
                        </SelectItem>
                        <SelectItem value="allow">
                          <span className="text-green-600">✓ Allow</span>
                        </SelectItem>
                        <SelectItem value="deny">
                          <span className="text-destructive">✗ Deny</span>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {hasPendingChanges && (
        <div className="flex items-center justify-end gap-2 p-4 border rounded-lg bg-muted/50 sticky bottom-4">
          <Button
            variant="outline"
            onClick={() => setPendingChanges(new Map())}
            disabled={loading}
          >
            <X className="h-4 w-4 mr-2" />
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={loading}>
            <Save className="h-4 w-4 mr-2" />
            Save {pendingChanges.size} Change{pendingChanges.size !== 1 ? 's' : ''}
          </Button>
        </div>
      )}
    </div>
  );
}
