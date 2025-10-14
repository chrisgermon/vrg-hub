import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

export function NewsletterSubmissionForm({
  cycleId,
  department,
  onSuccess,
  onCancel,
}: {
  cycleId: string;
  department: string;
  onSuccess: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="container mx-auto py-8">
      <Card>
        <CardHeader>
          <CardTitle>Newsletter Submission</CardTitle>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Newsletter submission is not available in single-tenant mode.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  );
}
