import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

interface KnowledgeBasePageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categoryId: string | null;
  subcategoryId: string | null;
  onSuccess: (pageId: string) => void;
}

export function KnowledgeBasePageDialog({ open, onOpenChange }: KnowledgeBasePageDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Page</DialogTitle>
          <DialogDescription>
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Knowledge base pages are not available in single-tenant mode.
              </AlertDescription>
            </Alert>
          </DialogDescription>
        </DialogHeader>
      </DialogContent>
    </Dialog>
  );
}
