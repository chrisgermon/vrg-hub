import { useState, useEffect, Fragment, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { FileText, Download, ExternalLink, Loader2, AlertCircle, Folder, ChevronRight, Home, Users, Lock } from "lucide-react";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { formatAUDateTimeFull } from "@/lib/dateUtils";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { ConnectOffice365Button } from "./ConnectOffice365Button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PermissionsDialog } from "./PermissionsDialog";

interface SharePointFolder {
  id: string;
  name: string;
  webUrl: string;
  childCount: number;
  lastModifiedDateTime: string;
  permissions?: Permission[];
}

interface SharePointFile {
  id: string;
  name: string;
  webUrl: string;
  size: number;
  createdDateTime: string;
  lastModifiedDateTime: string;
  createdBy?: string;
  lastModifiedBy?: string;
  fileType: string;
  downloadUrl?: string;
  permissions?: Permission[];
}

interface Permission {
  id: string;
  roles: string[];
  grantedTo?: Array<{
    displayName: string;
    email?: string;
    type: 'user' | 'group';
  }>;
  link?: {
    type: string;
    scope: string;
  };
}

export function SharePointBrowser() {
  const [folders, setFolders] = useState<SharePointFolder[]>([]);
  const [files, setFiles] = useState<SharePointFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [configured, setConfigured] = useState(false);
  const [needsO365, setNeedsO365] = useState(false);
  const [currentPath, setCurrentPath] = useState("/");
  const [pathHistory, setPathHistory] = useState<string[]>([]);
  const [fromCache, setFromCache] = useState(false);
  const [cachedAt, setCachedAt] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<SharePointFile | SharePointFolder | null>(null);
  const [uploading, setUploading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [spConfig, setSpConfig] = useState<any>(null);
  const [companyId, setCompanyId] = useState<string | null>(null);

  const checkConfigured = useCallback(async (): Promise<{ configured: boolean; companyId?: string }> => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setConfigured(false);
        setNeedsO365(false);
        setSpConfig(null);
        setCompanyId(null);
        return { configured: false };
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setConfigured(false);
        setNeedsO365(false);
        setSpConfig(null);
        setCompanyId(null);
        return { configured: false };
      }

      // Prefer company_id from Office 365 connection
      const { data: connection } = await (supabase as any)
        .from('office365_connections')
        .select('company_id')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false })
        .maybeSingle();

      let resolvedCompanyId: string | undefined = (connection?.company_id as string | undefined);

      if (!resolvedCompanyId) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('brand_id')
          .eq('id', user.id)
          .maybeSingle();
        resolvedCompanyId = (profile?.brand_id as any) || user.id;
      }

      const { data: spConfigData, error: spError } = await (supabase as any)
        .from('sharepoint_configurations')
        .select('*')
        .eq('company_id', resolvedCompanyId)
        .eq('is_active', true)
        .maybeSingle();

      const isConfigured = !!spConfigData && !spError;
      setConfigured(isConfigured);
      setSpConfig(spConfigData);
      setCompanyId(resolvedCompanyId || null);
      if (isConfigured) {
        setNeedsO365(false);
      }
      return { configured: isConfigured, companyId: resolvedCompanyId };
    } catch {
      setConfigured(false);
      setNeedsO365(false);
      setSpConfig(null);
      setCompanyId(null);
      return { configured: false };
    }
  }, []);

  const syncSharePointFiles = async (customFolderPath?: string, options?: { skipRefresh?: boolean }) => {
    setSyncing(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Please log in to sync files');
        return;
      }

      // Ensure we know which company/site to sync
      let resolvedCompanyId = companyId;
      if (!resolvedCompanyId || !spConfig) {
        const res = await checkConfigured();
        if (!res.configured || !res.companyId) {
          setConfigured(false);
          toast.error('SharePoint not configured. Please set it up in Integrations.');
          return;
        }
        resolvedCompanyId = res.companyId;
      }

      if (!resolvedCompanyId) {
        setConfigured(false);
        toast.error('SharePoint not configured. Please set it up in Integrations.');
        return;
      }

      const payload: Record<string, any> = {
        company_id: resolvedCompanyId,
      };
      if (spConfig?.site_id) payload.site_id = spConfig.site_id;
      
      // Use custom folder path if provided, otherwise use configured folder path
      const targetFolderPath = customFolderPath !== undefined ? customFolderPath : (spConfig?.folder_path || currentPath || '/');
      payload.folder_path = targetFolderPath;

      const { data, error } = await supabase.functions.invoke('sync-sharepoint-files', {
        body: payload,
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (error) {
        // Try extracting more details
        let status: number | undefined = (error as any)?.status;
        let bodyText = '';
        try {
          const res = (error as any)?.context?.response as Response | undefined;
          if (res) {
            status = res.status || status;
            const bodyAny = await res.clone().json().catch(async () => await res.text());
            bodyText = typeof bodyAny === 'string' ? bodyAny : (bodyAny?.error || JSON.stringify(bodyAny));
          }
        } catch {}

        const lower = (bodyText || '').toLowerCase();
        if (status === 404 || lower.includes('not configured')) {
          setConfigured(false);
          toast.error('SharePoint not configured. Please set it up in Integrations.');
        } else if (status === 401 || lower.includes('unauthorized')) {
          setNeedsO365(true);
          toast.error('Connect your Office 365 account to continue.');
        } else {
          console.error('Sync error:', error);
          toast.error('Failed to sync SharePoint files');
        }
      } else {
        // Only show success toast for manual syncs (when no custom folder path)
        if (customFolderPath === undefined) {
          toast.success('SharePoint files synced successfully');
        }
        if (!options?.skipRefresh) {
          await loadItems(customFolderPath !== undefined ? customFolderPath : currentPath, { forceRefresh: true });
        }
      }
    } catch (error) {
      console.error('Sync error:', error);
      toast.error('Failed to sync SharePoint files');
    } finally {
      setSyncing(false);
    }
  };

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      const result = await checkConfigured();
      if (!result.configured) {
        setLoading(false);
      }
    };
    init();
  }, []);

  useEffect(() => {
    if (!configured) {
      return;
    }
    loadItems(currentPath);
  }, [configured, currentPath, loadItems]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Please log in to upload files');
        return;
      }

      // Upload each file to SharePoint
      for (const file of Array.from(files)) {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('folder_path', currentPath);

        const { data, error } = await supabase.functions.invoke('sharepoint-upload-file', {
          body: formData,
          headers: { Authorization: `Bearer ${session.access_token}` },
        });

        if (error) {
          console.error('Upload error:', error);
          // Try to extract status and error body for better UX
          let status: number | undefined = (error as any)?.status;
          let bodyText = '';
          try {
            const res = (error as any)?.context?.response as Response | undefined;
            if (res) {
              status = res.status || status;
              const bodyAny = await res.clone().json().catch(async () => await res.text());
              bodyText = typeof bodyAny === 'string' ? bodyAny : (bodyAny?.error || JSON.stringify(bodyAny));
            }
          } catch {}

          const lower = (bodyText || '').toLowerCase();
          if (status === 401 || lower.includes('token expired')) {
            setNeedsO365(true);
            toast.error('Your Microsoft 365 session expired. Please reconnect your Office 365 account to continue.');
          } else if (status === 403 || lower.includes('access denied') || lower.includes('insufficient')) {
            setNeedsO365(true);
            toast.error('Permission denied. Reconnect your Office 365 account to grant write access, or ask an admin for permission to this folder.');
          } else if (status === 404 || lower.includes('not found')) {
            toast.error('Folder path not found in SharePoint configuration. Please verify the configured folder.');
          } else {
            toast.error(`Failed to upload ${file.name}`);
          }
        } else {
          toast.success(`Uploaded ${file.name} to SharePoint`);
        }
      }

      // Sync files after upload and refresh from cache
      await syncSharePointFiles();
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload files');
    } finally {
      setUploading(false);
      // Reset file input
      e.target.value = '';
    }
  };

  const loadItems = useCallback(async (path: string, options?: { forceRefresh?: boolean }) => {
    try {
      setLoading(true);

      const { data: { session }, error: sessionError } = await supabase.auth.getSession();

      if (sessionError || !session) {
        toast.error('Please log in again to access SharePoint documents');
        setConfigured(false);
        setNeedsO365(false);
        setCompanyId(null);
        setSpConfig(null);
        setFolders([]);
        setFiles([]);
        setFromCache(false);
        setCachedAt(null);
        return;
      }

      const { data, error } = await supabase.functions.invoke('sharepoint-browse-folders-cached', {
        body: {
          folder_path: path,
          force_refresh: options?.forceRefresh ?? false,
        },
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (error) {
        let status: number | undefined = (error as any)?.status;
        let errorBody: any = null;
        try {
          const res = (error as any)?.context?.response as Response | undefined;
          if (res) {
            status = res.status || status;
            errorBody = await res.clone().json().catch(async () => await res.text());
          }
        } catch {}

        const needsO365 = typeof errorBody === 'object' && errorBody !== null ? errorBody.needsO365 : false;
        const configuredValue = typeof errorBody === 'object' && errorBody !== null ? errorBody.configured : undefined;

        if (typeof configuredValue === 'boolean') {
          setConfigured(configuredValue);
          if (!configuredValue) {
            setCompanyId(null);
            setSpConfig(null);
          }
        }

        if (needsO365 || status === 401) {
          setNeedsO365(true);
          toast.error('Connect your Office 365 account to continue.');
        } else {
          console.error('Error loading SharePoint items:', error);
          toast.error('Failed to load SharePoint content. Please try syncing again.');
        }

        setFolders([]);
        setFiles([]);
        setFromCache(false);
        setCachedAt(null);
        return;
      }

      const response = data as {
        configured: boolean;
        needsO365?: boolean;
        folders?: SharePointFolder[];
        files?: SharePointFile[];
        fromCache?: boolean;
        cachedAt?: string | null;
      };

      setConfigured(response.configured);
      if (!response.configured) {
        setCompanyId(null);
        setSpConfig(null);
      }
      setNeedsO365(response.needsO365 ?? false);
      setFolders(response.folders ?? []);
      setFiles(response.files ?? []);
      setFromCache(response.fromCache ?? false);
      setCachedAt(response.cachedAt ?? null);
    } catch (error: any) {
      console.error('Error loading SharePoint items:', error);
      toast.error('Failed to load SharePoint content. Please try syncing again.');
      setFolders([]);
      setFiles([]);
      setFromCache(false);
      setCachedAt(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const navigateToFolder = (folderName: string) => {
    if (loading) return; // Prevent navigation while loading
    const newPath = currentPath === '/' ? `/${folderName}` : `${currentPath}/${folderName}`;
    setPathHistory([...pathHistory, currentPath]);
    setCurrentPath(newPath);
  };

  const navigateBack = () => {
    if (pathHistory.length > 0) {
      const previousPath = pathHistory[pathHistory.length - 1];
      setPathHistory(pathHistory.slice(0, -1));
      setCurrentPath(previousPath);
    }
  };

  const navigateToRoot = () => {
    setCurrentPath('/');
    setPathHistory([]);
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const getBreadcrumbs = () => {
    if (currentPath === '/') return [];
    const parts = currentPath.split('/').filter(Boolean);
    return parts;
  };

  const getPermissionsSummary = (permissions?: Permission[]) => {
    if (!permissions || permissions.length === 0) return 'No permissions info';
    
    const users = new Set<string>();
    const groups = new Set<string>();
    
    permissions.forEach(perm => {
      perm.grantedTo?.forEach(identity => {
        if (identity.type === 'user') {
          users.add(identity.displayName);
        } else {
          groups.add(identity.displayName);
        }
      });
    });
    
    const parts = [];
    if (users.size > 0) parts.push(`${users.size} user${users.size > 1 ? 's' : ''}`);
    if (groups.size > 0) parts.push(`${groups.size} group${groups.size > 1 ? 's' : ''}`);
    
    return parts.length > 0 ? parts.join(', ') : 'Shared with link';
  };

  if (loading && folders.length === 0 && files.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!configured) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12 space-y-4">
          <AlertCircle className="h-12 w-12 text-muted-foreground" />
          <div className="text-center space-y-2">
            <h3 className="text-lg font-semibold">SharePoint Not Configured</h3>
            <p className="text-sm text-muted-foreground max-w-md">
              A Super Admin needs to configure SharePoint access in Integrations before documents can be viewed.
            </p>
          </div>
          <div className="flex gap-3">
            <Button asChild>
              <a href="/integrations">Open Integrations</a>
            </Button>
            <ConnectOffice365Button />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (needsO365) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12 space-y-4">
          <AlertCircle className="h-12 w-12 text-primary" />
          <div className="text-center space-y-2">
            <h3 className="text-lg font-semibold">Connect Your Office 365 Account</h3>
            <p className="text-sm text-muted-foreground max-w-md">
              To access SharePoint documents, you need to connect your Office 365 account. This ensures you only see documents you have permission to access.
            </p>
          </div>
          <ConnectOffice365Button />
        </CardContent>
      </Card>
    );
  }

  const breadcrumbs = getBreadcrumbs();

  return (
    <div className="space-y-6">
      {/* Navigation */}
      <div className="flex items-center justify-between">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Button variant="ghost" size="sm" onClick={navigateToRoot}>
                  <Home className="h-4 w-4" />
                </Button>
              </BreadcrumbLink>
            </BreadcrumbItem>
            {breadcrumbs.map((part, index) => (
              <Fragment key={`bc-${index}`}>
                <BreadcrumbSeparator>
                  <ChevronRight className="h-4 w-4" />
                </BreadcrumbSeparator>
                <BreadcrumbItem>
                  <BreadcrumbLink>{part}</BreadcrumbLink>
                </BreadcrumbItem>
              </Fragment>
            ))}
          </BreadcrumbList>
        </Breadcrumb>

        <div className="flex gap-2">
          {pathHistory.length > 0 && (
            <Button variant="outline" size="sm" onClick={navigateBack}>
              Back
            </Button>
          )}
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => syncSharePointFiles()}
            disabled={syncing}
            title="Sync from SharePoint"
          >
            {syncing ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Sync'}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => loadItems(currentPath, { forceRefresh: true })}
            title="Refresh from SharePoint"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Refresh'}
          </Button>
          <label>
            <input
              type="file"
              multiple
              onChange={handleFileUpload}
              className="hidden"
              disabled={uploading}
            />
            <Button variant="default" size="sm" disabled={uploading} asChild>
              <span>
                {uploading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Upload Files
              </span>
            </Button>
          </label>
          {fromCache && cachedAt && (
            <span className="text-xs text-muted-foreground flex items-center ml-2">
              Cached {new Date(cachedAt).toLocaleTimeString()}
            </span>
          )}
        </div>
      </div>

      {/* Combined Table View */}
      {(folders.length > 0 || files.length > 0) && (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12"></TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead className="hidden md:table-cell">Modified</TableHead>
                  <TableHead className="hidden lg:table-cell">Modified By</TableHead>
                  <TableHead className="hidden sm:table-cell">Size</TableHead>
                  <TableHead className="w-32">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {/* Folders */}
                {folders.map((folder) => (
                  <TableRow 
                    key={folder.id}
                    className={`cursor-pointer hover:bg-muted/50 ${loading ? 'opacity-50 pointer-events-none' : ''}`}
                    onClick={() => navigateToFolder(folder.name)}
                  >
                    <TableCell>
                      <Folder className="h-5 w-5 text-primary" />
                    </TableCell>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        {folder.name}
                        <span className="text-xs text-muted-foreground">
                          ({folder.childCount} {folder.childCount === 1 ? 'item' : 'items'})
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                      {formatAUDateTimeFull(folder.lastModifiedDateTime)}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                      —
                    </TableCell>
                    <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">
                      —
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm">
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                
                {/* Files */}
                {files.map((doc) => (
                  <TableRow key={doc.id} className="hover:bg-muted/50">
                    <TableCell>
                      <FileText className="h-5 w-5 text-muted-foreground" />
                    </TableCell>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <span className="truncate max-w-xs">{doc.name}</span>
                        <span className="text-xs font-mono bg-muted px-1.5 py-0.5 rounded flex-shrink-0">
                          {doc.fileType}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                      {formatAUDateTimeFull(doc.lastModifiedDateTime)}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-sm text-muted-foreground truncate max-w-xs">
                      {doc.lastModifiedBy || '—'}
                    </TableCell>
                    <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">
                      {formatFileSize(doc.size)}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => window.open(doc.webUrl, '_blank')}
                          title="Open in SharePoint"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                        {doc.downloadUrl && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => window.open(doc.downloadUrl, '_blank')}
                            title="Download"
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {folders.length === 0 && files.length === 0 && !loading && (
        <Card>
          <CardContent className="py-12 text-center">
            <Folder className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">This folder is empty</h3>
            <p className="text-muted-foreground mb-4">
              There are no files or folders in this location.
            </p>
            <Button onClick={() => document.getElementById('sharepoint-upload')?.click()}>
              Upload Files
            </Button>
            <input
              id="sharepoint-upload"
              type="file"
              multiple
              className="hidden"
              onChange={handleFileUpload}
            />
          </CardContent>
        </Card>
      )}

      {/* Upload button for non-empty folders */}
      {(folders.length > 0 || files.length > 0) && (
        <div className="fixed bottom-6 right-6 z-50">
          <Button
            size="lg"
            onClick={() => document.getElementById('sharepoint-upload-fab')?.click()}
            className="rounded-full h-14 w-14 shadow-lg"
          >
            <input
              id="sharepoint-upload-fab"
              type="file"
              multiple
              className="hidden"
              onChange={handleFileUpload}
            />
            +
          </Button>
        </div>
      )}

    </div>
  );
}
