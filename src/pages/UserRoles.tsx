import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RBACUserManagement } from "@/components/rbac/RBACUserManagement";
import { RBACRoleManagement } from "@/components/rbac/RBACRoleManagement";
import { RBACPermissionsCatalog } from "@/components/rbac/RBACPermissionsCatalog";
import { RBACAccessPlayground } from "@/components/rbac/RBACAccessPlayground";
import { RBACAuditLog } from "@/components/rbac/RBACAuditLog";
import { RBACRolesPermissionsMatrix } from "@/components/rbac/RBACRolesPermissionsMatrix";
import { Users, Shield, Key, PlayCircle, FileText, Table } from "lucide-react";

export default function UserRoles() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">RBAC Management</h1>
        <p className="text-muted-foreground">
          Manage users, roles, and permissions with granular control
        </p>
      </div>

      <Tabs defaultValue="users" className="space-y-6">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="users" className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            Users
          </TabsTrigger>
          <TabsTrigger value="roles" className="flex items-center gap-2">
            <Shield className="w-4 h-4" />
            Roles
          </TabsTrigger>
          <TabsTrigger value="permissions" className="flex items-center gap-2">
            <Key className="w-4 h-4" />
            Permissions
          </TabsTrigger>
          <TabsTrigger value="matrix" className="flex items-center gap-2">
            <Table className="w-4 h-4" />
            Matrix
          </TabsTrigger>
          <TabsTrigger value="playground" className="flex items-center gap-2">
            <PlayCircle className="w-4 h-4" />
            Test Access
          </TabsTrigger>
          <TabsTrigger value="audit" className="flex items-center gap-2">
            <FileText className="w-4 h-4" />
            Audit Log
          </TabsTrigger>
        </TabsList>

        <TabsContent value="users">
          <RBACUserManagement />
        </TabsContent>

        <TabsContent value="roles">
          <RBACRoleManagement />
        </TabsContent>

        <TabsContent value="permissions">
          <RBACPermissionsCatalog />
        </TabsContent>

        <TabsContent value="matrix">
          <RBACRolesPermissionsMatrix />
        </TabsContent>
 
        <TabsContent value="playground">
          <RBACAccessPlayground />
        </TabsContent>

        <TabsContent value="audit">
          <RBACAuditLog />
        </TabsContent>
      </Tabs>
    </div>
  );
}
