import { Fragment } from 'react';
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
import { RequestNotificationAssignments } from '@/components/settings/RequestNotificationAssignments';
import { UsersSection } from '@/components/settings/UsersSection';
import { PrintBrandsManager } from '@/components/settings/PrintBrandsManager';
import { CompanyDomainsManager } from '@/components/settings/CompanyDomainsManager';
import { CompanyFeaturesManager } from '@/components/settings/CompanyFeaturesManager';
import { DepartmentRequestTypeManager } from '@/components/requests/admin/DepartmentRequestTypeManager';
import { TeamManagement } from '@/components/requests/admin/TeamManagement';
import { TicketAuditLog } from '@/components/requests/admin/TicketAuditLog';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Edit } from 'lucide-react';
import { APP_VERSION, BUILD_DATE } from '@/lib/version';

const ticketingSections = [
  {
    value: 'departments',
    label: 'Departments & Types',
    content: <DepartmentRequestTypeManager />,
  },
  {
    value: 'teams',
    label: 'Teams',
    content: <TeamManagement />,
  },
  {
    value: 'audit',
    label: 'Audit Log',
    content: <TicketAuditLog />,
  },
];

function TicketingSettingsTabs() {
  return (
    <Tabs defaultValue={ticketingSections[0].value} className="space-y-4">
      <TabsList className="flex flex-wrap gap-2">
        {ticketingSections.map((section) => (
          <TabsTrigger key={section.value} value={section.value} className="whitespace-nowrap">
            {section.label}
          </TabsTrigger>
        ))}
      </TabsList>
      {ticketingSections.map((section) => (
        <TabsContent key={section.value} value={section.value} className="space-y-6">
          {section.content}
        </TabsContent>
      ))}
    </Tabs>
  );
}

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

  const sections = [
    {
      value: 'general',
      label: 'General',
      allowed: true,
      content: (
        <Card>
          <CardHeader>
            <CardTitle>About</CardTitle>
            <CardDescription>Application information</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Version</span>
                <span className="font-medium">{APP_VERSION}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Build Date</span>
                <span className="font-medium">{BUILD_DATE}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Environment</span>
                <span className="font-medium">beta</span>
              </div>
            </div>
          </CardContent>
        </Card>
      ),
    },
    {
      value: 'branding',
      label: 'Branding',
      allowed: isAdmin,
      content: <CompanySettings />,
    },
    {
      value: 'brands',
      label: 'Brands',
      allowed: isAdmin,
      content: <BrandsManager />,
    },
    {
      value: 'locations',
      label: 'Locations',
      allowed: isAdmin,
      content: <LocationsManager />,
    },
    {
      value: 'features',
      label: 'Features',
      allowed: isAdmin,
      content: <CompanyFeaturesManager />,
    },
    {
      value: 'company',
      label: 'Company',
      allowed: isAdmin,
      content: (
        <Fragment>
          <CompanyDomainsManager />
          <PrintBrandsManager />
          <CannedResponsesManager />
        </Fragment>
      ),
    },
    {
      value: 'users',
      label: 'Users & Roles',
      allowed: isAdmin,
      content: (
        <Card>
          <CardHeader>
            <CardTitle>User & Role Management</CardTitle>
            <CardDescription>Manage user roles and permissions with RBAC system</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Centralized role-based access control for all users and permissions.
              </p>
              <Button onClick={() => navigate('/user-roles')}>
                <Edit className="w-4 h-4 mr-2" />
                Manage Users & Roles
              </Button>
            </div>
          </CardContent>
        </Card>
      ),
    },
    {
      value: 'forms',
      label: 'Request Forms',
      allowed: isAdmin,
      content: (
        <Card>
          <CardHeader>
            <CardTitle>Request Form Templates</CardTitle>
            <CardDescription>Customize department request forms with advanced form builder</CardDescription>
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
      ),
    },
    {
      value: 'ticketing',
      label: 'Ticketing System',
      allowed: isAdmin,
      content: <TicketingSettingsTabs />,
    },
    {
      value: 'notifications',
      label: 'Notifications',
      allowed: isAdmin,
      content: (
        <Fragment>
          {(isSuperAdmin || isTenantAdmin) && <RequestNotificationAssignments />}
          <NotificationSettingsManager />
        </Fragment>
      ),
    },
    {
      value: 'menu',
      label: 'Menu',
      allowed: isAdmin,
      content: <MenuEditor />,
    },
    {
      value: 'system',
      label: 'System',
      allowed: isSuperAdmin,
      content: (
        <Fragment>
          <SystemStatusManager />
          <SystemBannerManager />
          <ApprovalWorkflowManager />
        </Fragment>
      ),
    },
  ].filter((section) => section.allowed);

  const defaultTab = sections[0]?.value ?? 'general';

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground mt-2">Manage your application preferences and configuration</p>
      </div>

      <Tabs defaultValue={defaultTab} className="space-y-6">
        <TabsList className="flex flex-wrap gap-2">
          {sections.map((section) => (
            <TabsTrigger key={section.value} value={section.value} className="whitespace-nowrap">
              {section.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {sections.map((section) => (
          <TabsContent key={section.value} value={section.value} className="space-y-6">
            {section.content}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
