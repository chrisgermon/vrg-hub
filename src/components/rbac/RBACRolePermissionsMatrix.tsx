import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Save, X } from 'lucide-react';

interface Permission {
  id: string;
  resource: string;
  action: string;
  description: string | null;
}

interface RBACRolePermissionsMatrixProps {
  roleId: string;
  onUpdate: () => void;
}

export function RBACRolePermissionsMatrix({ roleId, onUpdate }: RBACRolePermissionsMatrixProps) {
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [rolePermissions, setRolePermissions] = useState<Map<string, 'allow' | 'deny'>>(new Map());
  const [pendingChanges, setPendingChanges] = useState<Map<string, 'allow' | 'deny' | null>>(new Map());
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchData();
  }, [roleId]);

  const fetchData = async () => {
    try {
      const [permissionsRes, rolePermsRes] = await Promise.all([
        supabase.from('rbac_permissions').select('*').order('resource').order('action'),
        supabase.from('rbac_role_permissions').select('*').eq('role_id', roleId)
      ]);

      if (permissionsRes.error) throw permissionsRes.error;
      if (rolePermsRes.error) throw rolePermsRes.error;

      setPermissions(permissionsRes.data || []);

      const rolePermsMap = new Map<string, 'allow' | 'deny'>();
      (rolePermsRes.data || []).forEach((rp: any) => {
        if (rp.effect === 'allow' || rp.effect === 'deny') {
          rolePermsMap.set(rp.permission_id, rp.effect);
        }
      });
      setRolePermissions(rolePermsMap);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load permissions');
    }
  };

  const handlePermissionChange = (permissionId: string, value: string) => {
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
          // Remove permission
          await supabase
            .from('rbac_role_permissions')
            .delete()
            .eq('role_id', roleId)
            .eq('permission_id', permissionId);
        } else {
          // Upsert permission
          await supabase
            .from('rbac_role_permissions')
            .upsert({
              role_id: roleId,
              permission_id: permissionId,
              effect
            });
        }
      }

      toast.success('Role permissions saved');
      setPendingChanges(new Map());
      await fetchData();
      onUpdate();
    } catch (error) {
      console.error('Error saving permissions:', error);
      toast.error('Failed to save permissions');
    } finally {
      setLoading(false);
    }
  };

  const getEffectiveValue = (permissionId: string): string => {
    if (pendingChanges.has(permissionId)) {
      const pending = pendingChanges.get(permissionId);
      return pending === null ? 'none' : pending;
    }
    return rolePermissions.get(permissionId) || 'none';
  };

  const hasPendingChanges = pendingChanges.size > 0;

  // Group permissions by resource
  const groupedPermissions = permissions.reduce((acc, perm) => {
    if (!acc[perm.resource]) {
      acc[perm.resource] = [];
    }
    acc[perm.resource].push(perm);
    return acc;
  }, {} as Record<string, Permission[]>);

  return (
    <div className="space-y-4">
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Resource</TableHead>
              <TableHead>Action</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Effect</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {Object.entries(groupedPermissions).map(([resource, perms]) => (
              <React.Fragment key={resource}>
                {perms.map((permission, idx) => {
                  const currentValue = getEffectiveValue(permission.id);
                  const hasEffect = currentValue !== 'none';

                  return (
                    <TableRow key={permission.id}>
                      {idx === 0 && (
                        <TableCell
                          rowSpan={perms.length}
                          className="font-mono text-sm font-medium bg-muted/50"
                        >
                          {resource}
                        </TableCell>
                      )}
                      <TableCell className="font-mono text-sm">{permission.action}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {permission.description || '-'}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Select
                            value={currentValue}
                            onValueChange={(value) => handlePermissionChange(permission.id, value)}
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
                          {hasEffect && (
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
              </React.Fragment>
            ))}
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
