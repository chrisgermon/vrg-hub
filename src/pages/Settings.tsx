import { useState, useEffect, Suspense, lazy, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { usePermissions } from '@/hooks/usePermissions';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { APP_VERSION, BUILD_DATE } from '@/lib/version';
import {
  Info,
  Palette,
  Tags,
  MapPin,
  Sparkles,
  Building2,
  Users,
  FileText,
  Bell,
  Menu,
  Clock,
  Settings as SettingsIcon,
  FlaskConical,
  ChevronRight,
  Edit,
  type LucideIcon,
} from 'lucide-react';

// Lazy load heavy components for better performance
const CompanySettings = lazy(() => import('@/components/CompanySettings').then(m => ({ default: m.CompanySettings })));
const MenuEditor = lazy(() => import('@/components/settings/MenuEditor').then(m => ({ default: m.MenuEditor })));
const BrandsManager = lazy(() => import('@/components/settings/BrandsManager').then(m => ({ default: m.BrandsManager })));
const LocationsManager = lazy(() => import('@/components/settings/LocationsManager').then(m => ({ default: m.LocationsManager })));
const NotificationSettingsManager = lazy(() => import('@/components/settings/NotificationSettingsManager').then(m => ({ default: m.NotificationSettingsManager })));
const RequestNotificationAssignments = lazy(() => import('@/components/settings/RequestNotificationAssignments').then(m => ({ default: m.RequestNotificationAssignments })));
const PrintBrandsManager = lazy(() => import('@/components/settings/PrintBrandsManager').then(m => ({ default: m.PrintBrandsManager })));
const CompanyDomainsManager = lazy(() => import('@/components/settings/CompanyDomainsManager').then(m => ({ default: m.CompanyDomainsManager })));
const CompanyFeaturesManager = lazy(() => import('@/components/settings/CompanyFeaturesManager').then(m => ({ default: m.CompanyFeaturesManager })));
const ReminderSettingsManager = lazy(() => import('@/components/settings/ReminderSettingsManager').then(m => ({ default: m.ReminderSettingsManager })));
const SystemStatusManager = lazy(() => import('@/components/settings/SystemStatusManager').then(m => ({ default: m.SystemStatusManager })));
const SystemBannerManager = lazy(() => import('@/components/banners/SystemBannerManager').then(m => ({ default: m.SystemBannerManager })));
const ApprovalWorkflowManager = lazy(() => import('@/components/workflows/ApprovalWorkflowManager').then(m => ({ default: m.ApprovalWorkflowManager })));
const TestsTab = lazy(() => import('@/components/settings/TestsTab').then(m => ({ default: m.TestsTab })));

// Loading skeleton for lazy-loaded content
function ContentSkeleton() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-72" />
      </div>
      <Separator />
      <div className="space-y-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    </div>
  );
}

// Section header component to reduce repetition
function SectionHeader({ title, description }: { title: string; description: string }) {
  return (
    <>
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">{title}</h2>
        <p className="text-muted-foreground">{description}</p>
      </div>
      <Separator />
    </>
  );
}

// Types for section configuration
interface SectionConfig {
  value: string;
  label: string;
  description: string;
  icon: LucideIcon;
  group: 'general' | 'appearance' | 'organization' | 'content' | 'system';
}

// Section groups for better organization
const SECTION_GROUPS = {
  general: { label: 'General', order: 0 },
  appearance: { label: 'Appearance', order: 1 },
  organization: { label: 'Organization', order: 2 },
  content: { label: 'Content & Access', order: 3 },
  system: { label: 'System', order: 4 },
} as const;

export default function Settings() {
  const { userRole } = useAuth();
  const { hasPermission } = usePermissions();
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState<string>('general');

  const isSuperAdmin = userRole === 'super_admin';
  const isTenantAdmin = userRole === 'tenant_admin';
  const isAdmin = isSuperAdmin || isTenantAdmin;
  const canManageReminderSettings = hasPermission('manage_reminder_settings') || isAdmin;

  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove('dark');
    root.classList.add('light');
    localStorage.setItem('theme', 'light');
  }, []);

  // Section configuration - separated from content for cleaner code
  const sectionConfigs: (SectionConfig & { allowed: boolean })[] = useMemo(() => [
    { value: 'general', label: 'General', description: 'App info & version', icon: Info, group: 'general', allowed: true },
    { value: 'branding', label: 'Branding', description: 'Logo & colors', icon: Palette, group: 'appearance', allowed: isAdmin },
    { value: 'brands', label: 'Brands', description: 'Product brands', icon: Tags, group: 'organization', allowed: isAdmin },
    { value: 'locations', label: 'Locations', description: 'Sites & offices', icon: MapPin, group: 'organization', allowed: isAdmin },
    { value: 'company', label: 'Company', description: 'Domains & print', icon: Building2, group: 'organization', allowed: isAdmin },
    { value: 'features', label: 'Features', description: 'Toggle features', icon: Sparkles, group: 'content', allowed: isAdmin },
    { value: 'users', label: 'Users & Roles', description: 'RBAC management', icon: Users, group: 'content', allowed: isAdmin },
    { value: 'forms', label: 'Request Forms', description: 'Form templates', icon: FileText, group: 'content', allowed: isAdmin },
    { value: 'menu', label: 'Menu', description: 'Navigation editor', icon: Menu, group: 'content', allowed: isAdmin },
    { value: 'notifications', label: 'Notifications', description: 'Email & alerts', icon: Bell, group: 'system', allowed: isAdmin },
    { value: 'reminders', label: 'Reminders', description: 'Reminder schedules', icon: Clock, group: 'system', allowed: canManageReminderSettings },
    { value: 'system', label: 'System', description: 'Status & workflows', icon: SettingsIcon, group: 'system', allowed: isSuperAdmin },
    { value: 'tests', label: 'Tests', description: 'Diagnostics', icon: FlaskConical, group: 'system', allowed: isAdmin },
  ], [isAdmin, isSuperAdmin, canManageReminderSettings]);

  const allowedSections = useMemo(() =>
    sectionConfigs.filter(s => s.allowed),
    [sectionConfigs]
  );

  // Group sections for sidebar display
  const groupedSections = useMemo(() => {
    const groups = new Map<string, typeof allowedSections>();

    for (const section of allowedSections) {
      const existing = groups.get(section.group) || [];
      groups.set(section.group, [...existing, section]);
    }

    return Array.from(groups.entries())
      .sort((a, b) => SECTION_GROUPS[a[0] as keyof typeof SECTION_GROUPS].order - SECTION_GROUPS[b[0] as keyof typeof SECTION_GROUPS].order)
      .filter(([, sections]) => sections.length > 0);
  }, [allowedSections]);

  // Set default to first allowed section
  useEffect(() => {
    if (allowedSections.length > 0 && !allowedSections.find(s => s.value === activeSection)) {
      setActiveSection(allowedSections[0].value);
    }
  }, [allowedSections, activeSection]);

  // Render content based on active section - only renders the active one
  const renderContent = () => {
    const section = allowedSections.find(s => s.value === activeSection);
    if (!section) return null;

    const content = (() => {
      switch (activeSection) {
        case 'general':
          return (
            <>
              <SectionHeader title="General" description="Application information and about" />
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">About This Application</CardTitle>
                  <CardDescription>Version and build information</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4">
                    <div className="flex items-center justify-between py-2 border-b">
                      <span className="text-muted-foreground">Version</span>
                      <span className="font-mono font-medium bg-muted px-2 py-1 rounded">{APP_VERSION}</span>
                    </div>
                    <div className="flex items-center justify-between py-2 border-b">
                      <span className="text-muted-foreground">Build Date</span>
                      <span className="font-mono font-medium bg-muted px-2 py-1 rounded">{BUILD_DATE}</span>
                    </div>
                    <div className="flex items-center justify-between py-2">
                      <span className="text-muted-foreground">Environment</span>
                      <span className="font-mono font-medium bg-blue-100 text-blue-800 px-2 py-1 rounded">beta</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          );

        case 'branding':
          return (
            <>
              <SectionHeader title="Branding" description="Customize your company's look and feel" />
              <Suspense fallback={<ContentSkeleton />}>
                <CompanySettings />
              </Suspense>
            </>
          );

        case 'brands':
          return (
            <>
              <SectionHeader title="Brands" description="Manage your organization's brands" />
              <Suspense fallback={<ContentSkeleton />}>
                <BrandsManager />
              </Suspense>
            </>
          );

        case 'locations':
          return (
            <>
              <SectionHeader title="Locations" description="Manage office and site locations" />
              <Suspense fallback={<ContentSkeleton />}>
                <LocationsManager />
              </Suspense>
            </>
          );

        case 'features':
          return (
            <>
              <SectionHeader title="Features" description="Control which features are enabled" />
              <Suspense fallback={<ContentSkeleton />}>
                <CompanyFeaturesManager />
              </Suspense>
            </>
          );

        case 'company':
          return (
            <>
              <SectionHeader title="Company" description="Manage domains and print brand settings" />
              <Suspense fallback={<ContentSkeleton />}>
                <div className="space-y-6">
                  <CompanyDomainsManager />
                  <PrintBrandsManager />
                </div>
              </Suspense>
            </>
          );

        case 'users':
          return (
            <>
              <SectionHeader title="Users & Roles" description="Manage user roles and permissions with RBAC" />
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">User & Role Management</CardTitle>
                  <CardDescription>Centralized role-based access control for all users and permissions</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                      Configure user roles, assign permissions, and manage individual user access overrides.
                      The RBAC system provides fine-grained control over what each user can see and do.
                    </p>
                    <Button onClick={() => navigate('/user-roles')} className="w-full sm:w-auto">
                      <Edit className="w-4 h-4 mr-2" />
                      Manage Users & Roles
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </>
          );

        case 'forms':
          return (
            <>
              <SectionHeader title="Request Forms" description="Create and manage request form templates" />
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Request Forms & Categories</CardTitle>
                  <CardDescription>Create and manage forms for each request category</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                      Manage request types, categories, and their associated form templates. Use the form builder
                      to create custom fields and layouts for each type of request.
                    </p>
                    <Button onClick={() => navigate('/form-templates')} className="w-full sm:w-auto">
                      <Edit className="w-4 h-4 mr-2" />
                      Manage Request Forms
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </>
          );

        case 'notifications':
          return (
            <>
              <SectionHeader title="Notifications" description="Configure notification preferences and assignments" />
              <Suspense fallback={<ContentSkeleton />}>
                <div className="space-y-6">
                  {(isSuperAdmin || isTenantAdmin) && <RequestNotificationAssignments />}
                  <NotificationSettingsManager />
                </div>
              </Suspense>
            </>
          );

        case 'menu':
          return (
            <>
              <SectionHeader title="Menu" description="Customize the navigation menu" />
              <Suspense fallback={<ContentSkeleton />}>
                <MenuEditor />
              </Suspense>
            </>
          );

        case 'reminders':
          return (
            <>
              <SectionHeader title="Reminders" description="Configure reminder schedules and settings" />
              <Suspense fallback={<ContentSkeleton />}>
                <ReminderSettingsManager />
              </Suspense>
            </>
          );

        case 'system':
          return (
            <>
              <SectionHeader title="System" description="System status, banners, and workflows" />
              <Suspense fallback={<ContentSkeleton />}>
                <div className="space-y-6">
                  <SystemStatusManager />
                  <SystemBannerManager />
                  <ApprovalWorkflowManager />
                </div>
              </Suspense>
            </>
          );

        case 'tests':
          return (
            <>
              <SectionHeader title="Tests" description="Testing and diagnostic tools" />
              <Suspense fallback={<ContentSkeleton />}>
                <TestsTab />
              </Suspense>
            </>
          );

        default:
          return null;
      }
    })();

    return <div className="space-y-6">{content}</div>;
  };

  return (
    <div className="container mx-auto p-4 md:p-6 max-w-7xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground mt-1">Manage your application preferences and configuration</p>
      </div>

      <div className="flex flex-col md:flex-row gap-6">
        {/* Sidebar Navigation */}
        <aside className="w-full md:w-56 shrink-0">
          <Card className="sticky top-4">
            <ScrollArea className="h-auto md:h-[calc(100vh-200px)]">
              <nav className="p-2">
                {groupedSections.map(([groupKey, sections], groupIndex) => (
                  <div key={groupKey}>
                    {groupIndex > 0 && <Separator className="my-2" />}
                    <div className="px-3 py-1.5">
                      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        {SECTION_GROUPS[groupKey as keyof typeof SECTION_GROUPS].label}
                      </span>
                    </div>
                    {sections.map((section) => {
                      const Icon = section.icon;
                      const isActive = activeSection === section.value;

                      return (
                        <button
                          key={section.value}
                          onClick={() => setActiveSection(section.value)}
                          className={cn(
                            "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors",
                            "hover:bg-accent hover:text-accent-foreground",
                            isActive
                              ? "bg-primary text-primary-foreground shadow-sm"
                              : "text-muted-foreground"
                          )}
                        >
                          <Icon className={cn(
                            "h-4 w-4 shrink-0",
                            isActive ? "text-primary-foreground" : "text-muted-foreground"
                          )} />
                          <span className={cn(
                            "font-medium text-sm truncate flex-1",
                            isActive ? "text-primary-foreground" : "text-foreground"
                          )}>
                            {section.label}
                          </span>
                          {isActive && (
                            <ChevronRight className="h-4 w-4 shrink-0 text-primary-foreground" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                ))}
              </nav>
            </ScrollArea>
          </Card>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 min-w-0">
          <Card className="min-h-[calc(100vh-200px)]">
            <CardContent className="p-6">
              {renderContent()}
            </CardContent>
          </Card>
        </main>
      </div>
    </div>
  );
}
