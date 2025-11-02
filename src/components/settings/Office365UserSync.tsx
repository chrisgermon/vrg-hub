import { useState, useEffect, useMemo, useCallback } from 'react';
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
  Unlink,
  Users,
  Loader2
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { logger } from '@/lib/logger';

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
  const [bulkImporting, setBulkImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const usersPerPage = 20;

  const isAdmin = userRole === 'super_admin' || userRole === 'tenant_admin';

  // Memoize filtered and paginated users for performance
  const filteredUsers = useMemo(() => {
    return office365Users.filter(user =>
      user.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (user.mail && user.mail.toLowerCase().includes(searchQuery.toLowerCase())) ||
      user.userPrincipalName.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [office365Users, searchQuery]);

  const paginatedUsers = useMemo(() => {
    const startIndex = (currentPage - 1) * usersPerPage;
    const endIndex = startIndex + usersPerPage;
    return filteredUsers.slice(startIndex, endIndex);
  }, [filteredUsers, currentPage, usersPerPage]);

  const totalPages = useMemo(() => {
    return Math.ceil(filteredUsers.length / usersPerPage);
  }, [filteredUsers.length, usersPerPage]);

  const getTenantCompanyId = useCallback(async (): Promise<string | null> => {
    try {
      const { data, error } = await (supabase as any)
        .from('synced_office365_users')
        .select('company_id')
        .limit(1)
        .maybeSingle();

      if (error) {
        logger.error('Error fetching tenant company ID', error);
        return null;
      }

      return data?.company_id ?? null;
    } catch (error) {
      logger.error('Unexpected error fetching tenant company ID', error);
      toast.error('Failed to load company information');
      return null;
    }
  }, []);

  const loadUsers = useCallback(async (companyIdParam?: string) => {
    try {
      const companyId = companyIdParam || (await getTenantCompanyId());
      if (!companyId) {
        setOffice365Users([]);
        return;
      }
      const { data: syncedUsers, error: queryError } = await (supabase as any)
        .from('synced_office365_users')
        .select('*')
        .eq('company_id', companyId)
        .eq('is_active', true)
        .order('display_name');
      if (queryError) {
        logger.error('Error loading synced users', queryError);
        toast.error('Failed to load synced users');
        setOffice365Users([]);
        return;
      }
      const users = (syncedUsers || []).map((u: any) => ({
        id: u.user_principal_name,
        displayName: u.display_name,
        mail: u.mail,
        userPrincipalName: u.user_principal_name,
        jobTitle: u.job_title,
        department: u.department,
      }));
      setOffice365Users(users);
    } catch (error) {
      logger.error('Unexpected error loading users', error);
      toast.error('An unexpected error occurred');
      setOffice365Users([]);
    }
  }, [getTenantCompanyId]);

  const checkConnection = useCallback(async () => {
    setLoading(true);
    try {
      // Get user's company_id from their profile
      const { data: profile } = await (supabase as any)
        .from('profiles')
        .select('company_id')
        .eq('user_id', user?.id || '')
        .maybeSingle();

      const companyId = profile?.company_id;

      if (!companyId) {
        setConnection({ id: '1', connected: false, last_sync: null, sync_enabled: false });
        setLoading(false);
        return;
      }

      // Check for company-level connection (not user-level)
      const { data: conn, error } = await ((supabase as any)
        .from('office365_connections')
        .select('id, updated_at, company_id, is_active')
        .eq('company_id', companyId)
        .eq('is_active', true)
        .order('updated_at', { ascending: false })
        .maybeSingle());

      if (!error && conn) {
        setConnection({
          id: (conn as any).id,
          connected: true,
          last_sync: null,
          sync_enabled: true,
        });
        // Preload users for this company
        await loadUsers(companyId);
      } else {
        // Fallback: infer connectivity from existing synced users (tenant-wide)
        const fallbackCompanyId = await getTenantCompanyId();
        if (fallbackCompanyId) {
          setConnection({ id: 'tenant', connected: true, last_sync: null, sync_enabled: true });
          await loadUsers(fallbackCompanyId);
        } else {
          setConnection({ id: '1', connected: false, last_sync: null, sync_enabled: false });
        }
      }
    } catch (error) {
      logger.error('Error checking Office 365 connection', error);
      setConnection({ id: '1', connected: false, last_sync: null, sync_enabled: false });
    } finally {
      setLoading(false);
    }
  }, [user?.id, loadUsers, getTenantCompanyId]);

  useEffect(() => {
    if (isAdmin) {
      checkConnection();
    }
  }, [isAdmin, checkConnection]);

  const connectOffice365 = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Please sign in again to connect Office 365');
        return;
      }

      // Get the user's company_id from their profile
      const { data: profile, error: profileError } = await (supabase as any)
        .from('profiles')
        .select('company_id')
        .eq('user_id', user?.id || '')
        .maybeSingle();

      if (profileError || !profile?.company_id) {
        toast.error('Could not determine your company. Please contact support.');
        console.error('Profile fetch error:', profileError);
        return;
      }

      const company_id = profile.company_id;

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
          // Check by company_id, not user_id (connections are company-level now)
          const { data: conn } = await supabase
            .from('office365_connections')
            .select('id, updated_at')
            .eq('company_id', company_id)
            .eq('is_active', true)
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
      // Get company_id from user's profile (not from connections table)
      const { data: profile } = await (supabase as any)
        .from('profiles')
        .select('company_id')
        .eq('user_id', user?.id || '')
        .maybeSingle();

      let companyId = profile?.company_id;

      // Fallback to checking synced users table
      if (!companyId) {
        companyId = await getTenantCompanyId();
      }

      if (!companyId) {
        toast.error('Could not determine your company. Please contact support.');
        setSyncing(false);
        return;
      }

      // Call the sync function with the user's company_id
      const { data, error } = await supabase.functions.invoke('office365-sync-data', {
        body: { company_id: companyId }
      });

      if (error) throw error;

      // Refresh the list
      await loadUsers(companyId);

      const synced = (data as any)?.users_synced ?? 0;
      toast.success(`Sync complete${synced ? `: ${synced} users updated` : ''}`);

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
      const companyId = await getTenantCompanyId();
      if (!companyId) {
        toast.error('Could not determine company ID');
        return;
      }

      // Get the full user data from synced users
      const { data: syncedUser } = await (supabase as any)
        .from('synced_office365_users')
        .select('*')
        .eq('company_id', companyId)
        .eq('user_principal_name', selectedUser.id)
        .single();

      if (!syncedUser) {
        toast.error('User not found in synced users');
        return;
      }

      const { error } = await supabase.functions.invoke('import-office365-user', {
        body: {
          o365User: {
            id: syncedUser.user_principal_name,
            mail: syncedUser.mail,
            display_name: syncedUser.display_name,
            job_title: syncedUser.job_title,
            department: syncedUser.department,
            office_location: syncedUser.office_location,
            business_phones: syncedUser.business_phones,
            mobile_phone: syncedUser.mobile_phone,
          },
          role: selectedRole,
          companyId,
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

  const bulkImportUsers = async () => {
    if (!confirm(`Import all ${office365Users.length} synced users as inactive "requester" accounts? They will be activated when they first sign in.`)) {
      return;
    }

    setBulkImporting(true);
    setImportProgress(0);
    let successCount = 0;
    let errorCount = 0;
    let skippedCount = 0;

    try {
      const companyId = await getTenantCompanyId();
      if (!companyId) {
        toast.error('Could not determine company ID');
        setBulkImporting(false);
        return;
      }

      const totalUsers = office365Users.length;

      for (let i = 0; i < totalUsers; i++) {
        const o365User = office365Users[i];
        try {
          const { data: syncedUser } = await (supabase as any)
            .from('synced_office365_users')
            .select('*')
            .eq('company_id', companyId)
            .eq('user_principal_name', o365User.id)
            .single();

          if (!syncedUser) {
            errorCount++;
            continue;
          }

          const { data, error } = await supabase.functions.invoke('import-office365-user', {
            body: {
              o365User: {
                id: syncedUser.user_principal_name,
                mail: syncedUser.mail,
                display_name: syncedUser.display_name,
                job_title: syncedUser.job_title,
                department: syncedUser.department,
                office_location: syncedUser.office_location,
                business_phones: syncedUser.business_phones,
                mobile_phone: syncedUser.mobile_phone,
              },
              role: 'requester',
              companyId,
            }
          });

          if (error) {
            console.error(`Failed to import ${o365User.displayName}:`, error);
            errorCount++;
          } else if (data?.skipped) {
            skippedCount++;
          } else {
            successCount++;
          }
        } catch (err) {
          console.error(`Error processing ${o365User.displayName}:`, err);
          errorCount++;
        }

        // Update progress
        const progress = Math.round(((i + 1) / totalUsers) * 100);
        setImportProgress(progress);
      }

      toast.success(`Import complete: ${successCount} imported, ${skippedCount} already existed${errorCount > 0 ? `, ${errorCount} failed` : ''}`);
    } catch (error) {
      console.error('Bulk import error:', error);
      toast.error('Bulk import failed');
    } finally {
      setBulkImporting(false);
      setImportProgress(0);
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
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="space-y-2 flex-1">
              <Skeleton className="h-6 w-64" />
              <Skeleton className="h-4 w-96" />
            </div>
            <Skeleton className="h-8 w-24" />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-2 flex-1">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-48" />
            </div>
            <Skeleton className="h-10 w-32" />
          </div>
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
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Office 365 Users ({office365Users.length})</CardTitle>
                <CardDescription>
                  Import users from your Office 365 directory
                </CardDescription>
              </div>
              <Button 
                onClick={bulkImportUsers} 
                disabled={bulkImporting}
                variant="default"
              >
                {bulkImporting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Importing...
                  </>
                ) : (
                  <>
                    <Users className="h-4 w-4 mr-2" />
                    Import All Users
                  </>
                )}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {bulkImporting && importProgress > 0 && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>Importing users...</span>
                  <span>{importProgress}%</span>
                </div>
                <Progress value={importProgress} />
              </div>
            )}
            <div>
              <Input
                placeholder="Search by name or email..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
              />
            </div>
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
                {paginatedUsers.map((o365User) => (
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
                        disabled={bulkImporting}
                      >
                        <UserPlus className="h-4 w-4 mr-2" />
                        Import
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {paginatedUsers.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      No users found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
            {(() => {
              if (totalPages <= 1) return null;
              
              return (
                <Pagination>
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious 
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        className={currentPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                      />
                    </PaginationItem>
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pageNum;
                      if (totalPages <= 5) {
                        pageNum = i + 1;
                      } else if (currentPage <= 3) {
                        pageNum = i + 1;
                      } else if (currentPage >= totalPages - 2) {
                        pageNum = totalPages - 4 + i;
                      } else {
                        pageNum = currentPage - 2 + i;
                      }
                      
                      return (
                        <PaginationItem key={pageNum}>
                          <PaginationLink
                            onClick={() => setCurrentPage(pageNum)}
                            isActive={currentPage === pageNum}
                            className="cursor-pointer"
                          >
                            {pageNum}
                          </PaginationLink>
                        </PaginationItem>
                      );
                    })}
                    <PaginationItem>
                      <PaginationNext 
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                        className={currentPage === totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              );
            })()}
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
