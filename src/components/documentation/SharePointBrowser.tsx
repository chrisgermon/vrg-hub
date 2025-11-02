import { useState, useEffect } from "react";
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

  useEffect(() => {
    loadItems(currentPath);
  }, [currentPath]);

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

      // Upload each file to storage
      for (const file of Array.from(files)) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${crypto.randomUUID()}.${fileExt}`;
        const filePath = `sharepoint-uploads/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('company-assets')
          .upload(filePath, file);

        if (uploadError) {
          console.error('Upload error:', uploadError);
          toast.error(`Failed to upload ${file.name}`);
        } else {
          toast.success(`Uploaded ${file.name}`);
        }
      }

      // Refresh the current view
      await loadItems(currentPath, true);
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload files');
    } finally {
      setUploading(false);
      // Reset file input
      e.target.value = '';
    }
  };

  const loadItems = async (path: string, forceRefresh = false) => {
    try {
      setLoading(true);
      
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session) {
        toast.error('Please log in again to access SharePoint documents');
        setConfigured(false);
        return;
      }
      
      console.log('Invoking sharepoint-browse-folders-cached with session:', !!session);
      
      const { data, error } = await supabase.functions.invoke('sharepoint-browse-folders-cached', {
        body: { folder_path: path, force_refresh: forceRefresh },
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (error) {
        console.error('SharePoint function error:', error);
        // Try to parse the function response body for a better message/status
        let status = (error as any)?.status;
        let fnMessage: string | undefined;
        try {
          const res = (error as any)?.context?.response as Response | undefined;
          if (res) {
            status = res.status || status;
            const bodyAny = await res.clone().json().catch(async () => await res.text());
            if (typeof bodyAny === 'string') fnMessage = bodyAny;
            else fnMessage = bodyAny?.error;
          }
        } catch {}
        // Bubble up a normalized error for unified catch handling
        throw new Error(fnMessage || (error as any)?.message || 'SharePoint request failed');
      }

      setFolders(data.folders || []);
      setFiles(data.files || []);
      setConfigured(!!data.configured);
      setNeedsO365(!!data.needsO365);
      setFromCache(!!data.fromCache);
      setCachedAt(data.cachedAt || null);
      
      if (data.fromCache) {
        toast.success('Loaded from cache (faster!)', { duration: 2000 });
      }
    } catch (error: any) {
      console.error('Error loading SharePoint items:', error);
      // Fallback: detect whether SharePoint is actually configured for this company
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const userId = session?.user?.id;
        let isConfigured = false;
        if (userId) {
          const { data: o365 } = await supabase
            .from('office365_connections')
            .select('company_id')
            .eq('user_id', userId)
            .order('updated_at', { ascending: false })
            .limit(1);
          const companyId = o365?.[0]?.company_id;
          if (companyId) {
            const { data: configs } = await supabase
              .from('sharepoint_configurations')
              .select('id')
              .eq('company_id', companyId)
              .eq('is_active', true)
              .limit(1);
            isConfigured = Array.isArray(configs) && configs.length > 0;
          }
        }
        setConfigured(isConfigured);
        if (isConfigured) {
          toast.error('Unable to fetch SharePoint items. Please check SharePoint permissions or try again.');
        } else {
          toast.error('SharePoint is not configured. A Super Admin must configure it in Integrations.');
        }
      } catch {
        setConfigured(false);
        toast.error(error?.message || 'Failed to load SharePoint content. Please refresh the page.');
      }
    } finally {
      setLoading(false);
    }
  };

  const navigateToFolder = (folderName: string) => {
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
              A Super Admin needs to configure SharePoint access in the Integrations page before documents can be viewed.
            </p>
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
              <>
                <BreadcrumbSeparator key={`sep-${index}`}>
                  <ChevronRight className="h-4 w-4" />
                </BreadcrumbSeparator>
                <BreadcrumbItem key={part}>
                  <BreadcrumbLink>{part}</BreadcrumbLink>
                </BreadcrumbItem>
              </>
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
            onClick={() => loadItems(currentPath, true)}
            title="Force refresh from SharePoint"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Refresh'}
          </Button>
          {fromCache && cachedAt && (
            <span className="text-xs text-muted-foreground flex items-center">
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
                    className="cursor-pointer hover:bg-muted/50"
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
