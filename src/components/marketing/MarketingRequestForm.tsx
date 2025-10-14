import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

interface MarketingRequestFormProps {
  onSuccess?: () => void;
}

export function MarketingRequestForm({ onSuccess }: MarketingRequestFormProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>New Marketing Request</CardTitle>
      </CardHeader>
      <CardContent>
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Marketing requests are not available in single-tenant mode.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}
