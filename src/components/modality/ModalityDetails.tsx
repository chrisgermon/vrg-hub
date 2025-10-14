import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

export function ModalityDetails() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Modality Management</CardTitle>
      </CardHeader>
      <CardContent>
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Modality management is not available in single-tenant mode.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}
