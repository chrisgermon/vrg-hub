import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { FileDropzone } from "@/components/ui/file-dropzone";
import {
  Download,
  Trash2,
  File,
  FileText,
  Image as ImageIcon,
  FileCode,
  Archive,
  Loader2,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface DocumentFile {
  name: string;
  id: string;
  created_at: string;
  metadata: Record<string, any>;
}

export default function Documents() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [files, setFiles] = useState<DocumentFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [deleteFile, setDeleteFile] = useState<DocumentFile | null>(null);

  useEffect(() => {
    if (user) {
      loadFiles();
    }
  }, [user]);

  const loadFiles = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const { data, error } = await supabase.storage
        .from("documents")
        .list(`${user.id}/`, {
          sortBy: { column: "created_at", order: "desc" },
        });

      if (error) throw error;

      setFiles(data || []);
    } catch (error: any) {
      console.error("Error loading files:", error);
      toast({
        title: "Error",
        description: "Failed to load documents",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (files: File[]) => {
    if (!user || files.length === 0) return;

    // Validate file sizes (20MB limit)
    const invalidFiles = files.filter(file => file.size > 20 * 1024 * 1024);
    if (invalidFiles.length > 0) {
      toast({
        title: "Files too large",
        description: `${invalidFiles.length} file(s) exceed the 20MB limit`,
        variant: "destructive",
      });
      return;
    }

    try {
      setUploading(true);
      let successCount = 0;
      let errorCount = 0;

      for (const file of files) {
        try {
          const filePath = `${user.id}/${file.name}`;
          const { error: uploadError } = await supabase.storage
            .from("documents")
            .upload(filePath, file, {
              upsert: false,
            });

          if (uploadError) throw uploadError;
          successCount++;
        } catch (error: any) {
          console.error("Error uploading file:", file.name, error);
          errorCount++;
        }
      }

      if (successCount > 0) {
        toast({
          title: "Success",
          description: `${successCount} document(s) uploaded successfully`,
        });
        loadFiles();
      }

      if (errorCount > 0) {
        toast({
          title: "Warning",
          description: `${errorCount} document(s) failed to upload`,
          variant: "destructive",
        });
      }
    } finally {
      setUploading(false);
    }
  };

  const handleOpenFile = async (file: DocumentFile) => {
    if (!user) return;

    try {
      const { data, error } = await supabase.storage
        .from("documents")
        .createSignedUrl(`${user.id}/${file.name}`, 3600); // 1 hour expiry

      if (error) throw error;

      window.open(data.signedUrl, '_blank');
    } catch (error: any) {
      console.error("Error opening file:", error);
      toast({
        title: "Error",
        description: "Failed to open document",
        variant: "destructive",
      });
    }
  };

  const handleDownload = async (file: DocumentFile) => {
    if (!user) return;

    try {
      const { data, error } = await supabase.storage
        .from("documents")
        .download(`${user.id}/${file.name}`);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      const a = document.createElement("a");
      a.href = url;
      a.download = file.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: "Success",
        description: "Document downloaded",
      });
    } catch (error: any) {
      console.error("Error downloading file:", error);
      toast({
        title: "Error",
        description: "Failed to download document",
        variant: "destructive",
      });
    }
  };

  const confirmDelete = async () => {
    if (!deleteFile || !user) return;

    try {
      const { error } = await supabase.storage
        .from("documents")
        .remove([`${user.id}/${deleteFile.name}`]);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Document deleted",
      });

      loadFiles();
    } catch (error: any) {
      console.error("Error deleting file:", error);
      toast({
        title: "Error",
        description: "Failed to delete document",
        variant: "destructive",
      });
    } finally {
      setDeleteFile(null);
    }
  };

  const getFileIcon = (mimetype?: string) => {
    if (!mimetype) return <File className="h-8 w-8 text-muted-foreground" />;
    if (mimetype.startsWith("image/")) return <ImageIcon className="h-8 w-8 text-primary" />;
    if (mimetype.includes("pdf")) return <FileText className="h-8 w-8 text-red-500" />;
    if (mimetype.includes("zip") || mimetype.includes("rar"))
      return <Archive className="h-8 w-8 text-yellow-500" />;
    if (
      mimetype.includes("javascript") ||
      mimetype.includes("json") ||
      mimetype.includes("xml")
    )
      return <FileCode className="h-8 w-8 text-green-500" />;
    return <File className="h-8 w-8 text-muted-foreground" />;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + " " + sizes[i];
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      <div className="space-y-6">
        <div>
          <h1 className="text-4xl font-bold mb-1">My Documents</h1>
          <p className="text-lg text-muted-foreground mb-6">
            Upload and manage your personal documents
          </p>
          <div className={uploading ? "pointer-events-none opacity-50" : ""}>
            <FileDropzone
              onFilesSelected={handleFileUpload}
              multiple
              maxSize={20 * 1024 * 1024}
              label={uploading ? "Uploading..." : "Drag files here or click to upload"}
              description="Upload multiple documents at once (max 20MB each)"
            />
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : files.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <File className="h-16 w-16 text-muted-foreground mb-4" />
              <p className="text-lg font-medium">No documents yet</p>
              <p className="text-sm text-muted-foreground">
                Use the upload area above to get started
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {files.map((file) => (
              <Card key={file.id} className="hover:shadow-lg transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      {getFileIcon(file.metadata?.mimetype)}
                      <div className="flex-1 min-w-0">
                        <CardTitle 
                          className="text-base truncate cursor-pointer hover:text-primary transition-colors" 
                          title={file.name}
                          onClick={() => handleOpenFile(file)}
                        >
                          {file.name}
                        </CardTitle>
                        <CardDescription className="text-xs">
                          {formatFileSize(file.metadata?.size || 0)}
                        </CardDescription>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-xs text-muted-foreground">
                    {formatDate(file.created_at)}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDownload(file)}
                      className="flex-1"
                    >
                      <Download className="mr-1 h-3 w-3" />
                      Download
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => setDeleteFile(file)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <AlertDialog open={!!deleteFile} onOpenChange={() => setDeleteFile(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Document</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deleteFile?.name}"? This action cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
