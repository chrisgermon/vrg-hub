import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2, Mail, Phone, Smartphone, Users, Briefcase, MapPin, Calendar } from "lucide-react";
import { Separator } from "@/components/ui/separator";

interface Office365UserDetailProps {
  userId: string;
  companyId: string;
  onBack: () => void;
}

const LICENSE_NAMES: Record<string, string> = {
  // ... copy the same LICENSE_NAMES object from SyncedOffice365Users
  'O365_BUSINESS_ESSENTIALS': 'Microsoft 365 Business Basic',
  'O365_BUSINESS_PREMIUM': 'Microsoft 365 Business Standard',
  'SPE_E3': 'Microsoft 365 E3',
  'SPE_E5': 'Microsoft 365 E5',
  'ENTERPRISEPACK': 'Office 365 E3',
  'ENTERPRISEPREMIUM': 'Office 365 E5',
  'f8ced641-8e17-4dc5-b014-f5a2d53f6ac8': 'Microsoft Cloud App Security',
  '46c3a859-c90d-40b3-9551-6178a48d5c18': 'Microsoft 365 E3',
  '7e31c0d9-9551-471d-836f-32ee72be4a01': 'Microsoft Teams Phone Standard',
};

const getLicenseName = (skuPartNumber: string): string => {
  const name = LICENSE_NAMES[skuPartNumber];
  if (name) return name;
  const guidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (guidPattern.test(skuPartNumber)) return 'Unknown License';
  return skuPartNumber;
};

export const Office365UserDetail = ({ userId, companyId, onBack }: Office365UserDetailProps) => {
  const { data: user, isLoading } = useQuery({
    queryKey: ['office365-user-detail', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('synced_office365_users')
        .select('*')
        .eq('id', userId)
        .single();
      
      if (error) throw error;
      return data;
    },
  });

  const { data: mailboxes, isLoading: isLoadingMailboxes } = useQuery({
    queryKey: ['office365-user-mailboxes', user?.mail, companyId],
    queryFn: async () => {
      if (!user?.mail && !user?.user_principal_name) return [];
      
      // Fetch all mailboxes and filter client-side based on members
      // @ts-ignore - Avoiding deep type instantiation error
      const { data, error } = await supabase
        .from('synced_office365_mailboxes')
        .select('*')
        .eq('company_id', companyId)
        .eq('is_active', true);
      
      if (error) throw error;
      
      // Filter mailboxes where user is a member
      const userEmail = user.mail?.toLowerCase();
      const userUpn = user.user_principal_name?.toLowerCase();
      
      return (data || []).filter((mailbox: any) => {
        const members = mailbox.members as Array<{ mail?: string; userPrincipalName?: string }> | null;
        if (!members || members.length === 0) return false;
        
        return members.some(member => {
          const memberMail = member.mail?.toLowerCase();
          const memberUpn = member.userPrincipalName?.toLowerCase();
          return (userEmail && (memberMail === userEmail || memberUpn === userEmail)) ||
                 (userUpn && (memberMail === userUpn || memberUpn === userUpn));
        });
      });
    },
    enabled: !!user?.mail || !!user?.user_principal_name,
  });

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (!user) {
    return (
      <Card>
        <CardContent className="py-8">
          <p className="text-center text-muted-foreground">User not found</p>
        </CardContent>
      </Card>
    );
  }

  const businessPhones = user.business_phones as string[] | null;
  const memberOf = user.member_of as Array<{ id: string; displayName: string }> | null;
  const licenses = user.assigned_licenses as Array<{ skuId: string; skuPartNumber?: string }> | null;

  return (
    <div className="space-y-6">
      <Button variant="ghost" onClick={onBack} className="mb-4">
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Users
      </Button>

      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">{user.display_name}</CardTitle>
          <CardDescription>{user.job_title || 'No job title'}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Contact Information */}
          <div>
            <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Contact Information
            </h3>
            <div className="grid gap-3 ml-7">
              <div>
                <span className="text-sm text-muted-foreground">Email:</span>
                <p className="font-medium">{user.mail || user.user_principal_name || '-'}</p>
              </div>
              <div>
                <span className="text-sm text-muted-foreground">User Principal Name:</span>
                <p className="font-medium">{user.user_principal_name || '-'}</p>
              </div>
              {businessPhones && businessPhones.length > 0 && (
                <div>
                  <span className="text-sm text-muted-foreground flex items-center gap-2">
                    <Phone className="h-4 w-4" />
                    Office Phone:
                  </span>
                  <p className="font-medium">{businessPhones.join(', ')}</p>
                </div>
              )}
              {user.mobile_phone && (
                <div>
                  <span className="text-sm text-muted-foreground flex items-center gap-2">
                    <Smartphone className="h-4 w-4" />
                    Mobile Phone:
                  </span>
                  <p className="font-medium">{user.mobile_phone}</p>
                </div>
              )}
            </div>
          </div>

          <Separator />

          {/* Organization Information */}
          <div>
            <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <Briefcase className="h-5 w-5" />
              Organization
            </h3>
            <div className="grid gap-3 ml-7">
              {user.department && (
                <div>
                  <span className="text-sm text-muted-foreground">Department:</span>
                  <p className="font-medium">{user.department}</p>
                </div>
              )}
              {user.office_location && (
                <div>
                  <span className="text-sm text-muted-foreground flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    Location:
                  </span>
                  <p className="font-medium">{user.office_location}</p>
                </div>
              )}
            </div>
          </div>

          <Separator />

          {/* Groups/Member Of */}
          {memberOf && memberOf.length > 0 && (
            <>
              <div>
                <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Groups ({memberOf.length})
                </h3>
                <div className="flex flex-wrap gap-2 ml-7">
                  {memberOf.map((group, idx) => (
                    <Badge key={idx} variant="secondary">
                      {group.displayName}
                    </Badge>
                  ))}
                </div>
              </div>
              <Separator />
            </>
          )}

          {/* Licenses */}
          {licenses && licenses.length > 0 && (
            <>
              <div>
                <h3 className="text-lg font-semibold mb-3">Assigned Licenses ({licenses.length})</h3>
                <div className="flex flex-wrap gap-2 ml-7">
                  {licenses.map((license, idx) => (
                    <Badge 
                      key={idx} 
                      variant="outline"
                      title={license.skuId}
                    >
                      {getLicenseName(license.skuPartNumber || license.skuId)}
                    </Badge>
                  ))}
                </div>
              </div>
              <Separator />
            </>
          )}

          {/* Shared Mailboxes */}
          <div>
            <h3 className="text-lg font-semibold mb-3">Shared Mailboxes</h3>
            {isLoadingMailboxes ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : mailboxes && mailboxes.length > 0 ? (
              <div className="space-y-4 ml-7">
                {mailboxes.map((mailbox) => {
                  const members = mailbox.members as Array<{ displayName: string; mail?: string }> | null;
                  return (
                    <div key={mailbox.id} className="border rounded-lg p-4 space-y-2">
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="font-medium">{mailbox.mailbox_name}</p>
                          <p className="text-sm text-muted-foreground">{mailbox.email_address}</p>
                        </div>
                      </div>
                      {members && members.length > 0 && (
                        <div className="mt-2 pl-6">
                          <p className="text-xs text-muted-foreground mb-2">Members ({members.length}):</p>
                          <div className="flex flex-wrap gap-1">
                            {members.map((member, idx) => (
                              <Badge key={idx} variant="outline" className="text-xs">
                                {member.displayName}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground ml-7">No shared mailboxes found</p>
            )}
          </div>

          <Separator />

          {/* System Information */}
          <div>
            <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              System Information
            </h3>
            <div className="grid gap-3 ml-7">
              <div>
                <span className="text-sm text-muted-foreground">Status:</span>
                <Badge variant={user.is_active ? "default" : "secondary"} className="ml-2">
                  {user.is_active ? 'Active' : 'Inactive'}
                </Badge>
              </div>
              <div>
                <span className="text-sm text-muted-foreground">Last Synced:</span>
                <p className="font-medium">{new Date(user.synced_at).toLocaleString()}</p>
              </div>
              <div>
                <span className="text-sm text-muted-foreground">Created:</span>
                <p className="font-medium">{new Date(user.created_at).toLocaleString()}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
