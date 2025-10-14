
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useEffect, useState } from 'react';
import { SystemStatusManager } from '@/components/settings/SystemStatusManager';
// import { HaloIntegrationSettings } from '@/components/settings/HaloIntegrationSettings'; // Temporarily disabled
import { SystemBannerManager } from '@/components/banners/SystemBannerManager';
import { ApprovalWorkflowManager } from '@/components/workflows/ApprovalWorkflowManager';
import { useAuth } from '@/hooks/useAuth';
import { useCompanyContext } from '@/contexts/CompanyContext';

export default function Settings() {
  const { userRole, company: userCompany, loading } = useAuth();
  const { selectedCompany } = useCompanyContext();
  const companyId = selectedCompany?.id || userCompany?.id;
  
  const isSuperAdmin = userRole === 'super_admin';

  // System-wide features only available for super admins on their platform admin page
  const showSystemStatus = false; // Disabled in regular settings

  useEffect(() => {
    // Force light theme
    const root = window.document.documentElement;
    root.classList.remove('dark');
    root.classList.add('light');
    localStorage.setItem('theme', 'light');
  }, []);

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground mt-2">Manage your application preferences</p>
      </div>

      {loading ? (
        <Card>
          <CardContent className="py-8">
            <p className="text-center text-muted-foreground">Loading...</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {showSystemStatus && (
            <SystemStatusManager />
          )}

          {/* HaloPSA Integration - Temporarily disabled */}
          {/* <HaloIntegrationSettings /> */}
          
          {isSuperAdmin && companyId && (
            <>
              <SystemBannerManager />
              <ApprovalWorkflowManager />
            </>
          )}

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
        </div>
      )}
    </div>
  );
}
