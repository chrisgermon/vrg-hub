import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { FileText, Download, ExternalLink, Loader2, AlertCircle, Folder, ChevronRight, Home } from "lucide-react";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { formatAUDateTimeFull } from "@/lib/dateUtils";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { ConnectOffice365Button } from "./ConnectOffice365Button";

interface SharePointFolder {
  id: string;
  name: string;
  webUrl: string;
  childCount: number;
  lastModifiedDateTime: string;
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
}

export function SharePointBrowser() {
  const [folders, setFolders] = useState<SharePointFolder[]>([]);
  const [files, setFiles] = useState<SharePointFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [configured, setConfigured] = useState(false);
  const [currentPath, setCurrentPath] = useState("/");
  const [pathHistory, setPathHistory] = useState<string[]>([]);

  useEffect(() => {
    loadItems(currentPath);
  }, [currentPath]);

  const loadItems = async (path: string) => {
    try {
      setLoading(true);
      
      // Get current session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session) {
        toast.error('Please log in again to access SharePoint documents');
        setConfigured(false);
        return;
      }
      
      console.log('Invoking sharepoint-browse-folders with session:', !!session);
      
      const { data, error } = await supabase.functions.invoke('sharepoint-browse-folders', {
        body: { folder_path: path },
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (error) {
        console.error('SharePoint function error:', error);
        // Surface clearer auth error if present
        if ((error as any)?.status === 401) {
          toast.error('Your session expired. Please sign in again.');
          setConfigured(false);
          return;
        }
        throw error;
      }

      setFolders(data.folders || []);
      setFiles(data.files || []);
      setConfigured(!!data.configured);
    } catch (error: any) {
      console.error('Error loading SharePoint items:', error);
      toast.error(error?.message || 'Failed to load SharePoint content. Please refresh the page.');
      setConfigured(false);
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

  const getFileIcon = (fileType: string) => {
    return <FileText className="h-8 w-8 text-primary" />;
  };

  const getBreadcrumbs = () => {
    if (currentPath === '/') return [];
    const parts = currentPath.split('/').filter(Boolean);
    return parts;
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
        <CardHeader>
          <CardTitle>Connect to SharePoint</CardTitle>
          <CardDescription>
            Connect your Office 365 account to access SharePoint documents with your personal permissions
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              You'll see only the files and folders you have permission to access in SharePoint
            </AlertDescription>
          </Alert>
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
          <Button variant="outline" size="sm" onClick={() => loadItems(currentPath)}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Refresh'}
          </Button>
        </div>
      </div>

      {/* Folders Section */}
      {folders.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-3">Folders</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {folders.map((folder) => (
              <Card 
                key={folder.id} 
                className="hover:shadow-lg transition-shadow cursor-pointer"
                onClick={() => navigateToFolder(folder.name)}
              >
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <Folder className="h-8 w-8 text-primary" />
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-base truncate">{folder.name}</CardTitle>
                      <CardDescription>
                        {folder.childCount} {folder.childCount === 1 ? 'item' : 'items'}
                      </CardDescription>
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                  </div>
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Files Section */}
      {files.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-3">Files</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {files.map((doc) => (
              <Card key={doc.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    {getFileIcon(doc.fileType)}
                    <span className="text-xs font-mono bg-muted px-2 py-1 rounded">
                      {doc.fileType}
                    </span>
                  </div>
                  <CardTitle className="text-lg mt-2 break-words">
                    {doc.name}
                  </CardTitle>
                  <CardDescription>
                    {formatFileSize(doc.size)}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="text-sm space-y-1">
                    <p className="text-muted-foreground">
                      Last modified: {formatAUDateTimeFull(doc.lastModifiedDateTime)}
                    </p>
                    {doc.lastModifiedBy && (
                      <p className="text-muted-foreground">
                        By: {doc.lastModifiedBy}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="default"
                      size="sm"
                      className="flex-1"
                      onClick={() => window.open(doc.webUrl, '_blank')}
                    >
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Open
                    </Button>
                    {doc.downloadUrl && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(doc.downloadUrl, '_blank')}
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {folders.length === 0 && files.length === 0 && !loading && (
        <Card>
          <CardContent className="py-12 text-center">
            <Folder className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">This folder is empty</h3>
            <p className="text-muted-foreground">
              There are no files or folders in this location.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
