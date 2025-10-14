import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

export default function NewsletterSubmit() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Newsletter Submission</h1>
        <p className="text-muted-foreground">
          Submit your monthly newsletter content
        </p>
      </div>

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
