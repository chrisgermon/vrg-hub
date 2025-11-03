import { useState, useEffect, Fragment, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, AlertCircle, Home, ChevronRight, Search, Folder, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { ConnectOffice365Button } from "./ConnectOffice365Button";
import { useSharePointCache } from "./useSharePointCache";
import { SharePointSkeleton } from "./SharePointSkeleton";
import { VirtualizedTable } from "./VirtualizedTable";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FolderRow, FileRow } from "./SharePointTableRow";
import { FileUploadProgress } from "./FileUploadProgress";
import { CreateFolderDialog } from "./CreateFolderDialog";

interface SharePointFolder {
  id: string;
  name: string;
  webUrl: string;
  childCount: number;
  lastModifiedDateTime: string;
  permissions?: Permission[];
  path?: string;
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
  path?: string;
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

const ITEMS_PER_PAGE = 50;
const LARGE_LIST_THRESHOLD = 100; // Use virtual scrolling if more than 100 items

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
  const [syncing, setSyncing] = useState(false);
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
  const [showCreateFolderDialog, setShowCreateFolderDialog] = useState(false);
  const [sharePointSiteUrl, setSharePointSiteUrl] = useState<string | null>(null);

  const cache = useSharePointCache();

  const autoConfigureSharePoint = async (companyId: string, userId: string) => {
    try {
      console.log('SharePoint: Auto-configuring for company', companyId);
      
      // Fetch sites to find vrgdocuments
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

      // Clear old cache
      await supabase
        .from('sharepoint_cache')
        .delete()
        .eq('company_id', companyId);

      // Save configuration
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
      
      // Re-check configuration
      await checkConfigured();
    } catch (error) {
      console.error('SharePoint: Auto-configuration error:', error);
    }
  };

  const checkConfigured = useCallback(async (): Promise<{ configured: boolean; companyId?: string }> => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        console.log('SharePoint: No session found');
        setConfigured(false);
        setNeedsO365(false);
        setSpConfig(null);
        setCompanyId(null);
        return { configured: false };
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.log('SharePoint: No user found');
        setConfigured(false);
        setNeedsO365(false);
        setSpConfig(null);
        setCompanyId(null);
        return { configured: false };
      }

      console.log('SharePoint: Checking O365 connection for user', user.id);
      const { data: connection, error: connectionError } = await supabase
        .from('office365_connections')
        .select('company_id')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false })
        .maybeSingle();

      console.log('SharePoint: O365 connection result:', { connection, connectionError });

      let resolvedCompanyId: string | undefined = connection?.company_id;

      if (!resolvedCompanyId) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('brand_id')
          .eq('id', user.id)
          .maybeSingle();
        resolvedCompanyId = profile?.brand_id || user.id;
        console.log('SharePoint: Using fallback company_id:', resolvedCompanyId);
      }

      console.log('SharePoint: Checking configuration for company', resolvedCompanyId);
      const { data: spConfigData, error: spError } = await supabase
        .from('sharepoint_configurations')
        .select('*')
        .eq('company_id', resolvedCompanyId)
        .eq('is_active', true)
        .maybeSingle();

      console.log('SharePoint: Configuration result:', { spConfigData, spError });

      const isConfigured = !!spConfigData && !spError;
      console.log('SharePoint: Final configuration status:', isConfigured);
      
      setConfigured(isConfigured);
      setSpConfig(spConfigData);
      setCompanyId(resolvedCompanyId || null);
      if (isConfigured) {
        setNeedsO365(false);
        setSharePointSiteUrl(spConfigData?.site_url || null);
      }
      return { configured: isConfigured, companyId: resolvedCompanyId };
    } catch (error) {
      console.error('SharePoint: Error in checkConfigured:', error);
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
      
      const targetFolderPath = customFolderPath !== undefined ? customFolderPath : (currentPath || spConfig?.folder_path || '/');
      payload.folder_path = targetFolderPath;

      const { data, error } = await supabase.functions.invoke('sync-sharepoint-files', {
        body: payload,
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (error) {
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
        // Check if user has O365 connection but no SharePoint config
        // If so, try to auto-configure
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
    if (!configured) {
      return;
    }
    loadItems(currentPath);
  }, [configured, currentPath]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    setShowUploadDialog(true);
    
    // Initialize progress for all files
    const initialProgress = Array.from(files).map(file => ({
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

      // Upload files sequentially to track individual progress
      const results: boolean[] = [];
      
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        
        try {
          // Create FormData
          const formData = new FormData();
          formData.append('file', file);
          formData.append('folder_path', currentPath);

          // Get the edge function URL
          const { data: { session: currentSession } } = await supabase.auth.getSession();
          if (!currentSession) throw new Error('Session expired');

          const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
          const supabaseAnonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
          const functionUrl = `${supabaseUrl}/functions/v1/sharepoint-upload-file`;

          // Use XMLHttpRequest for progress tracking
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
          
          // Update progress with error
          setUploadProgress(prev => prev.map((item, idx) => 
            idx === i ? { 
              ...item, 
              status: 'error', 
              error: error.message || 'Upload failed' 
            } : item
          ));
          
          results.push(false);
        }
      }

      // Check if all uploads succeeded
      const allSuccess = results.every(r => r);
      if (allSuccess) {
        toast.success('All files uploaded successfully');
      } else {
        toast.warning('Some files failed to upload');
      }

      // Close dialog after 2 seconds
      setTimeout(() => {
        setShowUploadDialog(false);
        setUploadProgress([]);
      }, 2000);

      // Sync files after upload
      await syncSharePointFiles();
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload files');
      setTimeout(() => {
        setShowUploadDialog(false);
        setUploadProgress([]);
      }, 2000);
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleCreateFolder = async (folderName: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Please log in to create folders');
        return;
      }

      const { data, error } = await supabase.functions.invoke('sharepoint-create-folder', {
        body: { 
          folder_name: folderName,
          folder_path: currentPath 
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

        const errorMsg = typeof errorBody === 'object' && errorBody !== null 
          ? errorBody.error 
          : 'Failed to create folder';

        if (status === 409) {
          toast.error('A folder with this name already exists');
        } else if (status === 401) {
          setNeedsO365(true);
          toast.error('Your Microsoft 365 session expired. Please reconnect.');
        } else if (status === 403) {
          toast.error('Permission denied. You cannot create folders here.');
        } else {
          console.error('Create folder error:', error);
          toast.error(errorMsg);
        }
        // Prevent error boundary from triggering
        return;
      }

      toast.success(`Folder "${folderName}" created successfully`);
      
      // Refresh the current folder to show the new folder
      await loadItems(currentPath, { forceRefresh: true });
    } catch (error) {
      console.error('Create folder error:', error);
      throw error;
    }
  };

  const loadItems = useCallback(async (path: string, options?: { forceRefresh?: boolean }) => {
    try {
      // Show skeleton while loading folders
      setLoading(true);
      setDisplayPage(1); // Reset pagination

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

      // Try IndexedDB cache first for instant loading
      if (!options?.forceRefresh && cache.ready) {
        const cached = await cache.getCachedItems(path);
        if (cached) {
          setFolders(cached.folders);
          setFiles(cached.files);
          setFromCache(true);
          setCachedAt(cached.cachedAt);
          setLoading(false);
          // Still fetch fresh data in background
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
      // Incremental loading: fetch folders first
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
          toast.error('SharePoint folder not found. Please check the site and folder path configuration in Integrations.');
        } else {
          console.error('Error loading SharePoint items:', error);
          toast.error('Failed to load SharePoint content. Please try syncing again.');
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
      
      // Store SharePoint site URL if available
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
        
        // Show warning if folder not found or access denied
        if (response.warning) {
          if (response.warning === 'Folder not found') {
            toast.warning('This folder no longer exists or has been moved.');
          } else if (response.warning === 'Access denied') {
            toast.warning('You do not have permission to access this folder.');
          }
          
          // Navigate back if possible and this was a direct navigation (not prefetch)
          if (updateUI && pathHistory.length > 0) {
            setTimeout(() => {
              const previousPath = pathHistory[pathHistory.length - 1];
              setPathHistory(pathHistory.slice(0, -1));
              setCurrentPath(previousPath);
            }, 1000); // Give user time to see the toast
          }
        }
        
        // Show folders immediately (incremental loading)
        setFolders(response.folders ?? []);
        setLoading(false);
        
        // Load files after a brief delay to prioritize folder rendering
        setLoadingFiles(true);
        setTimeout(() => {
          setFiles(response.files ?? []);
          setLoadingFiles(false);
        }, 50);
        
        setFromCache(response.fromCache ?? false);
        setCachedAt(response.cachedAt ?? null);

        // Cache in IndexedDB for instant future loads (only if not a warning)
        if (cache.ready && !response.warning) {
          cache.setCachedItems(path, response.folders ?? [], response.files ?? []);
        }
      }

      // Aggressive prefetching: prefetch ALL subfolders in background
      if (response.folders && response.folders.length > 0 && !forceRefresh) {
        response.folders.forEach(folder => {
          const subPath = path === '/' ? `/${folder.name}` : `${path}/${folder.name}`;
          // Fire and forget - completely silent, no errors logged
          supabase.functions.invoke('sharepoint-browse-folders-cached', {
            body: { folder_path: subPath, force_refresh: false },
            headers: { Authorization: `Bearer ${accessToken}` },
          }).then(async ({ data: prefetchData, error: prefetchError }) => {
            // Only cache if successful
            if (!prefetchError && cache.ready && prefetchData?.folders && prefetchData?.files) {
              await cache.setCachedItems(subPath, prefetchData.folders, prefetchData.files);
            }
            // Silently ignore all errors (404s, permission denied, etc.)
          }).catch(() => {}); // Completely silent
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
      // From search result - navigate to parent first
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
        toast.error('Failed to navigate to folder. It may have been moved or deleted.');
      });
    } else {
      // Normal navigation
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

    // Check IndexedDB cache first
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
        let status: number | undefined = (error as any)?.status;
        let errorBody: any = null;
        try {
          const res = (error as any)?.context?.response as Response | undefined;
          if (res) {
            status = res.status || status;
            errorBody = await res.clone().json().catch(async () => await res.text());
          }
        } catch {}

        const lower = (typeof errorBody === 'string' ? errorBody : JSON.stringify(errorBody || '')).toLowerCase();
        const needs = typeof errorBody === 'object' && errorBody !== null ? (errorBody.needsO365 === true) : lower.includes('needso365');

        if (status === 404 || lower.includes('not configured')) {
          setConfigured(false);
          setSearchResults(null);
          toast.error('SharePoint not configured. Please set it up in Integrations.');
        } else if (status === 401 || needs) {
          setNeedsO365(true);
          setSearchResults(null);
          toast.error('Connect your Office 365 account to continue.');
        } else if (status === 403 || lower.includes('insufficient')) {
          toast.error('You do not have permission to perform search. Ask an admin to enable it.');
        } else {
          console.error('Search error:', error);
          toast.error('Search failed. Please try again.');
        }
        return;
      }

      const results = data as any;
      setSearchResults(results);

      // Cache search results
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

  // Debounce search
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

  // Use search results if available, otherwise show current folder contents
  const displayFolders = searchResults?.folders || folders;
  const displayFiles = searchResults?.files || files;

  // Pagination
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
              To access SharePoint documents, you need to connect your Office 365 account. This ensures you only see documents you have permission to access.
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

        <div className="flex gap-2">
          {pathHistory.length > 0 && (
            <Button variant="outline" size="sm" onClick={navigateBack}>
              Back
            </Button>
          )}
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setShowCreateFolderDialog(true)}
            title="Create new folder"
          >
            New Folder
          </Button>
          {sharePointSiteUrl && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => window.open(sharePointSiteUrl, '_blank')}
              title="Open SharePoint site"
              className="gap-2"
            >
              <ExternalLink className="h-4 w-4" />
              Open SharePoint Site
            </Button>
          )}
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
                      />
                    ))}
                    
                    {paginatedFiles.map((file) => (
                      <FileRow
                        key={file.id}
                        file={file}
                        isSearchResult={!!searchResults}
                        currentPath={currentPath}
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
                : 'There are no files or folders in this location.'}
            </p>
            {!searchQuery && (
              <div className="flex gap-3 justify-center">
                <Button variant="outline" onClick={() => setShowCreateFolderDialog(true)}>
                  New Folder
                </Button>
                <Button onClick={() => document.getElementById('sharepoint-upload')?.click()}>
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

      {/* Upload button for non-empty folders */}
      {!searchResults && (displayFolders.length > 0 || displayFiles.length > 0) && (
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

      {/* Upload Progress Dialog */}
      <FileUploadProgress 
        open={showUploadDialog} 
        files={uploadProgress}
      />

      {/* Create Folder Dialog */}
      <CreateFolderDialog
        open={showCreateFolderDialog}
        onOpenChange={setShowCreateFolderDialog}
        onCreateFolder={handleCreateFolder}
      />
    </div>
  );
}
