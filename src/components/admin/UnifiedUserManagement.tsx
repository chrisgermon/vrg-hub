import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Label } from '@/components/ui/label';
import { Loader2, Search, UserPlus, CheckCircle2, Mail, Calendar, XCircle, Clock, Send } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { toast } from 'sonner';
import { formatAUDate } from '@/lib/dateUtils';
import { UserDetailDialog } from './UserDetailDialog';

const inviteFormSchema = z.object({
  email: z.string().email('Invalid email address'),
  role: z.string(),
  days_valid: z.coerce.number().min(1).max(90).default(30),
});

interface UnifiedUserManagementProps {
  companyId: string;
}

export const UnifiedUserManagement = ({ companyId }: UnifiedUserManagementProps) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [selectedRole, setSelectedRole] = useState<string>('requester');
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [detailUserId, setDetailUserId] = useState<string>('');
  const [detailIsO365, setDetailIsO365] = useState(false);

  const inviteForm = useForm({
    resolver: zodResolver(inviteFormSchema),
    defaultValues: {
      email: '',
      role: 'requester',
      days_valid: 30,
    },
  });

  // Fetch local system users (profiles)
  const { data: localUsers = [], isLoading: isLoadingLocal } = useQuery({
    queryKey: ['local-users', companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('company_id', companyId);
      
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch O365 users
  const { data: o365Users = [], isLoading: isLoadingO365 } = useQuery({
    queryKey: ['office365-users', companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('synced_office365_users')
        .select('*')
        .eq('company_id', companyId)
        .eq('is_active', true);
      
      if (error) throw error;
      
      // Only return users with licenses
      return (data || []).filter(user => 
        Array.isArray(user.assigned_licenses) && user.assigned_licenses.length > 0
      );
    },
  });

  // Get imported O365 user emails
  const importedO365Emails = new Set(
    localUsers.map(u => u.email?.toLowerCase()).filter(Boolean)
  );

  // Filter O365 users that haven't been imported yet
  const unimportedO365Users = o365Users.filter(
    user => !importedO365Emails.has(user.mail?.toLowerCase())
  );

  // Fetch user invites
  const { data: invites = [], isLoading: isLoadingInvites } = useQuery({
    queryKey: ['user-invites', companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_invites')
        .select('*')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data || [];
    },
  });

  // Import user mutation
  const importUserMutation = useMutation({
    mutationFn: async ({ o365User, role }: { o365User: any; role: string }) => {
      const { data, error } = await supabase.functions.invoke('import-office365-user', {
        body: { o365User, role, companyId },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success('User imported successfully');
      queryClient.invalidateQueries({ queryKey: ['local-users', companyId] });
      queryClient.invalidateQueries({ queryKey: ['office365-users', companyId] });
      queryClient.invalidateQueries({ queryKey: ['unified-users', companyId] });
      setImportDialogOpen(false);
      setSelectedUser(null);
    },
    onError: (error: Error) => {
      toast.error(`Failed to import user: ${error.message}`);
    },
  });

  // Create invite mutation
  const createInviteMutation = useMutation({
    mutationFn: async (values: z.infer<typeof inviteFormSchema>) => {
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + values.days_valid);

      const { data: inviteData, error } = await supabase
        .from('user_invites')
        .insert({
          email: values.email,
          role: values.role as any,
          company_id: companyId,
          invited_by: user?.id,
          expires_at: expiresAt.toISOString(),
        })
        .select()
        .single();

      if (error) throw error;

      // Send invite email
      const emailResult = await supabase.functions.invoke('send-user-invite-email', {
        body: { inviteId: inviteData.id }
      });

      if (emailResult.error) throw emailResult.error;
      return inviteData;
    },
    onSuccess: () => {
      toast.success('Invite sent successfully!');
      queryClient.invalidateQueries({ queryKey: ['user-invites', companyId] });
      setInviteDialogOpen(false);
      inviteForm.reset();
    },
    onError: (error: Error) => {
      toast.error(`Failed to send invite: ${error.message}`);
    },
  });

  // Resend invite mutation
  const resendInviteMutation = useMutation({
    mutationFn: async (inviteId: string) => {
      const emailResult = await supabase.functions.invoke('send-user-invite-email', {
        body: { inviteId }
      });
      if (emailResult.error) throw emailResult.error;
    },
    onSuccess: () => {
      toast.success('Invite resent successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to resend invite: ${error.message}`);
    },
  });

  // Revoke invite mutation
  const revokeInviteMutation = useMutation({
    mutationFn: async (inviteId: string) => {
      const { error } = await supabase
        .from('user_invites')
        .update({ status: 'revoked' })
        .eq('id', inviteId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Invite revoked');
      queryClient.invalidateQueries({ queryKey: ['user-invites', companyId] });
    },
    onError: (error: Error) => {
      toast.error(`Failed to revoke invite: ${error.message}`);
    },
  });

  const handleImportClick = (user: any) => {
    setSelectedUser(user);
    setImportDialogOpen(true);
  };

  const confirmImport = () => {
    if (selectedUser) {
      importUserMutation.mutate({
        o365User: selectedUser,
        role: selectedRole,
      });
    }
  };

  // Combine local and O365 users with membership status
  const { data: allMemberships } = useQuery({
    queryKey: ['all-memberships', companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('company_memberships')
        .select('user_id, status')
        .eq('company_id', companyId)
        .eq('status', 'active');
      
      if (error) throw error;
      return data || [];
    },
  });

  const activeMembershipUserIds = new Set(allMemberships?.map(m => m.user_id) || []);

  const allUsers = [
    ...localUsers.map(user => ({
      ...user,
      source: 'local' as const,
      display_name: user.name,
      email: user.email,
      isActiveInCrowdHub: activeMembershipUserIds.has(user.user_id),
    })),
    ...unimportedO365Users.map(user => ({
      ...user,
      source: 'office365' as const,
      email: user.mail || user.user_principal_name,
      isActiveInCrowdHub: false,
    })),
  ];

  // Filter users based on search
  const filteredUsers = allUsers.filter(user => {
    const matchesSearch = 
      user.display_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesSearch;
  });

  const handleViewUser = (user: any) => {
    // For local users, use user_id (auth user ID), for O365 users use id (O365 record ID)
    setDetailUserId(user.source === 'local' ? user.user_id : user.id);
    setDetailIsO365(user.source === 'office365');
    setDetailDialogOpen(true);
  };

  const getInviteStatusBadge = (status: string, expiresAt: string) => {
    if (status === 'accepted') {
      return <Badge variant="default" className="gap-1"><CheckCircle2 className="h-3 w-3" />Accepted</Badge>;
    }
    if (status === 'revoked') {
      return <Badge variant="destructive" className="gap-1"><XCircle className="h-3 w-3" />Revoked</Badge>;
    }
    if (new Date(expiresAt) < new Date()) {
      return <Badge variant="secondary" className="gap-1"><Clock className="h-3 w-3" />Expired</Badge>;
    }
    return <Badge variant="outline" className="gap-1"><Clock className="h-3 w-3" />Pending</Badge>;
  };

  if (isLoadingLocal || isLoadingO365 || isLoadingInvites) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Tabs defaultValue="users" className="w-full">
        <TabsList>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="invites">
            Invites
            {invites.filter(i => i.status === 'pending' && new Date(i.expires_at) > new Date()).length > 0 && (
              <Badge variant="secondary" className="ml-2">
                {invites.filter(i => i.status === 'pending' && new Date(i.expires_at) > new Date()).length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="users">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>User Directory</CardTitle>
                  <CardDescription>
                    Combined directory of Office 365 and CrowdHub users
                  </CardDescription>
                </div>
                <Badge variant="secondary">
                  {filteredUsers.length} user{filteredUsers.length !== 1 ? 's' : ''}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
          {/* Search */}
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          <div className="mt-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Status</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground">
                      No users found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredUsers.map((user) => {
                    return (
                      <TableRow 
                        key={user.id}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => handleViewUser(user)}
                      >
                        <TableCell>
                          {user.isActiveInCrowdHub && (
                            <div title="Active in CrowdHub">
                              <CheckCircle2 className="h-5 w-5 text-green-600" />
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="font-medium">{user.display_name}</TableCell>
                        <TableCell>{user.email}</TableCell>
                        <TableCell>{user.source === 'office365' ? user.department || '-' : '-'}</TableCell>
                        <TableCell>
                          <Badge variant={user.source === 'local' ? 'default' : 'secondary'}>
                            {user.source === 'local' ? 'CrowdHub' : 'Office 365'}
                          </Badge>
                        </TableCell>
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          {user.source === 'office365' && !user.isActiveInCrowdHub && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleImportClick(user)}
                            >
                              <UserPlus className="h-4 w-4 mr-1" />
                              Import
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
        </CardContent>
      </Card>
        </TabsContent>

        <TabsContent value="invites">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Mail className="h-5 w-5" />
                    User Invites
                  </CardTitle>
                  <CardDescription>
                    Invite users to join your organization with pre-assigned roles
                  </CardDescription>
                </div>
                <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
                  <Button onClick={() => setInviteDialogOpen(true)} className="gap-2">
                    <UserPlus className="h-4 w-4" />
                    Create Invite
                  </Button>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Create User Invite</DialogTitle>
                      <DialogDescription>
                        Send an invite to a new user. They must use an email within your company's domains.
                      </DialogDescription>
                    </DialogHeader>
                    <Form {...inviteForm}>
                      <form onSubmit={inviteForm.handleSubmit((values) => createInviteMutation.mutate(values))} className="space-y-4">
                        <FormField
                          control={inviteForm.control}
                          name="email"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Email Address</FormLabel>
                              <FormControl>
                                <Input placeholder="user@company.com" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={inviteForm.control}
                          name="role"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Role</FormLabel>
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="requester">Requester</SelectItem>
                                  <SelectItem value="manager">Manager</SelectItem>
                                  <SelectItem value="tenant_admin">Company Admin</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormDescription>
                                The role will be automatically assigned when they sign up
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={inviteForm.control}
                          name="days_valid"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Valid For (days)</FormLabel>
                              <FormControl>
                                <Input type="number" min={1} max={90} {...field} />
                              </FormControl>
                              <FormDescription>
                                How many days the invite will remain valid
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <DialogFooter>
                          <Button type="button" variant="outline" onClick={() => setInviteDialogOpen(false)}>
                            Cancel
                          </Button>
                          <Button type="submit" disabled={createInviteMutation.isPending}>
                            {createInviteMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                            Send Invite
                          </Button>
                        </DialogFooter>
                      </form>
                    </Form>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              {invites.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No invites found. Create your first invite to get started.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Email</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead>Expires</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {invites.map((invite) => (
                      <TableRow key={invite.id}>
                        <TableCell className="font-medium">{invite.email}</TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {invite.role === 'requester' ? 'Requester' : 
                             invite.role === 'manager' ? 'Manager' : 
                             invite.role === 'tenant_admin' ? 'Company Admin' : invite.role}
                          </Badge>
                        </TableCell>
                        <TableCell>{getInviteStatusBadge(invite.status, invite.expires_at)}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <Calendar className="h-3 w-3" />
                            {formatAUDate(invite.created_at)}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <Calendar className="h-3 w-3" />
                            {formatAUDate(invite.expires_at)}
                          </div>
                        </TableCell>
                        <TableCell>
                          {invite.status === 'pending' && new Date(invite.expires_at) > new Date() && (
                            <div className="flex gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => resendInviteMutation.mutate(invite.id)}
                                disabled={resendInviteMutation.isPending}
                                title="Resend invite email"
                              >
                                <Send className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => revokeInviteMutation.mutate(invite.id)}
                                disabled={revokeInviteMutation.isPending}
                                title="Revoke invite"
                              >
                                <XCircle className="h-4 w-4" />
                              </Button>
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Import Dialog */}
      <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Import User from Office 365</DialogTitle>
            <DialogDescription>
              Import {selectedUser?.display_name} and assign a role
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Name</Label>
              <p className="text-sm text-muted-foreground">{selectedUser?.display_name}</p>
            </div>
            <div>
              <Label>Email</Label>
              <p className="text-sm text-muted-foreground">{selectedUser?.mail}</p>
            </div>
            <div>
              <Label htmlFor="role">Role</Label>
              <Select value={selectedRole} onValueChange={setSelectedRole}>
                <SelectTrigger id="role">
                  <SelectValue />
                </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="requester">Requester</SelectItem>
                          <SelectItem value="manager">Manager</SelectItem>
                          <SelectItem value="tenant_admin">Company Admin</SelectItem>
                        </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setImportDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={confirmImport} disabled={importUserMutation.isPending}>
              {importUserMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Import User
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <UserDetailDialog
        userId={detailUserId}
        companyId={companyId}
        isO365User={detailIsO365}
        open={detailDialogOpen}
        onOpenChange={setDetailDialogOpen}
      />
    </>
  );
};
