import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

export function TemplateEditor({
  open,
  onOpenChange,
  template,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template?: any;
  onSave: (data: any) => Promise<void>;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Template Editor</DialogTitle>
        </DialogHeader>
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Template editor is not available in single-tenant mode.
          </AlertDescription>
        </Alert>
      </DialogContent>
    </Dialog>
  );
}
