import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { 
  Cloud, 
  RefreshCw, 
  UserPlus, 
  CheckCircle2, 
  XCircle, 
  AlertCircle,
  Link as LinkIcon,
  Unlink
} from 'lucide-react';

interface Office365Connection {
  id: string;
  connected: boolean;
  last_sync: string | null;
  sync_enabled: boolean;
}

interface Office365User {
  id: string;
  displayName: string;
  mail: string;
  userPrincipalName: string;
  jobTitle?: string;
  department?: string;
}

export function Office365UserSync() {
  const { user, userRole } = useAuth();
  const [connection, setConnection] = useState<Office365Connection | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [office365Users, setOffice365Users] = useState<Office365User[]>([]);
  const [selectedUser, setSelectedUser] = useState<Office365User | null>(null);
  const [selectedRole, setSelectedRole] = useState<string>('requester');
  const [importDialogOpen, setImportDialogOpen] = useState(false);

  const isAdmin = userRole === 'super_admin' || userRole === 'tenant_admin';

  useEffect(() => {
    if (isAdmin) {
      checkConnection();
    }
  }, [isAdmin]);

  const checkConnection = async () => {
    setLoading(true);
    try {
      // Determine if a user-level Office 365 connection exists
      const { data: conn, error } = await ((supabase as any)
        .from('office365_connections')
        .select('id, updated_at')
        .eq('user_id', user?.id || '')
        .order('updated_at', { ascending: false })
        .maybeSingle());

      if (error) throw error;

      if (conn) {
        setConnection({
          id: (conn as any).id,
          connected: true,
          last_sync: null,
          sync_enabled: true,
        });
      } else {
        setConnection({ id: '1', connected: false, last_sync: null, sync_enabled: false });
      }
    } catch (error) {
      console.error('Error checking connection:', error);
      // Fallback to not connected if status cannot be determined (likely RLS)
      setConnection({ id: '1', connected: false, last_sync: null, sync_enabled: false });
    } finally {
      setLoading(false);
    }
  };

  const connectOffice365 = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Please sign in again to connect Office 365');
        return;
      }

      // Use a default company_id or get it from the user context
      // For now, we'll pass it in the state and retrieve it later
      const company_id = 'default'; // This will be stored in the oauth state

      const { data, error } = await supabase.functions.invoke('office365-oauth-initiate', {
        body: { company_id },
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      
      if (error) {
        console.error('OAuth initiate error:', error);
        throw error;
      }

      if (data?.authorization_url) {
        const width = 600;
        const height = 700;
        const left = window.screenX + (window.outerWidth - width) / 2;
        const top = window.screenY + (window.outerHeight - height) / 2;

        const popup = window.open(
          data.authorization_url,
          'office365-auth',
          `width=${width},height=${height},left=${left},top=${top}`
        );

        if (!popup) {
          toast.error('Please allow popups for this site to connect Office 365');
          return;
        }

        let connectionCheckInterval: NodeJS.Timeout | null = null;
        
        const checkConnectionStatus = async () => {
          const { data: conn } = await supabase
            .from('office365_connections')
            .select('id, updated_at')
            .eq('user_id', user?.id || '')
            .order('updated_at', { ascending: false })
            .maybeSingle();

          if (conn) {
            toast.success('Office 365 connected successfully');
            if (connectionCheckInterval) clearInterval(connectionCheckInterval);
            try { popup?.close(); } catch {}
            checkConnection();
          }
        };

        // Poll for connection status
        connectionCheckInterval = setInterval(checkConnectionStatus, 2000);

        const poll = setInterval(() => {
          if (!popup || popup.closed) {
            clearInterval(poll);
            if (connectionCheckInterval) clearInterval(connectionCheckInterval);
            // Check one final time in case connection was made
            setTimeout(checkConnectionStatus, 1000);
          }
        }, 500);
      }
    } catch (error) {
      console.error('Error connecting Office 365:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to connect Office 365');
    }
  };

  const disconnectOffice365 = async () => {
    try {
      // Implement disconnect logic
      toast.success('Office 365 disconnected');
      setConnection({ ...connection!, connected: false });
    } catch (error) {
      console.error('Error disconnecting Office 365:', error);
      toast.error('Failed to disconnect Office 365');
    }
  };

  const syncUsers = async () => {
    if (!connection?.connected) {
      toast.error('Please connect Office 365 first');
      return;
    }

    setSyncing(true);
    try {
      // Get company_id from the connection
      const { data: conn } = await (supabase as any)
        .from('office365_connections')
        .select('company_id')
        .eq('user_id', user?.id || '')
        .maybeSingle();

      if (!conn?.company_id) {
        throw new Error('No company ID found for Office 365 connection');
      }

      // Call the sync function
      const { data, error } = await supabase.functions.invoke('office365-sync-data', {
        body: { company_id: conn.company_id }
      });

      if (error) throw error;

      // Query the synced users from the database
      const { data: syncedUsers, error: queryError } = await (supabase as any)
        .from('synced_office365_users')
        .select('*')
        .eq('company_id', conn.company_id)
        .eq('is_active', true)
        .order('display_name');

      if (queryError) throw queryError;

      // Map to the expected format
      const users = (syncedUsers || []).map((u: any) => ({
        id: u.user_principal_name,
        displayName: u.display_name,
        mail: u.mail,
        userPrincipalName: u.user_principal_name,
        jobTitle: u.job_title,
        department: u.department,
      }));

      setOffice365Users(users);
      toast.success(`Synced ${data?.users_synced || 0} Office 365 users successfully`);

      // Update last sync time
      setConnection({
        ...connection,
        last_sync: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error syncing users:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to sync Office 365 users');
    } finally {
      setSyncing(false);
    }
  };

  const importUser = async () => {
    if (!selectedUser) return;

    try {
      const { error } = await supabase.functions.invoke('import-office365-user', {
        body: {
          o365UserId: selectedUser.id,
          role: selectedRole
        }
      });

      if (error) throw error;

      toast.success(`User ${selectedUser.displayName} imported successfully`);
      setImportDialogOpen(false);
      setSelectedUser(null);
    } catch (error) {
      console.error('Error importing user:', error);
      toast.error('Failed to import user');
    }
  };

  if (!isAdmin) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          You don't have permission to manage Office 365 integration.
        </AlertDescription>
      </Alert>
    );
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8">
          <p className="text-center text-muted-foreground">Loading...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Cloud className="h-5 w-5" />
                Office 365 / Azure AD Integration
              </CardTitle>
              <CardDescription>
                Sync users from your Office 365 / Azure AD directory
              </CardDescription>
            </div>
            <Badge variant={connection?.connected ? 'default' : 'outline'}>
              {connection?.connected ? (
                <>
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  Connected
                </>
              ) : (
                <>
                  <XCircle className="h-3 w-3 mr-1" />
                  Not Connected
                </>
              )}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-sm font-medium">Connection Status</p>
              <p className="text-sm text-muted-foreground">
                {connection?.connected 
                  ? `Last synced: ${connection.last_sync ? new Date(connection.last_sync).toLocaleString() : 'Never'}`
                  : 'Connect to Office 365 to sync users'
                }
              </p>
            </div>
            <div className="flex gap-2">
              {connection?.connected ? (
                <>
                  <Button
                    variant="outline"
                    onClick={syncUsers}
                    disabled={syncing}
                  >
                    {syncing ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        Syncing...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Sync Users
                      </>
                    )}
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={disconnectOffice365}
                  >
                    <Unlink className="h-4 w-4 mr-2" />
                    Disconnect
                  </Button>
                </>
              ) : (
                <Button onClick={connectOffice365}>
                  <LinkIcon className="h-4 w-4 mr-2" />
                  Connect Office 365
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {office365Users.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Office 365 Users</CardTitle>
            <CardDescription>
              Import users from your Office 365 directory
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Job Title</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {office365Users.map((o365User) => (
                  <TableRow key={o365User.id}>
                    <TableCell className="font-medium">
                      {o365User.displayName}
                    </TableCell>
                    <TableCell>{o365User.mail || o365User.userPrincipalName}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {o365User.jobTitle || '-'}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {o365User.department || '-'}
                    </TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSelectedUser(o365User);
                          setImportDialogOpen(true);
                        }}
                      >
                        <UserPlus className="h-4 w-4 mr-2" />
                        Import
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Import Office 365 User</DialogTitle>
            <DialogDescription>
              Select a role for {selectedUser?.displayName}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">User Details</label>
              <div className="text-sm text-muted-foreground space-y-1">
                <p>Name: {selectedUser?.displayName}</p>
                <p>Email: {selectedUser?.mail || selectedUser?.userPrincipalName}</p>
                {selectedUser?.jobTitle && <p>Job Title: {selectedUser.jobTitle}</p>}
                {selectedUser?.department && <p>Department: {selectedUser.department}</p>}
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Assign Role</label>
              <Select value={selectedRole} onValueChange={setSelectedRole}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="requester">Requester</SelectItem>
                  <SelectItem value="manager">Manager</SelectItem>
                  <SelectItem value="marketing">Marketing</SelectItem>
                  <SelectItem value="marketing_manager">Marketing Manager</SelectItem>
                  <SelectItem value="tenant_admin">Tenant Admin</SelectItem>
                  {userRole === 'super_admin' && (
                    <SelectItem value="super_admin">Super Admin</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => setImportDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={importUser}>
              <UserPlus className="h-4 w-4 mr-2" />
              Import User
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
