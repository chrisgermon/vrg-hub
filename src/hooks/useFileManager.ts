import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Folder {
  id: string;
  name: string;
  parent_id: string | null;
  created_at: string;
  created_by: string;
}

interface FileDocument {
  id: string;
  name: string;
  storage_path: string;
  folder_id: string | null;
  size: number;
  mime_type: string;
  created_at: string;
  uploaded_by: string;
  tags: string[];
}

interface Breadcrumb {
  id: string | null;
  name: string;
}

export function useFileManager() {
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [files, setFiles] = useState<FileDocument[]>([]);
  const [breadcrumbs, setBreadcrumbs] = useState<Breadcrumb[]>([{ id: null, name: 'Home' }]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchContents = async (folderId: string | null) => {
    try {
      setLoading(true);

      // Fetch folders
      const { data: foldersData, error: foldersError } = await supabase
        .from('file_folders')
        .select('*')
        .eq('parent_id', folderId)
        .eq('is_active', true)
        .order('name');

      if (foldersError) throw foldersError;

      // Fetch files
      const { data: filesData, error: filesError } = await supabase
        .from('file_documents')
        .select('*')
        .eq('folder_id', folderId)
        .eq('is_active', true)
        .order('name');

      if (filesError) throw filesError;

      setFolders(foldersData || []);
      setFiles(filesData || []);
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error loading files',
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const buildBreadcrumbs = async (folderId: string | null) => {
    if (!folderId) {
      setBreadcrumbs([{ id: null, name: 'Home' }]);
      return;
    }

    try {
      const crumbs: Breadcrumb[] = [{ id: null, name: 'Home' }];
      let currentId: string | null = folderId;

      while (currentId) {
        const { data, error } = await supabase
          .from('file_folders')
          .select('id, name, parent_id')
          .eq('id', currentId)
          .single();

        if (error) throw error;

        crumbs.push({ id: data.id, name: data.name });
        currentId = data.parent_id;
      }

      setBreadcrumbs(crumbs.reverse());
    } catch (error: any) {
      console.error('Error building breadcrumbs:', error);
    }
  };

  const navigateToFolder = async (folderId: string | null) => {
    setCurrentFolderId(folderId);
    await Promise.all([fetchContents(folderId), buildBreadcrumbs(folderId)]);
  };

  const refreshFiles = () => {
    fetchContents(currentFolderId);
  };

  useEffect(() => {
    navigateToFolder(null);
  }, []);

  return {
    currentFolderId,
    folders,
    files,
    breadcrumbs,
    loading,
    navigateToFolder,
    refreshFiles,
  };
}
