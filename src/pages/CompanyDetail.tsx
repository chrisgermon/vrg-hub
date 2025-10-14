import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Building2, Loader2 } from 'lucide-react';
import { CompanySettings } from '@/components/CompanySettings';
import { ApplicationsManager } from '@/components/settings/ApplicationsManager';
import { Office365Integration } from '@/components/settings/Office365Integration';
import { CompanyFeaturesManager } from '@/components/settings/CompanyFeaturesManager';
import { PrintBrandsManager } from '@/components/settings/PrintBrandsManager';
import { CompanyDomainsManager } from '@/components/settings/CompanyDomainsManager';
import { CompanyLocationsManager } from '@/components/settings/CompanyLocationsManager';
import { UsersSection } from '@/components/settings/UsersSection';
import { UnifiedUserManagement } from '@/components/admin/UnifiedUserManagement';
import { UserAccountsList } from '@/components/user-accounts/UserAccountsList';
import { useAuth } from '@/hooks/useAuth';
import { TestSampleEmailsButton } from '@/components/TestSampleEmailsButton';

export default function CompanyDetail() {
  const { companyId } = useParams<{ companyId: string }>();
  const navigate = useNavigate();
  const { userRole, company: userCompany } = useAuth();
  const searchParams = new URLSearchParams(window.location.search);
  const defaultTab = searchParams.get('tab') || 'overview';

  const { data: company, isLoading, refetch } = useQuery({
    queryKey: ['company-detail', companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('companies')
        .select(`
          *,
          company_domains(domain, active)
        `)
        .eq('id', companyId)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!companyId
  });

  const handleLogoUpdated = () => {
    refetch();
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-8">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (!company) {
    return (
      <div className="container mx-auto py-8">
        <Card>
          <CardContent className="py-8">
            <p className="text-center text-muted-foreground">Company not found</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Tenant admins can only access their own company
  if (userRole === 'tenant_admin' && userCompany?.id !== companyId) {
    return (
      <div className="container mx-auto py-8">
        <Card>
          <CardContent className="py-8">
            <div className="text-center">
              <h2 className="text-lg font-semibold text-red-800 mb-2">
                Access Denied
              </h2>
              <p className="text-red-700">
                You can only access your own company's settings.
              </p>
              <Button 
                onClick={() => navigate(`/admin/companies/${userCompany?.id}`)} 
                className="mt-4"
              >
                Go to Your Company Settings
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          {userRole === 'super_admin' && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/admin/companies')}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
          )}
          <div className="flex items-center gap-3">
            {company.logo_url ? (
              <img 
                src={company.logo_url} 
                alt={company.name}
                className="h-12 w-12 object-contain rounded"
              />
            ) : (
              <div className="h-12 w-12 rounded bg-primary/10 flex items-center justify-center">
                <Building2 className="h-6 w-6 text-primary" />
              </div>
            )}
            <div>
              <h1 className="text-3xl font-bold text-foreground">{company.name}</h1>
              <p className="text-muted-foreground">Company Configuration & Settings</p>
            </div>
          </div>
        </div>
        {userRole === 'super_admin' && <TestSampleEmailsButton />}
      </div>

      {/* Main Content */}
      <Tabs defaultValue={defaultTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-9 lg:w-auto">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="features">Features</TabsTrigger>
          <TabsTrigger value="domains">Domains</TabsTrigger>
          <TabsTrigger value="locations">Locations</TabsTrigger>
          <TabsTrigger value="applications">Applications</TabsTrigger>
          <TabsTrigger value="office365">Office 365</TabsTrigger>
          <TabsTrigger value="print-brands">Print Brands</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <CompanySettings company={company} onLogoUpdated={handleLogoUpdated} />
        </TabsContent>

        {/* Users Tab */}
        <TabsContent value="users" className="space-y-6">
          {/* User Management with Invites, Roles, Permissions */}
          <Card>
            <CardHeader>
              <CardTitle>User Management</CardTitle>
              <CardDescription>
                Manage users, invitations, roles, and permissions for {company.name}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <UsersSection companyId={company.id} />
            </CardContent>
          </Card>

          {/* Unified User Management */}
          <UnifiedUserManagement companyId={company.id} />
          
          {/* User Account Requests */}
          <Card>
            <CardHeader>
              <CardTitle>User Account Requests</CardTitle>
              <CardDescription>
                Review and approve new Active Directory user account requests
              </CardDescription>
            </CardHeader>
            <CardContent>
              <UserAccountsList />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Features Tab */}
        <TabsContent value="features" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Feature Management</CardTitle>
              <CardDescription>
                Enable or disable features for {company.name}
              </CardDescription>
            </CardHeader>
          </Card>
          <CompanyFeaturesManager companyId={company.id} />
        </TabsContent>

        {/* Domains Tab */}
        <TabsContent value="domains" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Email Domains</CardTitle>
              <CardDescription>
                Manage email domains for {company.name}
              </CardDescription>
            </CardHeader>
          </Card>
          <CompanyDomainsManager />
        </TabsContent>

        {/* Locations Tab */}
        <TabsContent value="locations" className="space-y-6">
          <CompanyLocationsManager companyId={company.id} />
        </TabsContent>

        {/* Applications Tab */}
        <TabsContent value="applications" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Application Access</CardTitle>
              <CardDescription>
                Configure which applications are available for {company.name}
              </CardDescription>
            </CardHeader>
          </Card>
          <ApplicationsManager />
        </TabsContent>

        {/* Office 365 Tab */}
        <TabsContent value="office365" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Office 365 Integration</CardTitle>
              <CardDescription>
                Connect and sync with Office 365 for {company.name}
              </CardDescription>
            </CardHeader>
          </Card>
          <Office365Integration companyId={company.id} />
        </TabsContent>

        {/* Print Brands Tab */}
        <TabsContent value="print-brands" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Print Order Brands</CardTitle>
              <CardDescription>
                Manage available print ordering brands for {company.name}
              </CardDescription>
            </CardHeader>
          </Card>
          <PrintBrandsManager />
        </TabsContent>
      </Tabs>
    </div>
  );
}
