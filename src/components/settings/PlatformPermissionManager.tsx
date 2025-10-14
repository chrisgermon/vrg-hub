import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Loader2, RefreshCw, Shield } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface PlatformPermission {
  id: string;
  role: string;
  permission_key: string;
  enabled: boolean;
}

const PLATFORM_PERMISSIONS = [
  {
    category: 'Company Management',
    permissions: [
      { key: 'manage_all_companies', label: 'Manage All Companies', description: 'Create, edit, and delete any company' },
      { key: 'view_all_companies', label: 'View All Companies', description: 'View details of all companies' },
    ]
  },
  {
    category: 'User Management',
    permissions: [
      { key: 'manage_system_users', label: 'Manage System Users', description: 'Manage users across all companies' },
      { key: 'impersonate_users', label: 'Impersonate Users', description: 'Log in as any user for support purposes' },
    ]
  },
  {
    category: 'System Administration',
    permissions: [
      { key: 'view_all_audit_logs', label: 'View All Audit Logs', description: 'Access audit logs from all companies' },
      { key: 'manage_platform_settings', label: 'Manage Platform Settings', description: 'Configure platform-wide settings' },
      { key: 'manage_integrations', label: 'Manage Integrations', description: 'Configure system integrations' },
    ]
  },
];

export function PlatformPermissionManager() {
  const [permissions, setPermissions] = useState<PlatformPermission[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadPermissions();
  }, []);

  const loadPermissions = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('platform_permissions')
        .select('*')
        .eq('role', 'super_admin');

      if (error) throw error;
      setPermissions(data || []);
    } catch (error: any) {
      toast({
        title: "Error loading permissions",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const syncAllPermissions = async () => {
    try {
      setSaving(true);

      // Get all defined permissions
      const allPermissions = PLATFORM_PERMISSIONS.flatMap(cat => 
        cat.permissions.map(p => p.key)
      );

      // Upsert each permission
      for (const permissionKey of allPermissions) {
        const { error } = await supabase
          .from('platform_permissions')
          .upsert({
            role: 'super_admin',
            permission_key: permissionKey,
            enabled: true,
          }, {
            onConflict: 'role,permission_key',
          });

        if (error) throw error;
      }

      await loadPermissions();
      
      toast({
        title: "Permissions synced",
        description: "All platform permissions have been synchronized.",
      });
    } catch (error: any) {
      toast({
        title: "Error syncing permissions",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const togglePermission = async (permissionKey: string, currentEnabled: boolean) => {
    try {
      const { error } = await supabase
        .from('platform_permissions')
        .update({ enabled: !currentEnabled })
        .eq('role', 'super_admin')
        .eq('permission_key', permissionKey);

      if (error) throw error;

      setPermissions(prev =>
        prev.map(p =>
          p.permission_key === permissionKey
            ? { ...p, enabled: !currentEnabled }
            : p
        )
      );

      toast({
        title: "Permission updated",
        description: `Platform permission ${!currentEnabled ? 'enabled' : 'disabled'} successfully.`,
      });
    } catch (error: any) {
      toast({
        title: "Error updating permission",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const getPermissionState = (permissionKey: string) => {
    const permission = permissions.find(p => p.permission_key === permissionKey);
    return permission?.enabled ?? false;
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-2 border-purple-200 dark:border-purple-800">
      <CardHeader className="bg-purple-50 dark:bg-purple-900/20">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-purple-900 dark:text-purple-100">
              <Shield className="h-5 w-5" />
              Platform Permissions
            </CardTitle>
            <CardDescription>
              Configure platform-wide permissions for super administrators
            </CardDescription>
          </div>
          <Button 
            onClick={syncAllPermissions} 
            disabled={saving}
            variant="outline"
            size="sm"
          >
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Syncing...
              </>
            ) : (
              <>
                <RefreshCw className="mr-2 h-4 w-4" />
                Sync Permissions
              </>
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <Alert>
          <Shield className="h-4 w-4" />
          <AlertDescription>
            These permissions apply globally across the entire platform and are only available to super administrators.
            Company-specific permissions should be managed in the Company Admin section.
          </AlertDescription>
        </Alert>

        {PLATFORM_PERMISSIONS.map((category) => (
          <div key={category.category} className="space-y-4">
            <h3 className="text-lg font-semibold text-foreground border-b pb-2">
              {category.category}
            </h3>
            <div className="space-y-4">
              {category.permissions.map((permission) => {
                const isEnabled = getPermissionState(permission.key);
                return (
                  <div
                    key={permission.key}
                    className="flex items-start justify-between space-x-4 p-4 rounded-lg border bg-card"
                  >
                    <div className="space-y-1 flex-1">
                      <Label htmlFor={permission.key} className="text-base font-medium cursor-pointer">
                        {permission.label}
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        {permission.description}
                      </p>
                    </div>
                    <Switch
                      id={permission.key}
                      checked={isEnabled}
                      onCheckedChange={() => togglePermission(permission.key, isEnabled)}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
