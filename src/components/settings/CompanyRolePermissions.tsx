import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Shield, Info } from "lucide-react";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface RolePermission {
  id: string;
  role: string;
  permission_key: string;
  enabled: boolean;
  company_id: string;
}

interface PermissionGroup {
  name: string;
  permissions: string[];
}

const PERMISSION_GROUPS: PermissionGroup[] = [
  {
    name: "Basic Access",
    permissions: [
      "view_dashboard",
      "view_own_requests",
      "edit_own_drafts",
    ]
  },
  {
    name: "Create Requests",
    permissions: [
      "create_hardware_request",
      "create_toner_request",
      "create_marketing_request",
      "create_user_account_request",
      "create_user_offboarding_request",
    ]
  },
  {
    name: "Approvals",
    permissions: [
      "approve_hardware_requests",
      "approve_marketing_requests",
      "approve_user_account_requests",
      "approve_user_offboarding_requests",
      "approve_newsletter_submissions",
    ]
  },
  {
    name: "Management",
    permissions: [
      "manage_company_users",
      "manage_hardware_catalog",
      "manage_newsletter_cycle",
      "view_all_company_requests",
      "view_request_metrics",
    ]
  },
  {
    name: "Configuration",
    permissions: [
      "configure_company_settings",
      "manage_company_features",
      "manage_office365_integration",
      "configure_sharepoint",
    ]
  },
  {
    name: "Documentation",
    permissions: [
      "view_modality_details",
      "view_sharepoint_documents",
      "submit_newsletter",
    ]
  },
];

const ROLES = [
  { key: "requester", label: "Requester", color: "bg-blue-100 text-blue-800" },
  { key: "manager", label: "Manager", color: "bg-green-100 text-green-800" },
  { key: "tenant_admin", label: "Tenant Admin", color: "bg-purple-100 text-purple-800" },
];

interface CompanyRolePermissionsProps {
  companyId: string;
}

export function CompanyRolePermissions({ companyId }: CompanyRolePermissionsProps) {
  const [permissions, setPermissions] = useState<RolePermission[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);

  useEffect(() => {
    loadPermissions();
  }, [companyId]);

  const loadPermissions = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("role_permissions")
        .select("*")
        .eq("company_id", companyId)
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
        .eq("company_id", companyId)
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
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          Configure permissions for each role within this company. Changes take effect immediately.
        </AlertDescription>
      </Alert>

      <div className="space-y-8">
        {PERMISSION_GROUPS.map((group) => (
          <Card key={group.name}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-primary" />
                {group.name}
              </CardTitle>
              <CardDescription>
                Manage {group.name.toLowerCase()} permissions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[300px]">Permission</TableHead>
                    {ROLES.map((role) => (
                      <TableHead key={role.key} className="text-center">
                        <Badge className={role.color} variant="secondary">
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
                      {ROLES.map((role) => {
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
  );
}