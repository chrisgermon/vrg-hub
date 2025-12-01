import { useState, useEffect, Fragment, useCallback, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, AlertCircle, Home, ChevronRight, Search, ExternalLink, FolderPlus, Upload } from "lucide-react";
import { toast } from "sonner";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { ConnectOffice365Button } from "./ConnectOffice365Button";
import { useSharePointCache } from "./useSharePointCache";
import { SharePointSkeleton } from "./SharePointSkeleton";
import { VirtualizedTable } from "./VirtualizedTable";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FolderRow, FileRow, SharePointFile, SharePointFolder, FileOperationCallbacks } from "./SharePointTableRow";
import { FileUploadProgress } from "./FileUploadProgress";
import { FilePreviewModal } from "./FilePreviewModal";
import { DeleteDialog, RenameDialog, CreateFolderDialog, MoveCopyDialog } from "./FileOperationDialogs";

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

const ITEMS_PER_PAGE = 50;
const LARGE_LIST_THRESHOLD = 100;

export function SharePointBrowser() {
  const [folders, setFolders] = useState<SharePointFolder[]>([]);
  const [files, setFiles] = useState<SharePointFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [configured, setConfigured] = useState(false);
  const [needsO365, setNeedsO365] = useState(false);
  const [currentPath, setCurrentPath] = useState("/");
  const [pathHistory, setPathHistory] = useState<string[]>([]);
  const [fromCache, setFromCache] = useState(false);
  const [cachedAt, setCachedAt] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<{
    folders: SharePointFolder[];
    files: SharePointFile[];
  } | null>(null);
  const [uploading, setUploading] = useState(false);
  const [spConfig, setSpConfig] = useState<any>(null);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [displayPage, setDisplayPage] = useState(1);
  const [uploadProgress, setUploadProgress] = useState<Array<{
    name: string;
    progress: number;
    status: 'uploading' | 'success' | 'error';
    error?: string;
  }>>([]);
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [sharePointSiteUrl, setSharePointSiteUrl] = useState<string | null>(null);

  // File operation states
  const [previewFile, setPreviewFile] = useState<SharePointFile | null>(null);
  const [deleteItem, setDeleteItem] = useState<{ item: SharePointFile | SharePointFolder; type: 'file' | 'folder' } | null>(null);
  const [renameItem, setRenameItem] = useState<{ item: SharePointFile | SharePointFolder; type: 'file' | 'folder' } | null>(null);
  const [moveCopyItem, setMoveCopyItem] = useState<{ item: SharePointFile | SharePointFolder; type: 'file' | 'folder'; operation: 'move' | 'copy' } | null>(null);
  const [showCreateFolder, setShowCreateFolder] = useState(false);

  // Drag and drop state
  const [isDragging, setIsDragging] = useState(false);
  const dropZoneRef = useRef<HTMLDivElement>(null);

  const cache = useSharePointCache();

  // File operation callbacks
  const fileOperations: FileOperationCallbacks = {
    onDelete: (item, type) => setDeleteItem({ item, type }),
    onRename: (item, type) => setRenameItem({ item, type }),
    onMove: (item, type) => setMoveCopyItem({ item, type, operation: 'move' }),
    onCopy: (item, type) => setMoveCopyItem({ item, type, operation: 'copy' }),
    onPreview: (file) => setPreviewFile(file),
  };

  const autoConfigureSharePoint = async (companyId: string, userId: string) => {
    try {
      console.log('SharePoint: Auto-configuring for company', companyId);

      const { data, error } = await supabase.functions.invoke('sharepoint-get-sites', {
        body: { company_id: companyId }
      });

      if (error) {
        console.error('SharePoint: Error fetching sites:', error);
        return;
      }

      const TARGET_SITE_NAME = 'vrgdocuments';
      const vrgSite = data?.sites?.find((s: any) =>
        s.name.toLowerCase() === TARGET_SITE_NAME.toLowerCase()
      );

      if (!vrgSite) {
        console.log('SharePoint: vrgdocuments site not found');
        return;
      }

      console.log('SharePoint: Found vrgdocuments site, configuring...');

      await supabase
        .from('sharepoint_cache')
        .delete()
        .eq('company_id', companyId);

      const { error: configError } = await supabase
        .from('sharepoint_configurations')
        .insert({
          company_id: companyId,
          site_id: vrgSite.id,
          site_name: vrgSite.name,
          site_url: vrgSite.webUrl,
          folder_path: '/',
          configured_by: userId,
          is_active: true,
        });

      if (configError) {
        console.error('SharePoint: Error saving configuration:', configError);
        return;
      }

      console.log('SharePoint: Configuration saved, re-checking...');
      toast.success('SharePoint configured successfully!');

      await checkConfigured();
    } catch (error) {
      console.error('SharePoint: Auto-configuration error:', error);
    }
  };

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

      const { data: connection } = await supabase
        .from('office365_connections')
        .select('company_id')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false })
        .maybeSingle();

      let resolvedCompanyId: string | undefined = connection?.company_id;

      if (!resolvedCompanyId) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('brand_id')
          .eq('id', user.id)
          .maybeSingle();
        resolvedCompanyId = profile?.brand_id || user.id;
      }

      let { data: spConfigData } = await supabase
        .from('sharepoint_configurations')
        .select('*')
        .eq('company_id', resolvedCompanyId)
        .eq('is_active', true)
        .maybeSingle();

      if (!spConfigData) {
        const { data: fallback } = await supabase
          .from('sharepoint_configurations')
          .select('*')
          .eq('is_active', true)
          .order('updated_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        if (fallback) {
          spConfigData = fallback as any;
          resolvedCompanyId = (fallback as any).company_id;
        }
      }

      const isConfigured = !!spConfigData;

      setConfigured(isConfigured);
      setSpConfig(spConfigData);
      setCompanyId(((spConfigData?.company_id as string | undefined) ?? resolvedCompanyId) || null);
      if (isConfigured) {
        setNeedsO365(false);
        setSharePointSiteUrl(spConfigData?.site_url || null);
      }
      return { configured: isConfigured, companyId: (spConfigData?.company_id as string | undefined) ?? resolvedCompanyId };
    } catch (error) {
      console.error('SharePoint: Error in checkConfigured:', error);
      setConfigured(false);
      setNeedsO365(false);
      setSpConfig(null);
      setCompanyId(null);
      return { configured: false };
    }
  }, []);

  // Delete handler
  const handleDelete = async () => {
    if (!deleteItem) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Please log in to delete items');
        return;
      }

      const { error } = await supabase.functions.invoke('sharepoint-delete-item', {
        body: {
          item_id: deleteItem.item.id,
          item_type: deleteItem.type,
          parent_path: currentPath,
        },
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (error) {
        toast.error('Failed to delete item');
        throw error;
      }

      toast.success(`${deleteItem.type === 'folder' ? 'Folder' : 'File'} deleted successfully`);
      await loadItems(currentPath, { forceRefresh: true });
    } catch (error) {
      console.error('Delete error:', error);
      throw error;
    }
  };

  // Rename handler
  const handleRename = async (newName: string) => {
    if (!renameItem) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Please log in to rename items');
        return;
      }

      const { error } = await supabase.functions.invoke('sharepoint-rename-item', {
        body: {
          item_id: renameItem.item.id,
          new_name: newName,
          parent_path: currentPath,
        },
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (error) {
        toast.error('Failed to rename item');
        throw error;
      }

      toast.success('Item renamed successfully');
      await loadItems(currentPath, { forceRefresh: true });
    } catch (error) {
      console.error('Rename error:', error);
      throw error;
    }
  };

  // Move/Copy handler
  const handleMoveCopy = async (destinationPath: string) => {
    if (!moveCopyItem) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Please log in');
        return;
      }

      const { error } = await supabase.functions.invoke('sharepoint-move-copy-item', {
        body: {
          item_id: moveCopyItem.item.id,
          destination_path: destinationPath,
          operation: moveCopyItem.operation,
        },
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (error) {
        toast.error(`Failed to ${moveCopyItem.operation} item`);
        throw error;
      }

      toast.success(`Item ${moveCopyItem.operation === 'move' ? 'moved' : 'copied'} successfully`);
      await loadItems(currentPath, { forceRefresh: true });
    } catch (error) {
      console.error('Move/copy error:', error);
      throw error;
    }
  };

  // Create folder handler
  const handleCreateFolder = async (folderName: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Please log in to create folders');
        return;
      }

      const { error } = await supabase.functions.invoke('sharepoint-create-folder', {
        body: {
          folder_name: folderName,
          folder_path: currentPath,
        },
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (error) {
        toast.error('Failed to create folder');
        throw error;
      }

      toast.success('Folder created successfully');
      await loadItems(currentPath, { forceRefresh: true });
    } catch (error) {
      console.error('Create folder error:', error);
      throw error;
    }
  };

  // Drag and drop handlers
  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.types.includes('Files')) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.currentTarget === dropZoneRef.current) {
      setIsDragging(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const droppedFiles = e.dataTransfer.files;
    if (droppedFiles.length === 0) return;

    await uploadFiles(Array.from(droppedFiles));
  };

  const uploadFiles = async (filesToUpload: File[]) => {
    if (filesToUpload.length === 0) return;

    setUploading(true);
    setShowUploadDialog(true);

    const initialProgress = filesToUpload.map(file => ({
      name: file.name,
      progress: 0,
      status: 'uploading' as const,
    }));
    setUploadProgress(initialProgress);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Please log in to upload files');
        setShowUploadDialog(false);
        return;
      }

      const results: boolean[] = [];

      for (let i = 0; i < filesToUpload.length; i++) {
        const file = filesToUpload[i];

        try {
          const formData = new FormData();
          formData.append('file', file);
          formData.append('folder_path', currentPath);

          const { data: { session: currentSession } } = await supabase.auth.getSession();
          if (!currentSession) throw new Error('Session expired');

          const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
          const supabaseAnonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
          const functionUrl = `${supabaseUrl}/functions/v1/sharepoint-upload-file`;

          await new Promise<void>((resolve, reject) => {
            const xhr = new XMLHttpRequest();

            xhr.upload.addEventListener('progress', (e) => {
              if (e.lengthComputable) {
                const percentComplete = Math.round((e.loaded / e.total) * 100);
                setUploadProgress(prev => prev.map((item, idx) =>
                  idx === i ? { ...item, progress: percentComplete } : item
                ));
              }
            });

            xhr.addEventListener('load', () => {
              if (xhr.status >= 200 && xhr.status < 300) {
                setUploadProgress(prev => prev.map((item, idx) =>
                  idx === i ? { ...item, progress: 100, status: 'success' } : item
                ));
                resolve();
              } else {
                let errorMsg = 'Upload failed';
                try {
                  const response = JSON.parse(xhr.responseText);
                  errorMsg = response.error || errorMsg;
                } catch {}

                setUploadProgress(prev => prev.map((item, idx) =>
                  idx === i ? { ...item, status: 'error', error: errorMsg } : item
                ));
                reject(new Error(errorMsg));
              }
            });

            xhr.addEventListener('error', () => {
              setUploadProgress(prev => prev.map((item, idx) =>
                idx === i ? { ...item, status: 'error', error: 'Network error' } : item
              ));
              reject(new Error('Network error'));
            });

            xhr.open('POST', functionUrl);
            xhr.setRequestHeader('Authorization', `Bearer ${currentSession.access_token}`);
            xhr.setRequestHeader('apikey', supabaseAnonKey);
            xhr.send(formData);
          });

          results.push(true);
        } catch (error: any) {
          console.error(`Upload error for ${file.name}:`, error);
          setUploadProgress(prev => prev.map((item, idx) =>
            idx === i ? { ...item, status: 'error', error: error.message || 'Upload failed' } : item
          ));
          results.push(false);
        }
      }

      const allSuccess = results.every(r => r);
      if (allSuccess) {
        toast.success('All files uploaded successfully');
      } else {
        toast.warning('Some files failed to upload');
      }

      setTimeout(() => {
        setShowUploadDialog(false);
        setUploadProgress([]);
      }, 2000);

      await loadItems(currentPath, { forceRefresh: true });
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload files');
      setTimeout(() => {
        setShowUploadDialog(false);
        setUploadProgress([]);
      }, 2000);
    } finally {
      setUploading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    await uploadFiles(Array.from(files));
    e.target.value = '';
  };

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      const result = await checkConfigured();
      if (!result.configured) {
        setLoading(false);
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: connection } = await supabase
            .from('office365_connections')
            .select('company_id')
            .eq('user_id', user.id)
            .maybeSingle();

          if (connection?.company_id) {
            console.log('SharePoint: O365 connected but not configured, attempting auto-config');
            await autoConfigureSharePoint(connection.company_id, user.id);
          }
        }
      }
    };
    init();
  }, []);

  useEffect(() => {
    if (!configured) return;
    loadItems(currentPath);
  }, [configured, currentPath]);

  const loadItems = useCallback(async (path: string, options?: { forceRefresh?: boolean }) => {
    try {
      setLoading(true);
      setDisplayPage(1);

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

      if (!options?.forceRefresh && cache.ready) {
        const cached = await cache.getCachedItems(path);
        if (cached) {
          setFolders(cached.folders);
          setFiles(cached.files);
          setFromCache(true);
          setCachedAt(cached.cachedAt);
          setLoading(false);
          loadItemsFromServer(path, session.access_token, false);
          return;
        }
      }

      await loadItemsFromServer(path, session.access_token, true, options?.forceRefresh);
    } catch (error: any) {
      console.error('Error loading SharePoint items:', error);
      toast.error('Failed to load SharePoint content. Please try syncing again.');
      setFolders([]);
      setFiles([]);
      setFromCache(false);
      setCachedAt(null);
      setLoading(false);
    }
  }, [cache]);

  const loadItemsFromServer = async (
    path: string,
    accessToken: string,
    updateUI: boolean,
    forceRefresh?: boolean
  ) => {
    try {
      const { data, error } = await supabase.functions.invoke('sharepoint-browse-folders-cached', {
        body: {
          folder_path: path,
          force_refresh: forceRefresh ?? false,
        },
        headers: { Authorization: `Bearer ${accessToken}` },
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
        } else if (status === 404) {
          setConfigured(false);
          toast.error('SharePoint folder not found.');
        } else {
          console.error('Error loading SharePoint items:', error);
          toast.error('Failed to load SharePoint content.');
        }

        if (updateUI) {
          setFolders([]);
          setFiles([]);
          setFromCache(false);
          setCachedAt(null);
          setLoading(false);
        }
        return;
      }

      const response = data as {
        configured: boolean;
        needsO365?: boolean;
        folders?: SharePointFolder[];
        files?: SharePointFile[];
        fromCache?: boolean;
        cachedAt?: string | null;
        warning?: string;
        siteUrl?: string;
      };

      if (response.siteUrl) {
        setSharePointSiteUrl(response.siteUrl);
      }

      if (updateUI) {
        setConfigured(response.configured);
        if (!response.configured) {
          setCompanyId(null);
          setSpConfig(null);
        }
        setNeedsO365(response.needsO365 ?? false);

        if (response.warning) {
          if (response.warning === 'Folder not found') {
            toast.warning('This folder no longer exists or has been moved.');
          } else if (response.warning === 'Access denied') {
            toast.warning('You do not have permission to access this folder.');
          }

          if (updateUI && pathHistory.length > 0) {
            setTimeout(() => {
              const previousPath = pathHistory[pathHistory.length - 1];
              setPathHistory(pathHistory.slice(0, -1));
              setCurrentPath(previousPath);
            }, 1000);
          }
        }

        setFolders(response.folders ?? []);
        setLoading(false);

        setLoadingFiles(true);
        setTimeout(() => {
          setFiles(response.files ?? []);
          setLoadingFiles(false);
        }, 50);

        setFromCache(response.fromCache ?? false);
        setCachedAt(response.cachedAt ?? null);

        if (cache.ready && !response.warning) {
          cache.setCachedItems(path, response.folders ?? [], response.files ?? []);
        }
      }

      if (response.folders && response.folders.length > 0 && !forceRefresh) {
        response.folders.forEach(folder => {
          const subPath = path === '/' ? `/${folder.name}` : `${path}/${folder.name}`;
          supabase.functions.invoke('sharepoint-browse-folders-cached', {
            body: { folder_path: subPath, force_refresh: false },
            headers: { Authorization: `Bearer ${accessToken}` },
          }).then(async ({ data: prefetchData, error: prefetchError }) => {
            if (!prefetchError && cache.ready && prefetchData?.folders && prefetchData?.files) {
              await cache.setCachedItems(subPath, prefetchData.folders, prefetchData.files);
            }
          }).catch(() => {});
        });
      }
    } catch (error) {
      console.error('Error in loadItemsFromServer:', error);
      if (updateUI) {
        setLoading(false);
      }
    }
  };

  const navigateToFolder = (folderName: string, folderPath?: string) => {
    if (loading) return;

    if (folderPath) {
      setCurrentPath(folderPath);
      setSearchQuery('');
      setSearchResults(null);
      setPathHistory([]);
      loadItems(folderPath).then(() => {
        const newPath = folderPath === '/' ? `/${folderName}` : `${folderPath}/${folderName}`;
        setPathHistory([folderPath]);
        setCurrentPath(newPath);
      }).catch((err) => {
        console.error('Navigation error:', err);
        toast.error('Failed to navigate to folder.');
      });
    } else {
      const newPath = currentPath === '/' ? `/${folderName}` : `${currentPath}/${folderName}`;
      setPathHistory([...pathHistory, currentPath]);
      setCurrentPath(newPath);
    }
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
    setSearchQuery('');
    setSearchResults(null);
  };

  const performGlobalSearch = async (query: string) => {
    if (!query.trim()) {
      setSearchResults(null);
      return;
    }

    if (cache.ready) {
      const cached = await cache.getCachedSearch(query);
      if (cached) {
        setSearchResults(cached);
        setIsSearching(false);
        return;
      }
    }

    setIsSearching(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Please log in to search');
        return;
      }

      const { data, error } = await supabase.functions.invoke('sharepoint-search', {
        body: { search_query: query },
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (error) {
        toast.error('Search failed. Please try again.');
        return;
      }

      const results = data as any;
      setSearchResults(results);

      if (cache.ready) {
        cache.setCachedSearch(query, results.folders || [], results.files || []);
      }
    } catch (error) {
      console.error('Search error:', error);
      toast.error('Search failed. Please try again.');
    } finally {
      setIsSearching(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery.trim()) {
        performGlobalSearch(searchQuery);
      } else {
        setSearchResults(null);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const displayFolders = searchResults?.folders || folders;
  const displayFiles = searchResults?.files || files;

  const totalItems = displayFolders.length + displayFiles.length;
  const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);
  const startIndex = (displayPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;

  const paginatedFolders = displayFolders.slice(
    Math.max(0, startIndex),
    Math.min(displayFolders.length, endIndex)
  );
  const remainingSlots = endIndex - startIndex - paginatedFolders.length;
  const paginatedFiles = displayFiles.slice(
    Math.max(0, startIndex - displayFolders.length),
    Math.max(0, startIndex - displayFolders.length) + remainingSlots
  );

  const getBreadcrumbs = () => {
    if (currentPath === '/') return [];
    const parts = currentPath.split('/').filter(Boolean);
    return parts;
  };

  if (loading && folders.length === 0 && files.length === 0) {
    return (
      <div className="space-y-4">
        <SharePointSkeleton rows={10} />
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
              To access SharePoint documents, you need to connect your Office 365 account.
            </p>
          </div>
          <ConnectOffice365Button />
        </CardContent>
      </Card>
    );
  }

  const breadcrumbs = getBreadcrumbs();
  const useVirtualScrolling = totalItems > LARGE_LIST_THRESHOLD;

  return (
    <div
      ref={dropZoneRef}
      className={`space-y-6 relative ${isDragging ? 'ring-2 ring-primary ring-offset-2 rounded-lg' : ''}`}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {/* Drag overlay */}
      {isDragging && (
        <div className="absolute inset-0 bg-primary/10 z-50 flex items-center justify-center rounded-lg pointer-events-none">
          <div className="bg-background border-2 border-dashed border-primary rounded-lg p-8 text-center">
            <Upload className="h-12 w-12 mx-auto mb-2 text-primary" />
            <p className="text-lg font-medium">Drop files here to upload</p>
            <p className="text-sm text-muted-foreground">Files will be uploaded to: {currentPath}</p>
          </div>
        </div>
      )}

      {/* Navigation */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Button variant="ghost" size="sm" onClick={navigateToRoot}>
                  <Home className="h-4 w-4" />
                </Button>
              </BreadcrumbLink>
            </BreadcrumbItem>
            {breadcrumbs.map((part, index) => {
              const isLast = index === breadcrumbs.length - 1;
              const pathToSegment = '/' + breadcrumbs.slice(0, index + 1).join('/');

              return (
                <Fragment key={`bc-${index}`}>
                  <BreadcrumbSeparator>
                    <ChevronRight className="h-4 w-4" />
                  </BreadcrumbSeparator>
                  <BreadcrumbItem>
                    {isLast ? (
                      <BreadcrumbLink className="font-medium">{part}</BreadcrumbLink>
                    ) : (
                      <BreadcrumbLink asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-auto p-0 hover:underline"
                          onClick={() => {
                            setCurrentPath(pathToSegment);
                            loadItems(pathToSegment, { forceRefresh: true });
                          }}
                        >
                          {part}
                        </Button>
                      </BreadcrumbLink>
                    )}
                  </BreadcrumbItem>
                </Fragment>
              );
            })}
          </BreadcrumbList>
        </Breadcrumb>

        <div className="flex gap-2 flex-wrap">
          {pathHistory.length > 0 && (
            <Button variant="outline" size="sm" onClick={navigateBack}>
              Back
            </Button>
          )}
          {sharePointSiteUrl && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open(sharePointSiteUrl, '_blank')}
              title="Open SharePoint site"
              className="gap-2"
            >
              <ExternalLink className="h-4 w-4" />
              <span className="hidden sm:inline">Open SharePoint</span>
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowCreateFolder(true)}
            title="Create new folder"
          >
            <FolderPlus className="h-4 w-4" />
            <span className="hidden sm:inline ml-2">New Folder</span>
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
                {uploading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Upload className="h-4 w-4 mr-2" />}
                Upload
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

      {/* Search Input */}
      <div className="space-y-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search all SharePoint files and folders..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
            disabled={isSearching}
          />
          {isSearching && (
            <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
          )}
        </div>
        {searchResults && (
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>
              Found {searchResults.folders.length + searchResults.files.length} results
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSearchQuery('');
                setSearchResults(null);
              }}
            >
              Clear search
            </Button>
          </div>
        )}
      </div>

      {/* Table View */}
      {(displayFolders.length > 0 || displayFiles.length > 0) && (
        <Card>
          <CardContent className="p-0">
            {useVirtualScrolling && !searchResults ? (
              <VirtualizedTable
                folders={displayFolders}
                files={displayFiles}
                onFolderNavigate={navigateToFolder}
                isSearchResult={!!searchResults}
                currentPath={currentPath}
                loading={loading || isSearching}
              />
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12"></TableHead>
                      <TableHead>Name</TableHead>
                      {searchResults && <TableHead className="hidden lg:table-cell">Location</TableHead>}
                      <TableHead className="hidden md:table-cell">Modified</TableHead>
                      <TableHead className="hidden lg:table-cell">Modified By</TableHead>
                      <TableHead className="hidden sm:table-cell">Size</TableHead>
                      <TableHead className="w-32">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedFolders.map((folder) => (
                      <FolderRow
                        key={folder.id}
                        folder={folder}
                        onNavigate={navigateToFolder}
                        isSearchResult={!!searchResults}
                        currentPath={currentPath}
                        loading={loading || isSearching}
                        operations={fileOperations}
                      />
                    ))}

                    {paginatedFiles.map((file) => (
                      <FileRow
                        key={file.id}
                        file={file}
                        isSearchResult={!!searchResults}
                        currentPath={currentPath}
                        operations={fileOperations}
                      />
                    ))}

                    {loadingFiles && paginatedFiles.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={searchResults ? 7 : 6} className="text-center py-8">
                          <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                          <p className="text-sm text-muted-foreground mt-2">Loading files...</p>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between px-4 py-3 border-t">
                    <div className="text-sm text-muted-foreground">
                      Showing {startIndex + 1} to {Math.min(endIndex, totalItems)} of {totalItems} items
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setDisplayPage(p => Math.max(1, p - 1))}
                        disabled={displayPage === 1}
                      >
                        Previous
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setDisplayPage(p => Math.min(totalPages, p + 1))}
                        disabled={displayPage === totalPages}
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {displayFolders.length === 0 && displayFiles.length === 0 && !loading && !isSearching && !loadingFiles && (
        <Card>
          <CardContent className="py-12 text-center">
            <AlertCircle className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">
              {searchQuery ? 'No results found' : 'This folder is empty'}
            </h3>
            <p className="text-muted-foreground mb-4">
              {searchQuery
                ? `No files or folders match "${searchQuery}"`
                : 'There are no files or folders in this location. Drag and drop files here or use the Upload button.'}
            </p>
            {!searchQuery && (
              <div className="flex gap-3 justify-center">
                <Button onClick={() => setShowCreateFolder(true)}>
                  <FolderPlus className="h-4 w-4 mr-2" />
                  Create Folder
                </Button>
                <Button variant="outline" onClick={() => document.getElementById('sharepoint-upload')?.click()}>
                  <Upload className="h-4 w-4 mr-2" />
                  Upload Files
                </Button>
              </div>
            )}
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

      {/* FAB for upload */}
      {!searchResults && (displayFolders.length > 0 || displayFiles.length > 0) && (
        <div className="fixed bottom-6 right-6 z-40">
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
            <Upload className="h-6 w-6" />
          </Button>
        </div>
      )}

      {/* Dialogs */}
      <FileUploadProgress
        open={showUploadDialog}
        files={uploadProgress}
      />

      <FilePreviewModal
        open={!!previewFile}
        onOpenChange={(open) => !open && setPreviewFile(null)}
        file={previewFile}
      />

      <DeleteDialog
        open={!!deleteItem}
        onOpenChange={(open) => !open && setDeleteItem(null)}
        item={deleteItem?.item || null}
        itemType={deleteItem?.type || 'file'}
        onConfirm={handleDelete}
      />

      <RenameDialog
        open={!!renameItem}
        onOpenChange={(open) => !open && setRenameItem(null)}
        item={renameItem?.item || null}
        itemType={renameItem?.type || 'file'}
        onConfirm={handleRename}
      />

      <MoveCopyDialog
        open={!!moveCopyItem}
        onOpenChange={(open) => !open && setMoveCopyItem(null)}
        item={moveCopyItem?.item || null}
        itemType={moveCopyItem?.type || 'file'}
        operation={moveCopyItem?.operation || 'move'}
        onConfirm={handleMoveCopy}
      />

      <CreateFolderDialog
        open={showCreateFolder}
        onOpenChange={setShowCreateFolder}
        currentPath={currentPath}
        onConfirm={handleCreateFolder}
      />
    </div>
  );
}
