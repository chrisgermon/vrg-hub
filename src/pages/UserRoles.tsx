import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Shield, Info } from "lucide-react";
import { toast } from "sonner";
import { useAccessControl } from "@/hooks/useAccessControl";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { PERMISSION_GROUPS, ROLE_DEFINITIONS } from "@/lib/access-control";

interface RolePermission {
  id: string;
  role: string;
  permission_key: string;
  enabled: boolean;
}

export default function UserRoles() {
  const navigate = useNavigate();
  const { isSuperAdmin } = useAccessControl();
  const [permissions, setPermissions] = useState<RolePermission[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const roleDefinitions = useMemo(() => ROLE_DEFINITIONS, []);

  useEffect(() => {
    if (!isSuperAdmin) {
      navigate("/");
      return;
    }
    loadPermissions();
  }, [isSuperAdmin, navigate]);

  const loadPermissions = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("role_permissions")
        .select("*")
        .order("role", { ascending: true })
        .order("permission_key", { ascending: true });

      if (error) throw error;
      setPermissions(data || []);
    } catch (error: any) {
      console.error("Error loading permissions:", error);
      toast.error("Failed to load role permissions");
    } finally {
      setLoading(false);
    }
  };

  const togglePermission = async (role: string, permissionKey: string, currentEnabled: boolean) => {
    const updateKey = `${role}-${permissionKey}`;
    setUpdating(updateKey);

    try {
      const { error } = await supabase
        .from("role_permissions")
        .update({ enabled: !currentEnabled })
        .eq("role", role as any)
        .eq("permission_key", permissionKey);

      if (error) throw error;

      setPermissions(prev =>
        prev.map(p =>
          p.role === role && p.permission_key === permissionKey
            ? { ...p, enabled: !currentEnabled }
            : p
        )
      );

      toast.success(`Permission ${!currentEnabled ? 'enabled' : 'disabled'}`);
    } catch (error: any) {
      console.error("Error updating permission:", error);
      toast.error("Failed to update permission");
    } finally {
      setUpdating(null);
    }
  };

  const getPermissionForRole = (role: string, permissionKey: string): RolePermission | undefined => {
    return permissions.find(p => p.role === role && p.permission_key === permissionKey);
  };

  const formatPermissionName = (key: string): string => {
    return key
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  if (loading) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Shield className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-4xl font-bold">User Role Permissions</h1>
            <p className="text-lg text-muted-foreground mt-1">
              Configure granular permissions for each user role
            </p>
          </div>
        </div>

        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            Changes to permissions take effect immediately for all users with that role. 
            Use caution when modifying permissions as this affects system access control.
          </AlertDescription>
        </Alert>

        <div className="space-y-8">
          {PERMISSION_GROUPS.map((group) => (
            <Card key={group.name}>
              <CardHeader>
                <CardTitle>{group.name}</CardTitle>
                <CardDescription>
                  Manage {group.name.toLowerCase()} permissions across roles
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[300px]">Permission</TableHead>
                      {roleDefinitions.map((role) => (
                        <TableHead key={role.key} className="text-center">
                          <Badge className={role.badgeClassName} variant="secondary">
                            {role.label}
                          </Badge>
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {group.permissions.map((permissionKey) => (
                      <TableRow key={permissionKey}>
                        <TableCell className="font-medium">
                          {formatPermissionName(permissionKey)}
                        </TableCell>
                        {roleDefinitions.map((role) => {
                          const permission = getPermissionForRole(role.key, permissionKey);
                          const updateKey = `${role.key}-${permissionKey}`;
                          const isUpdating = updating === updateKey;

                          return (
                            <TableCell key={role.key} className="text-center">
                              {permission ? (
                                <div className="flex justify-center">
                                  {isUpdating ? (
                                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                                  ) : (
                                    <Switch
                                      checked={permission.enabled}
                                      onCheckedChange={() =>
                                        togglePermission(role.key, permissionKey, permission.enabled)
                                      }
                                      disabled={isUpdating}
                                    />
                                  )}
                                </div>
                              ) : (
                                <span className="text-muted-foreground">-</span>
                              )}
                            </TableCell>
                          );
                        })}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}