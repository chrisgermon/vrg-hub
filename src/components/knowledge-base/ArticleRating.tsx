import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

export function ArticleRating({ pageId }: { pageId: string }) {
  return (
    <Alert>
      <AlertCircle className="h-4 w-4" />
      <AlertDescription>
        Article rating is not available in single-tenant mode.
      </AlertDescription>
    </Alert>
  );
}