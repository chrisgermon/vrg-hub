import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Search, Download, File, Folder, FileText, Image, Paperclip } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

interface FileRecord {
  id: string;
  file_name: string;
  file_path: string;
  file_size: number;
  content_type: string;
  created_at: string;
  company_name: string;
  company_id: string;
  brand?: string | null;
  source: "marketing" | "hardware" | "newsletter";
  uploader_name?: string;
}

const FileManager = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedCompanies, setExpandedCompanies] = useState<Set<string>>(new Set());

  const { data: files, isLoading } = useQuery({
    queryKey: ["all-files"],
    queryFn: async () => {
      const allFiles: FileRecord[] = [];

      // Fetch marketing request attachments
      const { data: marketingFiles, error: marketingError } = await supabase
        .from("marketing_request_attachments")
        .select(`
          id,
          file_name,
          file_path,
          file_size,
          content_type,
          created_at,
          request_id,
          uploaded_by
        `)
        .order("created_at", { ascending: false });

      if (!marketingError && marketingFiles) {
        // Fetch marketing requests to get company_id and brand
        const requestIds = marketingFiles.map(f => f.request_id);
        const { data: requests } = await supabase
          .from("marketing_requests")
          .select("id, company_id, brand")
          .in("id", requestIds);

        // Fetch companies
        const companyIds = requests?.map(r => r.company_id) || [];
        const { data: companies } = await supabase
          .from("companies")
          .select("id, name")
          .in("id", companyIds);

        // Fetch uploader names
        const uploaderIds = marketingFiles.map(f => f.uploaded_by);
        const { data: uploaders } = await supabase
          .from("profiles")
          .select("user_id, name")
          .in("user_id", uploaderIds);

        marketingFiles.forEach((file: any) => {
          const request = requests?.find(r => r.id === file.request_id);
          const company = companies?.find(c => c.id === request?.company_id);
          const uploader = uploaders?.find(u => u.user_id === file.uploaded_by);
          
          allFiles.push({
            id: file.id,
            file_name: file.file_name,
            file_path: file.file_path,
            file_size: file.file_size,
            content_type: file.content_type,
            created_at: file.created_at,
            company_name: company?.name || "Unknown",
            company_id: request?.company_id || "",
            brand: request?.brand,
            source: "marketing",
            uploader_name: uploader?.name,
          });
        });
      }

      // Fetch hardware request attachments
      const { data: hardwareFiles, error: hardwareError } = await supabase
        .from("request_attachments")
        .select(`
          id,
          file_name,
          file_path,
          file_size,
          content_type,
          created_at,
          request_id,
          uploaded_by
        `)
        .order("created_at", { ascending: false });

      if (!hardwareError && hardwareFiles) {
        // Fetch hardware requests to get company_id
        const requestIds = hardwareFiles.map(f => f.request_id);
        const { data: requests } = await supabase
          .from("hardware_requests")
          .select("id, company_id")
          .in("id", requestIds);

        // Fetch companies
        const companyIds = requests?.map(r => r.company_id) || [];
        const { data: companies } = await supabase
          .from("companies")
          .select("id, name")
          .in("id", companyIds);

        // Fetch uploader names
        const uploaderIds = hardwareFiles.map(f => f.uploaded_by);
        const { data: uploaders } = await supabase
          .from("profiles")
          .select("user_id, name")
          .in("user_id", uploaderIds);

        hardwareFiles.forEach((file: any) => {
          const request = requests?.find(r => r.id === file.request_id);
          const company = companies?.find(c => c.id === request?.company_id);
          const uploader = uploaders?.find(u => u.user_id === file.uploaded_by);
          
          allFiles.push({
            id: file.id,
            file_name: file.file_name,
            file_path: file.file_path,
            file_size: file.file_size,
            content_type: file.content_type,
            created_at: file.created_at,
            company_name: company?.name || "Unknown",
            company_id: request?.company_id || "",
            source: "hardware",
            uploader_name: uploader?.name,
          });
        });
      }

      // Fetch newsletter attachments
      const { data: newsletterFiles, error: newsletterError } = await supabase
        .from("newsletter_attachments")
        .select(`
          id,
          file_name,
          file_path,
          file_size,
          content_type,
          created_at,
          submission_id,
          uploaded_by
        `)
        .order("created_at", { ascending: false });

      if (!newsletterError && newsletterFiles) {
        // Fetch submissions to get submitter_id
        const submissionIds = newsletterFiles.map(f => f.submission_id);
        const { data: submissions } = await supabase
          .from("newsletter_submissions")
          .select("id, submitter_id")
          .in("id", submissionIds);

        // Fetch profiles to get company_id
        const submitterIds = submissions?.map(s => s.submitter_id) || [];
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, company_id")
          .in("user_id", submitterIds);

        // Fetch companies
        const companyIds = profiles?.map(p => p.company_id).filter(Boolean) || [];
        const { data: companies } = await supabase
          .from("companies")
          .select("id, name")
          .in("id", companyIds as string[]);

        // Fetch uploader names
        const uploaderIds = newsletterFiles.map(f => f.uploaded_by);
        const { data: uploaders } = await supabase
          .from("profiles")
          .select("user_id, name")
          .in("user_id", uploaderIds);

        newsletterFiles.forEach((file: any) => {
          const submission = submissions?.find(s => s.id === file.submission_id);
          const profile = profiles?.find(p => p.user_id === submission?.submitter_id);
          const company = companies?.find(c => c.id === profile?.company_id);
          const uploader = uploaders?.find(u => u.user_id === file.uploaded_by);
          
          allFiles.push({
            id: file.id,
            file_name: file.file_name,
            file_path: file.file_path,
            file_size: file.file_size,
            content_type: file.content_type,
            created_at: file.created_at,
            company_name: company?.name || "Unknown",
            company_id: profile?.company_id || "",
            source: "newsletter",
            uploader_name: uploader?.name,
          });
        });
      }

      return allFiles;
    },
  });

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / (k ** i) * 100) / 100 + " " + sizes[i];
  };

  const getFileIcon = (contentType: string) => {
    if (contentType.startsWith("image/")) return <Image className="size-4" />;
    if (contentType.includes("pdf")) return <FileText className="size-4" />;
    return <File className="size-4" />;
  };

  const getSourceBadgeVariant = (source: string) => {
    switch (source) {
      case "marketing":
        return "default";
      case "hardware":
        return "secondary";
      case "newsletter":
        return "outline";
      default:
        return "default";
    }
  };

  const downloadFile = async (filePath: string, fileName: string, source: string) => {
    let bucket = "";
    if (source === "marketing") bucket = "marketing-requests";
    else if (source === "hardware") bucket = "request-attachments";
    else if (source === "newsletter") bucket = "newsletter-attachments";

    const { data, error } = await supabase.storage
      .from(bucket)
      .download(filePath);

    if (error) {
      console.error("Download error:", error);
      return;
    }

    const url = URL.createObjectURL(data);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const filteredFiles = files?.filter(file =>
    file.file_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    file.company_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    file.brand?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    file.uploader_name?.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  // Group files by brand (for marketing) or company, then by date
  const filesByFolder = filteredFiles.reduce((acc, file) => {
    // Use brand if available (for marketing), otherwise company name
    const folderName = file.brand || file.company_name;
    const fileDate = new Date(file.created_at);
    const dateKey = format(fileDate, "dd-MM-yyyy");
    
    if (!acc[folderName]) {
      acc[folderName] = {};
    }
    
    if (!acc[folderName][dateKey]) {
      acc[folderName][dateKey] = [];
    }
    
    acc[folderName][dateKey].push(file);
    return acc;
  }, {} as Record<string, Record<string, FileRecord[]>>);

  const toggleCompany = (folderId: string) => {
    const newExpanded = new Set(expandedCompanies);
    if (newExpanded.has(folderId)) {
      newExpanded.delete(folderId);
    } else {
      newExpanded.add(folderId);
    }
    setExpandedCompanies(newExpanded);
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-8 px-4">
        <Card>
          <CardContent className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">File Manager</h1>
          <p className="text-muted-foreground mt-2">
            View and manage all uploaded files across the system
          </p>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>All Files</CardTitle>
                <CardDescription>
                  {filteredFiles.length} files organized by brand/company and date
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline">
                  <Paperclip className="h-3 w-3 mr-1" />
                  Total: {formatFileSize(filteredFiles.reduce((sum, f) => sum + f.file_size, 0))}
                </Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                placeholder="Search files, companies, or uploaders..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Folders and Files */}
            <div className="space-y-2">
              {Object.entries(filesByFolder).length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No files found
                </div>
              ) : (
                Object.entries(filesByFolder).map(([folderName, dateGroups]) => {
                  const totalFiles = Object.values(dateGroups).flat().length;
                  const totalSize = Object.values(dateGroups).flat().reduce((sum, f) => sum + f.file_size, 0);
                  
                  return (
                    <Collapsible
                      key={folderName}
                      open={expandedCompanies.has(folderName)}
                      onOpenChange={() => toggleCompany(folderName)}
                    >
                      <Card>
                        <CollapsibleTrigger asChild>
                          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <Folder className="h-5 w-5 text-primary" />
                                <div>
                                  <CardTitle className="text-lg">{folderName}</CardTitle>
                                  <CardDescription>
                                    {totalFiles} file{totalFiles !== 1 ? "s" : ""} • {formatFileSize(totalSize)}
                                  </CardDescription>
                                </div>
                              </div>
                            </div>
                          </CardHeader>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          <CardContent className="space-y-4">
                            {Object.entries(dateGroups).sort(([a], [b]) => {
                              const dateA = a.split('-').reverse().join('-');
                              const dateB = b.split('-').reverse().join('-');
                              return dateB.localeCompare(dateA);
                            }).map(([dateKey, dateFiles]) => (
                              <div key={dateKey} className="space-y-2">
                                <div className="flex items-center gap-2 text-sm font-medium text-primary border-b pb-1">
                                  <span>📅 {dateKey}</span>
                                </div>
                                <Table>
                                  <TableHeader>
                                    <TableRow>
                                      <TableHead>File Name</TableHead>
                                      <TableHead>Size</TableHead>
                                      <TableHead>Source</TableHead>
                                      <TableHead>Uploaded By</TableHead>
                                      <TableHead>Time</TableHead>
                                      <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                    {dateFiles.map((file) => (
                                      <TableRow key={file.id}>
                                        <TableCell>
                                          <div className="flex items-center gap-2">
                                            {getFileIcon(file.content_type)}
                                            <span className="font-medium">{file.file_name}</span>
                                          </div>
                                        </TableCell>
                                        <TableCell>{formatFileSize(file.file_size)}</TableCell>
                                        <TableCell>
                                          <Badge variant={getSourceBadgeVariant(file.source) as any}>
                                            {file.source.charAt(0).toUpperCase() + file.source.slice(1)}
                                          </Badge>
                                        </TableCell>
                                        <TableCell>{file.uploader_name || "-"}</TableCell>
                                        <TableCell>
                                          {format(new Date(file.created_at), "h:mm a")}
                                        </TableCell>
                                        <TableCell className="text-right">
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => downloadFile(file.file_path, file.file_name, file.source)}
                                          >
                                            <Download className="h-4 w-4" />
                                          </Button>
                                        </TableCell>
                                      </TableRow>
                                    ))}
                                  </TableBody>
                                </Table>
                              </div>
                            ))}
                          </CardContent>
                        </CollapsibleContent>
                      </Card>
                    </Collapsible>
                  );
                })
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default FileManager;
