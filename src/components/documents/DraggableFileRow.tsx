import { useDraggable } from '@dnd-kit/core';
import { TableRow, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Eye, Edit, Download, Trash2 } from "lucide-react";
import { DocumentFile } from './types';
import { cn } from '@/lib/utils';

interface DraggableFileRowProps {
  file: DocumentFile;
  selected: boolean;
  isPreviewable: boolean;
  onToggleSelect: () => void;
  onPreview: () => void;
  onRename: () => void;
  onDownload: () => void;
  onDelete: () => void;
  onOpenFile: () => void;
  getFileIcon: (filename: string, mimetype?: string) => JSX.Element;
  getFileExtension: (filename: string) => string;
  formatFileSize: (bytes: number) => string;
  formatDate: (date: string) => string;
}

export function DraggableFileRow({ 
  file, 
  selected,
  isPreviewable,
  onToggleSelect,
  onPreview,
  onRename,
  onDownload,
  onDelete,
  onOpenFile,
  getFileIcon,
  getFileExtension,
  formatFileSize,
  formatDate
}: DraggableFileRowProps) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: file.id,
  });

  return (
    <TableRow 
      ref={setNodeRef}
      className={cn(
        "group",
        isDragging && "opacity-50"
      )}
    >
      <TableCell className="py-3">
        <Checkbox
          checked={selected}
          onCheckedChange={onToggleSelect}
        />
      </TableCell>
      <TableCell 
        className="py-3 cursor-move" 
        {...listeners} 
        {...attributes}
      >
        {getFileIcon(file.name, file.metadata?.mimetype)}
      </TableCell>
      <TableCell className="font-medium">
        <button
          onClick={onOpenFile}
          className="text-left hover:text-primary transition-colors hover:underline"
          title={file.name}
        >
          {file.name}
        </button>
      </TableCell>
      <TableCell className="text-muted-foreground">
        {getFileExtension(file.name)}
      </TableCell>
      <TableCell className="text-muted-foreground">
        {formatFileSize(file.metadata?.size || 0)}
      </TableCell>
      <TableCell className="text-muted-foreground">
        {formatDate(file.created_at)}
      </TableCell>
      <TableCell className="text-right">
        <div className="flex gap-2 justify-end">
          {isPreviewable && (
            <Button
              size="sm"
              variant="ghost"
              onClick={onPreview}
              title="Preview"
            >
              <Eye className="h-4 w-4" />
            </Button>
          )}
          <Button
            size="sm"
            variant="ghost"
            onClick={onRename}
            title="Rename"
          >
            <Edit className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={onDownload}
            title="Download"
          >
            <Download className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={onDelete}
            title="Delete"
            className="text-destructive hover:text-destructive"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}
