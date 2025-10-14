import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, Shield } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ROLE_DEFINITIONS, PERMISSION_GROUPS } from "@/lib/access-control/constants";
import { cn } from "@/lib/utils";

interface RolePermissionsManagerProps {
  companyId: string;
}

// Permission label mapping with descriptions
const PERMISSION_LABELS: Record<string, { label: string; description: string }> = {
  // Basic Access
  view_dashboard: { label: "View Home & Overview", description: "Access the home page and overview" },
  view_own_requests: { label: "View Own Requests", description: "View their own submitted requests" },
  edit_own_drafts: { label: "Edit Own Drafts", description: "Edit their draft requests" },
  
  // Create Requests
  create_hardware_request: { label: "Create Hardware Request", description: "Submit new hardware equipment requests" },
  create_toner_request: { label: "Create Toner Request", description: "Order printer toner supplies" },
  create_marketing_request: { label: "Create Marketing Request", description: "Submit marketing material requests" },
  create_user_account_request: { label: "Create User Account Request", description: "Request new user accounts" },
  
  // Approvals
  approve_hardware_requests: { label: "Approve Hardware Requests", description: "Approve or decline hardware requests" },
  approve_marketing_requests: { label: "Approve Marketing Requests", description: "Approve or decline marketing requests" },
  approve_user_account_requests: { label: "Approve User Account Requests", description: "Approve or decline user account requests" },
  approve_newsletter_submissions: { label: "Approve Newsletter Submissions", description: "Review and approve newsletter content" },
  
  // Management
  manage_company_users: { label: "Manage Company Users", description: "Add, edit, and manage user accounts" },
  manage_hardware_catalog: { label: "Manage Hardware Catalog", description: "Manage the hardware catalog items" },
  manage_newsletter_cycle: { label: "Manage Newsletter Cycle", description: "Configure newsletter cycles and assignments" },
  view_all_company_requests: { label: "View All Company Requests", description: "View all requests in the company" },
  view_request_metrics: { label: "View Request Metrics", description: "Access request analytics and reports" },
  
  // Configuration
  configure_company_settings: { label: "Configure Company Settings", description: "Modify company settings and preferences" },
  manage_company_features: { label: "Manage Company Features", description: "Enable/disable company features" },
  manage_office365_integration: { label: "Manage Office 365 Integration", description: "Configure Office 365 connection" },
  configure_sharepoint: { label: "Configure SharePoint", description: "Set up SharePoint integration" },
  
  // Documentation
  view_modality_details: { label: "View Modality Details", description: "Access DICOM modality information" },
  view_sharepoint_documents: { label: "View SharePoint Documents", description: "Browse SharePoint files" },
  submit_newsletter: { label: "Submit Newsletter", description: "Contribute to the newsletter" },
  view_news: { label: "News", description: "View news articles" },
  create_news: { label: "Create News", description: "Create new news articles" },
  edit_news: { label: "Edit News", description: "Edit existing news articles" },
  delete_news: { label: "Delete News", description: "Delete news articles" },
  manage_knowledge_base: { label: "Manage Knowledge Base", description: "Full control over knowledge base" },
  edit_knowledge_base: { label: "Edit Knowledge Base", description: "Create and edit knowledge base articles" },
  delete_knowledge_base: { label: "Delete Knowledge Base", description: "Delete knowledge base content" },
  
  // System Admin
  manage_all_companies: { label: "Manage All Companies", description: "Platform-wide company management" },
  manage_system_users: { label: "Manage System Users", description: "Platform-wide user management" },
  view_audit_logs: { label: "View Audit Logs", description: "Access system audit logs" },
  manage_file_storage: { label: "Manage File Storage", description: "Control file storage and buckets" },
  manage_user_invites: { label: "Manage User Invites", description: "Send and manage user invitations" },
  manage_role_permissions: { label: "Manage Role Permissions", description: "Configure role permissions" },
  view_system_metrics: { label: "View System Metrics", description: "Access system-wide metrics" },
};

export function RolesManager({ companyId }: RolePermissionsManagerProps) {
  const queryClient = useQueryClient();
  const [updating, setUpdating] = useState<string | null>(null);
  const { toast } = useToast();

  // Get tenant roles only
  const tenantRoles = ROLE_DEFINITIONS.filter(role => role.scope === "tenant");

  // Fetch role permissions
  const { data: rolePermissions, isLoading } = useQuery({
    queryKey: ["role-permissions", companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("role_permissions")
        .select("*")
        .eq("company_id", companyId);

      if (error) throw error;
      return data;
    },
  });

  // Toggle role permission
  const togglePermissionMutation = useMutation({
    mutationFn: async ({ role, permissionKey, currentEnabled }: { role: string; permissionKey: string; currentEnabled: boolean }) => {
      const { data: existing } = await supabase
        .from("role_permissions")
        .select("id")
        .eq("company_id", companyId)
        .eq("role", role as any)
        .eq("permission_key", permissionKey)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from("role_permissions")
          .update({ enabled: !currentEnabled })
          .eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("role_permissions")
          .insert({
            company_id: companyId,
            role: role as any,
            permission_key: permissionKey,
            enabled: !currentEnabled,
          });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["role-permissions", companyId] });
      toast({
        title: "Success",
        description: "Permission updated",
      });
    },
    onError: (error) => {
      console.error("Error updating permission:", error);
      toast({
        title: "Error",
        description: "Failed to update permission",
        variant: "destructive",
      });
    },
    onSettled: () => {
      setUpdating(null);
    },
  });

  const getPermissionState = (role: string, permissionKey: string) => {
    const permission = rolePermissions?.find((p) => p.role === role && p.permission_key === permissionKey);
    return permission?.enabled ?? false;
  };

  const handleTogglePermission = (role: string, permissionKey: string) => {
    const currentEnabled = getPermissionState(role, permissionKey);
    const updateKey = `${role}-${permissionKey}`;
    setUpdating(updateKey);
    togglePermissionMutation.mutate({
      role,
      permissionKey,
      currentEnabled,
    });
  };

  // Get all permissions organized by group
  const allPermissions = PERMISSION_GROUPS
    .filter(group => group.scope === "tenant" || group.scope === "shared")
    .flatMap(group => 
      group.permissions.map(permKey => ({
        key: permKey,
        label: PERMISSION_LABELS[permKey]?.label || permKey,
        description: PERMISSION_LABELS[permKey]?.description || "",
        group: group.name
      }))
    )
    .filter(p => p.label);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Roles & Permissions
        </CardTitle>
        <CardDescription>
          Configure granular permissions for each role in your company
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border max-h-[600px] overflow-auto">
          <Table>
            <TableHeader className="sticky top-0 z-10 bg-background">
              <TableRow>
                <TableHead className="w-[300px] font-semibold sticky top-0 bg-background">Permission</TableHead>
                {tenantRoles.map((role) => (
                  <TableHead key={role.key} className="text-center font-semibold sticky top-0 bg-background">
                    {role.label}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {allPermissions.map((permission, index) => {
                const prevPermission = allPermissions[index - 1];
                const showGroupHeader = !prevPermission || prevPermission.group !== permission.group;
                
                return (
                  <>
                    {showGroupHeader && (
                      <TableRow key={`group-${permission.group}`} className="bg-muted/50 hover:bg-muted/50">
                        <TableCell colSpan={tenantRoles.length + 1} className="font-semibold py-2">
                          {permission.group}
                        </TableCell>
                      </TableRow>
                    )}
                    <TableRow key={permission.key}>
                      <TableCell className="font-medium">
                        <div>
                          <div className="text-sm">{permission.label}</div>
                          <div className="text-xs text-muted-foreground mt-0.5">
                            {permission.description}
                          </div>
                        </div>
                      </TableCell>
                      {tenantRoles.map((role) => {
                        const enabled = getPermissionState(role.key, permission.key);
                        const updateKey = `${role.key}-${permission.key}`;
                        const isUpdating = updating === updateKey;

                        return (
                          <TableCell key={role.key} className="text-center">
                            <div className="flex items-center justify-center">
                              {isUpdating ? (
                                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                              ) : (
                                <Checkbox
                                  checked={enabled}
                                  onCheckedChange={() => handleTogglePermission(role.key, permission.key)}
                                  disabled={isUpdating}
                                  className="h-5 w-5"
                                />
                              )}
                            </div>
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  </>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
