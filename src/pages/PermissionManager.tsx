import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Shield, Search, Settings, Users, Menu, Flag, ArrowLeft, Building2 } from "lucide-react";
import { useAccessControl } from "@/hooks/useAccessControl";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { RolePermissionsTab } from "@/components/permissions/RolePermissionsTab";
import { MenuItemsTab } from "@/components/permissions/MenuItemsTab";
import { FeatureFlagsTab } from "@/components/permissions/FeatureFlagsTab";
import { UserOverridesTab } from "@/components/permissions/UserOverridesTab";
import { supabase } from "@/integrations/supabase/client";

export default function PermissionManager() {
  const navigate = useNavigate();
  const { isSuperAdmin, isTenantAdmin, companyId: defaultCompanyId } = useAccessControl();
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("roles");

  // Fetch all companies for super admin
  const { data: companies = [] } = useQuery({
    queryKey: ['all-companies'],
    enabled: isSuperAdmin,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('companies')
        .select('id, name')
        .eq('active', true)
        .order('name');

      if (error) throw error;
      return data;
    }
  });

  // Set default company when data loads
  useEffect(() => {
    if (isSuperAdmin && companies.length > 0 && !selectedCompanyId) {
      setSelectedCompanyId(defaultCompanyId || companies[0].id);
    }
  }, [isSuperAdmin, companies, selectedCompanyId, defaultCompanyId]);

  // Determine which company ID to use
  const companyId = isSuperAdmin ? selectedCompanyId : defaultCompanyId;

  if (!isSuperAdmin && !isTenantAdmin) {
    return (
      <div className="container mx-auto py-8 px-4">
        <Alert>
          <Shield className="h-4 w-4" />
          <AlertDescription>
            You don't have permission to access the permission manager.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!companyId && !isSuperAdmin) {
    return (
      <div className="container mx-auto py-8 px-4">
        <Alert>
          <Shield className="h-4 w-4" />
          <AlertDescription>
            Please select a company to manage permissions.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const selectedCompany = companies.find(c => c.id === companyId);

  return (
    <div className="container mx-auto py-8 px-4 max-w-[1600px]">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-3">
              <Shield className="h-8 w-8 text-primary" />
              <div>
                <h1 className="text-3xl font-bold">Permission Manager</h1>
                <p className="text-muted-foreground">
                  Unified control for roles, permissions, features, and user overrides
                </p>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            {/* Company Selector for Super Admin */}
            {isSuperAdmin && (
              <div className="flex items-center gap-2 min-w-[300px]">
                <Building2 className="h-4 w-4 text-muted-foreground" />
                <Select value={companyId} onValueChange={setSelectedCompanyId}>
                  <SelectTrigger className="bg-background">
                    <SelectValue placeholder="Select a company..." />
                  </SelectTrigger>
                  <SelectContent className="bg-popover z-50">
                    {companies.map(company => (
                      <SelectItem key={company.id} value={company.id}>
                        {company.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            
            {/* Search */}
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search permissions..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        </div>

        {/* Company Info Badge */}
        {selectedCompany && (
          <Alert>
            <Building2 className="h-4 w-4" />
            <AlertDescription>
              Managing permissions for: <strong>{selectedCompany.name}</strong>
            </AlertDescription>
          </Alert>
        )}

        {/* Info Alert */}
        <Alert>
          <Shield className="h-4 w-4" />
          <AlertDescription>
            Changes take effect immediately. User overrides have highest precedence and can grant or deny specific features.
          </AlertDescription>
        </Alert>

        {/* Tabs */}
        {companyId ? (
          <Card>
            <CardHeader>
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="roles" className="flex items-center gap-2">
                    <Settings className="h-4 w-4" />
                    Role Permissions
                  </TabsTrigger>
                  <TabsTrigger value="menu" className="flex items-center gap-2">
                    <Menu className="h-4 w-4" />
                    Menu Items
                  </TabsTrigger>
                  <TabsTrigger value="features" className="flex items-center gap-2">
                    <Flag className="h-4 w-4" />
                    Feature Flags
                  </TabsTrigger>
                  <TabsTrigger value="users" className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    User Overrides
                  </TabsTrigger>
                </TabsList>

                <CardContent className="pt-6">
                  <TabsContent value="roles" className="mt-0">
                    <RolePermissionsTab companyId={companyId} searchTerm={searchTerm} />
                  </TabsContent>

                  <TabsContent value="menu" className="mt-0">
                    <MenuItemsTab companyId={companyId} searchTerm={searchTerm} />
                  </TabsContent>

                  <TabsContent value="features" className="mt-0">
                    <FeatureFlagsTab companyId={companyId} searchTerm={searchTerm} />
                  </TabsContent>

                  <TabsContent value="users" className="mt-0">
                    <UserOverridesTab companyId={companyId} searchTerm={searchTerm} />
                  </TabsContent>
                </CardContent>
              </Tabs>
            </CardHeader>
          </Card>
        ) : (
          <Alert>
            <Shield className="h-4 w-4" />
            <AlertDescription>
              Please select a company to manage permissions.
            </AlertDescription>
          </Alert>
        )}
      </div>
    </div>
  );
}
