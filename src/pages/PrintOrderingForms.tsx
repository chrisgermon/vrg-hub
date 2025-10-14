import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

export default function PrintOrderingForms() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Print Ordering Forms</h1>
        <p className="text-muted-foreground">
          Order print materials and forms
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Print Ordering</CardTitle>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Print ordering is not available in single-tenant mode.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  );
}
