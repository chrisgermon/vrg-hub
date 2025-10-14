import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

interface MarketingRequestDetailProps {
  requestId: string;
}

export function MarketingRequestDetail({ requestId }: MarketingRequestDetailProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Marketing Request Details</CardTitle>
      </CardHeader>
      <CardContent>
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Marketing request details are not available in single-tenant mode.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}
