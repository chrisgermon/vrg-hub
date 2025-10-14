import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useEffect } from 'react';
import { SystemStatusManager } from '@/components/settings/SystemStatusManager';
import { SystemBannerManager } from '@/components/banners/SystemBannerManager';
import { ApprovalWorkflowManager } from '@/components/workflows/ApprovalWorkflowManager';
import { CompanySettings } from '@/components/CompanySettings';
import { MenuEditor } from '@/components/settings/MenuEditor';
import { RolesManager } from '@/components/settings/RolesManager';
import { CannedResponsesManager } from '@/components/settings/CannedResponsesManager';
import { CompanyLocationsManager } from '@/components/settings/CompanyLocationsManager';
import { NotificationSettingsManager } from '@/components/settings/NotificationSettingsManager';
import { useAuth } from '@/hooks/useAuth';

export default function Settings() {
  const { userRole } = useAuth();
  
  const isSuperAdmin = userRole === 'super_admin';
  const isTenantAdmin = userRole === 'tenant_admin';
  const isAdmin = isSuperAdmin || isTenantAdmin;

  useEffect(() => {
    // Force light theme
    const root = window.document.documentElement;
    root.classList.remove('dark');
    root.classList.add('light');
    localStorage.setItem('theme', 'light');
  }, []);

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground mt-2">Manage your application preferences and configuration</p>
      </div>

      <Tabs defaultValue="general" className="space-y-6">
        <TabsList>
          <TabsTrigger value="general">General</TabsTrigger>
          {isAdmin && <TabsTrigger value="company">Company</TabsTrigger>}
          {isAdmin && <TabsTrigger value="users">Users & Roles</TabsTrigger>}
          {isAdmin && <TabsTrigger value="notifications">Notifications</TabsTrigger>}
          {isAdmin && <TabsTrigger value="menu">Menu</TabsTrigger>}
          {isSuperAdmin && <TabsTrigger value="system">System</TabsTrigger>}
        </TabsList>

        <TabsContent value="general" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>About</CardTitle>
              <CardDescription>
                Application information
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Version</span>
                  <span className="font-medium">1.0.0</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Environment</span>
                  <span className="font-medium">beta</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {isAdmin && (
          <TabsContent value="company" className="space-y-6">
            <CompanySettings />
            <CompanyLocationsManager />
            <CannedResponsesManager />
          </TabsContent>
        )}

        {isAdmin && (
          <TabsContent value="users" className="space-y-6">
            <RolesManager />
          </TabsContent>
        )}

        {isAdmin && (
          <TabsContent value="notifications" className="space-y-6">
            <NotificationSettingsManager />
          </TabsContent>
        )}

        {isAdmin && (
          <TabsContent value="menu" className="space-y-6">
            <MenuEditor />
          </TabsContent>
        )}

        {isSuperAdmin && (
          <TabsContent value="system" className="space-y-6">
            <SystemStatusManager />
            <SystemBannerManager />
            <ApprovalWorkflowManager />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
