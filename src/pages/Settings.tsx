import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { SystemStatusManager } from '@/components/settings/SystemStatusManager';
import { SystemBannerManager } from '@/components/banners/SystemBannerManager';
import { ApprovalWorkflowManager } from '@/components/workflows/ApprovalWorkflowManager';
import { CompanySettings } from '@/components/CompanySettings';
import { MenuEditor } from '@/components/settings/MenuEditor';
import { CannedResponsesManager } from '@/components/settings/CannedResponsesManager';
import { BrandsManager } from '@/components/settings/BrandsManager';
import { LocationsManager } from '@/components/settings/LocationsManager';
import { NotificationSettingsManager } from '@/components/settings/NotificationSettingsManager';
import { UsersSection } from '@/components/settings/UsersSection';
import { PrintBrandsManager } from '@/components/settings/PrintBrandsManager';
import { CompanyDomainsManager } from '@/components/settings/CompanyDomainsManager';
import { CompanyFeaturesManager } from '@/components/settings/CompanyFeaturesManager';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Edit } from 'lucide-react';

export default function Settings() {
  const { userRole } = useAuth();
  const navigate = useNavigate();
  
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
          {isAdmin && <TabsTrigger value="branding">Branding</TabsTrigger>}
          {isAdmin && <TabsTrigger value="brands">Brands</TabsTrigger>}
          {isAdmin && <TabsTrigger value="locations">Locations</TabsTrigger>}
          {isAdmin && <TabsTrigger value="features">Features</TabsTrigger>}
          {isAdmin && <TabsTrigger value="company">Company</TabsTrigger>}
          {isAdmin && <TabsTrigger value="users">Users & Roles</TabsTrigger>}
          {isAdmin && <TabsTrigger value="forms">Request Forms</TabsTrigger>}
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
          <TabsContent value="branding" className="space-y-6">
            <CompanySettings />
          </TabsContent>
        )}

        {isAdmin && (
          <TabsContent value="brands" className="space-y-6">
            <BrandsManager />
          </TabsContent>
        )}

        {isAdmin && (
          <TabsContent value="locations" className="space-y-6">
            <LocationsManager />
          </TabsContent>
        )}

        {isAdmin && (
          <TabsContent value="features" className="space-y-6">
            <CompanyFeaturesManager />
          </TabsContent>
        )}

        {isAdmin && (
          <TabsContent value="company" className="space-y-6">
            <CompanyDomainsManager />
            <PrintBrandsManager />
            <CannedResponsesManager />
          </TabsContent>
        )}

        {isAdmin && (
          <TabsContent value="users" className="space-y-6">
            <UsersSection />
          </TabsContent>
        )}

        {isAdmin && (
          <TabsContent value="forms" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Request Form Templates</CardTitle>
                <CardDescription>
                  Customize department request forms with advanced form builder
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Edit and customize all department request forms including fields, validation, and layout.
                  </p>
                  <Button onClick={() => navigate('/form-templates')}>
                    <Edit className="w-4 h-4 mr-2" />
                    Open Form Editor
                  </Button>
                </div>
              </CardContent>
            </Card>
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
