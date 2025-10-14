import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Search, ChevronLeft, ChevronRight, Mail, CheckCircle2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Office365UserDetail } from "./Office365UserDetail";

interface SyncedOffice365UsersProps {
  companyId: string;
}

// Office 365 License SKU mapping (both SKU part numbers and GUIDs)
const LICENSE_NAMES: Record<string, string> = {
  // SKU Part Numbers
  'O365_BUSINESS_ESSENTIALS': 'Microsoft 365 Business Basic',
  'O365_BUSINESS_PREMIUM': 'Microsoft 365 Business Standard',
  'SPE_E3': 'Microsoft 365 E3',
  'SPE_E5': 'Microsoft 365 E5',
  'ENTERPRISEPACK': 'Office 365 E3',
  'ENTERPRISEPREMIUM': 'Office 365 E5',
  'STANDARDPACK': 'Office 365 E1',
  'STANDARDWOFFPACK': 'Office 365 E2',
  'DESKLESSPACK': 'Office 365 F3',
  'EXCHANGESTANDARD': 'Exchange Online Plan 1',
  'EXCHANGEENTERPRISE': 'Exchange Online Plan 2',
  'SHAREPOINTSTANDARD': 'SharePoint Online Plan 1',
  'SHAREPOINTENTERPRISE': 'SharePoint Online Plan 2',
  'MCOSTANDARD': 'Skype for Business Online Plan 2',
  'PROJECTPROFESSIONAL': 'Project Plan 3',
  'VISIOCLIENT': 'Visio Plan 2',
  'POWER_BI_PRO': 'Power BI Pro',
  'TEAMS_EXPLORATORY': 'Microsoft Teams Exploratory',
  'AAD_PREMIUM': 'Azure Active Directory Premium P1',
  'AAD_PREMIUM_P2': 'Azure Active Directory Premium P2',
  'FLOW_FREE': 'Power Automate Free',
  'POWERAPPS_VIRAL': 'Power Apps Trial',
  'EMS': 'Enterprise Mobility + Security E3',
  'EMSPREMIUM': 'Enterprise Mobility + Security E5',
  'RIGHTSMANAGEMENT_ADHOC': 'Rights Management Adhoc',
  'MCOMEETADV': 'Audio Conferencing',
  'STREAM': 'Microsoft Stream',
  'THREAT_INTELLIGENCE': 'Microsoft Defender for Office 365 (Plan 2)',
  'IDENTITY_THREAT_PROTECTION': 'Microsoft Defender for Identity',
  'WACONEDRIVESTANDARD': 'OneDrive for Business (Plan 1)',
  'WACONEDRIVEENTERPRISE': 'OneDrive for Business (Plan 2)',
  
  // SKU IDs (GUIDs) - Most common Office 365/Microsoft 365 licenses
  '18181a46-0d4e-45cd-891e-60aabd171b4e': 'Office 365 E1',
  '6fd2c87f-b296-42f0-b197-1e91e994b900': 'Office 365 E3',
  'c7df2760-2c81-4ef7-b578-5b5392b571df': 'Office 365 E5',
  '46c3a859-c90d-40b3-9551-6178a48d5c18': 'Microsoft 365 E3',
  '1f2f344a-700d-42c9-9427-5cea1d5d7ba6': 'Microsoft 365 E5',
  'cbdc14ab-d96c-4c30-b9f4-6ada7cdc1d46': 'Microsoft 365 Business Basic',
  'f245ecc8-75af-4f8e-b61f-27d8114de5f3': 'Microsoft 365 Business Standard',
  'ac5cef5d-921b-4f97-9ef3-c99076e5470f': 'Microsoft 365 Business Premium',
  '4b9405b0-7788-4568-add1-99614e613b69': 'Exchange Online Plan 1',
  '19ec0d23-8335-4cbd-94ac-6050e30712fa': 'Exchange Online Plan 2',
  '0c266dff-15dd-4b49-8397-2bb16070ed52': 'Audio Conferencing',
  '2b9c8e7c-319c-43a2-a2a0-48c5c6161de7': 'Azure Active Directory Premium P2',
  '078d2b04-f1bd-4111-bbd4-b4b1b354cef4': 'Azure Active Directory Premium P1',
  'f30db892-07e9-47e9-837c-80727f46fd3d': 'Microsoft Defender for Office 365 (Plan 1)',
  '7e31c0d9-9551-471d-836f-32ee72be4a01': 'Microsoft Teams Phone Standard',
  '440eaaa8-b3e0-484b-a8be-62870b9ba70a': 'Phone System',
  'e43b5b99-8dfb-405f-9987-dc307f34bcbd': 'Power BI Pro',
  'a403ebcc-fae0-4ca2-8c8c-7a907fd6c235': 'Power BI Premium Per User',
  '53818b1b-4a27-454b-8896-0dba576410e6': 'Project Plan 3',
  'b30411f5-fea1-4a59-9ad9-3db7c7ead579': 'Project Plan 5',
  'c5928f49-12ba-48f7-ada3-0d743a3601d5': 'Visio Plan 2',
  'b05e124f-c7cc-45a0-a6aa-8cf78c946968': 'Visio Plan 1',
  '061f9ace-7d42-4136-88ac-31dc755f143f': 'Intune',
  'efccb6f7-5641-4e0e-bd10-b4976e1bf68e': 'Enterprise Mobility + Security E3',
  'b05e124f-c7cc-45a0-a6aa-8cf78c946969': 'Enterprise Mobility + Security E5',
  '26d45bd9-adf1-46cd-a9e1-51e9a5524128': 'Microsoft Teams Rooms Standard',
  '6070a4c8-34c6-4937-8dfb-39bbc6397a60': 'Microsoft Teams Rooms Premium',
  '710779e8-3d4a-4c88-adb9-386c958d1fdf': 'Microsoft Teams Shared Devices',
  '4ef96642-f096-40de-a3e9-d83fb2f90211': 'Microsoft Defender for Endpoint',
  '84a661c4-e949-4bd2-a560-ed7766fcaf2b': 'Teams Exploratory',
  '90d8b3f8-712e-4f7b-aa1e-62e7ae6cbe96': 'Business Voice (Without Calling Plan)',
  '9f431833-0334-42de-a451-1302581dc64d': 'Microsoft 365 F3',
  'a4585165-0533-458a-97e3-c400570268c4': 'Office 365 F3',
  '26124093-3d78-432b-b5dc-48bf992543d5': 'Microsoft Defender for Endpoint P2',
  '8c4ce438-32a7-4ac5-91a6-e22ae08d9c8b': 'Rights Management Adhoc',
  'c52ea49f-fe5d-4e95-93ba-1de91d380f89': 'Information Protection for Office 365 - Standard',
  '184efa21-98c3-4e5d-95ab-d07053a96e67': 'Compliance Manager Premium Assessment Add-On',
  '28b0fa46-c39a-4188-89e2-58e979a6b014': 'Common Area Phone',
  '295a8eb0-f78d-45c7-8b5b-1eed5ed02dff': 'Microsoft Defender for Cloud Apps',
  '6a4f0a22-b230-4b9b-b9b2-da35d3c4e6c2': 'Microsoft Stream',
  '488ba24a-39a9-4473-8ee5-19291e71b002': 'Power Automate per user',
  'f2b2c5e2-1f42-4f8f-8d7a-3e3e3e3e3e3e': 'Microsoft Teams (Free)',
  '765b0a4e-7dd1-40f4-87ea-8b0c2ff75431': 'Microsoft 365 Apps for Business',
  'cdd28e44-67e3-425e-be4c-737fab2899d3': 'Microsoft 365 Apps for Enterprise',
  '3b555118-da6a-4418-894f-7df1e2096870': 'Microsoft 365 Business Basic',
  'f8a1db68-be16-40ed-86d5-cb42ce701560': 'Power Apps per app plan',
  'f8ced641-8e17-4dc5-b014-f5a2d53f6ac8': 'Microsoft Cloud App Security',
  '41fcdd7d-4733-4863-9cf4-c65b83ce2df4': 'Microsoft Business Center',
  '05e9a617-0261-4cee-bb44-138d3ef5d965': 'Microsoft 365 E3',
  '06ebc4ee-1bb5-47dd-8120-11324bc54e06': 'Microsoft 365 E5',
  '66b55226-6b4f-492c-910c-a3b7a3c9d993': 'Microsoft 365 F3',
  '3dd6cf57-d688-4eed-ba52-9e40b5468c3e': 'Microsoft Defender for Identity',
  '2b317a4a-77a6-4188-9437-b68a77b4e2c6': 'Microsoft Viva Suite',
  '4016f256-b063-4864-816e-d818aad600c9': 'Microsoft Viva Topics',
  '61902246-d7cb-453e-85cd-53ee28eec138': 'Microsoft Viva Learning',
  '3a10e0f2-27b4-447c-b5e9-f163f3b3fc1e': 'Microsoft Viva Insights',
  '1f338bbc-767e-4a1e-a2d4-b73207cc5b93': 'Microsoft 365 Phone System for Students',
  'd01d9287-694b-44f3-bcc5-ada78c8d953e': 'Microsoft 365 Phone System for DOD',
  
  // Additional licenses from tenant (SKU part numbers)
  'MICROSOFT_FABRIC_FREE': 'Microsoft Fabric (Free)',
  'POWER_APPS_DEV': 'Microsoft Power Apps for Developer',
  'STREAM_TRIAL': 'Microsoft Stream Trial',
  'TEAMS_ENTERPRISE': 'Microsoft Teams Enterprise',
  'TEAMS_ESSENTIALS': 'Microsoft Teams Essentials',
  'POWERPAGES_VIRAL': 'Power Pages vTrial for Makers',
  '535a3a29-c5f0-4603-8c88-7138f6382f31': 'Microsoft Teams Essentials',
  '3ab6abff-666f-4424-bfb7-f0bc274ec7bc': 'Microsoft Teams Enterprise',
};

const getLicenseName = (skuPartNumber: string): string => {
  const name = LICENSE_NAMES[skuPartNumber];
  if (name) return name;
  
  // If it's a GUID format and we don't have a mapping, show "Unknown License"
  const guidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (guidPattern.test(skuPartNumber)) {
    return 'Unknown License';
  }
  
  // Otherwise, return the SKU part number as-is
  return skuPartNumber;
};

export const SyncedOffice365Users = ({ companyId }: SyncedOffice365UsersProps) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [licenseFilter, setLicenseFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const itemsPerPage = 20;
  const { company, profile } = useAuth();
  const queryClient = useQueryClient();

  // Query to check which users already have profiles
  const { data: existingProfiles } = useQuery({
    queryKey: ['existing-profiles', companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('email')
        .eq('company_id', companyId);
      
      if (error) throw error;
      return new Set(data.map(p => p.email?.toLowerCase()));
    },
  });

  const { data: users, isLoading } = useQuery({
    queryKey: ['synced-office365-users', companyId],
    queryFn: async () => {
      const pageSize = 1000;
      let from = 0;
      let all: any[] = [];
      while (true) {
        const { data, error } = await supabase
          .from('synced_office365_users')
          .select('*')
          .eq('company_id', companyId)
          .eq('is_active', true)
          .not('mail', 'is', null)
          .order('display_name', { ascending: true })
          .range(from, from + pageSize - 1);

        if (error) throw error;
        if (data && data.length > 0) {
          all = all.concat(data);
        }
        if (!data || data.length < pageSize) break;
        from += pageSize;
      }
      return all;
    },
  });

  const sendInviteMutation = useMutation({
    mutationFn: async ({ email, displayName }: { email: string; displayName: string }) => {
      const loginUrl = window.location.origin + '/auth';
      
      const { data, error } = await supabase.functions.invoke('send-office365-invite', {
        body: {
          email,
          displayName,
          companyName: company?.name || 'Your Organization',
          inviterName: profile?.name || 'Your Administrator',
          loginUrl,
        },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success('Invitation sent successfully!');
      queryClient.invalidateQueries({ queryKey: ['existing-profiles', companyId] });
    },
    onError: (error: Error) => {
      console.error('Error sending invite:', error);
      toast.error(error.message || 'Failed to send invitation');
    },
  });

  const handleSendInvite = (email: string, displayName: string) => {
    sendInviteMutation.mutate({ email, displayName });
  };

  // Get unique licenses for filters
  
  // Extract all unique licenses from all users
  const allLicenses = new Set<string>();
  users?.forEach(user => {
    if (user.assigned_licenses && Array.isArray(user.assigned_licenses)) {
      user.assigned_licenses.forEach((license: any) => {
        const licenseKey = license.skuPartNumber || license.skuId;
        if (licenseKey) {
          allLicenses.add(licenseKey);
        }
      });
    }
  });
  const licenses = Array.from(allLicenses).sort((a, b) => {
    const nameA = getLicenseName(a);
    const nameB = getLicenseName(b);
    return nameA.localeCompare(nameB);
  });

  // Filter users
  const filteredUsers = users?.filter(user => {
    const matchesSearch = searchTerm === "" || 
      user.display_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.mail?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.user_principal_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.job_title?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesLicense = licenseFilter === "all" || (
      user.assigned_licenses && Array.isArray(user.assigned_licenses) &&
      user.assigned_licenses.some((license: any) => {
        const licenseKey = license.skuPartNumber || license.skuId;
        return licenseKey === licenseFilter;
      })
    );

    return matchesSearch && matchesLicense;
  }) || [];

  // Pagination
  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedUsers = filteredUsers.slice(startIndex, startIndex + itemsPerPage);

  // Reset to page 1 when filters change
  const handleFilterChange = () => {
    setCurrentPage(1);
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (!users || users.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Office 365 Users</CardTitle>
          <CardDescription>
            No users synced from Office 365 yet. Connect and sync in Settings to see users here.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (selectedUserId) {
    return (
      <Office365UserDetail 
        userId={selectedUserId} 
        companyId={companyId}
        onBack={() => setSelectedUserId(null)}
      />
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Office 365 Users</CardTitle>
        <CardDescription>
          Users synced from Office 365 tenant ({filteredUsers.length} of {users.length} total)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Search and Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, email, or job title..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                handleFilterChange();
              }}
              className="pl-10"
            />
          </div>

          <Select 
            value={licenseFilter} 
            onValueChange={(value) => {
              setLicenseFilter(value);
              handleFilterChange();
            }}
          >
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder="All Licenses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Licenses</SelectItem>
              {licenses.map((license) => (
                <SelectItem key={license} value={license}>
                  {getLicenseName(license)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Job Title</TableHead>
                <TableHead>Office Phone</TableHead>
                <TableHead>Mobile Phone</TableHead>
                <TableHead>Groups</TableHead>
                <TableHead>Licenses</TableHead>
                <TableHead>Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedUsers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                    No users found matching your filters
                  </TableCell>
                </TableRow>
              ) : (
                paginatedUsers.map((user) => {
                  const businessPhones = user.business_phones as string[] | null;
                  const memberOf = user.member_of as Array<{ displayName: string }> | null;
                  const userEmail = (user.mail || user.user_principal_name)?.toLowerCase();
                  const hasProfile = existingProfiles?.has(userEmail || '');
                  
                  return (
                    <TableRow 
                      key={user.id} 
                      className="hover:bg-muted/50"
                    >
                      <TableCell 
                        className="font-medium cursor-pointer"
                        onDoubleClick={() => setSelectedUserId(user.id)}
                      >
                        {user.display_name || '-'}
                      </TableCell>
                      <TableCell>{userEmail || '-'}</TableCell>
                      <TableCell>{user.job_title || '-'}</TableCell>
                      <TableCell>
                        {businessPhones && businessPhones.length > 0 
                          ? businessPhones.join(', ') 
                          : '-'}
                      </TableCell>
                      <TableCell>{user.mobile_phone || '-'}</TableCell>
                      <TableCell>
                        {memberOf && memberOf.length > 0 ? (
                          <div className="flex flex-wrap gap-1 max-w-xs">
                            {memberOf.slice(0, 2).map((group: any, idx: number) => (
                              <Badge key={idx} variant="outline" className="text-xs">
                                {group.displayName}
                              </Badge>
                            ))}
                            {memberOf.length > 2 && (
                              <Badge variant="outline" className="text-xs">
                                +{memberOf.length - 2}
                              </Badge>
                            )}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {user.assigned_licenses && Array.isArray(user.assigned_licenses) ? (
                          <div className="flex flex-wrap gap-1 max-w-xs">
                            {user.assigned_licenses.slice(0, 2).map((license: any, idx: number) => (
                              <Badge 
                                key={idx} 
                                variant="secondary" 
                                className="text-xs"
                                title={license.skuId}
                              >
                                {getLicenseName(license.skuPartNumber || license.skuId)}
                              </Badge>
                            ))}
                            {user.assigned_licenses.length > 2 && (
                              <Badge variant="secondary" className="text-xs">
                                +{user.assigned_licenses.length - 2}
                              </Badge>
                            )}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {hasProfile ? (
                          <Badge variant="outline" className="gap-1">
                            <CheckCircle2 className="h-3 w-3" />
                            Registered
                          </Badge>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleSendInvite(userEmail || '', user.display_name || '')}
                            disabled={!userEmail || sendInviteMutation.isPending}
                            className="gap-1"
                          >
                            {sendInviteMutation.isPending ? (
                              <>
                                <Loader2 className="h-3 w-3 animate-spin" />
                                Sending...
                              </>
                            ) : (
                              <>
                                <Mail className="h-3 w-3" />
                                Send Invite
                              </>
                            )}
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Showing {startIndex + 1} to {Math.min(startIndex + itemsPerPage, filteredUsers.length)} of {filteredUsers.length} users
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </Button>
              <span className="text-sm">
                Page {currentPage} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
