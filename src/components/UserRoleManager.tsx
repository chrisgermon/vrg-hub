import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Users, Shield, Settings, UserPlus, Building2, RefreshCw, KeyRound } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useAccessControl } from '@/hooks/useAccessControl';
import { useCompanyContext } from '@/contexts/CompanyContext';
import { formatAUDate, formatAUDateTimeFull } from '@/lib/dateUtils';
import { toast } from 'sonner';
import { UserPermissionsManager } from '@/components/UserPermissionsManager';
import { formatRoleLabel, getRoleDefinition, UserRoleKey } from '@/lib/access-control';

interface UserWithRole {
  id: string;
  user_id: string;
  name: string;
  email: string;
  role: UserRoleKey;
  company_id: string;
  company_name: string;
  created_at: string;
  last_sign_in_at: string | null;
}

export function UserRoleManager() {
  const { profile } = useAuth();
  const { selectedCompany } = useCompanyContext();
  const {
    userRole,
    isSuperAdmin,
    availableRoles,
    canManageRole,
    canAccessCompany,
  } = useAccessControl({ companyId: selectedCompany?.id });
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddAdmin, setShowAddAdmin] = useState(false);
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [isAddingAdmin, setIsAddingAdmin] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserWithRole | null>(null);
  const [showPermissions, setShowPermissions] = useState(false);

  const getSelectableRolesForUser = useCallback(
    (role: UserRoleKey, companyName: string) => {
      const baseOptions = [...availableRoles];
      const currentDefinition = getRoleDefinition(role);
      if (currentDefinition && !baseOptions.some((item) => item.key === currentDefinition.key)) {
        baseOptions.unshift(currentDefinition);
      }
      return baseOptions.filter(
        (option) => option.key !== 'super_admin' || companyName === 'Crowd IT'
      );
    },
    [availableRoles]
  );

  const fetchUsers = async () => {
    if (!profile?.company_id && !selectedCompany?.id && !isSuperAdmin) return;

    try {
      // Fetch profiles based on role
      let profilesQuery = supabase
        .from('profiles')
        .select('id, user_id, name, email, company_id, created_at, last_sign_in_at');

      // Filter by selected company
      const companyId = selectedCompany?.id || profile?.company_id;

      if (companyId) {
        if (!canAccessCompany(companyId) && !isSuperAdmin) {
          toast.error('You do not have access to this company');
          setUsers([]);
          setLoading(false);
          return;
        }
        profilesQuery = profilesQuery.eq('company_id', companyId);
      } else if (!isSuperAdmin) {
        toast.error('No company selected');
        setUsers([]);
        setLoading(false);
        return;
      }

      const { data: profilesData, error: profilesError } = await profilesQuery.order('created_at', { ascending: false });

      if (profilesError) throw profilesError;

      if (!profilesData || profilesData.length === 0) {
        setUsers([]);
        return;
      }

      // Fetch all user roles
      const userIds = profilesData.map(p => p.user_id);
      const { data: rolesData, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role, company_id')
        .in('user_id', userIds);

      if (rolesError) throw rolesError;

      // Fetch all companies
      const companyIds = [...new Set(profilesData.map(p => p.company_id))];
      const { data: companiesData, error: companiesError } = await supabase
        .from('companies')
        .select('id, name')
        .in('id', companyIds);

      if (companiesError) throw companiesError;

      // Create a map for quick lookups
      const rolesMap = new Map(rolesData?.map(r => [`${r.user_id}-${r.company_id}`, r.role]) || []);
      const companiesMap = new Map(companiesData?.map(c => [c.id, c.name]) || []);

      // Combine the data
      const formattedUsers: UserWithRole[] = profilesData.map(user => ({
        id: user.id,
        user_id: user.user_id,
        name: user.name || 'Unknown',
        email: user.email,
        role: rolesMap.get(`${user.user_id}-${user.company_id}`) || 'requester',
        company_id: user.company_id,
        company_name: companiesMap.get(user.company_id) || 'Unknown',
        created_at: user.created_at,
        last_sign_in_at: user.last_sign_in_at
      }));

      setUsers(formattedUsers);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const updateUserRole = async (userId: string, companyId: string, newRole: UserRoleKey) => {
    try {
      // Check if we're trying to assign super_admin to non-CrowdIT company
      if (newRole === 'super_admin') {
        const user = users.find(u => u.user_id === userId && u.company_id === companyId);
        if (user && user.company_name !== 'Crowd IT') {
          toast.error('Super admin role can only be assigned to Crowd IT users');
          return;
        }
      }

      const { error } = await supabase
        .from('user_roles')
        .update({ role: newRole as any })
        .eq('user_id', userId)
        .eq('company_id', companyId);

      if (error) {
        // Check if it's the validation error
        if (error.message.includes('Super admin role can only be assigned to Crowd IT users')) {
          toast.error('Super admin role can only be assigned to Crowd IT users');
        } else {
          throw error;
        }
        return;
      }

      setUsers(users.map(user => 
        user.user_id === userId && user.company_id === companyId 
          ? { ...user, role: newRole } 
          : user
      ));
      
      toast.success('User role updated successfully');
    } catch (error: any) {
      console.error('Error updating user role:', error);
      toast.error(error.message || 'Failed to update user role');
    }
  };

  const createGlobalAdmin = async () => {
    if (!newAdminEmail.trim()) {
      toast.error('Please enter an email address');
      return;
    }

    setIsAddingAdmin(true);
    try {
      // Check if user exists by email
      const { data: existingProfile, error: profileError } = await supabase
        .from('profiles')
        .select('user_id, company_id, email')
        .eq('email', newAdminEmail.toLowerCase())
        .maybeSingle();

      if (profileError) throw profileError;

      if (!existingProfile) {
        toast.error('User not found. They must log in at least once before being made a global admin.');
        return;
      }

      // Get company name to verify it's Crowd IT
      const { data: companyData } = await supabase
        .from('companies')
        .select('name')
        .eq('id', existingProfile.company_id)
        .single();

      if (companyData?.name !== 'Crowd IT') {
        toast.error('Super admin role can only be assigned to Crowd IT users');
        return;
      }

      // Check if they already have a super_admin role
      const { data: existingRole } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', existingProfile.user_id)
        .eq('role', 'super_admin')
        .maybeSingle();

      if (existingRole) {
        toast.error('User is already a global admin');
        return;
      }

      // Create super_admin role for this user
      const { error: roleError } = await supabase
        .from('user_roles')
        .insert({
          user_id: existingProfile.user_id,
          company_id: existingProfile.company_id,
          role: 'super_admin'
        });

      if (roleError) {
        if (roleError.message.includes('Super admin role can only be assigned to Crowd IT users')) {
          toast.error('Super admin role can only be assigned to Crowd IT users');
        } else {
          throw roleError;
        }
        return;
      }

      toast.success('Global admin created successfully');
      setShowAddAdmin(false);
      setNewAdminEmail('');
      fetchUsers();
    } catch (error: any) {
      console.error('Error creating global admin:', error);
      toast.error('Failed to create global admin: ' + error.message);
    } finally {
      setIsAddingAdmin(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [profile?.company_id, userRole, selectedCompany]);

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'super_admin': return 'destructive';
      case 'tenant_admin': return 'secondary';
      case 'manager': return 'default';
      case 'requester': return 'outline';
      default: return 'outline';
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'super_admin':
      case 'tenant_admin': return Settings;
      case 'manager': return Shield;
      default: return Users;
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            User Management
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">Loading users...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              User Management
            </CardTitle>
            <CardDescription>
              {userRole === 'super_admin' 
                ? 'Manage all users across all organisations' 
                : 'Manage user roles and permissions for your organisation'}
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={fetchUsers}>
              <RefreshCw className="h-4 w-4" />
            </Button>
            {userRole === 'super_admin' && !selectedCompany && (
            <Dialog open={showAddAdmin} onOpenChange={setShowAddAdmin}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <UserPlus className="w-4 h-4 mr-2" />
                  Add Global Admin
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create Global Admin</DialogTitle>
                  <DialogDescription>
                    Add a Crowd IT user as a global administrator. The user must have logged in at least once.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div>
                    <Label htmlFor="email">Email Address</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="user@crowdit.com.au"
                      value={newAdminEmail}
                      onChange={(e) => setNewAdminEmail(e.target.value)}
                      className="mt-2"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setShowAddAdmin(false)}>
                    Cancel
                  </Button>
                  <Button onClick={createGlobalAdmin} disabled={isAddingAdmin}>
                    {isAddingAdmin ? 'Creating...' : 'Create Admin'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {users.length === 0 ? (
          <div className="text-center py-8">
            <Users className="mx-auto h-12 w-12 text-muted-foreground" />
            <h3 className="mt-4 text-lg font-medium">No users found</h3>
            <p className="mt-2 text-muted-foreground">
              Users will appear here once they log in
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Email</TableHead>
                  {userRole === 'super_admin' && <TableHead>Organisation</TableHead>}
                  <TableHead>Role</TableHead>
                  <TableHead>Last Login</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => {
                  const RoleIcon = getRoleIcon(user.role);
                  return (
                    <TableRow key={`${user.user_id}-${user.company_id}`}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <RoleIcon className="w-4 h-4 text-muted-foreground" />
                          <span className="font-medium">{user.name}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{user.email}</TableCell>
                      {userRole === 'super_admin' && (
                        <TableCell>
                          <Badge variant="outline" className="flex items-center gap-1 w-fit">
                            <Building2 className="w-3 h-3" />
                            {user.company_name}
                          </Badge>
                        </TableCell>
                      )}
                      <TableCell>
                        <Badge variant={getRoleBadgeVariant(user.role)}>
                          {formatRoleLabel(user.role)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {user.last_sign_in_at 
                          ? formatAUDateTimeFull(user.last_sign_in_at)
                          : 'Never'}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatAUDate(user.created_at)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {canManageRole(user.role) ? (
                            <Select
                              value={user.role}
                              onValueChange={(newRole) =>
                                updateUserRole(user.user_id, user.company_id, newRole as UserRoleKey)
                              }
                            >
                              <SelectTrigger className="w-40">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {getSelectableRolesForUser(user.role, user.company_name).map((role) => (
                                  <SelectItem key={role.key} value={role.key}>
                                    {role.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          ) : (
                            <span className="text-muted-foreground text-sm">No permissions</span>
                          )}
                          {(userRole === 'super_admin' || userRole === 'tenant_admin') && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedUser(user);
                                setShowPermissions(true);
                              }}
                            >
                              <KeyRound className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}

        {/* User Permissions Dialog */}
        <Dialog open={showPermissions} onOpenChange={setShowPermissions}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>User Permissions</DialogTitle>
              <DialogDescription>
                Configure individual permissions for {selectedUser?.name}
              </DialogDescription>
            </DialogHeader>
            {selectedUser && (
              <UserPermissionsManager
                userId={selectedUser.user_id}
                companyId={selectedUser.company_id}
                userName={selectedUser.name}
              />
            )}
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}