import React, { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { CheckCircle2, XCircle, AlertCircle } from 'lucide-react';

interface EffectivePermission {
  resource: string;
  action: string;
  allowed: boolean;
  source: 'user_override' | 'role' | 'denied';
  details: string;
}

interface RBACEffectivePermissionsProps {
  userId: string;
}

export function RBACEffectivePermissions({ userId }: RBACEffectivePermissionsProps) {
  const [permissions, setPermissions] = useState<EffectivePermission[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchEffectivePermissions();
  }, [userId]);

  const fetchEffectivePermissions = async () => {
    setLoading(true);
    try {
      // Fetch all permissions
      const { data: allPermissions } = await supabase
        .from('rbac_permissions')
        .select('id, resource, action')
        .order('resource')
        .order('action');

      if (!allPermissions) {
        setPermissions([]);
        return;
      }

      // Fetch user overrides
      const { data: userOverrides } = await supabase
        .from('rbac_user_permissions')
        .select('permission_id, effect')
        .eq('user_id', userId);

      // Fetch user roles
      const { data: userRoles } = await supabase
        .from('rbac_user_roles')
        .select('role_id')
        .eq('user_id', userId);

      const roleIds = (userRoles || []).map(ur => ur.role_id);

      // Fetch role permissions
      const { data: rolePermissions } = roleIds.length > 0
        ? await supabase
            .from('rbac_role_permissions')
            .select('permission_id, effect, role:rbac_roles(name)')
            .in('role_id', roleIds)
        : { data: [] };

      // Calculate effective permissions
      const effective: EffectivePermission[] = allPermissions.map(perm => {
        // Check user override first
        const override = (userOverrides || []).find(uo => uo.permission_id === perm.id);
        if (override) {
          return {
            resource: perm.resource,
            action: perm.action,
            allowed: override.effect === 'allow',
            source: 'user_override',
            details: `User override: ${override.effect}`
          };
        }

        // Check role permissions
        const rolePerms = (rolePermissions || []).filter(rp => rp.permission_id === perm.id);
        if (rolePerms.length > 0) {
          // Check for any deny
          const hasDeny = rolePerms.some(rp => rp.effect === 'deny');
          if (hasDeny) {
            const denyRole = rolePerms.find(rp => rp.effect === 'deny');
            return {
              resource: perm.resource,
              action: perm.action,
              allowed: false,
              source: 'role',
              details: `Denied by role: ${denyRole?.role?.name || 'Unknown'}`
            };
          }

          // Check for any allow
          const hasAllow = rolePerms.some(rp => rp.effect === 'allow');
          if (hasAllow) {
            const allowRole = rolePerms.find(rp => rp.effect === 'allow');
            return {
              resource: perm.resource,
              action: perm.action,
              allowed: true,
              source: 'role',
              details: `Allowed by role: ${allowRole?.role?.name || 'Unknown'}`
            };
          }
        }

        // Default deny
        return {
          resource: perm.resource,
          action: perm.action,
          allowed: false,
          source: 'denied',
          details: 'Default deny (no matching rules)'
        };
      });

      setPermissions(effective);
    } catch (error) {
      console.error('Error fetching effective permissions:', error);
      toast.error('Failed to load effective permissions');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading effective permissions...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Resource</TableHead>
              <TableHead>Action</TableHead>
              <TableHead>Result</TableHead>
              <TableHead>Source</TableHead>
              <TableHead>Details</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {permissions.map((perm, idx) => (
              <TableRow key={idx}>
                <TableCell className="font-mono text-sm">{perm.resource}</TableCell>
                <TableCell className="font-mono text-sm">{perm.action}</TableCell>
                <TableCell>
                  {perm.allowed ? (
                    <div className="flex items-center gap-2 text-green-600">
                      <CheckCircle2 className="w-4 h-4" />
                      <span className="font-medium">Allow</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-red-600">
                      <XCircle className="w-4 h-4" />
                      <span className="font-medium">Deny</span>
                    </div>
                  )}
                </TableCell>
                <TableCell>
                  <Badge
                    variant={
                      perm.source === 'user_override'
                        ? 'default'
                        : perm.source === 'role'
                        ? 'secondary'
                        : 'outline'
                    }
                  >
                    {perm.source === 'user_override' ? 'User Override' : 
                     perm.source === 'role' ? 'Role' : 'Default'}
                  </Badge>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {perm.details}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
