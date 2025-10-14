import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Shield, User, Users, Layout, Settings, Search, RefreshCw, CheckCircle, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";

interface RolePermission {
  id: string;
  role: string;
  permission_key: string;
  enabled: boolean;
  company_id: string;
}

interface UserPermission {
  id: string;
  user_id: string;
  company_id: string;
  permission: string;
  granted: boolean;
}

interface MenuConfig {
  id: string;
  role: string;
  item_key: string;
  item_type: string;
  is_visible: boolean;
  sort_order: number;
}

interface Profile {
  user_id: string;
  name: string;
  email: string;
}

interface FeatureFlag {
  id: string;
  company_id: string;
  feature_key: string;
  enabled: boolean;
}

// All available permissions organized by category
const PERMISSION_CATEGORIES = {
  "Pages & Views": [
    "view_dashboard",
    "view_own_requests",
    "view_all_company_requests",
    "view_request_metrics",
    "view_modality_details",
    "view_sharepoint_documents",
  ],
  "Request Creation": [
    "create_hardware_request",
    "create_toner_request",
    "create_marketing_request",
    "create_user_account_request",
    "create_user_offboarding_request",
    "edit_own_drafts",
  ],
  "Approvals": [
    "approve_hardware_requests",
    "approve_marketing_requests",
    "approve_user_account_requests",
    "approve_user_offboarding_requests",
    "approve_newsletter_submissions",
  ],
  "Management": [
    "manage_company_users",
    "manage_hardware_catalog",
    "manage_newsletter_cycle",
    "configure_company_settings",
    "manage_company_features",
  ],
  "Integrations": [
    "manage_office365_integration",
    "configure_sharepoint",
  ],
  "Newsletter": [
    "submit_newsletter",
    "approve_newsletter_submissions",
    "manage_newsletter_cycle",
  ],
};

const FEATURE_FLAGS = [
  { key: "hardware_requests", label: "Hardware Requests" },
  { key: "toner_requests", label: "Toner Requests" },
  { key: "marketing_requests", label: "Marketing Requests" },
  { key: "user_accounts", label: "User Account Requests" },
  { key: "monthly_newsletter", label: "Monthly Newsletter" },
  { key: "modality_management", label: "Modality Management" },
  { key: "print_ordering", label: "Print Ordering Forms" },
];

const ROLES = [
  { key: "requester", label: "Requester", color: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200" },
  { key: "marketing", label: "Marketing", color: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200" },
  { key: "manager", label: "Manager", color: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" },
  { key: "marketing_manager", label: "Marketing Manager", color: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" },
  { key: "tenant_admin", label: "Tenant Admin", color: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200" },
];

interface ComprehensivePermissionManagerProps {
  companyId: string;
}

export function ComprehensivePermissionManager({ companyId }: ComprehensivePermissionManagerProps) {
  const [activeTab, setActiveTab] = useState("role-permissions");
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  
  // Role permissions
  const [rolePermissions, setRolePermissions] = useState<RolePermission[]>([]);
  
  // User permissions
  const [userPermissions, setUserPermissions] = useState<UserPermission[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [selectedUser, setSelectedUser] = useState<string>("");
  
  // Menu configurations
  const [menuConfigs, setMenuConfigs] = useState<MenuConfig[]>([]);
  
  // Feature flags
  const [featureFlags, setFeatureFlags] = useState<FeatureFlag[]>([]);
  
  const [updating, setUpdating] = useState<string | null>(null);

  // Guard against invalid companyId
  if (!companyId) {
    return (
      <Card>
        <CardContent className="py-8">
          <p className="text-center text-muted-foreground">
            No company selected. Please select a valid company to manage permissions.
          </p>
        </CardContent>
      </Card>
    );
  }

  useEffect(() => {
    loadAllData();
  }, [companyId]);

  const loadAllData = async () => {
    try {
      setLoading(true);
      await Promise.all([
        loadRolePermissions(),
        loadUserPermissions(),
        loadProfiles(),
        loadMenuConfigs(),
        loadFeatureFlags(),
      ]);
    } catch (error: any) {
      console.error("Error loading data:", error);
      toast.error("Failed to load permissions data");
    } finally {
      setLoading(false);
    }
  };

  const loadRolePermissions = async () => {
    const { data, error } = await supabase
      .from("role_permissions")
      .select("*")
      .eq("company_id", companyId)
      .order("role")
      .order("permission_key");

    if (error) throw error;
    setRolePermissions(data || []);
  };

  const loadUserPermissions = async () => {
    const { data, error } = await supabase
      .from("user_permissions")
      .select("*")
      .eq("company_id", companyId);

    if (error) throw error;
    setUserPermissions(data || []);
  };

  const loadProfiles = async () => {
    const { data, error } = await supabase
      .from("profiles")
      .select("user_id, name, email")
      .eq("company_id", companyId)
      .order("name");

    if (error) throw error;
    setProfiles(data || []);
  };

  const loadMenuConfigs = async () => {
    const { data, error } = await supabase
      .from("menu_configurations")
      .select("*")
      .order("role")
      .order("sort_order");

    if (error) throw error;
    setMenuConfigs(data || []);
  };

  const loadFeatureFlags = async () => {
    const { data, error } = await supabase
      .from("company_features")
      .select("*")
      .eq("company_id", companyId);

    if (error) throw error;
    setFeatureFlags(data || []);
  };

  const syncAllPermissions = async () => {
    try {
      setSyncing(true);
      
      // Get all possible permission keys from categories
      const allPermissionKeys = Object.values(PERMISSION_CATEGORIES).flat();
      
      // For each role and permission combination, ensure a record exists
      for (const role of ROLES) {
        for (const permissionKey of allPermissionKeys) {
          const exists = rolePermissions.find(
            p => p.role === role.key && p.permission_key === permissionKey
          );
          
          if (!exists) {
            await supabase.from("role_permissions").insert([{
              company_id: companyId,
              role: role.key as any,
              permission_key: permissionKey,
              enabled: role.key === "tenant_admin", // Default: admin has all
            }]);
          }
        }
      }
      
      // Reload data
      await loadAllData();
      toast.success("Permissions synchronized successfully");
    } catch (error: any) {
      console.error("Error syncing permissions:", error);
      toast.error("Failed to sync permissions");
    } finally {
      setSyncing(false);
    }
  };

  const toggleRolePermission = async (role: string, permissionKey: string, currentEnabled: boolean) => {
    const updateKey = `role-${role}-${permissionKey}`;
    setUpdating(updateKey);

    try {
      const permission = rolePermissions.find(
        p => p.role === role && p.permission_key === permissionKey
      );

      if (permission) {
        const { error } = await supabase
          .from("role_permissions")
          .update({ enabled: !currentEnabled })
          .eq("id", permission.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("role_permissions")
          .insert([{
            company_id: companyId,
            role: role as any,
            permission_key: permissionKey,
            enabled: !currentEnabled,
          }]);

        if (error) throw error;
      }

      await loadRolePermissions();
      toast.success(`Permission ${!currentEnabled ? 'enabled' : 'disabled'}`);
    } catch (error: any) {
      console.error("Error updating permission:", error);
      toast.error("Failed to update permission");
    } finally {
      setUpdating(null);
    }
  };

  const toggleMenuVisibility = async (menuId: string, currentVisible: boolean) => {
    setUpdating(`menu-${menuId}`);

    try {
      const { error } = await supabase
        .from("menu_configurations")
        .update({ is_visible: !currentVisible })
        .eq("id", menuId);

      if (error) throw error;

      await loadMenuConfigs();
      toast.success(`Menu item ${!currentVisible ? 'shown' : 'hidden'}`);
    } catch (error: any) {
      console.error("Error updating menu:", error);
      toast.error("Failed to update menu item");
    } finally {
      setUpdating(null);
    }
  };

  const toggleFeatureFlag = async (featureKey: string, currentEnabled: boolean) => {
    setUpdating(`feature-${featureKey}`);

    try {
      const existing = featureFlags.find(f => f.feature_key === featureKey);

      if (existing) {
        const { error } = await supabase
          .from("company_features")
          .update({ enabled: !currentEnabled })
          .eq("id", existing.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("company_features")
          .insert([{
            company_id: companyId,
            feature_key: featureKey,
            enabled: !currentEnabled,
          }]);

        if (error) throw error;
      }

      await loadFeatureFlags();
      toast.success(`Feature ${!currentEnabled ? 'enabled' : 'disabled'}`);
    } catch (error: any) {
      console.error("Error updating feature:", error);
      toast.error("Failed to update feature");
    } finally {
      setUpdating(null);
    }
  };

  const formatPermissionName = (key: string): string => {
    return key
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const getRolePermission = (role: string, permissionKey: string) => {
    return rolePermissions.find(p => p.role === role && p.permission_key === permissionKey);
  };

  const getFeatureFlag = (featureKey: string) => {
    return featureFlags.find(f => f.feature_key === featureKey);
  };

  const filteredCategories = Object.entries(PERMISSION_CATEGORIES).filter(([category, permissions]) =>
    category.toLowerCase().includes(searchTerm.toLowerCase()) ||
    permissions.some(p => p.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const filteredMenuConfigs = menuConfigs.filter(m =>
    m.item_key.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.role.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Shield className="h-6 w-6 text-primary" />
            Comprehensive Permission Manager
          </h2>
          <p className="text-muted-foreground mt-1">
            Control all features, pages, and actions for users and roles
          </p>
        </div>
        <Button
          onClick={syncAllPermissions}
          disabled={syncing}
          variant="outline"
          className="gap-2"
        >
          {syncing ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Syncing...
            </>
          ) : (
            <>
              <RefreshCw className="h-4 w-4" />
              Sync Permissions
            </>
          )}
        </Button>
      </div>

      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Permission System Overview</AlertTitle>
        <AlertDescription className="space-y-2">
          <p>This unified interface controls:</p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li><strong>Role Permissions:</strong> What each role can do (applies to all users with that role)</li>
            <li><strong>Menu Items:</strong> What navigation items are visible to each role</li>
            <li><strong>Feature Flags:</strong> Enable/disable entire features for the company</li>
            <li><strong>User Overrides:</strong> Override specific permissions for individual users</li>
          </ul>
        </AlertDescription>
      </Alert>

      <div className="flex items-center gap-2">
        <Search className="h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search permissions, features, or menu items..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-md"
        />
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="role-permissions" className="gap-2">
            <Users className="h-4 w-4" />
            Role Permissions
          </TabsTrigger>
          <TabsTrigger value="menu-items" className="gap-2">
            <Layout className="h-4 w-4" />
            Menu Items
          </TabsTrigger>
          <TabsTrigger value="features" className="gap-2">
            <Settings className="h-4 w-4" />
            Feature Flags
          </TabsTrigger>
          <TabsTrigger value="user-overrides" className="gap-2">
            <User className="h-4 w-4" />
            User Overrides
          </TabsTrigger>
        </TabsList>

        {/* Role Permissions Tab */}
        <TabsContent value="role-permissions" className="space-y-6">
          {filteredCategories.map(([category, permissions]) => (
            <Card key={category}>
              <CardHeader>
                <CardTitle>{category}</CardTitle>
                <CardDescription>
                  Manage {category.toLowerCase()} permissions for each role
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
                    {permissions.map((permissionKey) => (
                      <TableRow key={permissionKey}>
                        <TableCell className="font-medium">
                          {formatPermissionName(permissionKey)}
                        </TableCell>
                        {ROLES.map((role) => {
                          const permission = getRolePermission(role.key, permissionKey);
                          const updateKey = `role-${role.key}-${permissionKey}`;
                          const isUpdating = updating === updateKey;

                          return (
                            <TableCell key={role.key} className="text-center">
                              <div className="flex justify-center">
                                {isUpdating ? (
                                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                                ) : (
                                  <Switch
                                    checked={permission?.enabled || false}
                                    onCheckedChange={() =>
                                      toggleRolePermission(role.key, permissionKey, permission?.enabled || false)
                                    }
                                    disabled={isUpdating}
                                  />
                                )}
                              </div>
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
        </TabsContent>

        {/* Menu Items Tab */}
        <TabsContent value="menu-items" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Menu Visibility</CardTitle>
              <CardDescription>
                Control which menu items are visible to each role
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Menu Item</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead className="text-center">Visible</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredMenuConfigs.map((menu) => {
                    const role = ROLES.find(r => r.key === menu.role);
                    const isUpdating = updating === `menu-${menu.id}`;

                    return (
                      <TableRow key={menu.id}>
                        <TableCell className="font-medium">
                          {formatPermissionName(menu.item_key)}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{menu.item_type}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className={role?.color} variant="secondary">
                            {role?.label || menu.role}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          {isUpdating ? (
                            <Loader2 className="h-4 w-4 animate-spin mx-auto text-muted-foreground" />
                          ) : (
                            <Switch
                              checked={menu.is_visible}
                              onCheckedChange={() =>
                                toggleMenuVisibility(menu.id, menu.is_visible)
                              }
                              disabled={isUpdating}
                            />
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Feature Flags Tab */}
        <TabsContent value="features" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Feature Flags</CardTitle>
              <CardDescription>
                Enable or disable entire features for this company
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {FEATURE_FLAGS.map((feature) => {
                  const flag = getFeatureFlag(feature.key);
                  const isUpdating = updating === `feature-${feature.key}`;

                  return (
                    <div key={feature.key} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Label className="text-base font-medium">{feature.label}</Label>
                          {flag?.enabled ? (
                            <Badge variant="default" className="gap-1">
                              <CheckCircle className="h-3 w-3" />
                              Enabled
                            </Badge>
                          ) : (
                            <Badge variant="secondary">Disabled</Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Feature key: <code className="text-xs bg-muted px-1 py-0.5 rounded">{feature.key}</code>
                        </p>
                      </div>
                      {isUpdating ? (
                        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                      ) : (
                        <Switch
                          checked={flag?.enabled || false}
                          onCheckedChange={() =>
                            toggleFeatureFlag(feature.key, flag?.enabled || false)
                          }
                          disabled={isUpdating}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* User Overrides Tab */}
        <TabsContent value="user-overrides" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>User-Specific Permission Overrides</CardTitle>
              <CardDescription>
                Override permissions for individual users (Coming soon)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  User-specific permission overrides will be available in the next update. This will allow you to grant or revoke specific permissions for individual users, overriding their role-based permissions.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}