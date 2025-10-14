import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UserPermissionsManager } from "@/components/UserPermissionsManager";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Mail, Phone, Smartphone, Users, Briefcase, MapPin, Calendar, Shield } from "lucide-react";
import { toast } from "sonner";

interface UserDetailDialogProps {
  userId: string;
  companyId: string;
  isO365User: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const LICENSE_NAMES: Record<string, string> = {
  'O365_BUSINESS_ESSENTIALS': 'Microsoft 365 Business Basic',
  'O365_BUSINESS_PREMIUM': 'Microsoft 365 Business Standard',
  'SPE_E3': 'Microsoft 365 E3',
  'SPE_E5': 'Microsoft 365 E5',
  'ENTERPRISEPACK': 'Office 365 E3',
  'ENTERPRISEPREMIUM': 'Office 365 E5',
};

const getLicenseName = (skuPartNumber: string): string => {
  return LICENSE_NAMES[skuPartNumber] || skuPartNumber;
};

export const UserDetailDialog = ({ userId, companyId, isO365User, open, onOpenChange }: UserDetailDialogProps) => {
  const queryClient = useQueryClient();
  const [selectedRole, setSelectedRole] = useState<'requester' | 'approver' | 'company_admin' | 'company_owner' | ''>("");

  // Fetch CrowdHub profile data first - needed for all users
  const { data: profile, isLoading: isLoadingProfile } = useQuery({
    queryKey: ['user-profile', userId, companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .eq('company_id', companyId)
        .maybeSingle();
      
      if (error) throw error;
      return data;
    },
    enabled: open && !isO365User, // Only fetch if not an O365-only user
  });

  // Fetch O365 user data - try by ID first (if O365 user), then by email (for imported users)
  const { data: o365User, isLoading: isLoadingO365 } = useQuery({
    queryKey: ['office365-user-detail', userId, companyId, profile?.email],
    queryFn: async () => {
      // If this is an O365 user (not yet imported), fetch by ID
      if (isO365User) {
        const { data, error } = await supabase
          .from('synced_office365_users')
          .select('*')
          .eq('id', userId)
          .eq('company_id', companyId)
          .maybeSingle();
        
        if (!error && data) return data;
      }
      
      // For imported users or if ID fetch failed, try by email
      if (profile?.email) {
        const { data, error } = await supabase
          .from('synced_office365_users')
          .select('*')
          .eq('company_id', companyId)
          .or(`mail.ilike.${profile.email},user_principal_name.ilike.${profile.email}`)
          .maybeSingle();
        
        if (!error && data) return data;
      }
      
      return null;
    },
    enabled: open && (isO365User || (!!profile && !!profile.email)),
  });

  // Fetch CrowdHub membership and role
  const { data: membership, isLoading: isLoadingMembership } = useQuery({
    queryKey: ['user-membership', userId, companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('company_memberships')
        .select(`
          *,
          membership_roles (
            role
          )
        `)
        .eq('user_id', userId)
        .eq('company_id', companyId)
        .single();
      
      if (error && error.code !== 'PGRST116') throw error;
      return data;
    },
    enabled: open,
  });

  // Update role mutation
  const updateRoleMutation = useMutation({
    mutationFn: async (newRole: 'requester' | 'approver' | 'company_admin' | 'company_owner') => {
      if (!membership?.id) {
        throw new Error('User is not active in CrowdHub');
      }

      // Update the role in membership_roles
      const { error } = await supabase
        .from('membership_roles')
        .update({ role: newRole })
        .eq('membership_id', membership.id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Role updated successfully');
      queryClient.invalidateQueries({ queryKey: ['user-membership', userId, companyId] });
      queryClient.invalidateQueries({ queryKey: ['unified-users', companyId] });
    },
    onError: (error: Error) => {
      toast.error(`Failed to update role: ${error.message}`);
    },
  });

  // Toggle account status mutation
  const toggleAccountMutation = useMutation({
    mutationFn: async (newStatus: 'active' | 'inactive') => {
      if (!membership?.id) {
        throw new Error('User is not in CrowdHub');
      }

      const { error } = await supabase
        .from('company_memberships')
        .update({ 
          status: newStatus,
          deactivated_at: newStatus === 'inactive' ? new Date().toISOString() : null,
          activated_at: newStatus === 'active' ? new Date().toISOString() : null
        })
        .eq('id', membership.id);

      if (error) throw error;
    },
    onSuccess: (_, newStatus) => {
      toast.success(`Account ${newStatus === 'active' ? 'enabled' : 'disabled'} successfully`);
      queryClient.invalidateQueries({ queryKey: ['user-membership', userId, companyId] });
      queryClient.invalidateQueries({ queryKey: ['unified-users', companyId] });
    },
    onError: (error: Error) => {
      toast.error(`Failed to update account status: ${error.message}`);
    },
  });

  const isLoading = isLoadingO365 || isLoadingProfile || isLoadingMembership;

  if (isLoading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  const displayName = profile?.name || o365User?.display_name || 'Unknown User';
  const displayEmail = profile?.email || o365User?.mail || o365User?.user_principal_name;
  const businessPhones = o365User?.business_phones as string[] | null;
  const memberOf = o365User?.member_of as Array<{ id: string; displayName: string }> | null;
  const licenses = o365User?.assigned_licenses as Array<{ skuId: string; skuPartNumber?: string }> | null;
  const userRole = membership?.membership_roles?.[0]?.role;
  const isActive = !!membership && membership.status === 'active';
  const hasO365Data = !!o365User;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl flex items-center gap-3">
            {displayName}
            {isActive && (
              <Badge variant="default" className="text-xs">
                Active in CrowdHub
              </Badge>
            )}
            {!isActive && membership && (
              <Badge variant="secondary" className="text-xs">
                Inactive
              </Badge>
            )}
          </DialogTitle>
          <DialogDescription>
            {displayEmail}
            {hasO365Data && o365User.job_title && ` • ${o365User.job_title}`}
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="details" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="details">User Details</TabsTrigger>
            <TabsTrigger value="permissions" disabled={!membership}>Permissions</TabsTrigger>
          </TabsList>

          <TabsContent value="details" className="space-y-6 mt-4">
          {/* CrowdHub Settings - Editable */}
          {membership && (
            <>
              <div className="bg-primary/5 p-4 rounded-lg border border-primary/20">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Shield className="h-5 w-5 text-primary" />
                  CrowdHub Settings
                </h3>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="role">Role</Label>
                    <div className="flex gap-2 mt-2">
                      <Select
                        value={selectedRole || userRole || ''}
                        onValueChange={(value: 'requester' | 'approver' | 'company_admin' | 'company_owner') => setSelectedRole(value)}
                        disabled={!isActive}
                      >
                        <SelectTrigger id="role">
                          <SelectValue placeholder="Select role" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="requester">Requester</SelectItem>
                          <SelectItem value="approver">Approver</SelectItem>
                          <SelectItem value="company_admin">Company Admin</SelectItem>
                        </SelectContent>
                      </Select>
                      {selectedRole && selectedRole !== userRole && isActive && (
                        <Button
                          onClick={() => updateRoleMutation.mutate(selectedRole)}
                          disabled={updateRoleMutation.isPending}
                        >
                          {updateRoleMutation.isPending ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            'Update'
                          )}
                        </Button>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Changes to role and permissions only affect CrowdHub access
                    </p>
                  </div>
                  
                  <div>
                    <Label>Account Status</Label>
                    <div className="flex gap-2 mt-2">
                      <Button
                        variant={isActive ? "default" : "outline"}
                        size="sm"
                        onClick={() => toggleAccountMutation.mutate('active')}
                        disabled={isActive || toggleAccountMutation.isPending}
                      >
                        {toggleAccountMutation.isPending && !isActive ? (
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        ) : null}
                        Enable Account
                      </Button>
                      <Button
                        variant={!isActive ? "destructive" : "outline"}
                        size="sm"
                        onClick={() => toggleAccountMutation.mutate('inactive')}
                        disabled={!isActive || toggleAccountMutation.isPending}
                      >
                        {toggleAccountMutation.isPending && isActive ? (
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        ) : null}
                        Disable Account
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Disabled accounts cannot access CrowdHub
                    </p>
                  </div>
                </div>
              </div>
              <Separator />
            </>
          )}

          {/* Contact Information - Read Only */}
          {hasO365Data && (
            <>
              <div>
                <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                  <Mail className="h-5 w-5" />
                  Contact Information
                </h3>
                <div className="grid gap-3 ml-7 text-sm">
                  <div>
                    <span className="text-muted-foreground">Email:</span>
                    <p className="font-medium">{o365User.mail || o365User.user_principal_name || '-'}</p>
                  </div>
                  {businessPhones && businessPhones.length > 0 && (
                    <div>
                      <span className="text-muted-foreground flex items-center gap-2">
                        <Phone className="h-4 w-4" />
                        Office Phone:
                      </span>
                      <p className="font-medium">{businessPhones.join(', ')}</p>
                    </div>
                  )}
                  {o365User.mobile_phone && (
                    <div>
                      <span className="text-muted-foreground flex items-center gap-2">
                        <Smartphone className="h-4 w-4" />
                        Mobile Phone:
                      </span>
                      <p className="font-medium">{o365User.mobile_phone}</p>
                    </div>
                  )}
                </div>
              </div>
              <Separator />
            </>
          )}

          {/* Organization Information - Read Only */}
          {hasO365Data && (o365User.department || o365User.office_location || o365User.job_title) && (
            <>
              <div>
                <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                  <Briefcase className="h-5 w-5" />
                  Organization
                </h3>
                <div className="grid gap-3 ml-7 text-sm">
                  {o365User.job_title && (
                    <div>
                      <span className="text-muted-foreground">Job Title:</span>
                      <p className="font-medium">{o365User.job_title}</p>
                    </div>
                  )}
                  {o365User.department && (
                    <div>
                      <span className="text-muted-foreground">Department:</span>
                      <p className="font-medium">{o365User.department}</p>
                    </div>
                  )}
                  {o365User.office_location && (
                    <div>
                      <span className="text-muted-foreground flex items-center gap-2">
                        <MapPin className="h-4 w-4" />
                        Location:
                      </span>
                      <p className="font-medium">{o365User.office_location}</p>
                    </div>
                  )}
                </div>
              </div>
              <Separator />
            </>
          )}

          {/* Groups - Read Only */}
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

          {/* Licenses - Read Only */}
          {licenses && licenses.length > 0 && (
            <>
              <div>
                <h3 className="text-lg font-semibold mb-3">Assigned Licenses ({licenses.length})</h3>
                <div className="flex flex-wrap gap-2 ml-7">
                  {licenses.map((license, idx) => (
                    <Badge key={idx} variant="outline">
                      {getLicenseName(license.skuPartNumber || license.skuId)}
                    </Badge>
                  ))}
                </div>
              </div>
              <Separator />
            </>
          )}

          {/* System Information - Read Only */}
          <div>
            <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              System Information
            </h3>
            <div className="grid gap-3 ml-7 text-sm">
              {hasO365Data && (
                <>
                  <div>
                    <span className="text-muted-foreground">Office 365 Status:</span>
                    <Badge variant={o365User.is_active ? "default" : "secondary"} className="ml-2">
                      {o365User.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Last Synced:</span>
                    <p className="font-medium">{new Date(o365User.synced_at).toLocaleString()}</p>
                  </div>
                </>
              )}
              {membership && (
                <div>
                  <span className="text-muted-foreground">CrowdHub Status:</span>
                  <Badge variant={membership.status === 'active' ? "default" : "secondary"} className="ml-2">
                    {membership.status}
                  </Badge>
                </div>
              )}
            </div>
          </div>
          </TabsContent>

          <TabsContent value="permissions" className="mt-4">
            {membership && profile && (
              <UserPermissionsManager
                userId={userId}
                companyId={companyId}
                userName={displayName}
              />
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
