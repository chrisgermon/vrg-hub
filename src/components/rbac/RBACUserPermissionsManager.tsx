import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
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
          // Remove override
          await supabase
            .from('rbac_user_permissions')
            .delete()
            .eq('user_id', userId)
            .eq('permission_id', permissionId);
        } else {
          // Upsert override
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

  const hasPendingChanges = pendingChanges.size > 0;

  return (
    <div className="space-y-4">
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          User permission overrides have the highest priority and will override role-based permissions.
          Use sparingly for exceptional cases.
        </AlertDescription>
      </Alert>

      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Resource</TableHead>
              <TableHead>Action</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Override</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {permissions.map((permission) => {
              const currentValue = getEffectiveValue(permission.id);
              const hasOverride = currentValue !== 'none';

              return (
                <TableRow key={permission.id}>
                  <TableCell className="font-mono text-sm">{permission.resource}</TableCell>
                  <TableCell className="font-mono text-sm">{permission.action}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {permission.description || '-'}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Select
                        value={currentValue}
                        onValueChange={(value) => handleOverrideChange(permission.id, value)}
                      >
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">None</SelectItem>
                          <SelectItem value="allow">Allow</SelectItem>
                          <SelectItem value="deny">Deny</SelectItem>
                        </SelectContent>
                      </Select>
                      {hasOverride && (
                        <Badge variant={currentValue === 'allow' ? 'default' : 'destructive'}>
                          {currentValue}
                        </Badge>
                      )}
                      {pendingChanges.has(permission.id) && (
                        <Badge variant="outline">Pending</Badge>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {hasPendingChanges && (
        <div className="flex gap-2">
          <Button onClick={handleSave} disabled={loading} className="flex-1">
            <Save className="w-4 h-4 mr-2" />
            {loading ? 'Saving...' : `Save ${pendingChanges.size} Changes`}
          </Button>
          <Button
            onClick={() => setPendingChanges(new Map())}
            variant="outline"
          >
            <X className="w-4 h-4 mr-2" />
            Cancel
          </Button>
        </div>
      )}
    </div>
  );
}
