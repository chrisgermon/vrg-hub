import { useAuth } from '@/hooks/useAuth';
import { useCompanyContext } from '@/contexts/CompanyContext';
import { Navigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Building2, Settings as SettingsIcon } from 'lucide-react';
import { TestSampleEmailsButton } from '@/components/TestSampleEmailsButton';

export default function CompanyAdmin() {
  const { userRole, company } = useAuth();
  const { selectedCompany } = useCompanyContext();

  // Determine which company to manage
  const managedCompany = userRole === 'super_admin' && selectedCompany ? selectedCompany : company;

  // Only tenant admins and super admins can access company administration
  if (userRole !== 'tenant_admin' && userRole !== 'super_admin') {
    return <Navigate to="/" replace />;
  }

  if (!managedCompany) {
    return (
      <div className="container mx-auto py-8">
        <Card>
          <CardContent className="py-8">
            <p className="text-center text-muted-foreground">
              No company selected. Please select a company to manage.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
            <Building2 className="h-8 w-8" />
            Company Administration
          </h1>
          <p className="text-muted-foreground mt-2">
            Manage settings and permissions for <strong>{managedCompany.name}</strong>
          </p>
        </div>
        {userRole === 'super_admin' && <TestSampleEmailsButton />}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Company Administration</CardTitle>
          <CardDescription>
            All permission management has been moved to the centralized Permission Manager
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">
            To manage roles, permissions, and feature flags, please visit the{' '}
            <a href="/permissions" className="text-primary hover:underline font-medium">
              Permission Manager
            </a>
          </p>
          <div className="flex gap-2">
            <a href="/permissions">
              <button className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2">
                Go to Permission Manager
              </button>
            </a>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
