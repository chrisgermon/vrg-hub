import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

interface KnowledgeBaseCategoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function KnowledgeBaseCategoryDialog({ open, onOpenChange }: KnowledgeBaseCategoryDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Category</DialogTitle>
          <DialogDescription>
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Category creation is not available in single-tenant mode.
              </AlertDescription>
            </Alert>
          </DialogDescription>
        </DialogHeader>
      </DialogContent>
    </Dialog>
  );
}
