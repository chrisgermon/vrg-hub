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
      // Check if Office 365 is connected
      const { data, error } = await supabase
        .from('app_config')
        .select('*')
        .maybeSingle();

      if (error) throw error;

      // For now, simulate connection status
      // In production, you'd check actual Office 365 connection
      setConnection({
        id: '1',
        connected: false,
        last_sync: null,
        sync_enabled: false
      });
    } catch (error) {
      console.error('Error checking connection:', error);
      toast.error('Failed to check Office 365 connection');
    } finally {
      setLoading(false);
    }
  };

  const connectOffice365 = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('office365-oauth-initiate', {
        body: { company_id: 'single-tenant' }
      });

      if (error) throw error;

      if (data?.authUrl) {
        // Open auth URL in popup
        const width = 600;
        const height = 700;
        const left = window.screenX + (window.outerWidth - width) / 2;
        const top = window.screenY + (window.outerHeight - height) / 2;
        
        window.open(
          data.authUrl,
          'office365-auth',
          `width=${width},height=${height},left=${left},top=${top}`
        );

        // Listen for auth completion
        window.addEventListener('message', (event) => {
          if (event.data.type === 'office365-connected') {
            toast.success('Office 365 connected successfully');
            checkConnection();
          }
        });
      }
    } catch (error) {
      console.error('Error connecting Office 365:', error);
      toast.error('Failed to connect Office 365');
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
      const { data, error } = await supabase.functions.invoke('office365-sync-data', {
        body: { syncType: 'users' }
      });

      if (error) throw error;

      if (data?.users) {
        setOffice365Users(data.users);
        toast.success(`Found ${data.users.length} Office 365 users`);
      }

      // Update last sync time
      setConnection({
        ...connection,
        last_sync: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error syncing users:', error);
      toast.error('Failed to sync Office 365 users');
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
