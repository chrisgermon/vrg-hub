import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { ROLE_DEFINITIONS } from "@/lib/access-control";

interface RolePermissionsTabProps {
  companyId: string;
  searchTerm: string;
}

export function RolePermissionsTab({ companyId, searchTerm }: RolePermissionsTabProps) {
  const queryClient = useQueryClient();
  const [updatingKey, setUpdatingKey] = useState<string | null>(null);

  // Fetch features
  const { data: features = [], isLoading: loadingFeatures } = useQuery({
    queryKey: ['features'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('features')
        .select('*')
        .eq('scope', 'tenant')
        .order('feature_group', { ascending: true })
        .order('display_name', { ascending: true });

      if (error) throw error;
      return data;
    }
  });

  // Fetch role permissions
  const { data: rolePermissions = [], isLoading: loadingPermissions } = useQuery({
    queryKey: ['role-permissions', companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('role_permissions')
        .select('*')
        .eq('company_id', companyId);

      if (error) throw error;
      return data;
    }
  });

  // Update permission
  const updatePermission = useMutation({
    mutationFn: async ({ role, featureId, enabled }: { role: string; featureId: string; enabled: boolean }) => {
      const existing = rolePermissions.find(
        rp => rp.role === role && rp.feature_id === featureId
      );

      if (existing) {
        const { error } = await supabase
          .from('role_permissions')
          .update({ enabled })
          .eq('id', existing.id);
        if (error) throw error;
      } else {
        // Get the feature to get its feature_key for permission_key
        const feature = features.find(f => f.id === featureId);
        const { error } = await supabase
          .from('role_permissions')
          .insert([{ 
            company_id: companyId, 
            role: role as any, 
            feature_id: featureId, 
            enabled,
            permission_key: feature?.feature_key || '' // Use feature_key as permission_key for backward compatibility
          } as any]);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['role-permissions', companyId] });
      queryClient.invalidateQueries({ queryKey: ['effective-permissions'] });
      toast.success('Permission updated');
    },
    onError: () => toast.error('Failed to update permission'),
    onSettled: () => setUpdatingKey(null)
  });

  const getPermissionForRole = (role: string, featureId: string): boolean => {
    return rolePermissions.find(rp => rp.role === role && rp.feature_id === featureId)?.enabled || false;
  };

  const handleToggle = (role: string, featureId: string, currentValue: boolean) => {
    setUpdatingKey(`${role}-${featureId}`);
    updatePermission.mutate({ role, featureId, enabled: !currentValue });
  };

  const filteredFeatures = features.filter(f => 
    f.display_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    f.feature_key.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const groupedFeatures = filteredFeatures.reduce((acc, feature) => {
    if (!acc[feature.feature_group]) acc[feature.feature_group] = [];
    acc[feature.feature_group].push(feature);
    return acc;
  }, {} as Record<string, typeof features>);

  if (loadingFeatures || loadingPermissions) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Role Permission Matrix</h3>
          <p className="text-sm text-muted-foreground">
            Toggle permissions for each role. Changes apply immediately.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => queryClient.invalidateQueries({ queryKey: ['role-permissions'] })}
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {Object.entries(groupedFeatures).map(([group, groupFeatures]) => (
        <div key={group} className="space-y-2">
          <h4 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">
            {group.replace(/_/g, ' ')}
          </h4>
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[300px]">Permission</TableHead>
                  {ROLE_DEFINITIONS.filter(r => r.scope === 'tenant').map(role => (
                    <TableHead key={role.key} className="text-center">
                      <Badge className={role.badgeClassName} variant="secondary">
                        {role.label}
                      </Badge>
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {groupFeatures.map(feature => (
                  <TableRow key={feature.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{feature.display_name}</div>
                        {feature.description && (
                          <div className="text-xs text-muted-foreground">{feature.description}</div>
                        )}
                      </div>
                    </TableCell>
                    {ROLE_DEFINITIONS.filter(r => r.scope === 'tenant').map(role => {
                      const isEnabled = getPermissionForRole(role.key, feature.id);
                      const updateKey = `${role.key}-${feature.id}`;
                      const isUpdating = updatingKey === updateKey;

                      return (
                        <TableCell key={role.key} className="text-center">
                          {isUpdating ? (
                            <Loader2 className="h-4 w-4 animate-spin mx-auto" />
                          ) : (
                            <Switch
                              checked={isEnabled}
                              onCheckedChange={() => handleToggle(role.key, feature.id, isEnabled)}
                            />
                          )}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      ))}

      {filteredFeatures.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          No permissions found matching "{searchTerm}"
        </div>
      )}
    </div>
  );
}
