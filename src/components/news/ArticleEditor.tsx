import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";

interface ArticleEditorProps {
  articleId?: string;
  onSave?: () => void;
}

export default function ArticleEditor({ articleId, onSave }: ArticleEditorProps) {
  return (
    <Card>
      <CardContent className="p-8">
        <div className="flex flex-col items-center justify-center text-center space-y-4">
          <AlertCircle className="h-12 w-12 text-muted-foreground" />
          <div>
            <h3 className="text-lg font-semibold">Article Editor Not Available</h3>
            <p className="text-sm text-muted-foreground mt-2">
              This feature is not available in single-tenant mode.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
