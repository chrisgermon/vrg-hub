import { memo } from "react";
import { TableCell, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { FileText, Download, ExternalLink, Folder, ChevronRight } from "lucide-react";
import { formatAUDateTimeFull } from "@/lib/dateUtils";

interface SharePointFolder {
  id: string;
  name: string;
  webUrl: string;
  childCount: number;
  lastModifiedDateTime: string;
  path?: string;
}

interface SharePointFile {
  id: string;
  name: string;
  webUrl: string;
  size: number;
  lastModifiedDateTime: string;
  lastModifiedBy?: string;
  fileType: string;
  downloadUrl?: string;
  path?: string;
}

interface FolderRowProps {
  folder: SharePointFolder;
  onNavigate: (name: string, path?: string) => void;
  isSearchResult: boolean;
  currentPath: string;
  loading: boolean;
}

interface FileRowProps {
  file: SharePointFile;
  isSearchResult: boolean;
  currentPath: string;
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

export const FolderRow = memo<FolderRowProps>(({ folder, onNavigate, isSearchResult, currentPath, loading }) => {
  return (
    <TableRow 
      className={`cursor-pointer hover:bg-muted/50 ${loading ? 'opacity-50 pointer-events-none' : ''}`}
      onClick={() => onNavigate(folder.name, folder.path)}
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
      {isSearchResult && (
        <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
          {folder.path || currentPath}
        </TableCell>
      )}
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
  );
});

FolderRow.displayName = 'FolderRow';

export const FileRow = memo<FileRowProps>(({ file, isSearchResult, currentPath }) => {
  return (
    <TableRow className="hover:bg-muted/50">
      <TableCell>
        <FileText className="h-5 w-5 text-muted-foreground" />
      </TableCell>
      <TableCell className="font-medium">
        <div className="flex items-center gap-2">
          <span className="truncate max-w-xs">{file.name}</span>
          <span className="text-xs font-mono bg-muted px-1.5 py-0.5 rounded flex-shrink-0">
            {file.fileType}
          </span>
        </div>
      </TableCell>
      {isSearchResult && (
        <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
          {file.path || currentPath}
        </TableCell>
      )}
      <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
        {formatAUDateTimeFull(file.lastModifiedDateTime)}
      </TableCell>
      <TableCell className="hidden lg:table-cell text-sm text-muted-foreground truncate max-w-xs">
        {file.lastModifiedBy || '—'}
      </TableCell>
      <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">
        {formatFileSize(file.size)}
      </TableCell>
      <TableCell>
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => window.open(file.webUrl, '_blank')}
            title="Open in SharePoint"
          >
            <ExternalLink className="h-4 w-4" />
          </Button>
          {file.downloadUrl && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => window.open(file.downloadUrl, '_blank')}
              title="Download"
            >
              <Download className="h-4 w-4" />
            </Button>
          )}
        </div>
      </TableCell>
    </TableRow>
  );
});

FileRow.displayName = 'FileRow';
