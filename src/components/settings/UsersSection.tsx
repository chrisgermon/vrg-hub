import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { UserPermissionsManager } from '@/components/UserPermissionsManager';
import { Badge } from '@/components/ui/badge';
import { UserInviteManager } from '@/components/UserInviteManager';
import { RolesManager } from '@/components/settings/RolesManager';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface UsersSectionProps {
  companyId: string;
}

export function UsersSection({ companyId }: UsersSectionProps) {
  const [selectedUserId, setSelectedUserId] = useState<string>('');

  // Fetch users for the company
  const { data: users, isLoading } = useQuery({
    queryKey: ['company-users', companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          user_id,
          name,
          email
        `)
        .eq('company_id', companyId)
        .order('name');

      if (error) throw error;
      return data;
    },
    enabled: !!companyId,
  });

  const selectedUser = users?.find(u => u.user_id === selectedUserId);

  return (
    <Tabs defaultValue="invites" className="space-y-6">
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="invites">Invitations</TabsTrigger>
        <TabsTrigger value="roles">Roles</TabsTrigger>
        <TabsTrigger value="permissions">Permissions</TabsTrigger>
      </TabsList>

      {/* User Invites Tab */}
      <TabsContent value="invites" className="space-y-6">
        <UserInviteManager />
      </TabsContent>

      {/* User Roles Tab */}
      <TabsContent value="roles" className="space-y-6">
        <RolesManager companyId={companyId} />
      </TabsContent>

      {/* User Permissions Tab */}
      <TabsContent value="permissions" className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>User Permission Overrides</CardTitle>
            <CardDescription>
              Select a user to manage their specific permission overrides
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Select User</label>
              <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a user..." />
                </SelectTrigger>
                <SelectContent>
                  {isLoading ? (
                    <SelectItem value="loading" disabled>Loading users...</SelectItem>
                  ) : users && users.length > 0 ? (
                    users.map((user) => (
                      <SelectItem key={user.user_id} value={user.user_id}>
                        {user.name || user.email}
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="none" disabled>No users found</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>

            {selectedUser && (
              <div className="pt-4 border-t">
                <UserPermissionsManager
                  userId={selectedUser.user_id}
                  companyId={companyId}
                  userName={selectedUser.name || selectedUser.email || 'Unknown User'}
                />
              </div>
            )}
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}